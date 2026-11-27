"""Hàm dùng chung cho các script crawl. Chỉ dùng thư viện chuẩn.

Gồm: gọi HTTP có thử lại, đọc vùng crawl (crawl/areas.geojson), kiểm điểm trong vùng,
chuẩn hoá tên (name_norm), sinh place_id, ghi crawl_log.
"""
import csv
import hashlib
import json
import math
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
AREAS_FILE = Path(__file__).resolve().parent / "areas.geojson"
CRAWL_LOG = PROCESSED_DIR / "crawl_log.csv"
CRAWL_LOG_COLS = ["run_id", "source", "scope", "started_at", "n_rows", "status", "script", "notes"]
USER_AGENT = "food-map-student-project/0.1 (AI20K hackathon)"
VN_TZ = timezone(timedelta(hours=7))

# Quán nằm ngoài ranh giới khu nhưng cách mép không quá chừng này (mét) vẫn được tính:
# shophouse ở đường bao và cổng khu thường nằm ngay mép polygon trên OSM.
EDGE_BUFFER_M = 150

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def now_iso():
    return datetime.now(VN_TZ).isoformat(timespec="seconds")


def load_env(path=ROOT / ".env"):
    """Đọc .env đơn giản (KEY=VALUE) vào os.environ nếu biến chưa có."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def http_request(url, data=None, headers=None, method=None, retries=4, timeout=90, backoff=5):
    """Gọi HTTP, thử lại khi lỗi mạng hoặc 429/5xx (chờ tăng gấp đôi). Trả về bytes."""
    hdrs = {"User-Agent": USER_AGENT}
    hdrs.update(headers or {})
    if isinstance(data, str):
        data = data.encode("utf-8")
    last = None
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            last = e
            body = e.read()[:300].decode("utf-8", "ignore")
            if e.code not in (429, 500, 502, 503, 504):
                raise RuntimeError(f"HTTP {e.code} từ {url}: {body}") from e
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last = e
        wait = backoff * (2 ** attempt)
        print(f"  lỗi tạm thời ({last}); thử lại sau {wait}s", file=sys.stderr)
        time.sleep(wait)
    raise RuntimeError(f"Hết lượt thử lại cho {url}: {last}")


def http_json(url, **kw):
    return json.loads(http_request(url, **kw).decode("utf-8-sig"))


# ---------- Vùng crawl ----------

def load_areas():
    """Trả về danh sách vùng từ areas.geojson: {area, district, name, rings, bbox}."""
    if not AREAS_FILE.exists():
        sys.exit("Chưa có crawl/areas.geojson. Chạy trước: python crawl/areas.py")
    gj = json.loads(AREAS_FILE.read_text(encoding="utf-8"))
    areas = []
    for f in gj["features"]:
        geom = f["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        rings = [poly[0] for poly in polys]  # chỉ lấy vòng ngoài
        lngs = [p[0] for r in rings for p in r]
        lats = [p[1] for r in rings for p in r]
        areas.append({**f["properties"], "rings": rings, "bbox": (min(lats), min(lngs), max(lats), max(lngs))})
    return areas


def haversine_m(lat1, lng1, lat2, lng2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _in_ring(lat, lng, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > lat) != (yj > lat) and lng < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def _dist_to_ring_m(lat, lng, ring):
    """Khoảng cách gần đúng (mét) từ điểm tới cạnh polygon, dùng phép chiếu phẳng cục bộ."""
    kx = 111320 * math.cos(math.radians(lat))
    ky = 110540
    best = float("inf")
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        ax, ay = (x1 - lng) * kx, (y1 - lat) * ky
        bx, by = (x2 - lng) * kx, (y2 - lat) * ky
        dx, dy = bx - ax, by - ay
        L = dx * dx + dy * dy
        t = 0 if L == 0 else max(0, min(1, -(ax * dx + ay * dy) / L))
        best = min(best, math.hypot(ax + t * dx, ay + t * dy))
    return best


def area_of(lat, lng, areas, buffer_m=EDGE_BUFFER_M):
    """Trả về vùng chứa điểm (hoặc cách mép ≤ buffer_m), None nếu không thuộc vùng nào."""
    for a in areas:
        s, w, n, e = a["bbox"]
        pad = buffer_m / 100000
        if not (s - pad <= lat <= n + pad and w - pad <= lng <= e + pad):
            continue
        for ring in a["rings"]:
            if _in_ring(lat, lng, ring) or _dist_to_ring_m(lat, lng, ring) <= buffer_m:
                return a
    return None


def expanded_bbox(area, buffer_m=EDGE_BUFFER_M):
    s, w, n, e = area["bbox"]
    pad_lat = buffer_m / 110540
    pad_lng = buffer_m / (111320 * math.cos(math.radians((s + n) / 2)))
    return s - pad_lat, w - pad_lng, n + pad_lat, e + pad_lng


# ---------- Tên và id ----------

def strip_accents(text):
    text = text.replace("đ", "d").replace("Đ", "D")
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def name_norm(name):
    """Chữ thường, bỏ dấu, bỏ ký tự thừa, gộp khoảng trắng (đúng định nghĩa trong data/SCHEMA.md)."""
    t = strip_accents(name or "").lower()
    t = re.sub(r"[^a-z0-9 ]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def make_place_id(key):
    return "p_" + hashlib.sha1(key.encode("utf-8")).hexdigest()[:8]


def slug(text):
    return name_norm(text).replace(" ", "_")


# ---------- Ghi file ----------

def write_raw(name, payload):
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    path = RAW_DIR / name
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    return path


def append_crawl_log(source, scope, started_at, n_rows, status, script, notes=""):
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    if CRAWL_LOG.exists():
        with open(CRAWL_LOG, newline="", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
    run_id = f"run_{len(rows) + 1:04d}"
    rows.append({"run_id": run_id, "source": source, "scope": scope, "started_at": started_at,
                 "n_rows": n_rows, "status": status, "script": script, "notes": notes})
    with open(CRAWL_LOG, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CRAWL_LOG_COLS)
        w.writeheader()
        w.writerows(rows)
    return run_id
