"""Evidence join and unknown-value regressions for the UI data exporter."""
import copy
import unittest

from export_data import export_payload, integrate_payload


def fixture():
    return {
        "places": [{"place_id": "p_one", "name": "Quán mẫu", "district": "gia_lam",
                    "area": "ocean_park_1", "lat": "20.99", "lng": "105.94",
                    "category": "restaurant", "price_min_k": "", "price_max_k": "",
                    "sources": "osm", "osm_id": "node/123", "fetched_at": "2026-11-27"}],
        "labels": [{"place_id": "p_one", "labeler": "L2", "label": "local",
                    "reason": "Nhãn nháp", "labeled_at": "2026-11-27"}],
    }


class ExportDataTests(unittest.TestCase):
    def test_draft_label_does_not_become_final_or_ai_confidence(self):
        payload = export_payload(fixture(), {})
        place = payload["places"][0]
        self.assertEqual(place["label"], "unsure")
        self.assertEqual(place["label_source"], "unclassified")
        self.assertIsNone(place["confidence"])
        self.assertIsNone(place["price_min_k"])
        self.assertIsNone(place["price_max_k"])
        self.assertEqual(place["review_links"], [])

    def test_final_label_published_without_inventing_probability(self):
        data = fixture()
        data["labels"].append({"place_id": "p_one", "labeler": "final", "label": "chain",
                               "reason": "Nguồn đã được nhóm duyệt", "labeled_at": "2026-11-28"})
        payload = export_payload(data, {"source_commit": "test"})
        self.assertEqual(payload["places"][0]["label"], "chain")
        self.assertEqual(payload["places"][0]["reason"], "Nguồn đã được nhóm duyệt")
        self.assertIsNone(payload["places"][0]["confidence"])
        self.assertEqual(payload["meta"]["final_label_count"], 1)

    def test_only_exact_menu_join_and_no_online_price_as_meal_price(self):
        data = fixture()
        data["shopee_menu"] = [
            {"store_id": "s_ok", "item_name": "Bún", "online_price_vnd": "40000", "source_url": "https://example.org/menu"},
            {"store_id": "s_bad", "item_name": "Sai quán", "online_price_vnd": "1000"},
        ]
        data["shopee_place_links"] = [
            {"place_id": "p_one", "store_id": "s_ok", "match_method": "exact_url_slug"},
            {"place_id": "p_one", "store_id": "s_bad", "match_method": "unmatched"},
        ]
        place = export_payload(data, {})["places"][0]
        self.assertEqual([m["name"] for m in place["online_menu"]], ["Bún"])
        self.assertIsNone(place["price_min_k"])
        self.assertIsNone(place["price_max_k"])

    def test_invalid_photo_and_missing_review_url_not_published(self):
        data = fixture()
        data["photos"] = [{"place_id": "p_one", "ref": "javascript:alert(1)", "source": "other"}]
        data["reviews"] = [{"place_id": "p_one", "text_excerpt": "Không có nguồn"}]
        place = export_payload(data, {})["places"][0]
        self.assertEqual(place["photo_url"], "")
        self.assertEqual(place["review_links"], [])

    def test_duplicate_ids_and_invalid_coordinates_fail(self):
        data = fixture()
        data["places"].append(copy.deepcopy(data["places"][0]))
        with self.assertRaises(ValueError):
            export_payload(data, {})
        data = fixture()
        data["places"][0]["lat"] = "nan"
        with self.assertRaises(ValueError):
            export_payload(data, {})

    def test_op2_keeps_its_own_region_and_coordinates(self):
        data = fixture()
        data["places"][0].update(area="ocean_park_2", district="van_giang", lat="20.95", lng="105.98")
        payload = export_payload(data, {})
        self.assertEqual(payload["places"][0]["district"], "van_giang")
        self.assertEqual(payload["places"][0]["lat"], 20.95)
        self.assertEqual(payload["meta"]["areas"][0]["name"], "Ocean Park 2 · Hưng Yên")


class IntegrationTests(unittest.TestCase):
    def setUp(self):
        data = fixture()
        data["labels"].append({"place_id": "p_one", "labeler": "final", "label": "local",
                               "reason": "Nhãn đối chiếu đã chốt", "labeled_at": "2026-11-28"})
        self.base = export_payload(data, {})
        self.integration = {
            "places_live": [{"place_id": "p_one", "lat": 20.99, "lng": 105.94, "label": "unsure",
                             "reason": "Chưa đủ review", "evaluated": True, "confidence": 49,
                             "model": "recorded-provider", "run_id": "run-3@fixture", "signals": []}],
            "menus_live": [],
            "live_manifest": {"source_places": 1, "mapped_places": 1, "excluded": [],
                              "evaluated_places": 1, "menu_stores": 0, "menu_rows": 0},
        }

    def test_recorded_ai_and_human_labels_remain_distinct(self):
        payload, _ = integrate_payload(self.base, self.integration, [])
        p = payload["places"][0]
        self.assertEqual((p["label"], p["confidence"], p["label_source"]), ("unsure", 49, "recorded_ai"))
        self.assertEqual(p["human_label"]["label"], "local")
        self.assertEqual(p["run_id"], "run-3@fixture")
        self.assertEqual(self.base["places"][0]["label"], "local")

    def test_human_label_is_not_published_as_ai_for_unevaluated_place(self):
        self.integration["places_live"][0].update(evaluated=False, confidence=99, label="local")
        self.integration["live_manifest"]["evaluated_places"] = 0
        payload, _ = integrate_payload(self.base, self.integration, [])
        p = payload["places"][0]
        self.assertEqual(p["label"], "unsure")
        self.assertIsNone(p["confidence"])
        self.assertEqual(p["human_label"]["label"], "local")
        self.assertEqual(p["model"], "")

    def test_only_explicit_exclusions_can_remove_places(self):
        self.integration["places_live"] = []
        self.integration["live_manifest"].update(mapped_places=0, evaluated_places=0)
        with self.assertRaises(ValueError):
            integrate_payload(self.base, self.integration, [])
        self.integration["live_manifest"]["excluded"] = [{"place_id": "p_one", "reason": "Explicit source exclusion"}]
        payload, _ = integrate_payload(self.base, self.integration, [])
        self.assertEqual(payload["places"], [])

    def test_full_catalog_keeps_unmatched_stores_without_inventing_pins(self):
        item = {"name": "Món theo nguồn", "online_price_vnd": 35000, "original_price_vnd": 40000}
        self.integration["menus_live"] = [
            {"store_id": "linked", "place_id": "p_one", "name": "Quán khớp", "items": [item]},
            {"store_id": "unmatched", "place_id": "", "name": "Chưa khớp", "items": [item]},
        ]
        self.integration["live_manifest"].update(menu_stores=2, menu_rows=2)
        links = [{"store_id": "linked", "place_id": "p_one", "match_method": "exact_url_slug"}]
        payload, catalog = integrate_payload(self.base, self.integration, links)
        self.assertEqual(len(payload["places"]), 1)
        self.assertEqual(len(catalog), 2)
        self.assertEqual(catalog[1]["place_id"], "")
        self.assertNotIn("lat", catalog[1])
        self.assertEqual(payload["meta"]["linked_menu_place_count"], 1)
        self.assertEqual(payload["places"][0]["online_menu"][0]["original_price_vnd"], 40000)
        self.assertIsNone(payload["places"][0]["price_min_k"])
        with self.assertRaises(ValueError):
            integrate_payload(self.base, self.integration, [])

    def test_fake_outputs_or_missing_run_provenance_are_rejected(self):
        for change in [{"model": "fake"}, {"run_id": ""}, {"confidence": float('nan')}]:
            data = copy.deepcopy(self.integration)
            data["places_live"][0].update(change)
            with self.assertRaises(ValueError):
                integrate_payload(self.base, data, [])

    def add_sourced_store(self):
        geo = {"store_id": "sf_new", "name": "Quán ShopeeFood", "lat": 20.991, "lng": 105.945,
               "source_url": "https://shopeefood.vn/ha-noi/quan-moi", "fetched_at": "2026-11-28",
               "coordinate_source": "ShopeeFood public store metadata"}
        self.integration["shopee_locations"] = [geo]
        self.integration["menus_live"] = [{**geo, "place_id": "", "items": [
            {"name": "Món có nguồn", "online_price_vnd": 35000}]}]
        self.integration["places_live"].append({"place_id": "shopee_sf_new", "store_id": "sf_new",
            "lat": geo["lat"], "lng": geo["lng"], "district": "gia_lam", "evaluated": False})
        self.integration["live_manifest"].update(mapped_places=2, menu_stores=1, menu_rows=1)

    def test_sourced_shopee_coordinates_add_a_real_pin_and_catalog_link(self):
        self.add_sourced_store()
        payload, catalog = integrate_payload(self.base, self.integration, [])
        p = next(p for p in payload["places"] if p["place_id"] == "shopee_sf_new")
        self.assertEqual((p["lat"], p["lng"]), (20.991, 105.945))
        self.assertEqual(catalog[0]["place_id"], p["place_id"])
        self.assertEqual(p["coordinate_source"], "ShopeeFood public store metadata")
        self.assertIsNone(p["price_min_k"])
        self.assertEqual(p["online_price_min_vnd"], 35000)
        self.assertFalse(p["evaluated"])
        self.assertGreater(p["distance_m"], 0)
        self.assertEqual(payload["meta"]["source_place_count"], 1)

    def test_new_pin_cannot_be_added_without_coordinate_provenance(self):
        self.add_sourced_store()
        self.integration["shopee_locations"][0]["coordinate_source"] = "guessed"
        with self.assertRaises(ValueError):
            integrate_payload(self.base, self.integration, [])
        self.integration.pop("shopee_locations")
        with self.assertRaises(ValueError):
            integrate_payload(self.base, self.integration, [])

    def test_mismatched_store_coordinates_and_orphan_ids_are_rejected(self):
        self.add_sourced_store()
        self.integration["menus_live"][0]["lat"] += .001
        with self.assertRaises(ValueError):
            integrate_payload(self.base, self.integration, [])
        self.integration["menus_live"][0]["lat"] -= .001
        self.integration["places_live"][-1]["place_id"] = "shopee_orphan"
        with self.assertRaises(ValueError):
            integrate_payload(self.base, self.integration, [])

    def test_existing_coordinate_update_requires_exact_source_and_keeps_original(self):
        self.add_sourced_store()
        self.integration["places_live"].pop()
        self.integration["places_live"][0].update(lat=20.991, lng=105.945)
        self.integration["menus_live"][0]["place_id"] = "p_one"
        self.integration["live_manifest"]["mapped_places"] = 1
        links = [{"store_id": "sf_new", "place_id": "p_one", "match_method": "exact_url_slug"}]
        payload, _ = integrate_payload(self.base, self.integration, links)
        self.assertEqual(payload["places"][0]["original_location"]["lat"], 20.99)
        self.assertEqual(payload["places"][0]["lat"], 20.991)


if __name__ == "__main__":
    unittest.main()
