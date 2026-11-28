"""Read-only restaurant evidence tools; human routing returns a local draft only."""
import csv
import re
import unicodedata
from pathlib import Path
from tracing import tool

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "processed"

def rows(name):
    path = DATA_DIR / name
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        result = list(csv.DictReader(handle))
    if name == "chain_registry.csv":
        additions = Path(__file__).with_name("chain_registry_additions.csv")
        if additions.exists():
            with additions.open(encoding="utf-8-sig", newline="") as handle:
                known = {r["brand_id"] for r in result}
                result += [r for r in csv.DictReader(handle) if r["brand_id"] not in known]
    return result

def norm(text):
    text = str(text).lower().replace("đ", "d")
    text = "".join(c for c in unicodedata.normalize("NFD", text) if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", text)).strip()

def base_name(name):
    return re.split(r"\s+[-–—|]\s+", name, maxsplit=1)[0]

@tool
def search_places(query: str) -> list:
    """Tra quán · input query · output tối đa 5 quán/id · chỉ đọc, không tác động ngoài."""
    places = rows("places.csv")
    ids = re.findall(r"\bp_[a-zA-Z0-9_]+\b", query)
    if ids:
        return [{"place_id": p["place_id"], "name": p["name"]} for p in places if p["place_id"] in ids][:5]
    q = norm(query)
    if not q:
        return []
    hits = []
    for p in places:
        name = norm(p["name"])
        if len(name) >= 3 and (name in q or q in name):
            hits.append((len(name), p))
    return [{"place_id": p["place_id"], "name": p["name"]} for _, p in sorted(hits, key=lambda item: -item[0])[:5]]

@tool
def lookup_chain(name: str) -> dict:
    """Tra thương hiệu · input tên · output registry và số địa chỉ quan sát · chỉ đọc."""
    normalized = norm(name)
    matches = []
    for brand in rows("chain_registry.csv"):
        aliases = [brand["brand_name"]] + brand.get("aliases", "").split(";")
        if any(norm(alias) and (" " + norm(alias) + " ") in (" " + normalized + " ") for alias in aliases):
            matches.append(brand)
    places = [p for p in rows("places.csv") if norm(base_name(p["name"])) == norm(base_name(name))
              and p.get("district") != "van_giang"]
    addresses = {(p.get("lat"), p.get("lng"), norm(p.get("address_text", ""))) for p in places}
    brand = matches[0] if len(matches) == 1 else None
    return {"is_chain": bool(brand) or len(addresses) >= 5,
            "brand_id": brand["brand_id"] if brand else "",
            "scope": brand["scope"] if brand else "",
            "source_url": brand["source_url"] if brand else "",
            "observed_addresses_hn": len(addresses),
            "coverage": "Số địa chỉ trong mẫu, không phải tổng số chi nhánh toàn Hà Nội",
            "ambiguous_registry": len(matches) > 1}

@tool
def get_reviews(place_id: str) -> list:
    """Tra review · input place_id · output tối đa 5 đoạn có nguồn · chỉ đọc."""
    return [{k: r.get(k, "") for k in ("text_excerpt", "lang", "url", "published_at")}
            for r in rows("reviews.csv") if r["place_id"] == place_id][:5]

@tool
def get_place(place_id: str) -> dict:
    """Tra quán · input place_id · output thông tin, giá nguồn và tín hiệu · chỉ đọc."""
    place = next((p for p in rows("places.csv") if p["place_id"] == place_id), None)
    if not place:
        return {}
    result = {k: place.get(k, "") for k in ("place_id", "name", "district", "address_text", "lat", "lng",
              "category", "cuisine", "price_min_k", "price_max_k", "hours_text", "sources", "foody_url")}
    links = [r for r in rows("shopee_place_links.csv") if r.get("place_id") == place_id]
    store_ids = {r["store_id"] for r in links}
    result["online_menu_sample"] = [
        {k: r.get(k, "") for k in ("item_name", "online_price_vnd", "source_url")}
        for r in rows("shopee_menu.csv") if r["store_id"] in store_ids][:8]
    result["price_note"] = "Giá menu online là giá đặt online; không gồm phí giao."
    # Only consume explicit feature values; no missing data is silently treated as a negative.
    feature = next((r for r in rows("features.csv") if r["place_id"] == place_id), {})
    result["tourist_signals"] = [s for s in feature.get("tourist_signals", "").split(";") if s]
    return result

@tool
def flag_for_human(place_id: str, reason: str) -> dict:
    """Chuyển người xem · input id/lý do · output bản nháp hàng đợi · không gửi hay ghi ra ngoài."""
    return {"queued": True, "status": "draft", "place_id": place_id, "reason": reason}
