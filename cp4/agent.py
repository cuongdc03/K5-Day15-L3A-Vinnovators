"""CP4 improvement: exclude non-restaurant support points and reject label pressure."""
import csv
import re
from pathlib import Path
from unittest.mock import patch
from cp3 import agent as base
from cp3 import tools
from .ai import call_model

_rows=tools.rows
_ground=base.grounded_verdict

def extended_rows(name):
    result=_rows(name)
    if name=='chain_registry.csv':
        with Path(__file__).with_name('chain_registry_additions.csv').open(encoding='utf8',newline='') as handle:
            known={r['brand_id'] for r in result}
            result += [r for r in csv.DictReader(handle) if r['brand_id'] not in known]
    return result

def non_restaurant(place):
    name=tools.norm(place.get('name',''))
    return any(s in name for s in ('tram tiep suc','diem nghi tai xe','trung tam ho tro tai xe'))

def grounded_verdict(place,chain,reviews,proposed):
    if non_restaurant(place):
        reason='Đây là điểm hỗ trợ/nghỉ cho tài xế theo tên danh mục, chưa phải quán ăn để phân loại; cần người kiểm tra.'
        result=_ground(place,{**chain,'is_chain':False},reviews,{})
        result.update(reason=reason,confidence=0,human_review=tools.flag_for_human(place['place_id'],reason))
        return result
    return _ground(place,chain,reviews,proposed)

def answer(text):
    q=tools.norm(text)
    if re.search(r'\b(cu ghi|cu gan|ep gan|gan dai)\b',q) and re.search(r'\b(chuoi|local|bay du lich)\b',q):
        return {'output':'Mình từ chối gắn nhãn theo yêu cầu khi thiếu căn cứ. Nhãn sai có thể làm thiệt quán; hãy cung cấp nguồn để người kiểm tra xem xét.'}
    with patch.object(tools,'rows',extended_rows),patch.object(base,'grounded_verdict',grounded_verdict),patch.object(base,'call_model',call_model):
        return base.answer(text)
