# Schema dữ liệu: quán local ở 4 quận Hà Nội

Phạm vi thu: **Cầu Giấy, Hai Bà Trưng, Hoàng Mai, Gia Lâm**. Quận `hoan_kiem` chỉ dùng lấy mẫu **bẫy du lịch** cho bộ câu thử (tối đa khoảng 15 quán), không crawl cả quận.

Nguồn sự thật cho máy: [schema/validate.py](schema/validate.py). Bản SQLite: [schema/schema.sql](schema/schema.sql). File CSV để trao đổi nằm ở `data/processed/`, dùng đúng tên cột và **đúng thứ tự cột** dưới đây. Ví dụ đúng format: [schema/examples/](schema/examples/) (dòng ví dụ ghi "VÍ DỤ", không phải dữ liệu thật).

```bash
python data/schema/validate.py data/processed     # chạy trước mỗi lần commit dữ liệu
```

## Ba tầng, ai ghi tầng nào

| Tầng | Bảng | Ai ghi | Ghi bằng gì |
|---|---|---|---|
| Thu về | `places`, `reviews`, `crawl_log` | Đức, Thái | Script crawl trong `crawl/` |
| Danh mục tay | `chain_registry` | Cường (Thái bổ sung nguồn) | Nhập tay, kèm `source_url` |
| Suy ra và gán nhãn | `features`, `labels` | Pipeline của Cường · Trường và Cường gán nhãn | `features` do script sinh, không sửa tay |

Dữ liệu thô (`data/raw/`) không commit. Chỉ commit CSV đã chuẩn hoá ở `data/processed/` và script chạy lại được.

## places: một dòng một quán

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `place_id` | text, khoá | `p_` + 8 ký tự đầu sha1 của `osm_id` hoặc `google_place_id` |
| `osm_id`, `google_place_id` | text | Một trong hai bắt buộc phải có. Chỉ giữ id của Google |
| `name`, `name_norm` | text | `name_norm`: chữ thường, bỏ dấu, bỏ ký tự thừa, gộp khoảng trắng. Dùng để nhận ra chi nhánh |
| `district` | enum | `cau_giay` · `hai_ba_trung` · `hoang_mai` · `gia_lam` · `hoan_kiem` (chỉ mẫu bẫy du lịch) |
| `address_text`, `lat`, `lng` | | `lat` trong 20.8–21.3, `lng` trong 105.6–106.1 |
| `category` | enum | `restaurant` · `cafe` · `fast_food` · `street_food` · `bakery` · `other` |
| `cuisine` | text | Thẻ cách nhau `;`, vd `pho;bun_cha` |
| `price_level` | 0–4 | Theo thang Google, bỏ trống nếu không có |
| `price_min_k`, `price_max_k` | int | Nghìn đồng |
| `rating`, `rating_count` | | Sao trung bình và số lượt |
| `hours_text` | text | Nguyên văn |
| `brand`, `brand_wikidata` | text | Thẻ của OSM nếu có |
| `sources` | text | Một hoặc nhiều của `osm`, `google`, `manual`, cách nhau `;` |
| `fetched_at` | ISO 8601 | Thời điểm lấy |

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
