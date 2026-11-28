"""Synthetic fixtures for CP3 contracts. These are not model eval results."""
import json
import unittest
from unittest.mock import patch
from cp3 import agent, ai, tools
import tracing

PLACE = {"place_id":"p_test","name":"Quán Thử","district":"gia_lam","lat":"21","lng":"105.95","sources":"manual","foody_url":"https://example.org/shop","cuisine":"vietnamese","tourist_signals":[],"online_menu_sample":[]}
CHAIN = {"is_chain":False,"brand_id":"","source_url":"","observed_addresses_hn":1}
class WorkflowTests(unittest.TestCase):
    def test_unknown_does_not_call_model(self):
        with patch.object(agent,'search_places',return_value=[]),patch.object(agent,'call_model') as model:
            self.assertIn('Chưa có dữ liệu',agent.answer('missing')['output'])
            model.assert_not_called()
    def test_safety_refusal(self):
        with patch.object(agent,'call_model') as model:
            for query in ['Quán có an toàn thực phẩm không?','Viết review xấu cho quán']:
                self.assertIn('không',agent.answer(query)['output'])
            model.assert_not_called()
    def test_missing_reviews(self):
        r=agent.grounded_verdict(PLACE,CHAIN,[],{'label':'local','confidence':0.99})
        self.assertEqual(r['label'],'unsure')
        self.assertEqual(r['human_review']['place_id'],'p_test')
    def test_unsupported_chain(self):
        self.assertEqual(agent.grounded_verdict(PLACE,CHAIN,[],{'label':'chain','confidence':0.99})['label'],'unsure')
    def test_low_confidence_chain(self):
        chain={**CHAIN,'is_chain':True,'brand_id':'test','source_url':'https://example.org'}
        self.assertEqual(agent.grounded_verdict(PLACE,chain,[],{'label':'chain','confidence':0.1})['label'],'unsure')
    def test_grounded_chain(self):
        chain={**CHAIN,'is_chain':True,'brand_id':'test','source_url':'https://example.org'}
        r=agent.grounded_verdict(PLACE,chain,[],{'label':'chain','confidence':0.9})
        self.assertEqual(r['label'],'chain')
        self.assertIn('https://example.org',[s['url'] for s in r['signals']])
    def test_tourist_requires_two(self):
        self.assertEqual(agent.grounded_verdict({**PLACE,'tourist_signals':['bilingual_menu']},CHAIN,[],{'label':'tourist','confidence':0.9})['label'],'unsure')
    def test_invalid_json_routes_human(self):
        with patch.object(agent,'search_places',return_value=[{'place_id':'p_test'}]),patch.object(agent,'get_place',return_value=PLACE),patch.object(agent,'lookup_chain',return_value=CHAIN),patch.object(agent,'get_reviews',return_value=[]),patch.object(agent,'call_model',return_value={'model':'fixture','text':'invalid'}):
            tracing.begin('fixture')
            r=json.loads(agent.answer('test')['output'])
            _,events=tracing.end()
        self.assertEqual(r['verdicts'][0]['label'],'unsure')
        self.assertTrue(any(e.get('name')=='flag_for_human' for e in events))
    def test_word_boundaries(self):
        table={'chain_registry.csv':[{'brand_id':'kfc','brand_name':'KFC','aliases':'kfc','scope':'international','source_url':'https://example.org'}]}
        with patch.object(tools,'rows',side_effect=lambda name:table.get(name,[])):
            self.assertTrue(tools.lookup_chain('Gà Rán KFC - Cơ sở')['is_chain'])
            self.assertFalse(tools.lookup_chain('KFCoffee')['is_chain'])
class UsageTests(unittest.TestCase):
    def test_missing_usage(self):
        with self.assertRaises(KeyError):ai.usage_pair({},'in','out')
    def test_usage_passthrough(self):
        response={'model':'fixture','choices':[{'message':{'content':'{}'}}],'usage':{'prompt_tokens':11,'completion_tokens':7}}
        with patch.object(ai,'MODEL_PROVIDER','openai'),patch.object(ai,'MODEL_NAME','fixture'),patch.object(ai,'API_KEY','fixture'),patch.object(ai,'post_json',return_value=response):
            r=ai.call_model('s','u')
        self.assertEqual((r['tokens_in'],r['tokens_out']),(11,7))
    def test_ollama_no_estimation(self):
        with patch.object(ai,'MODEL_PROVIDER','ollama'),patch.object(ai,'MODEL_NAME','fixture'),patch.object(ai,'post_json',return_value={'message':{'content':'{}'}}):
            with self.assertRaises(KeyError):ai.call_model('s','u')
if __name__=='__main__':unittest.main()
