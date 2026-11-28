"""Export only sourced places, menus and recorded model outputs to a static UI dataset."""
import csv
import json
import math
from collections import Counter,defaultdict
from pathlib import Path
from cp3.tools import norm
from .agent import non_restaurant

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'web-demo/data'
ORIGIN={'name':'VinUni','lat':20.9889,'lng':105.9447,'method':'straight_line_haversine'}

def distance_m(lat,lng):
    if lat is None or lng is None:return None
    a,b,c,d=map(math.radians,[ORIGIN['lat'],ORIGIN['lng'],lat,lng])
    h=math.sin((c-a)/2)**2+math.cos(a)*math.cos(c)*math.sin((d-b)/2)**2
    return round(6371000*2*math.asin(math.sqrt(min(1,h))))
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
    geo_file=ROOT/'data/processed/shopee_locations.json'
    locations={r['store_id']:r for r in json.loads(geo_file.read_text(encoding='utf8'))} if geo_file.exists() else {}
    links={r['store_id']:r['place_id'] for r in read('data/processed/shopee_place_links.csv')}
    menu_by_store=defaultdict(list)
    for r in read('data/processed/shopee_menu.csv'):
        menu_by_store[r['store_id']].append({'group':r['menu_group'],'name':r['item_name'],'description':r['description'],
            'online_price_vnd':number(r['online_price_vnd']),'original_price_vnd':number(r['original_price_vnd']),
            'source_url':safe_url(r['source_url']),'fetched_at':r['fetched_at']})
    menus=[];menus_by_place=defaultdict(list)
    for s in stores:
        pid=links.get(s['store_id'],'')
        geo=locations.get(s['store_id'],{});place=by_id.get(pid,{})
        lat=number(geo.get('lat'));lng=number(geo.get('lng'))
        if lat is None or lng is None:lat,lng=number(place.get('lat')),number(place.get('lng'))
        entry={'store_id':s['store_id'],'place_id':pid,'name':geo.get('name') or s['name'] or s['source_url'].rsplit('/',1)[-1].replace('-',' ')+' (tên theo link)','address':geo.get('address') or s['address_text'],
               'source_url':safe_url(geo.get('resolved_source_url') or s['source_url']),'original_source_url':safe_url(s['source_url']),'complete':s['menu_complete']=='1','items':menu_by_store[s['store_id']],
               'lat':lat,'lng':lng,'distance_m':distance_m(lat,lng),'distance_origin':ORIGIN,
               'coordinate_source':geo.get('coordinate_source') if geo.get('lat') is not None else ('existing_exact_slug_place' if lat is not None else 'unavailable'),
               'coordinate_fetched_at':geo.get('fetched_at',''),'status_at_fetch':s['status_at_fetch'],'rating_text':s['rating_text'],
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
    existing={r['place_id']:r for r in result}
    for s in menus:
        if s['place_id'] in existing:
            p=existing[s['place_id']]
            p.update(store_id=s['store_id'],coordinate_source=s['coordinate_source'],coordinate_fetched_at=s['coordinate_fetched_at'])
            if s['lat'] is not None:p.update(lat=s['lat'],lng=s['lng'])
            continue
        prices=[i['online_price_vnd'] for i in s['items'] if i['online_price_vnd'] is not None and i['online_price_vnd']>0]
        result.append({'place_id':'shopee_'+s['store_id'],'store_id':s['store_id'],'name':s['name'],'district':'van_giang' if any(x in norm(s['address']) for x in ['van giang','hung yen']) else 'gia_lam',
            'address':s['address'],'lat':s['lat'],'lng':s['lng'],'dish':', '.join(dict.fromkeys(i['group'] for i in s['items']))[:140] or 'ShopeeFood',
            'price_min_k':min(prices)/1000 if prices else None,'price_max_k':max(prices)/1000 if prices else None,'price_basis':'online',
            'label':'unsure','confidence':None,'reason':'Quán từ ShopeeFood, có menu/giá nguồn; chưa có lượt AI đánh giá nhãn.',
            'signals':[{'key':'Nguồn quán','value':'ShopeeFood','url':s['source_url']}],'review_links':[],'evaluated':False,'run_id':'','model':'',
            'menu':s['items'],'menu_count':len(s['items']),'source_urls':[s['source_url']],
            'coordinate_source':s['coordinate_source'],'coordinate_fetched_at':s['coordinate_fetched_at']})
    for p in result:p.update(distance_m=distance_m(p['lat'],p['lng']),distance_origin=ORIGIN)
    for district in {r['district'] for r in result}:
        group=[r for r in result if r['district']==district and r['lat'] is not None and r['lng'] is not None]
        if not group:continue
        west,east=min(r['lng'] for r in group),max(r['lng'] for r in group)
        south,north=min(r['lat'] for r in group),max(r['lat'] for r in group)
        for r in group:r.update(x=140+380*(r['lng']-west)/(east-west or 1),y=130+300*(north-r['lat'])/(north-south or 1))
    manifest={'source_places':len(places),'listed_places':len(result),'mapped_places':sum(r['lat'] is not None and r['lng'] is not None for r in result),'excluded':excluded,'districts':dict(Counter(r['district'] for r in result)),
        'evaluated_places':sum(r['evaluated'] for r in result),'labels':dict(Counter(r['label'] for r in result)),
        'menu_stores':len(menus),'menu_rows':sum(len(m['items']) for m in menus),'linked_stores':sum(bool(m['place_id']) for m in menus),'shopee_stores_with_coordinates':sum(s['lat'] is not None for s in menus),'distance_origin':ORIGIN,
        'run_sources':[p.name for p in runs],'generated_by':'python -m cp4.export_data'}
    return result,menus,manifest

def main():
    places,menus,manifest=build();OUT.mkdir(exist_ok=True,parents=True)
    for name,data in [('places_live.json',places),('menus_live.json',menus),('live_manifest.json',manifest)]:
        (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(manifest,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
