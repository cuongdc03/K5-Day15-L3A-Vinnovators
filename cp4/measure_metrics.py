"""Draft grounded-reason grading using recorded tool evidence, without API calls."""
import ast
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def chain_fields(text):
    # Framework may truncate the dictionary tail. Read only complete literal fields;
    # missing or cut values are never treated as evidence.
    result={}
    for key in ['is_chain','brand_id','source_url','observed_addresses_hn']:
        match=re.search("'"+key+r"': ('(?:\\.|[^'\\])*'|True|False|\d+)",text)
        if match:result[key]=ast.literal_eval(match[1])
    return result
def measure():
    events=defaultdict(list)
    for line in (ROOT/'traces/run-3.jsonl').read_text(encoding='utf8').splitlines():
        e=json.loads(line);events[e.get('case')].append(e)
    with (ROOT/'eval/run-3.csv').open(encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
    results=[]
    for r in rows:
        if r['type'] not in {'thuong','kho'}:continue
        try:vs=json.loads(r['output']).get('verdicts',[])
        except ValueError:continue
        if not vs:continue
        ev=events[r['id']]
        chains=[chain_fields(e['output']) for e in ev if e.get('name')=='lookup_chain']
        reviews=[ast.literal_eval(e['output']) for e in ev if e.get('name')=='get_reviews']
        places=[e['output'] for e in ev if e.get('name')=='get_place']
        verdicts=[]
        for i,v in enumerate(vs):
            reason=v['reason'];ok=False;proof='Không đủ bằng chứng trace để tự chấm.'
            if i<len(chains) and i<len(reviews):
                c=chains[i];match=re.fullmatch(r'Có trong chain_registry: (\w+)',reason)
                numbers=re.search(r'đã thu (\d+) review và quan sát (\d+) địa chỉ Hà Nội trong mẫu\.',reason)
                if match:
                    ok=bool(c.get('is_chain') and c.get('source_url') and match[1]==c.get('brand_id'));proof='brand_id và nguồn chuỗi khớp lookup_chain trong trace.'
                elif numbers:
                    ok=int(numbers[1])==len(reviews[i]) and int(numbers[2])==c.get('observed_addresses_hn');proof='Số review và địa chỉ khớp get_reviews / lookup_chain trong trace.'
                elif reason=='Đây là điểm hỗ trợ/nghỉ cho tài xế theo tên danh mục, chưa phải quán ăn để phân loại; cần người kiểm tra.':
                    ok=i<len(places) and v['name'] in places[i] and 'Trạm Tiếp Sức' in v['name'];proof='Tên danh mục Trạm Tiếp Sức có trong get_place; reason ghi rõ suy luận từ tên.'
            verdicts.append({'place_id':v['place_id'],'pass':bool(ok),'proof':proof})
        results.append({'id':r['id'],'pass':all(v['pass'] for v in verdicts),'verdicts':verdicts})
    return {'status':'draft_pending_human_review','metric':'grounded_reason','pass':sum(r['pass'] for r in results),'total':len(results),'cases':results}
if __name__=='__main__':
    result=measure();(ROOT/'cp4/results/grounded-reason-draft.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(result,ensure_ascii=False,indent=2))
