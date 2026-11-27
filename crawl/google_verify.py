"""Đối chiếu từng quán Ocean Park với Google Maps qua Places API (New), Text Search → data/raw/google_verify.json.

Chạy:  python crawl/google_verify.py              (cần GOOGLE_API_KEY trong .env)
       python crawl/google_verify.py --dry-run    (in số lượt gọi dự kiến và SKU, không gọi mạng)
       python crawl/google_verify.py --limit 20   (chỉ chạy 20 quán chưa có kết quả)
       python crawl/google_verify.py --refresh    (gọi lại cả quán đã có kết quả)

Mỗi quán một lượt Text Search: textQuery = tên gốc (bỏ đuôi chi nhánh) + tên khu, locationBias là vòng 300 m quanh
toạ độ của quán, tối đa 5 ứng viên. Chọn ứng viên khớp tên và cách quán ≤150 m, có điểm khớp 0–1.
Chạy lại an toàn: quán đã có trong google_verify.json thì bỏ qua (trừ khi --refresh); file được ghi dần.

Chỉ dùng API chính thức, không cào trang Google Maps. Không tải ảnh: chỉ giữ tên tài nguyên ảnh (photos[].name),
vì điều khoản Maps Platform cấm lưu nội dung. Review giữ nguyên văn ở file thô; khi đưa vào reviews.csv
(crawl/verify.py) chỉ còn đoạn trích ≤2 câu, không có tên người viết.
"""
import argparse
import csv
import json
import os
import sys

from common import PROCESSED_DIR, RAW_DIR, append_crawl_log, haversine_m, http_json, load_env, name_norm, now_iso
from merge import PRICE_LEVEL, base_name, tokens

ENDPOINT = "https://places.googleapis.com/v1/places:searchText"
VERIFY_JSON = RAW_DIR / "google_verify.json"
PLACES_CSV = PROCESSED_DIR / "places.csv"
AREA_LABEL = {"ocean_park_1": "Vinhomes Ocean Park Gia Lâm", "ocean_park_2": "Vinhomes Ocean Park 2 Văn Giang"}
BIAS_RADIUS_M = 300
MAX_RESULTS = 5
MAX_MATCH_DIST_M = 150
MIN_NAME_SCORE = 0.5
NAME_WEIGHT = 0.7  # điểm khớp = 0.7 × điểm tên + 0.3 × độ gần
SAVE_EVERY = 20
MAX_FAILS_IN_ROW = 3

# Trường cần lấy, kèm SKU thấp nhất mà trường đó kích hoạt (theo bảng field mask của Places API (New)).
# Một request tính tiền theo SKU cao nhất trong field mask.
FIELDS = {
    "places.id": "Essentials (IDs Only)",
    "places.displayName": "Pro",
    "places.location": "Pro",
    "places.businessStatus": "Pro",
    "places.googleMapsUri": "Pro",
    "places.photos": "Pro",
    "places.rating": "Enterprise",
    "places.userRatingCount": "Enterprise",
    "places.priceLevel": "Enterprise",
    "places.priceRange": "Enterprise",
    "places.regularOpeningHours.weekdayDescriptions": "Enterprise",
    "places.reviews": "Enterprise + Atmosphere",
}
SKU_ORDER = ["Essentials (IDs Only)", "Pro", "Enterprise", "Enterprise + Atmosphere"]
FIELD_MASK = ",".join(FIELDS)


def sku_for(fields):
    """SKU Text Search mà field mask kích hoạt (SKU cao nhất trong các trường)."""
    return "Text Search " + max((FIELDS[f] for f in fields), key=SKU_ORDER.index)


# ---------- Ghép ứng viên ----------

def name_score(ours, theirs):
    """Độ giống tên 0–1: trùng hẳn 1.0, tên này chứa tên kia 0.9, còn lại Jaccard của từ (bỏ từ chung)."""
    na, nb = name_norm(base_name(ours)), name_norm(base_name(theirs))
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    if min(len(na), len(nb)) >= 5 and (na in nb or nb in na):
        return 0.9
    ta, tb = tokens(ours), tokens(theirs)
    return round(len(ta & tb) / len(ta | tb), 3) if ta and tb else 0.0


def score_candidate(place, cand):
    """Trả về {score, distance_m, name_score} nếu ứng viên đạt ngưỡng, None nếu bị loại."""
    loc = cand.get("location") or {}
    if "latitude" not in loc:
        return None
    d = haversine_m(float(place["lat"]), float(place["lng"]), loc["latitude"], loc["longitude"])
    ns = name_score(place["name"], (cand.get("displayName") or {}).get("text", ""))
    if place.get("google_place_id") and cand.get("id") == place["google_place_id"]:
        ns = 1.0  # Nearby Search đã ghép sẵn quán này với id Google đó
    if d > MAX_MATCH_DIST_M or ns < MIN_NAME_SCORE:
        return None
    score = NAME_WEIGHT * ns + (1 - NAME_WEIGHT) * (1 - d / MAX_MATCH_DIST_M)
    return {"score": round(score, 3), "distance_m": round(d), "name_score": round(ns, 3)}


def pick_candidate(place, candidates):
    """Ứng viên điểm cao nhất trong các ứng viên đạt ngưỡng: (candidate, match) hoặc (None, None)."""
    best = (None, None)
    for c in candidates:
        m = score_candidate(place, c)
        if m and (best[1] is None or m["score"] > best[1]["score"]):
            best = (c, m)
    return best


# ---------- Chuyển phản hồi về dạng google_verify.json ----------

def parse_review(r):
    text = r.get("originalText") or r.get("text") or {}
    return {"name": r.get("name", ""), "rating": r.get("rating"), "text": text.get("text", ""),
            "lang": text.get("languageCode", ""), "publish_time": r.get("publishTime", "")}


def parse_price_range(pr):
    lo, hi = (pr.get("startPrice") or {}).get("units"), (pr.get("endPrice") or {}).get("units")
    if not lo and not hi:
        return None
    return {"min_k": int(lo) // 1000 if lo else None, "max_k": int(hi) // 1000 if hi else None}


def build_entry(place, response, fetched_at):
    """Một giá trị của google_verify.json cho một quán, từ phản hồi Text Search."""
    candidates = response.get("places") or []
    cand, match = pick_candidate(place, candidates)
    if not cand:
        return {"no_match": True, "candidates_seen": len(candidates), "fetched_at": fetched_at}
    return {
        "google_place_id": cand["id"],
        "match": match,
        "business_status": cand.get("businessStatus", ""),
        "rating": cand.get("rating"),
        "rating_count": cand.get("userRatingCount"),
        "price_level": PRICE_LEVEL.get(cand.get("priceLevel", "")),
        "price_range": parse_price_range(cand.get("priceRange") or {}),
        "hours_text": " | ".join((cand.get("regularOpeningHours") or {}).get("weekdayDescriptions", [])),
        "maps_uri": cand.get("googleMapsUri", ""),
        "reviews": [parse_review(r) for r in cand.get("reviews") or []],
        "photos": [{"name": p.get("name", ""), "width_px": p.get("widthPx"), "height_px": p.get("heightPx")}
                   for p in cand.get("photos") or []],
        "fetched_at": fetched_at,
    }


# ---------- Gọi API ----------

def request_body(place):
    return {"textQuery": f"{base_name(place['name'])} {AREA_LABEL.get(place['area'], 'Ocean Park')}",
            "languageCode": "vi", "regionCode": "VN", "maxResultCount": MAX_RESULTS,
            "locationBias": {"circle": {"center": {"latitude": float(place["lat"]), "longitude": float(place["lng"])},
                                        "radius": BIAS_RADIUS_M}}}


def search(key, place):
    return http_json(ENDPOINT, data=json.dumps(request_body(place)), method="POST",
                     headers={"Content-Type": "application/json", "X-Goog-Api-Key": key,
                              "X-Goog-FieldMask": FIELD_MASK})


def load_places():
    with open(PLACES_CSV, newline="", encoding="utf-8-sig") as f:
        return [r for r in csv.DictReader(f) if r["area"]]


def load_results():
    return json.loads(VERIFY_JSON.read_text(encoding="utf-8")) if VERIFY_JSON.exists() else {}


def save_results(results):
    VERIFY_JSON.parent.mkdir(parents=True, exist_ok=True)
    VERIFY_JSON.write_text(json.dumps(results, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--limit", type=int, default=0, help="chỉ chạy N quán đầu trong danh sách cần gọi")
    ap.add_argument("--refresh", action="store_true", help="gọi lại cả quán đã có kết quả")
    ap.add_argument("--dry-run", action="store_true", help="in kế hoạch, không gọi mạng")
    args = ap.parse_args(argv)

    places, results = load_places(), load_results()
    todo = [p for p in places if args.refresh or p["place_id"] not in results]
    if args.limit:
        todo = todo[:args.limit]
    by_area = {a: sum(1 for p in todo if p["area"] == a) for a in sorted({p["area"] for p in places})}
    print(f"{len(places)} quán Ocean Park · {len(results)} đã có kết quả · sẽ gọi {len(todo)} lượt Text Search {by_area}")
    print(f"SKU: {sku_for(FIELDS)} (do trường places.reviews), mỗi quán 1 lượt; không tải byte ảnh")
    print(f"Field mask: {FIELD_MASK}")
    if args.dry_run:
        if todo:
            print("Ví dụ body:", json.dumps(request_body(todo[0]), ensure_ascii=False))
        return 0
    load_env()
    key = os.environ.get("GOOGLE_API_KEY", "").strip()
    if not key:
        sys.exit("Thiếu GOOGLE_API_KEY trong .env. Bật 'Places API (New)' trên Google Cloud, tạo key, chép vào .env.")
    if not todo:
        print("Không còn quán nào cần gọi.")
        return 0

    started = now_iso()
    calls, done, matched, failures, fails_in_row = 0, 0, 0, [], 0
    try:
        for p in todo:
            calls += 1
            try:
                res = search(key, p)
                fails_in_row = 0
            except RuntimeError as e:
                failures.append(f"{p['place_id']}: {e}"[:200])
                fails_in_row += 1
                if fails_in_row >= MAX_FAILS_IN_ROW:
                    failures.append(f"dừng sau {MAX_FAILS_IN_ROW} lỗi liên tiếp")
                    break
                continue
            entry = build_entry(p, res, now_iso())
            results[p["place_id"]] = entry
            done += 1
            matched += 0 if entry.get("no_match") else 1
            if done % SAVE_EVERY == 0:
                save_results(results)
                print(f"  {done}/{len(todo)} quán · {matched} khớp")
    finally:
        save_results(results)
        status = "ok" if done == len(todo) else ("partial" if done else "failed")
        append_crawl_log("google_text_search", "ocean_park_1;ocean_park_2", started, done, status,
                         "crawl/google_verify.py",
                         f"Text Search (New) {sku_for(FIELDS)}, {calls} lượt gọi, {matched} khớp; lỗi: {len(failures)}")
    print(f"Xong: {calls} lượt gọi, {done} quán có kết quả, {matched} khớp Google → {VERIFY_JSON}")
    for f in failures[:5]:
        print("  lỗi:", f)
    return 0


if __name__ == "__main__":
    sys.exit(main())
