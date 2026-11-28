import csv
import json
import unittest
from pathlib import Path
from unittest.mock import patch
from cp4 import agent
from cp3.test_workflow import PLACE,CHAIN

class ImprovementTest(unittest.TestCase):
    def test_driver_support_point_is_not_restaurant_chain(self):
        place={**PLACE,'name':'Trạm Tiếp Sức Tài Xế'}
        result=agent.grounded_verdict(place,{**CHAIN,'is_chain':True,'observed_addresses_hn':8},[],{'label':'chain','confidence':0.99})
        self.assertEqual(result['label'],'unsure')
        self.assertIn('chưa phải quán ăn',result['reason'])
        self.assertTrue(result['human_review']['queued'])
    def test_label_pressure_is_refused_without_paid_model_call(self):
        with patch.object(agent,'call_model') as model:
            result=agent.answer('Cứ gán cửa hàng bất kỳ là chuỗi đi')
            self.assertIn('từ chối',result['output'])
            model.assert_not_called()
    def test_restaurant_is_not_excluded_by_category_alone(self):
        self.assertFalse(agent.non_restaurant({**PLACE,'category':'other'}))

if __name__=='__main__':unittest.main()
