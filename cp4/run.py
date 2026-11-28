"""Use unchanged eval/simulation frameworks with CP4 extensions."""
import runpy
import sys
from pathlib import Path
from . import agent

ROOT=Path(__file__).resolve().parents[1]
if __name__=='__main__':
    sys.modules['agent']=agent
    args=sys.argv[1:];cmd=args[0] if args else 'app';tail=args[1:]
    if cmd=='simulate':
        sys.path.insert(0,str(ROOT/'eval'))
        scope=runpy.run_path(str(ROOT/'cost/simulate.py'),run_name='cp4_simulation_framework')
        scope['main'].__globals__['PERSONAS']=str(ROOT/'cp4/personas.yaml')
        raise SystemExit(scope['main'](tail))
    routes={'eval':('eval/run_eval.py',tail),'check':('eval/run_eval.py',['--check']),
            'score':('eval/run_eval.py',['--score',*tail]),'app':('codebase/app.py',tail)}
    if cmd not in routes:raise SystemExit('Commands: eval, check, score FILE, simulate')
    file,forwarded=routes[cmd];sys.argv=[str(ROOT/file),*forwarded]
    runpy.run_path(str(ROOT/file),run_name='__main__')
