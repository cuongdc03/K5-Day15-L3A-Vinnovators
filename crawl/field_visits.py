"""Chuyển dữ liệu form thực địa về repo.

Chạy:  python crawl/field_visits.py <thư_mục_dump>
<thư_mục_dump> chứa visits/*.json và places/*.json, mỗi file một document kéo từ artifact
(ArtifactData list với out_dir). Ra:
  - data/processed/field_visits.csv   (đúng schema, mỗi lần đến quán một dòng)
  - data/raw/field_places.json         (quán đội tự thêm khi đi thực địa, crawl/merge.py đọc file này)
Sau đó chạy lại: python crawl/merge.py  → giá, giờ mở mới nhất vào places.csv.
Ảnh tải lên form ghi là asset:<id>; link ảnh ngoài giữ nguyên.
"""
import csv
import json
import sys
from pathlib import Path

from common import PROCESSED_DIR, RAW_DIR, write_raw

COLS = ["visit_id", "place_id", "visitor", "visited_at", "status", "price_min_k", "price_max_k", "dishes", "hours_text",
        "phone", "facebook_url", "tiktok_url", "photo_urls", "lat", "lng", "notes"]


def load_docs(folder):
    docs = {}
    for p in sorted(Path(folder).glob("*.json")):
        d = json.loads(p.read_text(encoding="utf-8"))
        if isinstance(d.get("data"), dict) and "version" in d:  # dạng {id, version, data}
            d = d["data"]
        docs[p.stem] = d
    return docs


def clean(v):
    return "" if v is None else str(v).replace("\r", " ").replace("\n", " ").strip()


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    root = Path(sys.argv[1])
    visits, places = load_docs(root / "visits"), load_docs(root / "places")
    rows = []
    for vid, v in visits.items():
        dishes = ";".join(f"{clean(x.get('name'))}:{x['price_k']}" if x.get("price_k") is not None else clean(x.get("name"))
                          for x in v.get("dishes") or [])
        photos = [f"asset:{i}" for i in v.get("photo_ids") or []] + list(v.get("photo_links") or [])
        rows.append({"visit_id": vid, "place_id": v["place_id"], "visitor": v["visitor"], "visited_at": v["visited_at"],
                     "status": v["status"], "price_min_k": clean(v.get("price_min_k")), "price_max_k": clean(v.get("price_max_k")),
                     "dishes": dishes, "hours_text": clean(v.get("hours_text")), "phone": clean(v.get("phone")),
                     "facebook_url": clean(v.get("facebook_url")), "tiktok_url": clean(v.get("tiktok_url")),
                     "photo_urls": ";".join(photos), "lat": "", "lng": "", "notes": clean(v.get("notes"))})
    rows.sort(key=lambda r: r["visited_at"])
    with open(PROCESSED_DIR / "field_visits.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        w.writerows(rows)
    new_places = [{"place_id": pid, "name": p["name"], "area": p["area"], "district": p["district"],
                   "category": p.get("category") or "other", "address_text": p.get("address", ""), "lat": p["lat"],
                   "lng": p["lng"], "created_at": p.get("created_at", ""), "cuisine": p.get("cuisine", "")}
                  for pid, p in places.items() if p.get("added_in_field")]
    write_raw("field_places.json", new_places)
    print(f"{len(rows)} phiếu → data/processed/field_visits.csv · {len(new_places)} quán thêm mới → data/raw/field_places.json")
    print("Tiếp theo: python crawl/merge.py rồi python data/schema/validate.py data/processed")


if __name__ == "__main__":
    main()
