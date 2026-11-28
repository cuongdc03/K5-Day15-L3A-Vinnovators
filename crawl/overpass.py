"""Crawl A, bước 1: khung quán ăn từ OpenStreetMap (Overpass API) → data/raw/osm.json.

Chạy:  python crawl/overpass.py
Lấy amenity=restaurant/cafe/fast_food/food_court/bar/pub/ice_cream và shop=bakery/pastry/confectionery
trong khung bao của từng khu (crawl/areas.geojson), rồi chỉ giữ điểm nằm trong khu hoặc cách mép ≤150 m.
Máy chủ Overpass công cộng hay quá tải nên thử lần lượt nhiều máy chủ.
Dữ liệu © OpenStreetMap contributors, giấy phép ODbL.
"""
import sys
import urllib.parse

from common import append_crawl_log, area_of, expanded_bbox, http_json, load_areas, now_iso, write_raw

SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
AMENITY = "restaurant|cafe|fast_food|food_court|bar|pub|ice_cream"
SHOP = "bakery|pastry|confectionery"


def query_for(bbox):
    s, w, n, e = bbox
    b = f"({s:.6f},{w:.6f},{n:.6f},{e:.6f})"
    return (f'[out:json][timeout:90];('
            f'nwr["amenity"~"^({AMENITY})$"]{b};'
            f'nwr["shop"~"^({SHOP})$"]{b};'
            f');out tags center;')


def run_query(q):
    errors = []
    for url in SERVERS:
        try:
            print(f"  gọi {url}")
            return http_json(url, data=urllib.parse.urlencode({"data": q}), retries=2, timeout=120), url
        except RuntimeError as e:
            errors.append(f"{url}: {e}")
    raise RuntimeError("Mọi máy chủ Overpass đều lỗi:\n" + "\n".join(errors))


def main():
    started = now_iso()
    areas = load_areas()
    out, scopes = [], []
    for a in areas:
        print(f"{a['area']}: truy vấn Overpass")
        try:
            res, server = run_query(query_for(expanded_bbox(a)))
        except RuntimeError as e:
            append_crawl_log("overpass", a["area"], started, 0, "failed", "crawl/overpass.py", str(e)[:200])
            print(e, file=sys.stderr)
            continue
        kept = 0
        for el in res.get("elements", []):
            lat = el.get("lat") or el.get("center", {}).get("lat")
            lng = el.get("lon") or el.get("center", {}).get("lon")
            if lat is None or lng is None:
                continue
            hit = area_of(lat, lng, [a])
            if not hit:
                continue
            out.append({"osm_id": f"{el['type']}/{el['id']}", "lat": lat, "lng": lng,
                        "area": a["area"], "district": a["district"], "tags": el.get("tags", {}),
                        "fetched_at": started})
            kept += 1
        print(f"  {len(res.get('elements', []))} điểm trong khung bao, giữ {kept} điểm trong khu")
        scopes.append(a["area"])
        append_crawl_log("overpass", a["area"], started, kept, "ok", "crawl/overpass.py", f"server {server}")
    path = write_raw("osm.json", out)
    print(f"Đã ghi {len(out)} quán vào {path}")
    named = [x for x in out if x["tags"].get("name")]
    for x in named[:3]:
        print("  vd:", x["area"], x["tags"].get("name"), x["tags"].get("amenity") or x["tags"].get("shop"))


if __name__ == "__main__":
    main()
