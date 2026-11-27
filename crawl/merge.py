"""Gộp các nguồn đã crawl → data/processed/places.csv (đúng schema ở data/SCHEMA.md).

Chạy:  python crawl/merge.py
Đọc data/raw/osm.json, google.json, foody.json, field_places.json (file nào thiếu thì bỏ qua)
và data/processed/field_visits.csv (lần đến mới nhất ghi đè giá, giờ mở).

Gộp trùng: hai bản ghi là một quán khi cách nhau ≤ MATCH_DIST_M và tên khớp (sau khi bỏ dấu, bỏ phần
" - Ocean Park…" của Foody và bỏ các từ chung như "quán", "vinhomes"). Ưu tiên giá trị: Google > OSM > Foody.
place_id giữ nguyên qua các lần chạy: nếu một khoá nguồn (osm_id, google_place_id, foody_url) đã có
trong places.csv cũ thì dùng lại id cũ, để form thực địa và nhãn không bị lệch.
Danh sách cặp đã gộp ghi ra data/raw/merge_report.txt để kiểm tay.
"""
import csv
import json
import re

from common import PROCESSED_DIR, RAW_DIR, haversine_m, make_place_id, name_norm, now_iso, slug

PLACES_CSV = PROCESSED_DIR / "places.csv"
VISITS_CSV = PROCESSED_DIR / "field_visits.csv"
COLS = ["place_id", "osm_id", "google_place_id", "name", "name_norm", "district", "address_text", "lat", "lng",
        "category", "cuisine", "price_level", "price_min_k", "price_max_k", "rating", "rating_count",
        "hours_text", "brand", "brand_wikidata", "sources", "fetched_at", "area", "foody_url"]
MATCH_DIST_M = 100
SAME_SOURCE_DIST_M = 60
STOP = {"quan", "nha", "hang", "tiem", "cua", "vinhomes", "vinhome", "vin", "ocean", "park", "op", "op1", "op2",
        "kdt", "khu", "do", "thi", "vincom", "mega", "mall", "the", "empire", "gia", "lam", "van", "giang",
        "hung", "yen", "ha", "noi", "chi", "nhanh", "cs", "co", "so", "shop", "store", "and", "va", "1", "2", "3"}
PRICE_LEVEL = {"PRICE_LEVEL_FREE": 0, "PRICE_LEVEL_INEXPENSIVE": 1, "PRICE_LEVEL_MODERATE": 2,
               "PRICE_LEVEL_EXPENSIVE": 3, "PRICE_LEVEL_VERY_EXPENSIVE": 4}
OSM_CATEGORY = {"restaurant": "restaurant", "cafe": "cafe", "fast_food": "fast_food", "food_court": "street_food",
                "ice_cream": "cafe", "bakery": "bakery", "pastry": "bakery", "confectionery": "bakery"}


def load_json(name):
    p = RAW_DIR / name
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []


def base_name(name):
    """Bỏ phần đuôi chi nhánh kiểu 'Gà Rán KFC - KĐT Vinhomes Ocean Park' → 'Gà Rán KFC'."""
    return re.split(r"\s+[-–|]\s+", name or "", maxsplit=1)[0].strip() or (name or "").strip()


def tokens(name):
    return {t for t in name_norm(base_name(name)).split() if t not in STOP}


def names_match(a, b):
    na, nb = name_norm(base_name(a)), name_norm(base_name(b))
    if not na or not nb:
        return False
    if na == nb or (min(len(na), len(nb)) >= 5 and (na in nb or nb in na)):
        return True
    ta, tb = tokens(a), tokens(b)
    return bool(ta and tb) and len(ta & tb) / len(ta | tb) >= 0.5


def google_category(p):
    t = p.get("primaryType") or ""
    if t in ("fast_food_restaurant", "meal_takeaway"):
        return "fast_food"
    if t in ("cafe", "coffee_shop", "tea_house", "dessert_shop", "ice_cream_shop", "juice_shop"):
        return "cafe"
    if t == "bakery":
        return "bakery"
    if t.endswith("restaurant") or t == "food_court":
        return "restaurant"
    return "other"


def records():
    """Chuyển từng nguồn về cùng dạng bản ghi."""
    out = []
    for p in load_json("google.json"):
        pr = p.get("priceRange") or {}
        lo, hi = (pr.get("startPrice") or {}).get("units"), (pr.get("endPrice") or {}).get("units")
        out.append({"src": "google", "key": ("google_place_id", p["id"]),
                    "name": (p.get("displayName") or {}).get("text", ""),
                    "lat": p["location"]["latitude"], "lng": p["location"]["longitude"],
                    "area": p["area"], "district": p["district"], "fetched_at": p["fetched_at"],
                    "address_text": p.get("formattedAddress", ""), "category": google_category(p),
                    "price_level": PRICE_LEVEL.get(p.get("priceLevel", ""), ""),
                    "price_min_k": int(lo) // 1000 if lo else "", "price_max_k": int(hi) // 1000 if hi else "",
                    "rating": p.get("rating", ""), "rating_count": p.get("userRatingCount", ""),
                    "hours_text": " | ".join((p.get("regularOpeningHours") or {}).get("weekdayDescriptions", []))})
    for p in load_json("osm.json"):
        t = p["tags"]
        if not t.get("name"):
            continue  # điểm không tên không đi kiểm được và không ghép được
        addr = " ".join(filter(None, [t.get("addr:housenumber"), t.get("addr:street")]))
        out.append({"src": "osm", "key": ("osm_id", p["osm_id"]), "name": t["name"],
                    "lat": p["lat"], "lng": p["lng"], "area": p["area"], "district": p["district"],
                    "fetched_at": p["fetched_at"], "address_text": addr,
                    "category": OSM_CATEGORY.get(t.get("amenity") or t.get("shop"), "other"),
                    "cuisine": t.get("cuisine", ""), "hours_text": t.get("opening_hours", ""),
                    "brand": t.get("brand", ""), "brand_wikidata": t.get("brand:wikidata", "")})
    for p in load_json("foody.json"):
        out.append({"src": "foody", "key": ("foody_url", p["foody_url"]), "name": base_name(p["name"]),
                    "lat": p["lat"], "lng": p["lng"], "area": p["area"], "district": p["district"],
                    "fetched_at": p["fetched_at"], "address_text": p["address"], "category": p["category"],
                    "cuisine": ";".join(slug(c) for c in p["cuisines"] if c)})
    for p in load_json("field_places.json"):
        out.append({"src": "field", "key": ("field_id", p["place_id"]), "name": p["name"],
                    "lat": p["lat"], "lng": p["lng"], "area": p.get("area", ""), "district": p["district"],
                    "fetched_at": p["created_at"], "address_text": p.get("address_text", ""),
                    "category": p.get("category") or "other", "cuisine": p.get("cuisine", "")})
    return out


def cluster(recs):
    """Ghép bản ghi vào cụm theo thứ tự ưu tiên nguồn (google, osm, foody, field)."""
    clusters, merged_pairs = [], []
    for r in recs:
        best = None
        # Quán đội tự thêm luôn đứng riêng: phiếu kiểm đã trỏ vào id của nó, gộp vào quán khác sẽ làm lệch id.
        for c in ([] if r["src"] == "field" else clusters):
            d = haversine_m(r["lat"], r["lng"], c["lat"], c["lng"])
            if r["src"] in c["srcs"]:
                # Cùng nguồn thường là hai quán khác nhau; trừ khi trùng hẳn tên và đứng sát nhau
                # (Foody hay có hai trang cho cùng một quán).
                ok = d <= SAME_SOURCE_DIST_M and name_norm(base_name(r["name"])) == name_norm(base_name(c["name"]))
            else:
                ok = d <= MATCH_DIST_M and names_match(r["name"], c["name"])
            if ok and (best is None or d < best[1]):
                best = (c, d)
        if best:
            c = best[0]
            c["srcs"].setdefault(r["src"], r)
            merged_pairs.append(f"{best[1]:5.0f} m · {c['name']}  ⇐  {r['name']} ({r['src']})")
        else:
            clusters.append({"name": r["name"], "lat": r["lat"], "lng": r["lng"], "srcs": {r["src"]: r}})
    return clusters, merged_pairs


def previous_ids():
    ids = {}
    if PLACES_CSV.exists():
        with open(PLACES_CSV, newline="", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                for k in ("osm_id", "google_place_id", "foody_url"):
                    if row.get(k):
                        ids[(k, row[k])] = row["place_id"]
    return ids


def latest_visits():
    visits = {}
    if VISITS_CSV.exists():
        with open(VISITS_CSV, newline="", encoding="utf-8-sig") as f:
            for v in csv.DictReader(f):
                if v["place_id"] not in visits or v["visited_at"] > visits[v["place_id"]]["visited_at"]:
                    visits[v["place_id"]] = v
    return visits


def build_row(c, old_ids):
    order = [c["srcs"][s] for s in ("google", "osm", "foody", "field") if s in c["srcs"]]

    def pick(field):
        return next((r[field] for r in order if r.get(field) not in (None, "")), "")

    keys = {r["key"][0]: r["key"][1] for r in order}
    pid = next((old_ids[(k, v)] for k, v in keys.items() if (k, v) in old_ids), None)
    if not pid:
        pid = keys["field_id"] if "field_id" in keys else make_place_id(
            keys.get("osm_id") or keys.get("google_place_id") or "foody/" + keys["foody_url"].rsplit("/", 1)[-1])
    name = pick("name")
    return {"place_id": pid, "osm_id": keys.get("osm_id", ""), "google_place_id": keys.get("google_place_id", ""),
            "name": name, "name_norm": name_norm(name), "district": pick("district"),
            "address_text": pick("address_text"), "lat": round(float(pick("lat")), 7),
            "lng": round(float(pick("lng")), 7), "category": pick("category") or "other", "cuisine": pick("cuisine"),
            "price_level": pick("price_level"), "price_min_k": pick("price_min_k"), "price_max_k": pick("price_max_k"),
            "rating": pick("rating"), "rating_count": pick("rating_count"), "hours_text": pick("hours_text"),
            "brand": pick("brand"), "brand_wikidata": pick("brand_wikidata"),
            "sources": ";".join(s for s in ("osm", "google", "foody", "field") if s in c["srcs"]),
            "fetched_at": max(r["fetched_at"] for r in order), "area": pick("area"),
            "foody_url": keys.get("foody_url", "")}


def main():
    recs = records()
    clusters, merged_pairs = cluster(recs)
    old_ids, visits = previous_ids(), latest_visits()
    rows, used = [], set()
    for c in clusters:
        row = build_row(c, old_ids)
        if row["place_id"] in used:  # va chạm hiếm của 8 ký tự sha1
            row["place_id"] = make_place_id(row["place_id"] + row["name_norm"])
        used.add(row["place_id"])
        v = visits.get(row["place_id"])
        if v:
            for k in ("price_min_k", "price_max_k", "hours_text"):
                if v.get(k):
                    row[k] = v[k]
            if "field" not in row["sources"].split(";"):
                row["sources"] += ";field"
        rows.append(row)
    rows.sort(key=lambda r: (r["area"], r["name_norm"]))
    with open(PLACES_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        w.writerows(rows)
    (RAW_DIR / "merge_report.txt").write_text(
        f"Chạy lúc {now_iso()}\n{len(merged_pairs)} cặp đã gộp (khoảng cách · tên giữ ⇐ tên gộp vào):\n"
        + "\n".join(merged_pairs), encoding="utf-8")
    print(f"{len(recs)} bản ghi → {len(rows)} quán sau khi gộp ({len(merged_pairs)} cặp gộp, xem data/raw/merge_report.txt)")
    for area in sorted({r["area"] for r in rows}):
        sub = [r for r in rows if r["area"] == area]
        by_src = {s: sum(1 for r in sub if s in r["sources"].split(";")) for s in ("osm", "google", "foody", "field")}
        by_cat = {}
        for r in sub:
            by_cat[r["category"]] = by_cat.get(r["category"], 0) + 1
        print(f"  {area}: {len(sub)} quán · theo nguồn {by_src} · theo loại {by_cat}")
    print(f"Đã ghi {PLACES_CSV}")


if __name__ == "__main__":
    main()
