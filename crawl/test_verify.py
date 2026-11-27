"""Kiểm crawl/verify.py và phần ghép ứng viên của crawl/google_verify.py.

Chạy:  python -m unittest crawl/test_verify.py
Không gọi mạng, không đọc ghi data/.
"""
import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "data" / "schema"))

import google_verify as gv  # noqa: E402
import verify as v  # noqa: E402
from validate import sentences  # noqa: E402

TODAY = date(2026, 11, 27)
PLACE = {"place_id": "p_test0001", "name": "Phở Thìn - Vinhomes Ocean Park", "lat": "20.99400", "lng": "105.95900",
         "area": "ocean_park_1", "google_place_id": "", "sources": "foody", "foody_url": ""}


def google_entry(status="OPERATIONAL", rating_count=50, publish_time="2026-11-01T08:00:00Z"):
    return {"google_place_id": "ChIJ_test", "match": {"score": 0.95, "distance_m": 12, "name_score": 1.0},
            "business_status": status, "rating": 4.3, "rating_count": rating_count, "price_level": 1,
            "price_range": None, "hours_text": "", "maps_uri": "https://maps.google.com/?cid=1",
            "reviews": [{"name": "places/ChIJ_test/reviews/abc", "rating": 5, "text": "Ngon. Rẻ. Đông khách.",
                         "lang": "vi", "publish_time": publish_time}],
            "photos": [{"name": "places/ChIJ_test/photos/xyz", "width_px": 800, "height_px": 600}],
            "fetched_at": "2026-11-27T10:00:00+07:00"}


def desk(status="open", newest="lt_1m", count="120"):
    return {"check_id": "d1", "place_id": PLACE["place_id"], "checker": "duc", "checked_at": "2026-11-28T09:00:00+07:00",
            "maps_status": status, "maps_review_count": count, "newest_review": newest, "has_menu_photo": "1",
            "notes": ""}


def status_of(google=None, visit=None, desk_row=None):
    return v.decide_status(v.gather_evidence(google, visit, desk_row, TODAY))


class StatusRulesTest(unittest.TestCase):
    def test_field_visit_wins_over_everything(self):
        self.assertEqual(status_of(google_entry("CLOSED_PERMANENTLY"), {"status": "open"}, desk("closed_permanently")),
                         "field_verified")

    def test_closed_from_google_api(self):
        self.assertEqual(status_of(google_entry("CLOSED_PERMANENTLY")), "closed")

    def test_closed_from_desk_check(self):
        self.assertEqual(status_of(desk_row=desk("closed_permanently", "older")), "closed")

    def test_desk_verified_when_open_and_recent_review(self):
        self.assertEqual(status_of(desk_row=desk("open", "lt_6m")), "desk_verified")

    def test_desk_open_but_stale_is_uncertain(self):
        self.assertEqual(status_of(desk_row=desk("open", "older")), "uncertain")
        self.assertEqual(status_of(desk_row=desk("open", "none", "")), "uncertain")

    def test_desk_not_found_is_uncertain(self):
        self.assertEqual(status_of(desk_row=desk("not_found", "", "")), "uncertain")

    def test_desk_closed_temporarily_is_uncertain(self):
        self.assertEqual(status_of(desk_row=desk("closed_temporarily", "lt_1m")), "uncertain")

    def test_auto_verified_by_fresh_review_or_many_ratings(self):
        self.assertEqual(status_of(google_entry(rating_count=3)), "auto_verified")
        self.assertEqual(status_of(google_entry(rating_count=25, publish_time="2024-01-01T00:00:00Z")), "auto_verified")

    def test_google_stale_or_temporarily_closed_is_uncertain(self):
        self.assertEqual(status_of(google_entry(rating_count=3, publish_time="2025-01-01T00:00:00.123456789Z")),
                         "uncertain")
        self.assertEqual(status_of(google_entry("CLOSED_TEMPORARILY")), "uncertain")

    def test_no_data_or_no_match_is_unverified(self):
        self.assertEqual(status_of(), "unverified")
        self.assertEqual(status_of({"no_match": True, "candidates_seen": 3, "fetched_at": "x"}), "unverified")

    def test_reasons_are_semicolon_joined_vietnamese(self):
        e = v.gather_evidence(None, None, desk("not_found", "", ""), TODAY)
        reasons = v.reasons_for(e, None, None, PLACE, desk("not_found", "", ""))
        self.assertIn("Maps (xem tay): không tìm thấy", reasons.split(";"))


class PriorityTest(unittest.TestCase):
    def place(self, pid, lat, sources="foody"):
        return {**PLACE, "place_id": pid, "name": f"Quán {pid}", "lat": str(lat), "sources": sources}

    def test_queues(self):
        places = [self.place("p_near", 20.9940), self.place("p_far", 20.9990), self.place("p_closed", 20.9941),
                  self.place("p_ok", 20.9942), self.place("p_new", 20.9943, "osm;foody")]
        desks = [{**desk("not_found", "", ""), "place_id": "p_near"},
                 {**desk("not_found", "", ""), "place_id": "p_far"},
                 {**desk("closed_permanently", "older"), "place_id": "p_closed"},
                 {**desk("open", "lt_1m", "300"), "place_id": "p_ok"}]
        rows, _, _ = v.build(places, {}, {}, [], desks, v.HUBS, 40, TODAY, "now")
        by = {r["place_id"]: r for r in rows}
        self.assertEqual(by["p_closed"]["field_priority"], "")
        self.assertLess(by["p_near"]["field_priority"], by["p_far"]["field_priority"])
        self.assertNotEqual(by["p_ok"]["field_priority"], "")   # desk_verified nổi bật: đi chụp ảnh, ghi giá
        self.assertEqual(by["p_new"]["field_priority"], "")     # chưa xem tay: xem Maps trước
        self.assertEqual(by["p_new"]["desk_priority"], 1)
        self.assertTrue(all(by[p]["desk_priority"] == "" for p in ("p_near", "p_far", "p_closed", "p_ok")))
        self.assertEqual(sorted(r["route_order"] for r in rows if r["route_order"] != ""), [1, 2, 3])


class PhotosTest(unittest.TestCase):
    def test_shared_foody_cover_gets_distinct_ids_and_google_refs_kept(self):
        foody = {"cover_photo_url": "https://img.example/a.jpg", "fetched_at": "t"}
        a = v.photo_rows("p_a", foody, google_entry(), [])
        b = v.photo_rows("p_b", foody, None, [])
        self.assertEqual([r["source"] for r in a], ["foody", "google"])
        self.assertEqual(a[1]["ref"], "places/ChIJ_test/photos/xyz")
        self.assertNotEqual(a[0]["photo_id"], b[0]["photo_id"])


class CandidateMatchTest(unittest.TestCase):
    def cand(self, pid, name, lat, lng):
        return {"id": pid, "displayName": {"text": name}, "location": {"latitude": lat, "longitude": lng}}

    def test_picks_right_place(self):
        cands = [self.cand("far_same_name", "Phở Thìn", 20.9990, 105.9590),
                 self.cand("near_other_name", "Bún Chả Hương Liên", 20.99401, 105.95901),
                 self.cand("right", "Phở Thìn Ocean Park", 20.99410, 105.95905)]
        cand, match = gv.pick_candidate(PLACE, cands)
        self.assertEqual(cand["id"], "right")
        self.assertGreaterEqual(match["name_score"], 0.9)
        self.assertLessEqual(match["distance_m"], gv.MAX_MATCH_DIST_M)
        self.assertTrue(0 < match["score"] <= 1)

    def test_rejects_far_and_different_name(self):
        cands = [self.cand("far", "Phở Thìn", 20.9990, 105.9590),
                 self.cand("other", "Bún Chả Hương Liên", 20.99401, 105.95901)]
        self.assertEqual(gv.pick_candidate(PLACE, cands), (None, None))


TEXT_SEARCH_FIXTURE = {"places": [
    {"id": "ChIJ_other", "displayName": {"text": "Highlands Coffee", "languageCode": "vi"},
     "location": {"latitude": 20.99405, "longitude": 105.95902}, "businessStatus": "OPERATIONAL"},
    {"id": "ChIJ_pho", "displayName": {"text": "Phở Thìn", "languageCode": "vi"},
     "location": {"latitude": 20.99408, "longitude": 105.95903}, "businessStatus": "OPERATIONAL",
     "rating": 4.4, "userRatingCount": 231, "priceLevel": "PRICE_LEVEL_INEXPENSIVE",
     "priceRange": {"startPrice": {"currencyCode": "VND", "units": "50000"},
                    "endPrice": {"currencyCode": "VND", "units": "100000"}},
     "regularOpeningHours": {"weekdayDescriptions": ["Thứ Hai: 06:00–22:00", "Thứ Ba: 06:00–22:00"]},
     "googleMapsUri": "https://maps.google.com/?cid=123",
     "reviews": [{"name": "places/ChIJ_pho/reviews/r1", "rating": 5,
                  "text": {"text": "Phở ngon", "languageCode": "vi"},
                  "originalText": {"text": "Great pho. Fast service. Will come back.", "languageCode": "en"},
                  "authorAttribution": {"displayName": "Người Viết", "uri": "https://x"},
                  "publishTime": "2026-10-20T03:04:05.123456789Z"}],
     "photos": [{"name": "places/ChIJ_pho/photos/ph1", "widthPx": 4032, "heightPx": 3024,
                 "authorAttributions": [{"displayName": "Người Chụp"}]}]},
]}


class TextSearchParseTest(unittest.TestCase):
    def test_fixture_to_google_verify_shape(self):
        e = gv.build_entry(PLACE, TEXT_SEARCH_FIXTURE, "2026-11-27T10:00:00+07:00")
        self.assertEqual(set(e), {"google_place_id", "match", "business_status", "rating", "rating_count",
                                  "price_level", "price_range", "hours_text", "maps_uri", "reviews", "photos",
                                  "fetched_at"})
        self.assertEqual(e["google_place_id"], "ChIJ_pho")
        self.assertEqual(set(e["match"]), {"score", "distance_m", "name_score"})
        self.assertEqual((e["rating_count"], e["price_level"], e["price_range"]), (231, 1, {"min_k": 50, "max_k": 100}))
        self.assertEqual(e["hours_text"], "Thứ Hai: 06:00–22:00 | Thứ Ba: 06:00–22:00")
        self.assertEqual(e["reviews"], [{"name": "places/ChIJ_pho/reviews/r1", "rating": 5,
                                         "text": "Great pho. Fast service. Will come back.", "lang": "en",
                                         "publish_time": "2026-10-20T03:04:05.123456789Z"}])
        self.assertEqual(e["photos"], [{"name": "places/ChIJ_pho/photos/ph1", "width_px": 4032, "height_px": 3024}])
        self.assertNotIn("Người", str(e))  # không giữ tên người viết, người chụp

    def test_no_match_shape(self):
        e = gv.build_entry(PLACE, {"places": TEXT_SEARCH_FIXTURE["places"][:1]}, "t")
        self.assertEqual(e, {"no_match": True, "candidates_seen": 1, "fetched_at": "t"})
        self.assertEqual(gv.build_entry(PLACE, {}, "t")["candidates_seen"], 0)

    def test_dry_run_sku(self):
        self.assertEqual(gv.sku_for(gv.FIELDS), "Text Search Enterprise + Atmosphere")


class ReviewsTest(unittest.TestCase):
    def test_excerpt_limits(self):
        self.assertEqual(v.excerpt("Một.  Hai!\nBa? Bốn."), "Một. Hai!")
        long = ("chữ " * 200).strip()
        out = v.excerpt(long)
        self.assertLessEqual(len(out), 300)
        self.assertLessEqual(sentences(out), 2)
        self.assertLessEqual(sentences(v.excerpt("A... B. C. D.")), 2)

    def test_lang_mapping(self):
        self.assertEqual([v.review_lang(c) for c in ("vi", "en-US", "zh-Hant", "th", "", None)],
                         ["vi", "en", "zh", "other", "other", "other"])

    def test_upsert_keeps_other_sources_and_is_idempotent(self):
        entry = gv.build_entry(PLACE, TEXT_SEARCH_FIXTURE, "2026-11-27T10:00:00+07:00")
        new = v.google_review_rows(PLACE["place_id"], entry)
        self.assertEqual(len(new), 1)
        r = new[0]
        self.assertEqual((r["review_id"], r["source"], r["lang"], r["published_at"], r["url"]),
                         (v.review_id("places/ChIJ_pho/reviews/r1"), "google", "en", "2026-10-20",
                          "https://maps.google.com/?cid=123"))
        self.assertEqual(r["text_excerpt"], "Great pho. Fast service.")
        blog = {"review_id": "r_blog0001", "place_id": PLACE["place_id"], "source": "blog", "rating": "",
                "text_excerpt": "Quán quen.", "lang": "vi", "published_at": "2026-10", "url": "https://b",
                "fetched_at": "t"}
        once = v.upsert_reviews([blog], new)
        twice = v.upsert_reviews(once, v.google_review_rows(PLACE["place_id"], entry))
        self.assertEqual(once, twice)
        self.assertEqual(once[0], blog)
        self.assertEqual(len(once), 2)


if __name__ == "__main__":
    unittest.main()
