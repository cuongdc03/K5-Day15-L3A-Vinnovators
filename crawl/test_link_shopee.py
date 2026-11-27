import unittest
from crawl.link_shopee import slug

class SourceLinkTest(unittest.TestCase):
    def test_different_domains_same_store_slug(self):
        self.assertEqual(slug('https://shopeefood.vn/ha-noi/bep-cua-nhung/'),slug('https://www.foody.vn/ha-noi/bep-cua-nhung'))
    def test_different_branch_suffixes_stay_different(self):
        self.assertNotEqual(slug('https://shopeefood.vn/ha-noi/shop.branch1'),slug('https://shopeefood.vn/ha-noi/shop.branch2'))
if __name__=='__main__':unittest.main()
