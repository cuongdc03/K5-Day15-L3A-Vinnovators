"""Run the unchanged starter CLI with the CP3 agent: python -m cp3.run eval."""
import runpy
import sys
from pathlib import Path
from . import agent

if __name__ == '__main__':
    sys.modules['agent'] = agent
    # Execute the original framework in this process, so the selected extension
    # survives the framework's normal import of `agent` without editing starter files.
    root = Path(__file__).resolve().parents[1]
    args = sys.argv[1:]
    command = args[0] if args else 'app'
    tail = args[1:]
    if command == 'eval':
        target, forwarded = root/'eval/run_eval.py', tail
    elif command == 'check':
        target, forwarded = root/'eval/run_eval.py', ['--check']
    elif command == 'score':
        target, forwarded = root/'eval/run_eval.py', ['--score', *tail]
    elif command == 'simulate':
        target, forwarded = root/'cost/simulate.py', tail
    elif command == 'app':
        target, forwarded = root/'codebase/app.py', tail
    else:
        raise SystemExit('Lệnh: python -m cp3.run [check|eval|score FILE|simulate]')
    sys.argv = [str(target), *forwarded]
    runpy.run_path(str(target), run_name='__main__')
