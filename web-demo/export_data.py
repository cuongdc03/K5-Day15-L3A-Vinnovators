"""Export fetched CSV evidence into the existing static UI, without calling AI.

Run: python web-demo/export_data.py --ref origin/main
Or:  python web-demo/export_data.py --source-dir data/processed
CSV-only exports use final labels. When the fetched integration exists, publish
its recorded AI outputs separately from human labels. Never call a model.
"""
import argparse
import csv
import io
import json
import math
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
TABLES = ("places", "labels", "verification", "photos", "reviews",
          "shopee_place_links", "shopee_menu")
LABELS = {"local", "chain", "tourist", "unsure"}
DISTANCE_ORIGIN = {"name": "VinUni", "lat": 20.9889, "lng": 105.9447,
                   "method": "straight_line_haversine"}
AREAS = {
    "ocean_park_1": {"district": "gia_lam", "name": "Ocean Park 1 · Gia Lâm"},
    "ocean_park_2": {"district": "van_giang", "name": "Ocean Park 2 · Hưng Yên"},
}
CATEGORIES = {"restaurant": "Quán ăn", "cafe": "Cà phê / trà",
              "fast_food": "Đồ ăn nhanh", "street_food": "Ăn vặt",
              "bakery": "Tiệm bánh", "other": "Địa điểm ăn uống"}
CUISINES = {"mon_viet": "Món Việt", "mon_bac": "Món Bắc", "mon_nam": "Món Nam",
            "mon_mien_trung": "Món miền Trung", "vietnamese": "Món Việt",
            "pho": "Phở", "bun_cha": "Bún chả", "coffee": "Cà phê"}


def safe_url(value):
    value = (value or "").strip()
    try:
        parsed = urlsplit(value)
        return value if parsed.scheme in {"https", "http"} and parsed.hostname and not parsed.username and not parsed.password else ""
    except ValueError:
        return ""


def positive_number(value):
    try:
        number = float(value)
        return number if math.isfinite(number) and number > 0 else None
    except (TypeError, ValueError):
        return None


def valid_coordinates(lat, lng):
    return (isinstance(lat, (int, float)) and not isinstance(lat, bool)
            and isinstance(lng, (int, float)) and not isinstance(lng, bool)
            and math.isfinite(lat) and math.isfinite(lng)
            and 20.8 <= lat <= 21.3 and 105.6 <= lng <= 106.1)


def distance_m(lat, lng):
    if not valid_coordinates(lat, lng):
        return None
    a, b, c, d = map(math.radians, [DISTANCE_ORIGIN["lat"], DISTANCE_ORIGIN["lng"], lat, lng])
    h = math.sin((c-a)/2)**2 + math.cos(a)*math.cos(c)*math.sin((d-b)/2)**2
    return round(6371000 * 2 * math.asin(math.sqrt(min(1, h))))


def read_tables(ref=None, source_dir=None):
    tables = {}
    for name in TABLES:
        if source_dir is not None:
            path = Path(source_dir) / (name + ".csv")
            if not path.exists() and name not in {"places", "labels"}:
                tables[name] = []
                continue
            text = path.read_text(encoding="utf-8-sig")
        else:
            result = subprocess.run(["git", "show", f"{ref}:data/processed/{name}.csv"],
                                    cwd=ROOT, capture_output=True)
            if result.returncode:
                if name in {"places", "labels"}:
                    raise ValueError(f"Không đọc được {name}.csv từ {ref}. Hãy git fetch origin trước.")
                tables[name] = []
                continue
            text = result.stdout.decode("utf-8-sig")
        tables[name] = list(csv.DictReader(io.StringIO(text)))
    return tables


def export_payload(tables, provenance):
    rows = tables["places"]
    ids = [p["place_id"] for p in rows]
    if not ids or len(ids) != len(set(ids)):
        raise ValueError("places.csv rỗng hoặc trùng place_id")
    known_ids = set(ids)
    final, supporting = {}, defaultdict(list)
    for label in tables["labels"]:
        pid = label["place_id"]
        if pid not in known_ids:
            raise ValueError(f"Nhãn tham chiếu quán không có: {pid}")
        supporting[pid].append(label)
        if label["labeler"] == "final":
            if label["label"] not in LABELS:
                raise ValueError(f"Nhãn không hợp lệ: {pid}")
            if pid not in final or label.get("labeled_at", "") > final[pid].get("labeled_at", ""):
                final[pid] = label
    verification = {r["place_id"]: r for r in tables.get("verification", [])}
    photos, reviews, menus, linked_stores = (defaultdict(list) for _ in range(4))
    for photo in tables.get("photos", []):
        if safe_url(photo.get("ref")):
            photos[photo["place_id"]].append(photo)
    for review in tables.get("reviews", []):
        if review.get("text_excerpt") and safe_url(review.get("url")):
            reviews[review["place_id"]].append(review)
    for menu in tables.get("shopee_menu", []):
        menus[menu["store_id"]].append(menu)
    for link in tables.get("shopee_place_links", []):
        # Only the upstream exact, unambiguous store/place joins are admitted.
        if link.get("place_id") in known_ids and link.get("match_method") == "exact_url_slug":
            linked_stores[link["place_id"]].append(link["store_id"])

    places = []
    for raw in rows:
        pid = raw["place_id"]
        lat, lng = float(raw["lat"]), float(raw["lng"])
        if not (math.isfinite(lat) and math.isfinite(lng) and 20.8 <= lat <= 21.3 and 105.6 <= lng <= 106.1):
            raise ValueError(f"Toạ độ không hợp lệ: {pid}")
        area = raw.get("area", "")
        if area not in AREAS:
            raise ValueError(f"Chưa có cấu hình vùng: {area}")
        label = final.get(pid)
        reason = "Chưa có nhãn đã chốt cho địa điểm này; cần bổ sung căn cứ trước khi phân loại."
        if label:
            reason = label["reason"]
            if reason.startswith("L1 và L2 cùng nhãn"):
                detail = next((r["reason"] for r in supporting[pid] if r["labeler"] == "L2"), "")
                detail = re.sub(r"^Nhãn nháp L2(?: của Đức)?(?: \([^)]*\))?:\s*", "", detail)
                reason = detail or reason
        sources = []
        if safe_url(raw.get("foody_url")):
            sources.append({"source": "Trang thông tin Foody", "url": raw["foody_url"]})
        osm_id = raw.get("osm_id", "")
        if re.fullmatch(r"(?:node|way|relation)/\d+", osm_id):
            sources.append({"source": "OpenStreetMap", "url": "https://www.openstreetmap.org/" + osm_id})
        sources.append({"source": "Tìm vị trí trên Google Maps (chưa xác minh)",
                        "url": f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"})
        if label:
            for url in re.findall(r"https?://[^\s)]+", label["reason"]):
                if safe_url(url):
                    sources.append({"source": "Nguồn kèm nhãn đã chốt", "url": url.rstrip(".,;")})
        menu_rows = [m for store in dict.fromkeys(linked_stores[pid]) for m in menus[store]]
        online_menu = [{"name": m["item_name"], "group": m.get("menu_group", ""),
                        "price_vnd": positive_number(m.get("online_price_vnd")),
                        "original_price_vnd": positive_number(m.get("original_price_vnd")),
                        "description": m.get("description", ""),
                        "url": safe_url(m.get("source_url")), "fetched_at": m.get("fetched_at", "")}
                       for m in menu_rows if m.get("item_name")]
        signals = [{"key": "Nguồn dữ liệu", "value": raw.get("sources", "")},
                   {"key": "Kiểm hoạt động", "value": "Chưa xác minh" if verification.get(pid, {}).get("auto_status", "unverified") == "unverified" else verification[pid]["auto_status"]},
                   {"key": "Review đã thu", "value": str(len(reviews[pid]))}]
        photo = photos[pid][0] if photos[pid] else None
        places.append({
            "place_id": pid, "name": raw["name"], "district": AREAS[area]["district"], "area": area,
            "address": raw.get("address_text", ""), "lat": lat, "lng": lng,
            "dish": " · ".join(CUISINES.get(tag, tag.replace("_", " ")) for tag in raw.get("cuisine", "").split(";") if tag) or CATEGORIES.get(raw.get("category"), "Địa điểm ăn uống"),
            "price_min_k": positive_number(raw.get("price_min_k")),
            "price_max_k": positive_number(raw.get("price_max_k")),
            "hours_text": raw.get("hours_text", ""),
            "label": label["label"] if label else "unsure", "reason": reason,
            "confidence": None, "label_source": "final" if label else "unclassified",
            "labeled_at": label.get("labeled_at", "") if label else "",
            "signals": signals, "source_links": sources,
            "review_links": [{"source": r["source"], "lang": r["lang"], "published_at": r.get("published_at", ""),
                              "text_excerpt": r["text_excerpt"], "url": safe_url(r["url"])} for r in reviews[pid][:5]],
            "photo_url": safe_url(photo["ref"]) if photo else "",
            "photo_source": photo["source"] if photo else "",
            "online_menu": online_menu, "fetched_at": raw.get("fetched_at", ""),
        })
    places.sort(key=lambda p: p["place_id"])
    area_counts = Counter(p["area"] for p in places)
    return {"meta": {
        "schema_version": 1, **provenance, "place_count": len(places),
        "final_label_count": len(final), "review_count": sum(len(r) for r in reviews.values()),
        "linked_menu_place_count": sum(bool(p["online_menu"]) for p in places),
        "areas": [{"key": k, **v, "count": area_counts[k]} for k, v in AREAS.items() if area_counts[k]],
        "notice": "Dữ liệu công khai chưa kiểm thực địa. Chỉ dùng nhãn final đã chốt; giá và độ chắc còn thiếu được để trống.",
    }, "places": places}


def read_integration(ref, folder=None):
    """Read public, already-generated JSON; do not import or execute CP4 code."""
    result = {}
    for name in ("places_live", "menus_live", "live_manifest"):
        if folder is not None:
            path = Path(folder) / (name + ".json")
            if not path.exists():
                return None
            content = path.read_text(encoding="utf-8-sig")
        else:
            blob = subprocess.run(["git", "show", f"{ref}:web-demo/data/{name}.json"],
                                  cwd=ROOT, capture_output=True)
            if blob.returncode:
                return None
            content = blob.stdout.decode("utf-8-sig")
        result[name] = json.loads(content)
    if folder is not None:
        location_file = Path(folder) / "shopee_locations.json"
        if location_file.exists():
            result["shopee_locations"] = json.loads(location_file.read_text(encoding="utf-8-sig"))
    else:
        location_blob = subprocess.run(["git", "show", f"{ref}:data/processed/shopee_locations.json"],
                                       cwd=ROOT, capture_output=True)
        if location_blob.returncode == 0:
            result["shopee_locations"] = json.loads(location_blob.stdout.decode("utf-8-sig"))
    return result


def integrate_payload(base, integration, exact_links):
    """Join by place_id, keeping source AI and human decisions distinguishable."""
    recorded = integration["places_live"]
    catalog = integration["menus_live"]
    manifest = integration["live_manifest"]
    known = {p["place_id"]: p for p in base["places"]}
    ids = [p["place_id"] for p in recorded]
    excluded = manifest.get("excluded", [])
    excluded_ids = {p["place_id"] for p in excluded}
    existing_ids = set(ids) & known.keys()
    additional_ids = set(ids) - known.keys()
    if (len(ids) != len(set(ids))
            or set(ids) & excluded_ids or existing_ids | excluded_ids != known.keys()
            or manifest.get("mapped_places") != len(ids)
            or manifest.get("source_places") != len(known)):
        raise ValueError("Danh sách tích hợp không khớp ID và danh sách loại trừ nguồn")
    location_rows = integration.get("shopee_locations", [])
    locations = {row["store_id"]: row for row in location_rows}
    if len(locations) != len(location_rows):
        raise ValueError("Nguồn tọa độ trùng store_id")
    links = {(r["store_id"], r["place_id"]) for r in exact_links
             if r.get("match_method") == "exact_url_slug" and r.get("place_id") in ids}
    store_ids = [s["store_id"] for s in catalog]
    if len(store_ids) != len(set(store_ids)):
        raise ValueError("Danh mục menu trùng store_id")
    clean_catalog, by_place = [], defaultdict(list)
    for store in catalog:
        pid = store.get("place_id", "")
        if pid and (store["store_id"], pid) not in links:
            raise ValueError("Menu chưa có liên kết slug chính xác: " + store["store_id"])
        geo = locations.get(store["store_id"], {})
        has_location = valid_coordinates(geo.get("lat"), geo.get("lng"))
        if has_location and (not str(geo.get("coordinate_source", "")).startswith("ShopeeFood public store metadata")
                             or not safe_url(geo.get("source_url")) or not geo.get("fetched_at")):
            raise ValueError("Tọa độ ShopeeFood thiếu nguồn và thời điểm: " + store["store_id"])
        new_pid = "shopee_" + store["store_id"]
        if not pid and new_pid in additional_ids:
            if not has_location:
                raise ValueError("Quán mới thiếu tọa độ ShopeeFood có nguồn: " + new_pid)
            pid = new_pid
        items = [{"name": item["name"], "group": item.get("group", ""),
                  "description": item.get("description", ""),
                  "online_price_vnd": positive_number(item.get("online_price_vnd")),
                  "original_price_vnd": positive_number(item.get("original_price_vnd")),
                  "source_url": safe_url(item.get("source_url")),
                  "fetched_at": item.get("fetched_at", "")} for item in store["items"]]
        entry = {"store_id": store["store_id"], "place_id": pid, "name": store["name"],
                 "address": store.get("address", ""), "complete": store.get("complete") is True,
                 "source_url": safe_url(store.get("source_url")),
                 "map_search_url": safe_url(store.get("map_search_url")), "items": items,
                 "district": known[pid]["district"] if pid in known else ""}
        if has_location:
            if store.get("lat") != geo["lat"] or store.get("lng") != geo["lng"]:
                raise ValueError("Tọa độ menu khác metadata ShopeeFood: " + store["store_id"])
            entry.update(lat=geo["lat"], lng=geo["lng"], distance_m=distance_m(geo["lat"], geo["lng"]),
                         distance_origin=DISTANCE_ORIGIN, coordinate_source=geo["coordinate_source"],
                         coordinate_fetched_at=geo["fetched_at"], original_source_url=safe_url(store.get("original_source_url")))
        if pid in additional_ids:
            ai = next((row for row in recorded if row["place_id"] == pid), None)
            if not ai or ai.get("store_id") != store["store_id"] or not has_location:
                raise ValueError("Quán mới không khớp cửa hàng nguồn: " + pid)
            if ai.get("district") not in {"gia_lam", "van_giang"}:
                raise ValueError("Quán mới thiếu vùng hợp lệ: " + pid)
            entry["district"] = ai["district"]
            known[pid] = {
                "place_id": pid, "store_id": store["store_id"], "name": entry["name"],
                "district": entry["district"], "area": "ocean_park_2" if entry["district"] == "van_giang" else "ocean_park_1",
                "address": entry["address"], "lat": geo["lat"], "lng": geo["lng"],
                "dish": "Quán ăn · ShopeeFood", "price_min_k": None, "price_max_k": None,
                "hours_text": "", "label": "unsure", "label_source": "unclassified", "labeled_at": "",
                "reason": "Chưa có kết quả AI đã lưu cho địa điểm này.",
                "signals": [{"key": "Nguồn quán", "value": "ShopeeFood"}], "review_links": [],
                "source_links": [{"source": "ShopeeFood · menu & giá online", "url": entry["source_url"]},
                                 {"source": "Tìm vị trí trên Google Maps (chưa xác minh)",
                                  "url": f"https://www.google.com/maps/search/?api=1&query={geo['lat']},{geo['lng']}"}],
                "photo_url": "", "photo_source": "", "fetched_at": geo["fetched_at"],
            }
        clean_catalog.append(entry)
        if pid:
            by_place[pid].append(entry)
    menu_rows = sum(len(s["items"]) for s in clean_catalog)
    if manifest.get("menu_stores") != len(clean_catalog) or manifest.get("menu_rows") != menu_rows:
        raise ValueError("Số quán/menu không khớp manifest nguồn")
    if not additional_ids <= known.keys():
        raise ValueError("Có ID mới chưa được đối chiếu với cửa hàng ShopeeFood")

    places = []
    for ai in recorded:
        p = dict(known[ai["place_id"]])
        p["source_links"] = list(p["source_links"])
        store = next(iter(by_place[p["place_id"]]), None)
        if ai.get("lat") != p["lat"] or ai.get("lng") != p["lng"]:
            if not store or "lat" not in store or ai.get("lat") != store["lat"] or ai.get("lng") != store["lng"]:
                raise ValueError("Toạ độ tích hợp khác dữ liệu nguồn: " + p["place_id"])
            p["original_location"] = {"lat": p["lat"], "lng": p["lng"], "source": "places.csv"}
            p.update(lat=store["lat"], lng=store["lng"])
        if not valid_coordinates(p["lat"], p["lng"]):
            raise ValueError("Tọa độ không hợp lệ: " + p["place_id"])
        if store and "lat" in store:
            p.update(store_id=store["store_id"], coordinate_source=store["coordinate_source"],
                     coordinate_fetched_at=store["coordinate_fetched_at"])
        human = {"label": p["label"], "reason": p["reason"], "labeled_at": p["labeled_at"]} if p["label_source"] == "final" else None
        evaluated = ai.get("evaluated") is True
        confidence = ai.get("confidence")
        if evaluated and (ai.get("label") not in LABELS or not ai.get("model") or not ai.get("run_id")
                          or str(ai["model"]).lower() in {"fake", "mock", "stub"}
                          or isinstance(confidence, bool) or not isinstance(confidence, (int, float))
                          or not math.isfinite(confidence) or not 0 <= confidence <= 100):
            raise ValueError("Kết quả AI thiếu nguồn chạy hợp lệ: " + p["place_id"])
        p.update(label=ai["label"] if evaluated else "unsure",
                 confidence=confidence if evaluated else None,
                 reason=ai["reason"] if evaluated else "Chưa có kết quả AI đã lưu cho địa điểm này; cần kiểm tra thêm căn cứ.",
                 label_source="recorded_ai" if evaluated else "unclassified",
                 evaluated=evaluated, model=ai.get("model", "") if evaluated else "",
                 run_id=ai.get("run_id", "") if evaluated else "", human_label=human)
        if evaluated:
            p["signals"] = [{**s, "url": safe_url(s.get("url"))} for s in ai.get("signals", [])]
            for s in p["signals"]:
                if s.get("url"):
                    p["source_links"].append({"source": s["key"], "url": s["url"]})
        p["menu_store_ids"] = [s["store_id"] for s in by_place[p["place_id"]]]
        p["shopee_source_urls"] = [s["source_url"] for s in by_place[p["place_id"]] if s["source_url"]]
        p["source_links"].extend({"source": "ShopeeFood · menu & giá online", "url": url}
                                 for url in p["shopee_source_urls"])
        p["source_links"] = list({link["url"]: link for link in p["source_links"]}.values())
        p["online_menu"] = [{"name": item["name"], "group": item["group"],
                              "description": item["description"], "price_vnd": item["online_price_vnd"],
                              "original_price_vnd": item["original_price_vnd"], "url": item["source_url"],
                              "fetched_at": item["fetched_at"]}
                             for store in by_place[p["place_id"]] for item in store["items"]]
        online_prices = [item["price_vnd"] for item in p["online_menu"] if item["price_vnd"] is not None]
        p.update(online_price_min_vnd=min(online_prices) if online_prices else None,
                 online_price_max_vnd=max(online_prices) if online_prices else None,
                 distance_m=distance_m(p["lat"], p["lng"]), distance_origin=DISTANCE_ORIGIN)
        places.append(p)
    places.sort(key=lambda p: p["place_id"])
    evaluated_count = sum(p["evaluated"] for p in places)
    if evaluated_count != manifest.get("evaluated_places"):
        raise ValueError("Số địa điểm có kết quả AI không khớp manifest")
    meta = dict(base["meta"])
    area_counts = Counter(p["area"] for p in places)
    meta.update(place_count=len(places), source_place_count=manifest["source_places"], excluded=excluded,
                final_label_count=sum(p["human_label"] is not None for p in places),
                evaluated_place_count=evaluated_count, menu_store_count=len(clean_catalog), menu_row_count=menu_rows,
                linked_menu_place_count=sum(bool(p["menu_store_ids"]) for p in places), run_sources=manifest.get("run_sources", []),
                labels=dict(Counter(p["label"] for p in places)),
                shopee_place_count=sum(bool(p["menu_store_ids"]) for p in places), distance_origin=DISTANCE_ORIGIN,
                notice="Tọa độ ShopeeFood có nguồn và thời điểm thu thập. Giá online và giá tại quán được giữ riêng; kết quả AI và nhãn nhóm duyệt là hai thông tin độc lập.")
    meta["areas"] = [{**area, "count": area_counts[area["key"]]} for area in meta["areas"]]
    return {"meta": meta, "places": places}, clean_catalog


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--ref", default=None)
    source.add_argument("--source-dir", type=Path)
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("data") / "places_live.json")
    parser.add_argument("--integration-dir", type=Path, help="Public CP4 JSON directory (optional for local CSV exports)")
    args = parser.parse_args()
    ref = args.ref or "origin/main"
    provenance = {"source": str(args.source_dir)} if args.source_dir else {
        "source": ref,
        "source_commit": subprocess.check_output(["git", "rev-parse", ref], cwd=ROOT, text=True).strip(),
    }
    tables = read_tables(ref, args.source_dir)
    payload = export_payload(tables, provenance)
    integration = read_integration(ref, args.integration_dir) if args.integration_dir or not args.source_dir else None
    if integration:
        payload, catalog = integrate_payload(payload, integration, tables.get("shopee_place_links", []))
    else:
        catalog = None
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if catalog is not None:
        args.output.with_name("menus_live.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        args.output.with_name("live_manifest.json").write_text(json.dumps({**integration["live_manifest"], **provenance}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload["meta"], ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
