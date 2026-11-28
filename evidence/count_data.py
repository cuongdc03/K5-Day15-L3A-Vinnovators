"""Read-only repeatable counts for the CP2/CP3 data report."""
import csv
import json
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(name):
    p=ROOT/'data'/'processed'/name
    if not p.exists():return []
    with p.open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def main():
    places=read('places.csv');stores=read('shopee_stores.csv');menu=read('shopee_menu.csv');reviews=read('reviews.csv')
    counts=Counter(r['place_id'] for r in reviews)
    report={'places':len(places),'districts':dict(Counter(p['district'] for p in places)),
            'shopee_stores':len(stores),'unique_shopee_urls':len({s['source_url'] for s in stores}),
            'complete_menus':sum(s['menu_complete']=='1' for s in stores),'menu_rows':len(menu),
            'review_rows':len(reviews),'places_with_3_reviews':sum(n>=3 for n in counts.values()),
            'survey_responses':'not_collected','interviews':'not_collected'}
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
