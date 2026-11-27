import unittest
from crawl.reviews import detect_lang,excerpt,normalize

class ReviewsTest(unittest.TestCase):
    def test_language(self):
        for text,lang in [('Món ăn ngon','vi'),('Good food','en'),('맛있어요','ko'),('おいしい','ja'),('很好吃','zh'),('x','other')]:
            self.assertEqual(detect_lang(text),lang)
    def test_limit(self):
        self.assertEqual(excerpt('A. B. C.'),'A. B.')
        self.assertLessEqual(len(excerpt('dai '*200)),300)
    def test_identity_and_privacy(self):
        raw={'place_id':'p_1','source':'blog','text':'Món ngon.','url':'https://example.org/review','author':'private'}
        first=normalize(raw,{'p_1'},'2026-11-27')
        self.assertNotIn('author',first)
        self.assertEqual(first['review_id'],normalize(raw,{'p_1'},'2026-11-28')['review_id'])
        with self.assertRaises(ValueError):normalize(raw,{'p_2'},'2026-11-27')

if __name__=='__main__':unittest.main()
