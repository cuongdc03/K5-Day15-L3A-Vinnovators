"""Review importer for Crawl B. No API key required for offline input.

python crawl/reviews.py --input data/raw/reviews_input.csv
CSV input: place_id,source,rating,text_excerpt,lang,published_at,url
Google API results can be imported from the existing google_verify.json via crawl/verify.py.
This importer keeps existing reviews and accepts only known place IDs and public source URLs.
"""
import argparse
import csv
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse

try:
    from .common import PROCESSED_DIR, append_crawl_log, now_iso
except ImportError:
    from common import PROCESSED_DIR, append_crawl_log, now_iso

COLS = ['review_id','place_id','source','rating','text_excerpt','lang','published_at','url','fetched_at']
LANGS = {'vi','en','ko','zh','ja','fr','other'}

def detect_lang(text, hint=''):
    hint = hint.lower().split('-')[0]
    if hint in LANGS:
        return hint
    if re.search('[가-힣]', text): return 'ko'
    if re.search('[ぁ-んァ-ン]', text): return 'ja'
    if re.search('[一-龥]', text): return 'zh'
    if re.search('[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]', text.lower()): return 'vi'
    words=set(re.findall(r'\w+',text.lower()))
    if words & {'food','delicious','staff','lunch','great','good'}: return 'en'
    if words & {'délicieux','repas','bonjour','très'}: return 'fr'
    return 'other'

def excerpt(text):
    text=re.sub(r'\s+',' ',text).strip()
    text=' '.join(re.split(r'(?<=[.!?…])\s+',text)[:2])
    return text if len(text)<=300 else text[:297].rsplit(' ',1)[0]+'…'

def read(path):
    if not path.exists(): return []
    with path.open(encoding='utf-8-sig',newline='') as handle:return list(csv.DictReader(handle))

def normalize(row, valid_ids, fetched_at):
    place_id=row.get('place_id','')
    if place_id not in valid_ids: raise ValueError('unknown place_id: '+place_id)
    source=row.get('source','other')
    if source not in {'google','youtube','blog','other'}: raise ValueError('invalid source')
    url=row.get('url',''); parsed=urlparse(url)
    if parsed.scheme not in {'http','https'} or not parsed.netloc: raise ValueError('missing public URL')
    text=excerpt(row.get('text_excerpt') or row.get('text') or '')
    if not text: raise ValueError('empty review')
    rating=row.get('rating','')
    if rating and (not rating.isdigit() or not 1<=int(rating)<=5): raise ValueError('rating must be 1..5')
    published=row.get('published_at','')
    key=hashlib.sha256(f'{place_id}|{source}|{text}|{published}'.encode()).hexdigest()[:12]
    return dict(zip(COLS,['r_'+key,place_id,source,rating,text,detect_lang(text,row.get('lang','')),published,url,fetched_at]))

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path)
    parser.add_argument('--folder',type=Path,default=PROCESSED_DIR)
    args=parser.parse_args()
    places=read(args.folder/'places.csv')
    if not places: parser.error('places.csv missing or empty')
    timestamp=now_iso();valid_ids={p['place_id'] for p in places}
    existing=read(args.folder/'reviews.csv')
    rows={r['review_id']:r for r in existing}
    incoming=read(args.input) if args.input else []
    normalized=[normalize(row,valid_ids,timestamp) for row in incoming]
    # Validate entire import before writing, so one malformed record cannot partially replace data.
    for row in normalized: rows[row['review_id']]=row
    counts={}; output=[]
    for row in sorted(rows.values(),key=lambda r:(r['place_id'],r['review_id'])):
        pid=row['place_id'];counts[pid]=counts.get(pid,0)+1
        if counts[pid]>5:
            raise ValueError('More than 5 reviews for '+pid+'; select the source sample before import')
        output.append(row)
    args.folder.mkdir(parents=True,exist_ok=True)
    with (args.folder/'reviews.csv').open('w',encoding='utf-8-sig',newline='') as handle:
        writer=csv.DictWriter(handle,fieldnames=COLS);writer.writeheader();writer.writerows(output)
    coverage={p['place_id']:sum(r['place_id']==p['place_id'] for r in output) for p in places}
    report={'places':len(places),'reviews':len(output),'places_with_3_reviews':sum(n>=3 for n in coverage.values()),'target_places':150,'collected_at':timestamp}
    (args.folder/'review_coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    if args.folder.resolve()==PROCESSED_DIR.resolve():
        append_crawl_log('public_review_input','places.csv',timestamp,len(normalized),'ok' if incoming else 'partial','crawl/reviews.py','Offline import; no API calls; missing input remains missing')
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':main()
