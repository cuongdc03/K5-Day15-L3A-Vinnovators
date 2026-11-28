import unittest
from .export_data import build,distance_m,ORIGIN

class LocationIntegrationTest(unittest.TestCase):
    def test_distance_uses_fixed_origin(self):
        self.assertEqual(distance_m(ORIGIN['lat'],ORIGIN['lng']),0)
        self.assertTrue(111000<distance_m(ORIGIN['lat']+1,ORIGIN['lng'])<112000)
        self.assertIsNone(distance_m(None,105.9))
    def test_every_store_is_on_main_list_once_with_all_menu_rows(self):
        places,menus,manifest=build()
        ids=[p['store_id'] for p in places if p.get('store_id')]
        self.assertEqual(len(ids),150);self.assertEqual(len(set(ids)),150)
        self.assertEqual(sum(len(p['menu']) for p in places),4308)
        self.assertEqual(len(places),552)
        for p in places:self.assertEqual(p['distance_m'],distance_m(p['lat'],p['lng']))
        for m in menus:self.assertEqual(m['distance_m'],distance_m(m['lat'],m['lng']))
        self.assertEqual(sum(bool(m['items']) for m in menus),138)
if __name__=='__main__':unittest.main()
