"""Crawl A, bước 2: quán ăn từ Google Places API (New), Nearby Search → data/raw/google.json.

Chạy:  python crawl/places_api.py            (cần GOOGLE_API_KEY trong .env)
       python crawl/places_api.py --dry-run  (chỉ in số lượt gọi dự kiến, không gọi API)

Phủ mỗi khu bằng lưới vòng tròn bán kính 250 m. Nearby Search trả tối đa 20 quán mỗi lượt, nên vòng nào
trả đủ 20 thì chia nhỏ thành 4 vòng bán kính một nửa (tối thiểu 70 m).
Dùng API chính thức thay vì cào trang Google Maps (trang dựng bằng JavaScript và điều khoản cấm cào).
Điều khoản Google Places: được lưu lâu dài place_id; nội dung khác chỉ dùng cho bản chạy thử, ghi nguồn
"Google Maps", không phát lại. Số lượt gọi thật ghi vào crawl_log để tính chi phí (spec §8).
"""
import json
import math
import os
import sys

from common import append_crawl_log, area_of, http_json, load_areas, load_env, now_iso, write_raw

ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby"
FIELD_MASK = ",".join([
    "places.id", "places.displayName", "places.formattedAddress", "places.location", "places.types",
    "places.primaryType", "places.priceLevel", "places.priceRange", "places.rating", "places.userRatingCount",
    "places.regularOpeningHours.weekdayDescriptions", "places.googleMapsUri", "places.businessStatus",
])
INCLUDED_TYPES = ["restaurant", "cafe", "coffee_shop", "fast_food_restaurant", "bakery", "meal_takeaway",
                  "bar", "food_court", "tea_house", "dessert_shop", "ice_cream_shop", "juice_shop"]
START_RADIUS_M = 250
MIN_RADIUS_M = 70
MAX_CALLS = 400  # chặn trên để không đốt tiền nếu lưới chia nhỏ quá nhiều


def grid_centers(area, radius):
    """Tâm các vòng tròn phủ khung bao của khu, bước = radius*1.4 (các vòng chồng nhau một chút)."""
    s, w, n, e = area["bbox"]
    step_lat = radius * 1.4 / 110540
    step_lng = radius * 1.4 / (111320 * math.cos(math.radians((s + n) / 2)))
    lat = s
    while lat <= n + step_lat / 2:
        lng = w
        while lng <= e + step_lng / 2:
            if area_of(lat, lng, [area], buffer_m=radius):
                yield lat, lng
            lng += step_lng
        lat += step_lat


def search(key, lat, lng, radius):
    body = {"includedTypes": INCLUDED_TYPES, "maxResultCount": 20, "languageCode": "vi", "regionCode": "VN",
            "locationRestriction": {"circle": {"center": {"latitude": lat, "longitude": lng}, "radius": radius}}}
    res = http_json(ENDPOINT, data=json.dumps(body), method="POST",
                    headers={"Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELD_MASK})
    return res.get("places", [])


def main():
    load_env()
    dry = "--dry-run" in sys.argv
    key = os.environ.get("GOOGLE_API_KEY", "").strip()
    areas = load_areas()
    plan = {a["area"]: list(grid_centers(a, START_RADIUS_M)) for a in areas}
    print("Số vòng ban đầu:", {k: len(v) for k, v in plan.items()}, "(chưa tính vòng chia nhỏ)")
    if dry:
        return
    if not key:
        sys.exit("Thiếu GOOGLE_API_KEY trong .env. Bật 'Places API (New)' trên Google Cloud, tạo key, chép vào .env.")
    started = now_iso()
    found, calls = {}, 0
    for a in areas:
        queue = [(lat, lng, START_RADIUS_M) for lat, lng in plan[a["area"]]]
        while queue and calls < MAX_CALLS:
            lat, lng, r = queue.pop(0)
            places = search(key, lat, lng, r)
            calls += 1
            for p in places:
                loc = p.get("location", {})
                hit = area_of(loc.get("latitude", 0), loc.get("longitude", 0), areas)
                if hit and p["id"] not in found:
                    found[p["id"]] = {**p, "area": hit["area"], "district": hit["district"], "fetched_at": started}
            if len(places) >= 20 and r / 2 >= MIN_RADIUS_M:
                d = r / 2 / 110540
                dl = r / 2 / (111320 * math.cos(math.radians(lat)))
                queue += [(lat + dy, lng + dx, r / 2) for dy in (-d, d) for dx in (-dl, dl)]
        print(f"{a['area']}: {sum(1 for x in found.values() if x['area'] == a['area'])} quán · {calls} lượt gọi tới giờ")
    status = "partial" if calls >= MAX_CALLS else "ok"
    out = list(found.values())
    write_raw("google.json", out)
    for a in areas:
        n = sum(1 for x in out if x["area"] == a["area"])
        append_crawl_log("google_places", a["area"], started, n, status, "crawl/places_api.py",
                         f"Nearby Search (New), {calls} lượt gọi cho cả 2 khu")
    print(f"Đã ghi {len(out)} quán vào data/raw/google.json · {calls} lượt gọi")


if __name__ == "__main__":
    main()
