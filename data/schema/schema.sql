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

-- Xem tay Google Maps trên trình duyệt (không qua API). Mỗi lần xem một dòng.
CREATE TABLE desk_checks (
  check_id           TEXT PRIMARY KEY,
  place_id           TEXT NOT NULL REFERENCES places(place_id),
  checker            TEXT NOT NULL,           -- thành viên nhóm đã xem (vd 'duc')
  checked_at         TEXT NOT NULL,           -- ISO 8601
  maps_status        TEXT NOT NULL CHECK (maps_status IN ('open','closed_permanently','closed_temporarily','not_found')),
  maps_review_count  INTEGER,                 -- số review hiện trên Maps, trống nếu không thấy
  newest_review      TEXT CHECK (newest_review IN ('lt_1m','lt_6m','older','none')),
  has_menu_photo     INTEGER CHECK (has_menu_photo IN (0,1)),
  notes              TEXT
);
CREATE INDEX idx_desk_checks_place ON desk_checks(place_id);

-- Suy ra bằng crawl/verify.py; không điền tay. Một dòng một quán Ocean Park.
CREATE TABLE verification (
  place_id            TEXT PRIMARY KEY REFERENCES places(place_id),
  auto_status         TEXT NOT NULL CHECK (auto_status IN ('field_verified','closed','desk_verified','auto_verified','uncertain','unverified')),
  reasons             TEXT NOT NULL,          -- tín hiệu ngắn cách nhau ';'
  google_place_id     TEXT,                   -- quán Google API khớp, nếu có
  match_score         REAL CHECK (match_score BETWEEN 0 AND 1),
  business_status     TEXT CHECK (business_status IN ('OPERATIONAL','CLOSED_TEMPORARILY','CLOSED_PERMANENTLY')),
  last_review_at      TEXT,                   -- YYYY-MM-DD review Google mới nhất
  rating_count        INTEGER,                -- số lượt đánh giá Google (API)
  foody_review_count  INTEGER,
  distance_to_hub_m   INTEGER NOT NULL,       -- tới trung tâm khu (Vincom Mega Mall OP1, The Empire OP2)
  field_priority      INTEGER,                -- 1..N quán nên đi thực địa, trống nếu không cần
  desk_priority       INTEGER,                -- thứ tự xem tay Maps cho quán chưa xem, trống nếu đã xem
  route_order         INTEGER,                -- thứ tự đi bộ trong khu, chỉ cho quán có field_priority
  computed_at         TEXT NOT NULL
);

-- Ảnh của quán: chỉ giữ tham chiếu. Ảnh Google chỉ giữ tên tài nguyên, không tải byte (điều khoản Maps Platform).
CREATE TABLE photos (
  photo_id    TEXT PRIMARY KEY,               -- 'ph_' + 8 ký tự đầu sha1(place_id|source|ref)
  place_id    TEXT NOT NULL REFERENCES places(place_id),
  source      TEXT NOT NULL CHECK (source IN ('foody','google','field')),
  ref         TEXT NOT NULL,                  -- URL (foody, field) hoặc tên tài nguyên 'places/…/photos/…' (google)
  width_px    INTEGER,
  height_px   INTEGER,
  fetched_at  TEXT NOT NULL
);
CREATE INDEX idx_photos_place ON photos(place_id);

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
