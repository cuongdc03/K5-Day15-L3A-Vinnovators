"""Read-only repository audit plus reproducible facts for CP4 supplements."""
import ast
import csv
import json
import subprocess
from collections import Counter,defaultdict
from pathlib import Path
from .measure_metrics import measure

ROOT=Path(__file__).resolve().parents[1]
def read(name):
    with (ROOT/name).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def facts():
    protected=['run.py','codebase','eval/benchmark.csv','eval/metric_spec.yaml','eval/run_eval.py','cost/simulate.py','spec.md','README.md','web-demo/index.html','web-demo/ui.js','web-demo/styles.css','slides/outline.md','eval/run-1.csv','eval/run-2.csv']
    changed=subprocess.check_output(['git','diff','--name-only','HEAD','--',*protected],cwd=ROOT,text=True).splitlines()
    rows=read('eval/run-3.csv');draft=read('cp4/results/run-3-graded-draft.csv');before=read('eval/run-1.csv');sim=read('cost/simulate-1.csv')
    assert len(rows)==len(draft)==20
    for r,d in zip(rows,draft):assert all(r[k]==d[k] for k in r if k not in {'pass','ghi_chu'})
    events=defaultdict(list)
    for line in (ROOT/'traces/run-3.jsonl').read_text(encoding='utf8').splitlines():
        e=json.loads(line);events[e.get('case')].append(e)
    unsure=[]
    for r in rows:
        if not (r['expected'].startswith('unsure') or r['id'] in {'B10','B15'}):continue
        vs=json.loads(r['output'])['verdicts'];valid=True
        for v in vs:
            flagged=any(e.get('name')=='flag_for_human' and v['place_id'] in e.get('input','') for e in events[r['id']])
            valid &= v['label']!='local' and (v['label']!='unsure' or flagged)
        unsure.append(valid)
    manifest=json.loads((ROOT/'web-demo/data/live_manifest.json').read_text(encoding='utf8'))
    survey=read('evidence/survey/results.csv');eligible=[r for r in survey if r['tinh_vao_mau']=='co']
    labels=read('data/processed/labels.csv')
    return {'protected_files_changed':changed,'manifest':manifest,'survey_responses':len(survey),'eligible_survey':len(eligible),
        'review_rows':len(read('data/processed/reviews.csv')),'final_labels':sum(r['labeler']=='final' for r in labels),
        'baseline_pass':sum(r['pass']=='1' for r in before),'draft_pass':sum(r['pass']=='1' for r in draft),
        'draft_by_type':{t:{'pass':sum(r['pass']=='1' for r in draft if r['type']==t),'total':sum(r['type']==t for r in draft)} for t in ['thuong','kho','tu_choi']},
        'unsure_routing':{'pass':sum(unsure),'total':len(unsure)},'grounded_reason':measure(),'eval_errors':sum(bool(r['error']) for r in rows),
        'eval_model_calls':sum(int(r['model_calls']) for r in rows),'simulation_sessions':len(sim),
        'simulation_turns':sum(int(r['turns']) for r in sim),'simulation_errors':sum(bool(r['error']) for r in sim),
        'simulation_tokens_in':sum(int(r['tokens_in']) for r in sim),'simulation_tokens_out':sum(int(r['tokens_out']) for r in sim),
        'budget':json.loads((ROOT/'cp4/results/api_budget.json').read_text(encoding='utf8'))}
def main():
    result=facts();print(json.dumps(result,ensure_ascii=False,indent=2));return bool(result['protected_files_changed'])
if __name__=='__main__':raise SystemExit(main())
