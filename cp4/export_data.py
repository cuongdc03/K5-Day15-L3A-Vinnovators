"""Export only sourced places, menus and recorded model outputs to a static UI dataset."""
import csv
import json
from collections import Counter,defaultdict
from pathlib import Path
from cp3.tools import norm
from .agent import non_restaurant

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'web-demo/data'
def read(file):
    with (ROOT/file).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def number(value):
    try:return float(value) if value not in (None,'') else None
    except (TypeError,ValueError):return None
def safe_url(value):return value if isinstance(value,str) and value.startswith(('https://','http://')) else ''

def build():
    places=read('data/processed/places.csv')
    by_id={p['place_id']:p for p in places}
    stores=read('data/processed/shopee_stores.csv')
    links={r['store_id']:r['place_id'] for r in read('data/processed/shopee_place_links.csv')}
    menu_by_store=defaultdict(list)
    for r in read('data/processed/shopee_menu.csv'):
        menu_by_store[r['store_id']].append({'group':r['menu_group'],'name':r['item_name'],'description':r['description'],
            'online_price_vnd':number(r['online_price_vnd']),'original_price_vnd':number(r['original_price_vnd']),
            'source_url':safe_url(r['source_url']),'fetched_at':r['fetched_at']})
    menus=[];menus_by_place=defaultdict(list)
    for s in stores:
        pid=links.get(s['store_id'],'')
        entry={'store_id':s['store_id'],'place_id':pid,'name':s['name'],'address':s['address_text'],
               'source_url':safe_url(s['source_url']),'complete':s['menu_complete']=='1','items':menu_by_store[s['store_id']],
               'map_search_url':'https://www.google.com/maps/search/?api=1&query='+__import__('urllib.parse',fromlist=['quote']).quote(s['name']+' '+s['address_text'])}
        menus.append(entry)
        if pid:menus_by_place[pid].extend(entry['items'])
    # Latest successful actual output wins; unprocessed places are never given a fabricated label.
    verdicts={}
    runs=sorted((ROOT/'eval').glob('run-[0-9]*.csv'),key=lambda p:int(p.stem.split('-')[-1]))
    for run in runs:
        for row in read(str(run.relative_to(ROOT))):
            if row['error'] or not row['model']:continue
            try:payload=json.loads(row['output'])
            except (ValueError,TypeError):continue
            for v in payload.get('verdicts',[]):
                if v.get('place_id') in by_id:
                    verdicts[v['place_id']]={**v,'run_id':row['run_id'],'model':row['model']}
    result=[];excluded=[]
    for p in places:
        if non_restaurant(p):excluded.append({'place_id':p['place_id'],'name':p['name'],'reason':'Điểm hỗ trợ tài xế, không đưa vào danh sách quán ăn'});continue
        lat,lng=number(p['lat']),number(p['lng'])
        if lat is None or lng is None:continue
        v=verdicts.get(p['place_id'])
        src=safe_url(p.get('foody_url'))
        menu=menus_by_place[p['place_id']]
        result.append({'place_id':p['place_id'],'name':p['name'],'district':p['district'],'address':p['address_text'],
            'lat':lat,'lng':lng,'dish':p['cuisine'].replace(';',', ') or p['name'],
            'price_min_k':number(p['price_min_k']),'price_max_k':number(p['price_max_k']),
            'label':v['label'] if v else 'unsure','confidence':v['confidence'] if v else None,
            'reason':v['reason'] if v else 'Chưa có lượt AI đánh giá quán này; cần người kiểm tra dữ liệu nguồn.',
            'signals':v['signals'] if v else [{'key':'Nguồn quán','value':p['sources'],'url':src}],
            'review_links':v.get('review_links',[]) if v else [],'evaluated':bool(v),'run_id':v.get('run_id','') if v else '',
            'model':v.get('model','') if v else '', 'menu':menu,'menu_count':len(menu),
            'source_urls':list(dict.fromkeys([s for s in [src]+[i['source_url'] for i in menu] if s]))})
    for district in {r['district'] for r in result}:
        group=[r for r in result if r['district']==district]
        west,east=min(r['lng'] for r in group),max(r['lng'] for r in group)
        south,north=min(r['lat'] for r in group),max(r['lat'] for r in group)
        for r in group:r.update(x=140+380*(r['lng']-west)/(east-west or 1),y=130+300*(north-r['lat'])/(north-south or 1))
    manifest={'source_places':len(places),'mapped_places':len(result),'excluded':excluded,'districts':dict(Counter(r['district'] for r in result)),
        'evaluated_places':sum(r['evaluated'] for r in result),'labels':dict(Counter(r['label'] for r in result)),
        'menu_stores':len(menus),'menu_rows':sum(len(m['items']) for m in menus),'linked_stores':sum(bool(m['place_id']) for m in menus),
        'run_sources':[p.name for p in runs],'generated_by':'python -m cp4.export_data'}
    return result,menus,manifest

def main():
    places,menus,manifest=build();OUT.mkdir(exist_ok=True,parents=True)
    for name,data in [('places_live.json',places),('menus_live.json',menus),('live_manifest.json',manifest)]:
        (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(manifest,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
