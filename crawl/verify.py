"""Xếp hạng việc kiểm thực địa cho quán Ocean Park 1, 2.

Chạy:  python crawl/verify.py                      (mặc định 40 quán ưu tiên)
       python crawl/verify.py --top 60
       python crawl/verify.py --hub ocean_park_1=20.9939,105.9595

Đọc places.csv, data/raw/foody.json, desk_checks.csv (xem tay Google Maps, nếu có), field_visits.csv (nếu có),
data/raw/google_verify.json (Google Places API, hiện chưa có vì không có key). Ghi:
  - data/processed/verification.csv  trạng thái của từng quán, lý do, hàng đợi xem tay Maps (desk_priority),
                                     danh sách đi thực địa (field_priority) và lộ trình đi bộ (route_order)
  - data/processed/photos.csv        ảnh bìa Foody (URL), tên tài nguyên ảnh Google (không tải byte), ảnh thực địa
  - data/processed/reviews.csv       thêm/cập nhật review Google (đoạn trích ≤2 câu, ≤300 ký tự, không tên người viết);
                                     giữ nguyên dòng của nguồn khác; chạy hai lần ra cùng một file

Trạng thái quyết định bằng bảng luật STATUS_RULES (luật đầu tiên đúng thì dùng), lấy lần xem tay và lần thực địa
mới nhất của mỗi quán. Quán chưa xem tay, chưa có Google API là `unverified` và vào hàng đợi xem tay; danh sách đi
thực địa chỉ gồm quán `uncertain` và quán đã xác nhận nổi bật (đi chụp ảnh, ghi giá menu).
"""
import argparse
import csv
import hashlib
import json
import math
import re
from dataclasses import dataclass
from datetime import datetime

from common import PROCESSED_DIR, RAW_DIR, VN_TZ, haversine_m, now_iso

PLACES_CSV = PROCESSED_DIR / "places.csv"
VISITS_CSV = PROCESSED_DIR / "field_visits.csv"
DESK_CSV = PROCESSED_DIR / "desk_checks.csv"
VERIFICATION_CSV = PROCESSED_DIR / "verification.csv"
PHOTOS_CSV = PROCESSED_DIR / "photos.csv"
REVIEWS_CSV = PROCESSED_DIR / "reviews.csv"
VERIFICATION_COLS = ["place_id", "auto_status", "reasons", "google_place_id", "match_score", "business_status",
                     "last_review_at", "rating_count", "foody_review_count", "distance_to_hub_m", "field_priority",
                     "desk_priority", "route_order", "computed_at"]
PHOTOS_COLS = ["photo_id", "place_id", "source", "ref", "width_px", "height_px", "fetched_at"]
REVIEWS_COLS = ["review_id", "place_id", "source", "rating", "text_excerpt", "lang", "published_at", "url", "fetched_at"]
REVIEW_LANGS = {"vi", "en", "ko", "zh", "ja", "fr"}

HUBS = {"ocean_park_1": ("Vincom Mega Mall Ocean Park", 20.9939, 105.9595),
        # OP2: tâm cụm quán dày nhất (37 quán trong 300 m, đo 27/11/2026); toạ độ The Empire cũ không có quán nào trong 300 m
        "ocean_park_2": ("cụm quán quanh Phở Lý Quốc Sư", 20.9516, 105.9764)}
DEFAULT_TOP_N = 40
FRESH_REVIEW_DAYS = 180
ENOUGH_RATINGS = 20
DIST_PENALTY_PER_KM = 1.0
EXCERPT_MAX_CHARS = 300
EXCERPT_MAX_SENTENCES = 2
FOODY_NO_PHOTO = ("no-image", "noimage", "default")  # ảnh giữ chỗ của Foody, không phải ảnh quán
DESK_FRESH = {"lt_1m", "lt_6m"}  # review mới nhất trên Maps trong vòng 6 tháng (khớp FRESH_REVIEW_DAYS)
NEWEST_REVIEW_VI = {"lt_1m": "dưới 1 tháng", "lt_6m": "dưới 6 tháng", "older": "trên 6 tháng", "none": "không có"}
DESK_STATUS_VI = {"open": "đang mở", "closed_permanently": "đóng cửa vĩnh viễn", "closed_temporarily": "tạm đóng cửa",
                  "not_found": "không tìm thấy"}


# ---------- Trạng thái ----------

@dataclass(frozen=True)
class Evidence:
    """Tín hiệu về một quán, đủ để quyết định trạng thái."""
    field_status: str = ""          # trạng thái lần thực địa mới nhất, "" nếu chưa đi
    desk_status: str = ""           # maps_status của lần xem tay Google Maps mới nhất, "" nếu chưa xem
    desk_newest_review: str = ""    # lt_1m · lt_6m · older · none
    desk_review_count: int | None = None
    google_checked: bool = False    # đã gọi Google Places API cho quán này chưa
    google_matched: bool = False
    business_status: str = ""       # OPERATIONAL · CLOSED_TEMPORARILY · CLOSED_PERMANENTLY
    review_age_days: int | None = None
    rating_count: int = 0


def has_recent_activity(e):
    return (e.review_age_days is not None and e.review_age_days <= FRESH_REVIEW_DAYS) or e.rating_count >= ENOUGH_RATINGS


# Luật đầu tiên đúng quyết định trạng thái.
STATUS_RULES = [
    ("field_verified", lambda e: bool(e.field_status)),
    ("closed", lambda e: (e.google_matched and e.business_status == "CLOSED_PERMANENTLY")
     or e.desk_status == "closed_permanently"),
    ("desk_verified", lambda e: e.desk_status == "open" and e.desk_newest_review in DESK_FRESH),
    ("auto_verified", lambda e: e.google_matched and e.business_status == "OPERATIONAL" and has_recent_activity(e)),
    # Xem tay thấy mở nhưng review cũ/không có, tạm đóng, không tìm thấy; hoặc khớp API nhưng cũ, tạm đóng.
    ("uncertain", lambda e: bool(e.desk_status) or e.google_matched),
    ("unverified", lambda e: True),  # chưa xem tay, chưa có dữ liệu Google API (hoặc API không có quán khớp)
]


def decide_status(e):
    return next(status for status, rule in STATUS_RULES if rule(e))


def parse_time(s):
    """RFC 3339 của Google (có thể có phần lẻ giây 9 chữ số, đuôi Z) → datetime giờ VN, None nếu hỏng."""
    if not s:
        return None
    s = re.sub(r"\.\d+", "", s).replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    return (dt if dt.tzinfo else dt.replace(tzinfo=VN_TZ)).astimezone(VN_TZ)


def newest_review_date(entry):
    times = [t for t in (parse_time(r.get("publish_time")) for r in (entry or {}).get("reviews") or []) if t]
    return max(times).date() if times else None


def gather_evidence(google_entry, visit, desk, today):
    """visit, desk: dòng mới nhất của field_visits.csv, desk_checks.csv cho quán (hoặc None)."""
    g, d = google_entry or {}, desk or {}
    matched = bool(g) and not g.get("no_match")
    newest = newest_review_date(g) if matched else None
    desk_n = (d.get("maps_review_count") or "").strip()
    return Evidence(field_status=(visit or {}).get("status", ""),
                    desk_status=d.get("maps_status", ""), desk_newest_review=d.get("newest_review", ""),
                    desk_review_count=int(desk_n) if desk_n.isdigit() else None,
                    google_checked=bool(g), google_matched=matched,
                    business_status=g.get("business_status", "") if matched else "",
                    review_age_days=(today - newest).days if newest else None,
                    rating_count=int(g.get("rating_count") or 0) if matched else 0)


def review_count(e):
    """Số review trên Maps tốt nhất đang có: xem tay trước, rồi Google API."""
    return e.desk_review_count if e.desk_review_count is not None else e.rating_count


BUSINESS_STATUS_VI = {"OPERATIONAL": "đang hoạt động", "CLOSED_TEMPORARILY": "tạm đóng cửa",
                      "CLOSED_PERMANENTLY": "đóng cửa vĩnh viễn"}


def reasons_for(e, google_entry, foody, place, desk=None):
    """Các tín hiệu ngắn (tiếng Việt) giải thích trạng thái, nối bằng ';'."""
    out = []
    if e.field_status:
        out.append(f"thực địa: {e.field_status}")
    if e.desk_status:
        out.append("Maps (xem tay): " + DESK_STATUS_VI.get(e.desk_status, e.desk_status))
        if e.desk_review_count is not None:
            out.append(f"Maps {e.desk_review_count} review")
        if e.desk_newest_review:
            out.append("review mới nhất " + NEWEST_REVIEW_VI.get(e.desk_newest_review, e.desk_newest_review))
        if (desk or {}).get("has_menu_photo") == "1":
            out.append("Maps có ảnh menu")
    else:
        out.append("chưa xem tay Google Maps")
    if not e.google_checked:
        pass  # Google API chưa chạy (không có key): không ghi để lý do đỡ dài
    elif not e.google_matched:
        out.append(f"Google API không có quán khớp ({google_entry.get('candidates_seen', 0)} ứng viên)")
    else:
        m = google_entry.get("match") or {}
        out.append(f"Google API khớp {m.get('score')} cách {m.get('distance_m')} m")
        if e.business_status:
            out.append("Google API: " + BUSINESS_STATUS_VI.get(e.business_status, e.business_status))
        out.append(f"{e.rating_count} lượt đánh giá Google")
        if e.review_age_days is None:
            out.append("không có review Google")
        else:
            stale = "" if e.review_age_days <= FRESH_REVIEW_DAYS else f" (quá {FRESH_REVIEW_DAYS} ngày)"
            out.append(f"review mới nhất cách {e.review_age_days} ngày{stale}")
    if foody:
        if foody.get("foody_review_count"):
            out.append(f"Foody {foody['foody_review_count']} review")
        if "Shop Online" in (foody.get("foody_categories") or []):
            out.append("Foody: Shop Online, có thể không có mặt tiền")
    srcs = [s for s in place["sources"].split(";") if s]
    if "osm" in srcs:
        out.append("có trên OSM")
    out.append(f"{len(srcs)} nguồn")
    return ";".join(out)


# ---------- Ưu tiên và lộ trình ----------

def prominence(maps_review_count, foody_review_count, n_sources, has_osm):
    """Độ nổi bật: log số review trên Maps (xem tay, hoặc Google API) và review Foody,
    cộng điểm khi nhiều nguồn và có trên OSM."""
    return (math.log1p(maps_review_count) + math.log1p(foody_review_count)
            + 0.5 * max(n_sources - 1, 0) + 0.5 * bool(has_osm))


def field_score(r):
    return r["prominence"] - DIST_PENALTY_PER_KM * r["distance_to_hub_m"] / 1000


def assign_priority(rows, top_n):
    """rows: dict có place_id, auto_status, prominence, distance_to_hub_m, has_desk_check.

    field_priority (1..top_n): mọi quán uncertain, cộng top_n//4 quán desk_verified/auto_verified nổi bật nhất
    (đi để chụp ảnh, ghi giá menu); xếp theo độ nổi bật − DIST_PENALTY_PER_KM × km tới trung tâm khu.
    Không xét quán closed, field_verified, và quán unverified (xem tay Google Maps trước, rẻ hơn đi bộ).
    desk_priority (1..): mọi quán chưa xem tay và chưa thực địa, chưa biết đóng cửa; nổi bật trước, gần trước.
    """
    pool = [r for r in rows if r["auto_status"] == "uncertain"]
    verified = sorted((r for r in rows if r["auto_status"] in ("desk_verified", "auto_verified")),
                      key=lambda r: (-r["prominence"], r["place_id"]))
    pool += verified[:max(top_n // 4, 1)]
    pool.sort(key=lambda r: (-field_score(r), r["place_id"]))
    desk = [r for r in rows if not r["has_desk_check"] and r["auto_status"] not in ("field_verified", "closed")]
    desk.sort(key=lambda r: (-r["prominence"], r["distance_to_hub_m"], r["place_id"]))
    for r in rows:
        r["field_priority"] = r["desk_priority"] = ""
    for i, r in enumerate(pool[:top_n], start=1):
        r["field_priority"] = i
    for i, r in enumerate(desk, start=1):
        r["desk_priority"] = i


def assign_route(rows, hubs):
    """Thứ tự đi bộ láng giềng gần nhất trong từng khu, bắt đầu ở trung tâm khu, chỉ qua quán có field_priority."""
    for r in rows:
        r["route_order"] = ""
    for area, (_, hlat, hlng) in hubs.items():
        left = [r for r in rows if r["area"] == area and r["field_priority"] != ""]
        lat, lng, step = hlat, hlng, 1
        while left:
            nxt = min(left, key=lambda r: (haversine_m(lat, lng, r["lat"], r["lng"]), r["place_id"]))
            nxt["route_order"] = step
            lat, lng, step = nxt["lat"], nxt["lng"], step + 1
            left.remove(nxt)


# ---------- Review và ảnh ----------

def excerpt(text):
    """Tối đa 2 câu và 300 ký tự (cùng cách tách câu với data/schema/validate.py)."""
    t = re.sub(r"\s+", " ", text or "").strip()
    t = " ".join([s for s in re.split(r"(?<=[.!?…])\s+", t) if s][:EXCERPT_MAX_SENTENCES])
    if len(t) > EXCERPT_MAX_CHARS:
        cut = t[:EXCERPT_MAX_CHARS - 1]
        cut = cut.rsplit(" ", 1)[0] if " " in cut else cut
        t = cut.rstrip(" ,;:") + "…"
    return t


def review_lang(code):
    primary = (code or "").split("-")[0].lower()
    return primary if primary in REVIEW_LANGS else "other"


def review_id(google_review_name):
    return "r_" + hashlib.sha1(google_review_name.encode("utf-8")).hexdigest()[:8]


def google_review_rows(place_id, entry):
    rows = []
    for r in (entry or {}).get("reviews") or []:
        text = excerpt(r.get("text"))
        if not r.get("name") or not text:
            continue  # review chỉ có sao, không có chữ: schema bắt buộc text_excerpt
        published = parse_time(r.get("publish_time"))
        rating = r.get("rating")
        rows.append({"review_id": review_id(r["name"]), "place_id": place_id, "source": "google",
                     "rating": int(round(rating)) if rating else "", "text_excerpt": text,
                     "lang": review_lang(r.get("lang")),
                     "published_at": published.date().isoformat() if published else "",
                     "url": entry.get("maps_uri", ""), "fetched_at": entry.get("fetched_at", "")})
    return rows


def upsert_reviews(existing, new_rows):
    """Giữ thứ tự và mọi dòng cũ; dòng mới cùng review_id thay dòng cũ, review_id mới nối vào cuối."""
    by_id = {r["review_id"]: r for r in existing}
    order = [r["review_id"] for r in existing]
    for r in sorted(new_rows, key=lambda r: (r["place_id"], r["review_id"])):
        if r["review_id"] not in by_id:
            order.append(r["review_id"])
        by_id[r["review_id"]] = {c: r.get(c, "") for c in REVIEWS_COLS}
    return [by_id[i] for i in order]


def photo_id(place_id, source, ref):
    # Có place_id trong khoá: Foody dùng chung một ảnh bìa cho vài quán (chuỗi, trang trùng).
    return "ph_" + hashlib.sha1(f"{place_id}|{source}|{ref}".encode("utf-8")).hexdigest()[:8]


def photo_rows(place_id, foody, google_entry, visit_rows):
    out = []
    cover = (foody or {}).get("cover_photo_url") or ""
    if cover.startswith("http") and not any(k in cover.lower() for k in FOODY_NO_PHOTO):
        out.append(("foody", cover, "", "", foody["fetched_at"]))
    g = google_entry or {}
    if not g.get("no_match"):
        for p in g.get("photos") or []:
            if p.get("name"):
                out.append(("google", p["name"], p.get("width_px") or "", p.get("height_px") or "", g["fetched_at"]))
    for v in visit_rows:
        for ref in filter(None, (v.get("photo_urls") or "").split(";")):
            out.append(("field", ref.strip(), "", "", v["visited_at"]))
    return [{"photo_id": photo_id(place_id, s, ref), "place_id": place_id, "source": s, "ref": ref, "width_px": w,
             "height_px": h, "fetched_at": t} for s, ref, w, h, t in out]


# ---------- Đọc và ghi ----------

def read_csv(path):
    if not path.exists():
        return []
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def write_csv(path, cols, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def load_json(name, default):
    p = RAW_DIR / name
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def parse_hub(text):
    area, _, coords = text.partition("=")
    lat, lng = (float(x) for x in coords.split(","))
    return area.strip(), lat, lng


def group_by_place(rows, time_col):
    """{place_id: [dòng, ...]} sắp theo thời gian tăng dần, dòng cuối là mới nhất."""
    out = {}
    for r in sorted(rows, key=lambda r: r[time_col]):
        out.setdefault(r["place_id"], []).append(r)
    return out


def build(places, foody_by_url, google, visits, desk_checks, hubs, top_n, today, computed_at):
    """Trả về (verification_rows, photo_rows, google_review_rows). Không đọc ghi file."""
    visits_by_place = group_by_place(visits, "visited_at")
    desk_by_place = group_by_place(desk_checks, "checked_at")
    rows, photos, reviews = [], [], []
    for p in places:
        pid = p["place_id"]
        g = google.get(pid)
        foody = foody_by_url.get(p.get("foody_url") or "")
        pv = visits_by_place.get(pid, [])
        desk = desk_by_place.get(pid, [None])[-1]
        e = gather_evidence(g, pv[-1] if pv else None, desk, today)
        lat, lng = float(p["lat"]), float(p["lng"])
        _, hlat, hlng = hubs[p["area"]]
        srcs = [s for s in p["sources"].split(";") if s]
        foody_n = int((foody or {}).get("foody_review_count") or 0)
        newest = newest_review_date(g) if e.google_matched else None
        rows.append({
            "place_id": pid, "area": p["area"], "lat": lat, "lng": lng, "name": p["name"],
            "has_desk_check": desk is not None,
            "auto_status": decide_status(e), "reasons": reasons_for(e, g, foody, p, desk),
            "google_place_id": g.get("google_place_id", "") if e.google_matched else "",
            "match_score": (g.get("match") or {}).get("score", "") if e.google_matched else "",
            "business_status": e.business_status, "last_review_at": newest.isoformat() if newest else "",
            "rating_count": e.rating_count if e.google_matched else "",
            "foody_review_count": foody_n if foody else "",
            "distance_to_hub_m": round(haversine_m(lat, lng, hlat, hlng)),
            "prominence": prominence(review_count(e), foody_n, len(srcs), "osm" in srcs),
            "computed_at": computed_at,
        })
        photos += photo_rows(pid, foody, g, pv)
        if e.google_matched:
            reviews += google_review_rows(pid, g)
    assign_priority(rows, top_n)
    assign_route(rows, hubs)
    photos.sort(key=lambda r: (r["place_id"], r["source"], r["ref"]))
    return rows, photos, reviews


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--top", type=int, default=DEFAULT_TOP_N, help="số quán được xếp field_priority")
    ap.add_argument("--hub", action="append", default=[], metavar="AREA=LAT,LNG", help="đổi trung tâm của một khu")
    args = ap.parse_args(argv)
    hubs = dict(HUBS)
    for h in args.hub:
        area, lat, lng = parse_hub(h)
        hubs[area] = (hubs.get(area, (area,))[0], lat, lng)

    places = [p for p in read_csv(PLACES_CSV) if p["area"] in hubs]
    foody_by_url = {x["foody_url"]: x for x in load_json("foody.json", []) if x.get("foody_url")}
    google = load_json("google_verify.json", {})
    visits, desk_checks = read_csv(VISITS_CSV), read_csv(DESK_CSV)
    rows, photos, google_reviews = build(places, foody_by_url, google, visits, desk_checks, hubs, args.top,
                                         datetime.now(VN_TZ).date(), now_iso())

    rows.sort(key=lambda r: (r["area"], r["field_priority"] == "", r["field_priority"] or 0,
                             r["desk_priority"] == "", r["desk_priority"] or 0, r["place_id"]))
    write_csv(VERIFICATION_CSV, VERIFICATION_COLS, rows)
    write_csv(PHOTOS_CSV, PHOTOS_COLS, photos)
    old_reviews = read_csv(REVIEWS_CSV)
    if google_reviews:  # không có review Google mới thì không đụng vào file của nguồn khác
        write_csv(REVIEWS_CSV, REVIEWS_COLS, upsert_reviews(old_reviews, google_reviews))

    counts = {}
    for r in rows:
        counts[r["auto_status"]] = counts.get(r["auto_status"], 0) + 1
    print(f"{len(rows)} quán · Google API: {len(google)} quán đã gọi · xem tay Maps: "
          f"{len({d['place_id'] for d in desk_checks})} quán · thực địa: {len({v['place_id'] for v in visits})} quán")
    print("Theo auto_status:", dict(sorted(counts.items())))
    print(f"Ảnh: {len(photos)} ({', '.join(f'{s} {sum(1 for p in photos if p['source'] == s)}' for s in ('foody', 'google', 'field'))})"
          f" · review Google: {len(google_reviews)} (reviews.csv: {len(old_reviews)} → "
          f"{len(upsert_reviews(old_reviews, google_reviews))} dòng)")
    for area, (hub_name, _, _) in hubs.items():
        sub = [r for r in rows if r["area"] == area]
        field = sorted((r for r in sub if r["field_priority"] != ""), key=lambda r: r["field_priority"])
        desk = sorted((r for r in sub if r["desk_priority"] != ""), key=lambda r: r["desk_priority"])
        print(f"\n{area} (trung tâm {hub_name}): {len(field)} quán cần đi thực địa, {len(desk)} quán chờ xem tay Maps")
        print("  Đi thực địa, top 10:" + ("" if field else " (chưa có: cần xem tay Maps trước)"))
        for r in field[:10]:
            print(f"    #{r['field_priority']:>2} (đi thứ {r['route_order']:>2}) {r['distance_to_hub_m']:>5} m  "
                  f"{r['auto_status']:<14} {r['name'][:40]}")
        print("  Xem tay Maps, top 10:")
        for r in desk[:10]:
            print(f"    #{r['desk_priority']:>3} {r['distance_to_hub_m']:>5} m  nổi bật {r['prominence']:.2f}  "
                  f"{r['name'][:40]}")
    print(f"\nĐã ghi {VERIFICATION_CSV.name}, {PHOTOS_CSV.name}" + (", reviews.csv" if REVIEWS_CSV.exists() else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
