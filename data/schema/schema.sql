-- Schema dữ liệu "quán local Hà Nội" (SQLite). File CSV trong data/processed/ dùng đúng tên cột và thứ tự cột ở đây.
-- Nguồn sự thật để kiểm CSV là data/schema/validate.py; mô tả cho người đọc là data/SCHEMA.md.
-- Tách ba tầng: thu về (places, reviews, crawl_log) · danh mục tay (chain_registry) · suy ra và gán nhãn (features, labels).

PRAGMA foreign_keys = ON;

CREATE TABLE places (
  place_id         TEXT PRIMARY KEY,          -- 'p_' + 8 ký tự đầu sha1(osm_id hoặc google_place_id)
  osm_id           TEXT,                      -- vd 'node/123456'
  google_place_id  TEXT,                      -- chỉ giữ id, không giữ nội dung Google ngoài các trường dưới
  name             TEXT NOT NULL,
  name_norm        TEXT NOT NULL,             -- chữ thường, bỏ dấu, bỏ ký tự thừa, gộp khoảng trắng
  district         TEXT NOT NULL CHECK (district IN ('cau_giay','hai_ba_trung','hoang_mai','gia_lam','hoan_kiem','van_giang')),
  address_text     TEXT,
  lat              REAL NOT NULL,
  lng              REAL NOT NULL,
  category         TEXT NOT NULL CHECK (category IN ('restaurant','cafe','fast_food','street_food','bakery','other')),
  cuisine          TEXT,                      -- thẻ cách nhau bằng ';' vd 'pho;bun_cha'
  price_level      INTEGER CHECK (price_level BETWEEN 0 AND 4),
  price_min_k      INTEGER,                   -- nghìn đồng
  price_max_k      INTEGER,
  rating           REAL CHECK (rating BETWEEN 1 AND 5),
  rating_count     INTEGER,
  hours_text       TEXT,
  brand            TEXT,                      -- thẻ brand của OSM nếu có
  brand_wikidata   TEXT,
  sources          TEXT NOT NULL,             -- một hoặc nhiều của 'osm;google;manual;foody;field'
  fetched_at       TEXT NOT NULL,             -- ISO 8601
  area             TEXT CHECK (area IN ('ocean_park_1','ocean_park_2')),  -- khu đô thị, trống nếu ngoài Ocean Park
  foody_url        TEXT                       -- link trang quán trên Foody nếu có
);
CREATE INDEX idx_places_name_norm ON places(name_norm);
CREATE INDEX idx_places_district ON places(district);

CREATE TABLE reviews (
  review_id     TEXT PRIMARY KEY,
  place_id      TEXT NOT NULL REFERENCES places(place_id),
  source        TEXT NOT NULL CHECK (source IN ('google','youtube','blog','other')),
  rating        INTEGER CHECK (rating BETWEEN 1 AND 5),
  text_excerpt  TEXT NOT NULL,                -- tối đa 2 câu và 300 ký tự; KHÔNG có tên người viết
  lang          TEXT NOT NULL CHECK (lang IN ('vi','en','ko','zh','ja','fr','other')),
  published_at  TEXT,                         -- YYYY-MM-DD hoặc YYYY-MM nếu chỉ biết tháng
  url           TEXT,                         -- link nguồn để kiểm lại
  fetched_at    TEXT NOT NULL
);
CREATE INDEX idx_reviews_place ON reviews(place_id);

-- Dữ liệu đội đi thực địa ghi bằng form trên điện thoại. Mỗi lần đến quán một dòng.
CREATE TABLE field_visits (
  visit_id      TEXT PRIMARY KEY,
  place_id      TEXT NOT NULL REFERENCES places(place_id),
  visitor       TEXT NOT NULL,                -- thành viên nhóm đi kiểm (vd 'duc'), không phải khách
  visited_at    TEXT NOT NULL,                -- ISO 8601
  status        TEXT NOT NULL CHECK (status IN ('open','closed','moved','not_found')),
  price_min_k   INTEGER,                      -- nghìn đồng, theo menu tại quán
  price_max_k   INTEGER,
  dishes        TEXT,                         -- 'tên món:giá k;tên món:giá k'
  hours_text    TEXT,
  phone         TEXT,                         -- số của quán (in trên biển / menu), không phải số cá nhân
  facebook_url  TEXT,                         -- fanpage của quán
  tiktok_url    TEXT,                         -- video review công khai
  photo_urls    TEXT,                         -- link ảnh, cách nhau ';'
  lat           REAL,                         -- vị trí đứng trước quán, nếu có
  lng           REAL,
  notes         TEXT
);
CREATE INDEX idx_field_visits_place ON field_visits(place_id);

CREATE TABLE chain_registry (
  brand_id        TEXT PRIMARY KEY,           -- vd 'kfc'
  brand_name      TEXT NOT NULL,
  aliases         TEXT,                       -- name_norm khác nhau của cùng chuỗi, cách nhau ';'
  scope           TEXT NOT NULL CHECK (scope IN ('international','national','local_origin')),
  origin          TEXT,                       -- vd 'hanoi' cho chuỗi gốc Hà Nội
  known_branches  INTEGER,
  source_url      TEXT,
  note            TEXT
);

CREATE TABLE crawl_log (
  run_id      TEXT PRIMARY KEY,
  source      TEXT NOT NULL,                  -- 'overpass', 'google_places', 'youtube', ...
  scope       TEXT NOT NULL,                  -- quận hoặc truy vấn đã chạy
  started_at  TEXT NOT NULL,
  n_rows      INTEGER NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('ok','partial','failed')),
  script      TEXT NOT NULL,                  -- đường dẫn script chạy lại được
  notes       TEXT
);

-- Suy ra từ places, reviews, chain_registry bằng pipeline; không điền tay.
CREATE TABLE features (
  place_id               TEXT PRIMARY KEY REFERENCES places(place_id),
  branches_hn            INTEGER,             -- số địa chỉ cùng name_norm trong dữ liệu Hà Nội
  branches_4d            INTEGER,             -- số địa chỉ cùng name_norm trong 4 quận
  chain_id               TEXT REFERENCES chain_registry(brand_id),
  review_n               INTEGER,
  foreign_lang_ratio     REAL CHECK (foreign_lang_ratio BETWEEN 0 AND 1),
  menu_bilingual         INTEGER CHECK (menu_bilingual IN (0,1)),
  price_ratio_district   REAL,                -- giá / trung vị cùng loại trong quận
  tourist_signals        TEXT,                -- thẻ cách nhau ';' vd 'bilingual_menu;price_2x;foreign_reviews;touting'
  computed_at            TEXT NOT NULL
);

-- Nhãn tay. Mỗi quán có nhãn của L1 và L2 làm độc lập, rồi một dòng 'final' sau khi bàn lại.
CREATE TABLE labels (
  place_id    TEXT NOT NULL REFERENCES places(place_id),
  labeler     TEXT NOT NULL CHECK (labeler IN ('L1','L2','final')),
  label       TEXT NOT NULL CHECK (label IN ('local','chain','tourist','unsure')),
  reason      TEXT NOT NULL,                  -- một câu, kiểm lại được
  labeled_at  TEXT NOT NULL,
  PRIMARY KEY (place_id, labeler)
);
