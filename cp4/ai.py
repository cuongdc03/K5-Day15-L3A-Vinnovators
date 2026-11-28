"""Budgeted OpenAI adapter for the explicitly approved CP4 workload."""
import json
import os
from pathlib import Path
from cp3 import ai as config
from tracing import model_call

LEDGER=Path(__file__).with_name('results')/'api_budget.json'
INPUT_PRICE=0.10
OUTPUT_PRICE=0.50
LIMIT_USD=1.0

@model_call
def call_model(system,user):
    if config.MODEL_PROVIDER!='openai' or config.MODEL_NAME!='gpt-6-luna':
        raise RuntimeError('CP4 budget adapter requires openai / gpt-6-luna; no automatic provider change')
    if not config.API_KEY:raise RuntimeError('Missing API key')
    ledger=json.loads(LEDGER.read_text(encoding='utf8')) if LEDGER.exists() else {'calls':0,'input_tokens':0,'output_tokens':0,'usd':0.0}
    # Byte count is a conservative upper bound on text token count, plus protocol overhead.
    worst_input=len((system+user).encode('utf8'))+8192
    reserve=(worst_input*INPUT_PRICE+1024*OUTPUT_PRICE)/1e6
    if ledger['usd']+reserve>LIMIT_USD:raise RuntimeError('Approved 1 USD budget reached; request not sent')
    data=config.post_json('https://api.openai.com/v1/chat/completions',{'Authorization':'Bearer '+config.API_KEY},
        {'model':config.MODEL_NAME,'messages':[{'role':'system','content':system},{'role':'user','content':user}],
         'max_completion_tokens':1024})
    ti,to=config.usage_pair(data['usage'],'prompt_tokens','completion_tokens')
    ledger.update(calls=ledger['calls']+1,input_tokens=ledger['input_tokens']+ti,output_tokens=ledger['output_tokens']+to,
                  usd=ledger['usd']+(ti*INPUT_PRICE+to*OUTPUT_PRICE)/1e6,
                  model=config.MODEL_NAME,limit_usd=LIMIT_USD,
                  price_source='https://developers.openai.com/api/docs/models/gpt-6-luna',price_date='2026-11-28')
    LEDGER.parent.mkdir(parents=True,exist_ok=True)
    LEDGER.write_text(json.dumps(ledger,indent=2),encoding='utf8')
    text=data['choices'][0]['message']['content']
    if not isinstance(text,str) or not text.strip():raise RuntimeError('Empty model response')
    return {'text':text,'model':data.get('model') or config.MODEL_NAME,'tokens_in':ti,'tokens_out':to}
