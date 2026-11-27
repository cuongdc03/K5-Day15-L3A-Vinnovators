#!/usr/bin/env python3
"""Kiểm các file CSV theo schema. Chỉ dùng thư viện chuẩn.

Dùng:  python data/schema/validate.py data/processed
       python data/schema/validate.py data/schema/examples   (tự kiểm)
Thoát mã 1 nếu có lỗi. File vắng mặt thì bỏ qua, file có mặt phải đúng cột, đúng giá trị, đúng khoá ngoại.
"""
import csv
import re
import sys
from pathlib import Path

DISTRICTS = {"cau_giay", "hai_ba_trung", "hoang_mai", "gia_lam", "hoan_kiem"}

# Cột theo đúng thứ tự trong schema.sql. 'req' là cột không được để trống.
SCHEMA = {
    "places": {
        "cols": ["place_id", "osm_id", "google_place_id", "name", "name_norm", "district", "address_text", "lat", "lng",
                 "category", "cuisine", "price_level", "price_min_k", "price_max_k", "rating", "rating_count",
                 "hours_text", "brand", "brand_wikidata", "sources", "fetched_at"],
        "req": ["place_id", "name", "name_norm", "district", "lat", "lng", "category", "sources", "fetched_at"],
        "enum": {"district": DISTRICTS, "category": {"restaurant", "cafe", "fast_food", "street_food", "bakery", "other"}},
        "multi": {"sources": {"osm", "google", "manual"}},
        "int": ["price_level", "price_min_k", "price_max_k", "rating_count"],
        "float": ["lat", "lng", "rating"],
    },
    "reviews": {
        "cols": ["review_id", "place_id", "source", "rating", "text_excerpt", "lang", "published_at", "url", "fetched_at"],
        "req": ["review_id", "place_id", "source", "text_excerpt", "lang", "fetched_at"],
        "enum": {"source": {"google", "youtube", "blog", "other"}, "lang": {"vi", "en", "ko", "zh", "ja", "fr", "other"}},
        "int": ["rating"],
    },
    "chain_registry": {
        "cols": ["brand_id", "brand_name", "aliases", "scope", "origin", "known_branches", "source_url", "note"],
        "req": ["brand_id", "brand_name", "scope"],
        "enum": {"scope": {"international", "national", "local_origin"}},
        "int": ["known_branches"],
    },
    "crawl_log": {
        "cols": ["run_id", "source", "scope", "started_at", "n_rows", "status", "script", "notes"],
        "req": ["run_id", "source", "scope", "started_at", "n_rows", "status", "script"],
        "enum": {"status": {"ok", "partial", "failed"}},
        "int": ["n_rows"],
    },
    "features": {
        "cols": ["place_id", "branches_hn", "branches_4d", "chain_id", "review_n", "foreign_lang_ratio",
                 "menu_bilingual", "price_ratio_district", "tourist_signals", "computed_at"],
        "req": ["place_id", "computed_at"],
        "enum": {"menu_bilingual": {"0", "1"}},
        "int": ["branches_hn", "branches_4d", "review_n"],
        "float": ["foreign_lang_ratio", "price_ratio_district"],
    },
    "labels": {
        "cols": ["place_id", "labeler", "label", "reason", "labeled_at"],
        "req": ["place_id", "labeler", "label", "reason", "labeled_at"],
        "enum": {"labeler": {"L1", "L2", "final"}, "label": {"local", "chain", "tourist", "unsure"}},
    },
}
RANGE = {("places", "lat"): (20.8, 21.3), ("places", "lng"): (105.6, 106.1),
         ("places", "price_level"): (0, 4), ("places", "rating"): (1, 5), ("reviews", "rating"): (1, 5),
         ("features", "foreign_lang_ratio"): (0, 1)}
FORBIDDEN_REVIEW_COLS = {"author", "author_name", "user", "username", "reviewer", "profile", "avatar", "author_url"}
FK = [("reviews", "place_id", "places", "place_id"), ("features", "place_id", "places", "place_id"),
      ("labels", "place_id", "places", "place_id"), ("features", "chain_id", "chain_registry", "brand_id")]


def sentences(text):
    return len([s for s in re.split(r"(?<=[.!?…])\s+", text.strip()) if s])


def read(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        r = csv.DictReader(f)
        return r.fieldnames or [], list(r)


def main(folder):
    errors, data = [], {}
    for table, spec in SCHEMA.items():
        path = Path(folder) / f"{table}.csv"
        if not path.exists():
            continue
        cols, rows = read(path)
        data[table] = rows
        bad = FORBIDDEN_REVIEW_COLS & set(cols) if table == "reviews" else set()
        if bad:
            errors.append(f"{path}: cột cấm (tên người viết review): {sorted(bad)}")
        if cols != spec["cols"]:
            errors.append(f"{path}: sai cột. Cần đúng thứ tự: {','.join(spec['cols'])}")
            continue
        seen = set()
        for i, row in enumerate(rows, start=2):
            where = f"{path}:{i}"
            for c in spec["req"]:
                if not (row[c] or "").strip():
                    errors.append(f"{where}: cột '{c}' đang trống")
            for c, allowed in spec.get("enum", {}).items():
                if row[c] and row[c] not in allowed:
                    errors.append(f"{where}: {c}='{row[c]}' không thuộc {sorted(allowed)}")
            for c, allowed in spec.get("multi", {}).items():
                for tok in filter(None, row[c].split(";")):
                    if tok not in allowed:
                        errors.append(f"{where}: {c} có '{tok}', chỉ nhận {sorted(allowed)}")
            for c in spec.get("int", []):
                if row[c]:
                    try:
                        int(row[c])
                    except ValueError:
                        errors.append(f"{where}: {c}='{row[c]}' không phải số nguyên")
            for c in spec.get("float", []):
                if row[c]:
                    try:
                        float(row[c])
                    except ValueError:
                        errors.append(f"{where}: {c}='{row[c]}' không phải số")
            for (t, c), (lo, hi) in RANGE.items():
                if t == table and row[c]:
                    try:
                        if not lo <= float(row[c]) <= hi:
                            errors.append(f"{where}: {c}={row[c]} ngoài khoảng [{lo}, {hi}]")
                    except ValueError:
                        pass
            if table == "reviews":
                t = row["text_excerpt"]
                if len(t) > 300:
                    errors.append(f"{where}: text_excerpt dài {len(t)} ký tự, tối đa 300")
                if sentences(t) > 2:
                    errors.append(f"{where}: text_excerpt quá 2 câu")
            key = tuple(row[c] for c in (("place_id", "labeler") if table == "labels" else (spec["cols"][0],)))
            if key in seen:
                errors.append(f"{where}: khoá {key} bị trùng")
            seen.add(key)
    for t, c, rt, rc in FK:
        if t in data and rt in data:
            valid = {r[rc] for r in data[rt]}
            for i, r in enumerate(data[t], start=2):
                if r[c] and r[c] not in valid:
                    errors.append(f"{folder}/{t}.csv:{i}: {c}='{r[c]}' không có trong {rt}.{rc}")
    # Quán ngoài 4 quận chỉ được dùng làm mẫu bẫy du lịch (hoan_kiem), nhắc nếu quá nhiều
    if "places" in data:
        n_hk = sum(1 for r in data["places"] if r["district"] == "hoan_kiem")
        if n_hk > 30:
            errors.append(f"places: {n_hk} quán hoan_kiem, chỉ dùng để lấy mẫu bẫy du lịch, đừng crawl cả quận")
    print(f"Đã kiểm: {', '.join(f'{k} ({len(v)} dòng)' for k, v in data.items()) or 'không có file nào'}")
    if errors:
        print(f"\n{len(errors)} lỗi:")
        for e in errors[:80]:
            print(" ✗", e)
        return 1
    print("OK, đúng schema.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "data/processed"))
