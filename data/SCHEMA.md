# Schema dữ liệu: quán local ở 4 quận Hà Nội

Phạm vi thu: **Cầu Giấy, Hai Bà Trưng, Hoàng Mai, Gia Lâm**, thêm hai khu đô thị **Vinhomes Ocean Park 1** (Gia Lâm) và **Ocean Park 2 / The Empire** (Văn Giang, Hưng Yên). Ranh giới hai khu lấy từ OSM, ở `crawl/areas.geojson`. Quận `hoan_kiem` chỉ dùng lấy mẫu **bẫy du lịch** cho bộ câu thử (tối đa khoảng 15 quán), không crawl cả quận.

Nguồn sự thật cho máy: [schema/validate.py](schema/validate.py). Bản SQLite: [schema/schema.sql](schema/schema.sql). File CSV để trao đổi nằm ở `data/processed/`, dùng đúng tên cột và **đúng thứ tự cột** dưới đây. Ví dụ đúng format: [schema/examples/](schema/examples/) (dòng ví dụ ghi "VÍ DỤ", không phải dữ liệu thật).

```bash
python data/schema/validate.py data/processed     # chạy trước mỗi lần commit dữ liệu
```

## Ba tầng, ai ghi tầng nào

| Tầng | Bảng | Ai ghi | Ghi bằng gì |
|---|---|---|---|
| Thu về | `places`, `reviews`, `crawl_log` | Đức, Thái | Script crawl trong `crawl/` |
| Thực địa | `field_visits`, `desk_checks` | Cả nhóm khi đi kiểm quán hoặc xem tay Google Maps | Form trên điện thoại, xuất về bằng `crawl/field_visits.py` |
| Kiểm tự động | `verification`, `photos` | Đức | `crawl/verify.py`, không sửa tay |
| Danh mục tay | `chain_registry` | Cường (Thái bổ sung nguồn) | Nhập tay, kèm `source_url` |
| Suy ra và gán nhãn | `features`, `labels` | Pipeline của Cường · Trường và Cường gán nhãn | `features` do script sinh, không sửa tay |

Dữ liệu thô (`data/raw/`) không commit. Chỉ commit CSV đã chuẩn hoá ở `data/processed/` và script chạy lại được.

## places: một dòng một quán

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `place_id` | text, khoá | `p_` + 8 ký tự đầu sha1 của `osm_id`, nếu không có thì `google_place_id`, rồi `foody/<id>` |
| `osm_id`, `google_place_id` | text | Cần ít nhất một trong `osm_id`, `google_place_id`, `foody_url` (quán đội tự thêm khi đi thực địa có nguồn `field` thì miễn). Chỉ giữ id của Google |
| `name`, `name_norm` | text | `name_norm`: chữ thường, bỏ dấu, bỏ ký tự thừa, gộp khoảng trắng. Dùng để nhận ra chi nhánh |
| `district` | enum | `cau_giay` · `hai_ba_trung` · `hoang_mai` · `gia_lam` · `hoan_kiem` (chỉ mẫu bẫy du lịch) · `van_giang` (Ocean Park 2) |
| `address_text`, `lat`, `lng` | | `lat` trong 20.8–21.3, `lng` trong 105.6–106.1 |
| `category` | enum | `restaurant` · `cafe` · `fast_food` · `street_food` · `bakery` · `other` |
| `cuisine` | text | Thẻ cách nhau `;`, vd `pho;bun_cha` |
| `price_level` | 0–4 | Theo thang Google, bỏ trống nếu không có |
| `price_min_k`, `price_max_k` | int | Nghìn đồng |
| `rating`, `rating_count` | | Sao trung bình và số lượt |
| `hours_text` | text | Nguyên văn |
| `brand`, `brand_wikidata` | text | Thẻ của OSM nếu có |
| `sources` | text | Một hoặc nhiều của `osm`, `google`, `manual`, `foody`, `field`, cách nhau `;` |
| `fetched_at` | ISO 8601 | Thời điểm lấy |
| `area` | enum | `ocean_park_1` · `ocean_park_2`; trống nếu quán ngoài hai khu |
| `foody_url` | text | Link trang quán trên Foody. Chỉ lấy thông tin quán, không lấy review hay người dùng Foody |

## field_visits: mỗi lần đội đến quán một dòng

`visit_id` · `place_id` (phải có trong `places`) · `visitor` (thành viên nhóm, vd `duc`) · `visited_at` · `status` (`open` · `closed` · `moved` · `not_found`) · `price_min_k`, `price_max_k` (nghìn đồng, theo menu) · `dishes` (`tên món:giá;…`) · `hours_text` · `phone` (số của quán) · `facebook_url` (fanpage quán) · `tiktok_url` (video review công khai) · `photo_urls` (cách nhau `;`) · `lat`, `lng` · `notes`.

Không chụp mặt người, biển số xe; không ghi tên chủ quán hay khách. Lần đến mới nhất của quán ghi đè giá, giờ mở trong `places` khi chạy `crawl/merge.py`.

## desk_checks: mỗi lần xem tay Google Maps một dòng

`check_id` · `place_id` · `checker` (thành viên nhóm) · `checked_at` · `maps_status` (`open` · `closed_permanently` · `not_found` · `needs_field_check`: Maps có quán nhưng không đủ thông tin để kết luận, cần đi thực địa) · `maps_review_count` (số nguyên, trống nếu không thấy) · `newest_review` (`lt_1m` · `lt_6m` · `older` · `none`) · `has_menu_photo` (`0`/`1`) · `notes`. Mở link Google Maps của quán trên trình duyệt và ghi điều nhìn thấy; không chép review hay tên người viết.

## verification: trạng thái kiểm và hàng đợi, suy ra bằng `crawl/verify.py`

Một dòng một quán Ocean Park, không sửa tay. `auto_status` lấy theo luật đầu tiên đúng: `field_verified` (đã đi thực địa) → `closed` (Google API `CLOSED_PERMANENTLY` hoặc xem tay `closed_permanently`) → `desk_verified` (xem tay thấy mở, review mới nhất dưới 6 tháng) → `auto_verified` (Google API khớp, đang hoạt động, review ≤180 ngày hoặc ≥20 lượt) → `uncertain` (xem tay thấy mở nhưng review cũ/không có, không tìm thấy, chưa xác thực được; hoặc Google API khớp nhưng cũ) → `unverified`.

Cột: `place_id` · `auto_status` · `reasons` (tín hiệu ngắn cách `;`) · `google_place_id`, `match_score` (0–1), `business_status`, `last_review_at`, `rating_count` (từ Google API, trống khi chưa có) · `foody_review_count` · `distance_to_hub_m` (tới Vincom Mega Mall ở OP1, tới cụm quán dày nhất ở OP2; toạ độ ở `HUBS` trong `crawl/verify.py`) · `field_priority` (1..N quán nên đi thực địa: `uncertain` và quán đã xác nhận nổi bật, không bao giờ `closed`) · `desk_priority` (thứ tự xem tay cho quán chưa xem) · `route_order` (thứ tự đi bộ trong khu) · `computed_at`.

## photos: tham chiếu ảnh, không lưu ảnh

`photo_id` (`ph_` + 8 ký tự đầu sha1 của `place_id|source|ref`) · `place_id` · `source` (`foody` · `google` · `field`) · `ref` (URL ảnh bìa Foody hoặc ảnh thực địa; với Google là tên tài nguyên `places/…/photos/…`) · `width_px`, `height_px` · `fetched_at`. Không tải byte ảnh Google (điều khoản Maps Platform cấm lưu nội dung).

## reviews: tối đa 5 đoạn rút gọn mỗi quán

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `review_id`, `place_id` | text | `place_id` phải có trong `places` |
| `source` | enum | `google` · `youtube` · `blog` · `other` |
| `rating` | 1–5 | Bỏ trống nếu nguồn không có sao |
| `text_excerpt` | text | **Tối đa 2 câu và 300 ký tự.** Không có tên người viết |
| `lang` | enum | `vi` · `en` · `ko` · `zh` · `ja` · `fr` · `other` |
| `published_at` | text | `YYYY-MM-DD`, hoặc `YYYY-MM` nếu chỉ biết tháng |
| `url`, `fetched_at` | | Link nguồn để kiểm lại |

Luật dữ liệu của đề: không chép tên người viết review, trích tối đa 2 câu, ghi link và ngày xem. Validator chặn các cột như `author`, `username`, `avatar`.

## chain_registry: danh sách chuỗi, nhập tay

`brand_id` · `brand_name` · `aliases` (các `name_norm` khác của cùng chuỗi, cách nhau `;`) · `scope` (`international` · `national` · `local_origin`) · `origin` (vd `hanoi`) · `known_branches` · `source_url` · `note`.

Mục tiêu 100–150 chuỗi. Chuỗi gốc Hà Nội nhưng nhiều địa chỉ ghi `local_origin` và chính là ca xám của bộ câu thử.

## features: suy ra, không sửa tay

`place_id` · `branches_hn` · `branches_4d` · `chain_id` (khoá tới `chain_registry`) · `review_n` · `foreign_lang_ratio` (0–1) · `menu_bilingual` (0/1) · `price_ratio_district` (giá so với trung vị cùng loại trong quận) · `tourist_signals` (thẻ cách nhau `;`: `bilingual_menu`, `price_2x`, `foreign_reviews`, `touting`) · `computed_at`.

## labels: nhãn tay làm độc lập

Mỗi quán có dòng của `L1` và `L2` làm riêng, rồi một dòng `final` sau khi bàn lại. Tỷ lệ L1 và L2 khớp nhau là con số về độ tin cậy của nhãn, đưa vào báo cáo.

| `label` | Định nghĩa (chốt ở đây để hai người chấm giống nhau) |
|---|---|
| `local` | Độc lập, **không quá 3 địa chỉ**, bán món Việt hoặc đặc sản địa phương |
| `chain` | Có trong `chain_registry`, hoặc cùng `name_norm` ở **5 địa chỉ trở lên** tại Hà Nội |
| `tourist` | Bán chủ yếu cho khách du lịch. Cần **ít nhất 2** trong: menu song ngữ · giá từ 1,7 lần trung vị trở lên · phần lớn review viết bằng tiếng nước ngoài · chèo kéo ngoài cửa |
| `unsure` | Không đủ tín hiệu, hoặc ca xám (đúng 4 địa chỉ, chuỗi gốc Hà Nội chưa vào registry) |

`reason` là một câu có thể kiểm lại, nêu tín hiệu cụ thể.

## crawl_log: mỗi lần chạy một dòng

`run_id` · `source` · `scope` (quận hoặc truy vấn) · `started_at` · `n_rows` · `status` (`ok` · `partial` · `failed`) · `script` (đường dẫn chạy lại được) · `notes`. Đây là phần "cách chọn mẫu và cách đếm kiểm lại được" mà rubric R1 chấm.

## Nối sang bộ câu thử

Mỗi dòng `eval/benchmark.csv` lấy từ một quán có nhãn `final`: `input` là tên và thông tin quán, `expected` là nhãn và lý do, `source` ghi `data_that: places.csv` hoặc `tu_viet`. Ca `tu_choi` là câu ngoài phạm vi ("quán này có sạch không") và review chèn chỉ dẫn.
