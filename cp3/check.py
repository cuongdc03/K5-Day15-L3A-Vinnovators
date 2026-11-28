"""Read-only CP3 readiness check. Existing starter checks stay unchanged."""
import csv
import json
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def read(relative):
    path=ROOT/relative
    if not path.exists():return []
    with path.open(encoding='utf-8-sig',newline='') as handle:return list(csv.DictReader(handle))

def main():
    protected=['codebase/agent.py','codebase/ai.py','codebase/tools.py','codebase/tracing.py','eval/run_eval.py','cost/simulate.py','run.py','eval/metric_spec.yaml','eval/benchmark.csv']
    unchanged=subprocess.run(['git','diff','--quiet','HEAD','--',*protected],cwd=ROOT).returncode==0
    cases=read('eval/benchmark.csv');reviews=read('data/processed/reviews.csv')
    finals=[r for r in read('data/processed/labels.csv') if r['labeler']=='final']
    runs=sorted((ROOT/'eval').glob('run-[0-9]*.csv'))
    report={'starter_and_frozen_eval_unchanged':unchanged,'benchmark_cases':len(cases),
            'real_review_rows':len(reviews),'final_labels':len(finals),
            'numbered_eval_runs':[p.name for p in runs],
            'human_evidence':'not supplied; inspect evidence files before declaring CP3 complete'}
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if unchanged else 1
if __name__=='__main__':raise SystemExit(main())
