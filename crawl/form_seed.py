"""Tạo dữ liệu nạp vào form thực địa (tools/field_form.html) từ data/processed/places.csv.

Chạy:  python crawl/form_seed.py [thư_mục_ra]      (mặc định data/raw/form_seed)
Ra mỗi quán một file <place_id>.json, đúng dạng document `places/<place_id>` mà form đọc.
Claude (hoặc người có quyền sửa artifact) nạp các file này vào collection `places` của artifact.
Chỉ nạp quán ở Ocean Park (cột area có giá trị). Không ghi đè `last` và `desk_last` (kết quả đi kiểm, kiểm tại bàn):
nạp lại cho quán đã có thì dùng thao tác `update` (gộp trường), không dùng `set`.
Nếu có data/processed/verification.csv (crawl/verify.py) thì kèm trạng thái xác thực tự động và thứ tự đi kiểm.
"""
import csv
import json
import sys
from pathlib import Path

from common import PROCESSED_DIR, RAW_DIR


def load_verification():
    """Kết quả crawl/verify.py theo place_id; rỗng nếu chưa chạy."""
    p = PROCESSED_DIR / "verification.csv"
    if not p.exists():
        return {}
    with open(p, newline="", encoding="utf-8-sig") as f:
        return {r["place_id"]: r for r in csv.DictReader(f)}


def as_int(v):
    return int(float(v)) if v not in (None, "") else None


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else RAW_DIR / "form_seed"
    out.mkdir(parents=True, exist_ok=True)
    ver = load_verification()
    n = 0
    with open(PROCESSED_DIR / "places.csv", newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            if not r["area"]:
                continue
            v = ver.get(r["place_id"], {})
            doc = {"name": r["name"], "area": r["area"], "district": r["district"], "category": r["category"],
                   "cuisine": r["cuisine"], "address": r["address_text"], "lat": float(r["lat"]), "lng": float(r["lng"]),
                   "sources": r["sources"], "foody_url": r["foody_url"],
                   # Trường xác thực tự động; null khi chưa chạy verify.py
                   "auto_status": v.get("auto_status") or None, "reasons": v.get("reasons") or "",
                   "field_priority": as_int(v.get("field_priority")), "desk_priority": as_int(v.get("desk_priority")),
                   "route_order": as_int(v.get("route_order")),
                   "distance_to_hub_m": as_int(v.get("distance_to_hub_m")), "rating_count": as_int(v.get("rating_count"))}
            (out / f"{r['place_id']}.json").write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
            n += 1
    print(f"Đã tạo {n} file trong {out}")


if __name__ == "__main__":
    main()
