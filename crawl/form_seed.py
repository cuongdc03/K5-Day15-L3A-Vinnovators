"""Tạo dữ liệu nạp vào form thực địa (tools/field_form.html) từ data/processed/places.csv.

Chạy:  python crawl/form_seed.py [thư_mục_ra]      (mặc định data/raw/form_seed)
Ra mỗi quán một file <place_id>.json, đúng dạng document `places/<place_id>` mà form đọc.
Claude (hoặc người có quyền sửa artifact) nạp các file này vào collection `places` của artifact.
Chỉ nạp quán ở Ocean Park (cột area có giá trị). Không ghi đè trường `last` (kết quả đi kiểm).
"""
import csv
import json
import sys
from pathlib import Path

from common import PROCESSED_DIR, RAW_DIR


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else RAW_DIR / "form_seed"
    out.mkdir(parents=True, exist_ok=True)
    n = 0
    with open(PROCESSED_DIR / "places.csv", newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            if not r["area"]:
                continue
            doc = {"name": r["name"], "area": r["area"], "district": r["district"], "category": r["category"],
                   "cuisine": r["cuisine"], "address": r["address_text"], "lat": float(r["lat"]), "lng": float(r["lng"]),
                   "sources": r["sources"], "foody_url": r["foody_url"]}
            (out / f"{r['place_id']}.json").write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
            n += 1
    print(f"Đã tạo {n} file trong {out}")


if __name__ == "__main__":
    main()
