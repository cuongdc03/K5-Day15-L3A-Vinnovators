"""Lấy ranh giới các khu crawl từ OpenStreetMap (Nominatim) → crawl/areas.geojson.

Chạy:  python crawl/areas.py
Chạy lại khi thêm khu vào AREAS. File areas.geojson được commit để mọi người dùng chung một ranh giới.
"""
import json
import time
import urllib.parse

from common import AREAS_FILE, http_json, now_iso

# osm: id đối tượng OSM có ranh giới khu (W = way, R = relation). Tra bằng nominatim.openstreetmap.org.
AREAS = [
    {"area": "ocean_park_1", "district": "gia_lam", "osm": "W761986888",
     "name": "Vinhomes Ocean Park (Gia Lâm, Hà Nội)"},
    {"area": "ocean_park_2", "district": "van_giang", "osm": "W1145184206",
     "name": "The Empire Vinhomes Ocean Park 2 (Văn Giang, Hưng Yên)"},
]


def main():
    features = []
    for a in AREAS:
        q = urllib.parse.urlencode({"osm_ids": a["osm"], "format": "json", "polygon_geojson": 1})
        res = http_json(f"https://nominatim.openstreetmap.org/lookup?{q}")
        if not res:
            raise SystemExit(f"Không tìm thấy {a['osm']} trên OSM")
        geom = res[0]["geojson"]
        if geom["type"] not in ("Polygon", "MultiPolygon"):
            raise SystemExit(f"{a['osm']} không phải vùng (geometry {geom['type']})")
        features.append({"type": "Feature", "geometry": geom,
                         "properties": {**a, "fetched_at": now_iso(),
                                        "source": "OpenStreetMap contributors (ODbL), qua Nominatim"}})
        print(f"{a['area']}: {res[0]['display_name'][:80]} · bbox {res[0]['boundingbox']}")
        time.sleep(1.1)  # luật dùng Nominatim: tối đa 1 request mỗi giây
    AREAS_FILE.write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False),
                          encoding="utf-8")
    print(f"Đã ghi {AREAS_FILE}")


if __name__ == "__main__":
    main()
