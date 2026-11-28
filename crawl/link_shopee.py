"""Link ShopeeFood menus to existing places by exact URL slug, never guess coordinates.
Run after node crawl/shopee_menus.mjs. Does not change places.csv or benchmark labels.
"""
import csv
import json
from pathlib import Path
from urllib.parse import urlparse
try:
    from .common import PROCESSED_DIR, append_crawl_log, now_iso
except ImportError:
    from common import PROCESSED_DIR, append_crawl_log, now_iso

def read(file):
    with file.open(encoding='utf-8-sig',newline='') as handle:return list(csv.DictReader(handle))

def slug(url):return urlparse(url).path.rstrip('/').split('/')[-1]

def main():
    places=read(PROCESSED_DIR/'places.csv');stores=read(PROCESSED_DIR/'shopee_stores.csv')
    index={}
    for p in places:
        if p.get('foody_url'):index.setdefault(slug(p['foody_url']),[]).append(p)
    rows=[]
    for s in stores:
        candidates=index.get(slug(s['source_url']),[])
        match=candidates[0] if len(candidates)==1 else None
        rows.append({'store_id':s['store_id'],'place_id':match['place_id'] if match else '',
                     'match_method':'exact_url_slug' if match else 'unmatched',
                     'source_url':s['source_url'],'address_text':s['address_text']})
    with (PROCESSED_DIR/'shopee_place_links.csv').open('w',encoding='utf-8-sig',newline='') as handle:
        writer=csv.DictWriter(handle,fieldnames=['store_id','place_id','match_method','source_url','address_text']);writer.writeheader();writer.writerows(rows)
    report={'stores':len(stores),'matched':sum(bool(r['place_id']) for r in rows),'unmatched':sum(not r['place_id'] for r in rows),
            'menu_rows':len(read(PROCESSED_DIR/'shopee_menu.csv')),
            'complete_menus':sum(s['menu_complete']=='1' for s in stores)}
    append_crawl_log('shopeefood','gia_lam',now_iso(),len(rows),'partial','crawl/link_shopee.py',json.dumps(report))
    (PROCESSED_DIR/'shopee_coverage.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    print(json.dumps(report))
if __name__=='__main__':main()
