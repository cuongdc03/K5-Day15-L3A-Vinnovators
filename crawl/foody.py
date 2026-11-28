"""Crawl A, bước 3: quán ăn trên Foody.vn quanh Ocean Park 1, 2 → data/raw/foody.json.

Chạy:  python crawl/foody.py
Đọc trang tìm kiếm công khai của Foody (bản JSON mà chính trang web tải khi cuộn trang).
Mỗi từ khoá Foody chỉ trả tối đa 5 trang × 12 quán, nên chạy nhiều từ khoá rồi gộp theo id Foody,
cuối cùng chỉ giữ quán có toạ độ nằm trong khu (crawl/areas.geojson).

Chỉ lấy thông tin của quán: tên, địa chỉ, toạ độ, loại, món, link, URL ảnh bìa (PicturePathLarge),
trạng thái mở cửa (IsOpening, Status). KHÔNG lấy nội dung review, tên hay ảnh người dùng. Nghỉ 2 giây giữa hai request. Foody không có robots.txt (kiểm ngày 27/11/2026).
Điểm Foody là thang 10, khác thang 1–5 của cột `rating`, nên không đưa vào `rating`.
"""
import json
import time
import urllib.parse

from common import RAW_DIR, append_crawl_log, area_of, http_request, load_areas, now_iso, write_raw

DELAY_S = 2
MAX_PAGES = 5  # giới hạn của Foody cho mỗi truy vấn
BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/130.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "application/json, text/javascript, */*; q=0.01",
}
# (tỉnh trên Foody, từ khoá). Tên phân khu, toà, trục đường nội khu giúp lấy thêm quán ngoài top 60.
QUERIES = [
    ("ha-noi", q) for q in [
        "ocean park", "vinhomes ocean park", "ocean park 1", "ocean park gia lam", "vincom mega mall ocean park",
        "sao bien", "san ho", "ngoc trai", "hai au", "tay bac", "cong vien bien ho", "da ton", "kieu ky",
        "duong xa", "trau quy", "com ocean park", "pho ocean park", "bun ocean park", "cafe ocean park",
        "tra sua ocean park", "banh ocean park", "lau ocean park", "nuong ocean park", "an vat ocean park",
        "mi ocean park", "banh mi ocean park", "che ocean park", "ga ocean park", "pizza ocean park",
        "sushi ocean park", "com tam ocean park", "bun cha ocean park", "nha hang ocean park", "quan an ocean park",
        "an sang ocean park", "kem ocean park", "do han ocean park", "oc ocean park", "bia ocean park",
        "chay ocean park", "banh cuon ocean park", "nuoc ep ocean park", "ca phe ocean park", "do an nhanh ocean park",
    ]
] + [
    ("hung-yen", q) for q in [
        "ocean park", "vinhomes ocean park 2", "ocean park 2", "the empire", "van giang", "nghia tru",
        "kinh do anh sang", "dao dua", "co xanh", "hai au", "ocean park van giang", "cafe ocean park",
        "com ocean park", "tra sua ocean park", "pho ocean park", "bun ocean park", "banh ocean park",
        "an vat ocean park", "lau ocean park", "nha hang ocean park", "ga ocean park", "mi ocean park",
    ]
]
CATEGORY_MAP = {
    "quán ăn": "restaurant", "nhà hàng": "restaurant", "buffet": "restaurant", "giao cơm văn phòng": "restaurant",
    "ăn chay": "restaurant", "quán nhậu": "restaurant", "café/dessert": "cafe", "ăn vặt/vỉa hè": "street_food",
    "tiệm bánh": "bakery",
}  # còn lại ("Shop Online": bếp nhà bán online, "Khu Ẩm Thực", "Bar/Pub"…) → other


MAX_FAILS_IN_ROW = 5  # Foody có thể đang chặn: dừng hẳn thay vì gọi tiếp


def fetch_page(province, keyword, page):
    q = urllib.parse.urlencode({"q": keyword, "ss": "header_search_form", "page": page, "append": "true"})
    body = http_request(f"https://www.foody.vn/{province}/dia-diem?{q}", headers=BROWSER_HEADERS, retries=3)
    try:
        return json.loads(body.decode("utf-8-sig"))
    except ValueError as e:
        raise RuntimeError(f"không phải JSON ({len(body)} byte)") from e


def load_previous():
    """Quán đã lấy ở lần chạy trước, để chạy lại chỉ thêm chứ không mất."""
    p = RAW_DIR / "foody.json"
    return {x["foody_id"]: x for x in json.loads(p.read_text(encoding="utf-8"))} if p.exists() else {}


def to_record(item, area, fetched_at):
    cats = [c.get("Name", "") for c in (item.get("Categories") or [])]
    category = next((CATEGORY_MAP[c.lower()] for c in cats if c.lower() in CATEGORY_MAP), "other")
    return {
        "foody_id": item["Id"],
        "name": (item.get("Name") or "").strip(),
        "address": ", ".join(filter(None, [item.get("Address"), item.get("District"), item.get("City")])),
        "lat": item["Latitude"], "lng": item["Longitude"],
        "area": area["area"], "district": area["district"],
        "foody_categories": cats, "category": category,
        "cuisines": [c.get("Name", "") for c in (item.get("Cuisines") or [])],
        "foody_url": "https://www.foody.vn" + item["DetailUrl"] if item.get("DetailUrl") else "",
        "shopeefood_url": item.get("DeliveryUrl") or "",
        "foody_rating_10": item.get("AvgRatingOriginal") or None,
        "foody_review_count": item.get("TotalReview"),
        # Ảnh bìa của quán (chỉ giữ URL, không tải ảnh) và trạng thái mở cửa Foody đang hiển thị.
        "cover_photo_url": item.get("PicturePathLarge") or "",
        "is_opening": item.get("IsOpening"),
        "foody_status": item.get("Status"),
        "fetched_at": fetched_at,
    }


def main():
    started = now_iso()
    areas = load_areas()
    previous = load_previous()
    seen, kept, n_requests, failures, fails_in_row = set(), {}, 0, [], 0
    for province, keyword in QUERIES:
        if fails_in_row >= MAX_FAILS_IN_ROW:
            failures.append(f"dừng sớm sau {MAX_FAILS_IN_ROW} lỗi liên tiếp, bỏ qua các từ khoá còn lại")
            break
        new_here = 0
        for page in range(1, MAX_PAGES + 1):
            try:
                data = fetch_page(province, keyword, page)
                fails_in_row = 0
            except RuntimeError as e:
                failures.append(f"{province}/{keyword}/p{page}: {e}"[:160])
                fails_in_row += 1
                break
            finally:
                n_requests += 1
                time.sleep(DELAY_S)
            items = data.get("searchItems") or []
            for it in items:
                if it.get("IsAd") or not it.get("Latitude"):
                    continue
                seen.add(it["Id"])
                area = area_of(it["Latitude"], it["Longitude"], areas)
                if area and it["Id"] not in kept:
                    kept[it["Id"]] = to_record(it, area, started)
                    new_here += 1
            if len(items) < 12:
                break
        print(f"{province:9} '{keyword}': +{new_here} quán mới trong khu (tổng {len(kept)})")
    n_new = sum(1 for k in kept if k not in previous)
    out = list({**previous, **kept}.values())  # lần này ghi đè bản cũ của cùng quán, giữ quán chỉ có ở lần trước
    path = write_raw("foody.json", out)
    print(f"Lần này gặp {len(kept)} quán trong khu, {n_new} quán chưa có ở lần trước")
    by_area = {a["area"]: sum(1 for x in out if x["area"] == a["area"]) for a in areas}
    status = "ok" if not failures else ("partial" if out else "failed")
    notes = f"{n_requests} request, {len(seen)} quán gặp, {len(QUERIES)} từ khoá; lỗi: {len(failures)}"
    for area, n in by_area.items():
        append_crawl_log("foody", area, started, n, status, "crawl/foody.py", notes)
    print(f"Đã ghi {len(out)} quán vào {path} · theo khu: {by_area} · {notes}")
    for f in failures[:5]:
        print("  lỗi:", f)


if __name__ == "__main__":
    main()
