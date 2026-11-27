# Data card — dữ liệu bản chạy thử dùng

> Điền ở guide bước 2.4 (bản đầu ở CP2, đủ ở CP3). Ôn lại: ngày 6 · lab ngày 6. Chấm ở rubric R4.
> Một trang. Mỗi dataset một mục. Dữ liệu chạy thử (bài mẫu, thông báo mẫu, đoạn transcript…) để trong thư mục `data/` này.
> Không commit nguyên tài liệu khoá, dữ liệu cá nhân thật hay nguyên file data BTC cấp — chỉ đoạn trích ngắn, bản viết lại, hoặc số đã tổng hợp.

## Dataset 1 · Quán ăn Ocean Park 1, 2 (`data/processed/places.csv`, cột `area` có giá trị)

| | |
|---|---|
| Dùng để làm gì | Danh sách quán cho bản đồ và cho công cụ `get_place` · danh sách quán để đội đi kiểm thực địa · nguồn chọn quán cho bộ câu thử |
| Từ đâu | (1) OpenStreetMap qua Overpass API, giấy phép ODbL. (2) Trang tìm kiếm công khai của Foody.vn (bản JSON trang web tự tải), chỉ thông tin quán. (3) Google Places API (New): script có sẵn (`crawl/places_api.py`), **chưa chạy vì chưa có key** |
| Xử lý những bước gì | Ranh giới khu lấy từ OSM (`crawl/areas.py` → `crawl/areas.geojson`: OP1 = way 761986888, OP2 = way 1145184206); giữ quán trong khu hoặc cách mép ≤150 m · OSM: bỏ điểm không tên · Foody: 66 từ khoá (tên khu, phân khu, món), tối đa 5 trang mỗi từ khoá, nghỉ 2 giây giữa request, gộp theo id Foody · gộp trùng giữa nguồn khi cách ≤100 m và tên khớp sau khi bỏ dấu (`crawl/merge.py`, danh sách cặp gộp ở `data/raw/merge_report.txt`) · `place_id` giữ nguyên qua các lần chạy lại |
| Số dòng | **422 quán**: OP1 364 (OSM 10, Foody 356), OP2 58 (OSM 23, Foody 36); 6 cặp gộp giữa OSM và Foody. Loại: 244 nhà hàng/quán ăn, 134 cà phê/trà, 16 ăn vặt, 4 tiệm bánh, 1 đồ ăn nhanh, 23 khác |
| Phiên bản / ngày lấy | 27/11/2026, xem `data/processed/crawl_log.csv` (run_0001 → run_0008) |
| Nhãn | thật (dữ liệu công khai), chưa kiểm thực địa. Nhãn `local` / `chain` / `tourist` / `unsure`: chưa có `labels.csv`; 15 quán trong `eval/benchmark.csv` mới có nhãn nháp của Đức (`L2`), chờ Cường gán `L1` rồi bàn ra `final` |
| Chưa phủ | 4 quận Cầu Giấy, Hai Bà Trưng, Hoàng Mai, Gia Lâm (ngoài Ocean Park) **chưa crawl**: `crawl/overpass.py` chạy được cho mọi vùng trong `crawl/areas.geojson` nhưng mới khai báo 2 khu Ocean Park. Mục tiêu spec "mỗi quận ≥60 quán" chưa đạt |
| Giới hạn | OSM rất thưa ở khu đô thị mới (33 quán). Foody lệch về quán có đăng ký giao hàng (ShopeeFood), thiếu quán vỉa hè; 25 mục "Shop Online" là bếp nhà bán online, có thể không có mặt tiền; 10 mục "Trạm Tiếp Sức ShopeeFood" là điểm nghỉ của tài xế, không phải quán ăn (giữ lại, chờ loại sau khi kiểm, câu thử B12); gần như **không có giá** (PriceMin/PriceMax = 0). OP2 ít quán hơn hẳn OP1 (khu mới, ít trên Foody). Toạ độ Foody có thể lệch vài chục mét. Vài quán Ocean Park 3 nằm trong dải 150 m quanh OP2. Chưa có điểm sao (điểm Foody thang 10 không đưa vào cột `rating` thang 1–5). Không lấy review, tên hay ảnh người dùng Foody |

## Dataset 2 · Dữ liệu thực địa (`data/processed/field_visits.csv`)

| | |
|---|---|
| Dùng để làm gì | Nguồn sự thật cho giá, món, ảnh, trạng thái quán (còn mở, đóng, chuyển chỗ); kiểm lại Dataset 1 |
| Từ đâu | Nhóm đến tận quán, ghi bằng form trên điện thoại (`tools/field_form.html`, xuất bản trên claude.ai). Link fanpage Facebook và video TikTok do người kiểm dán tay, không cào tự động |
| Xử lý những bước gì | Kéo dữ liệu form về rồi `python crawl/field_visits.py <thư mục>` → CSV; `crawl/merge.py` đưa giá và giờ mở của lần kiểm mới nhất vào `places.csv` |
| Số dòng | 0 *(chưa đi kiểm)* |
| Nhãn | thật, do nhóm thu |
| Giới hạn | Chỉ phủ quán nhóm đi được; giá theo menu ngày kiểm. Không chụp mặt người, biển số xe; không ghi tên chủ quán, khách; số điện thoại chỉ là số của quán in trên biển hoặc menu. Ảnh lưu trong artifact, repo chỉ ghi `asset:<id>` |

## Dataset 3 · Trạng thái kiểm và hàng đợi (`data/processed/verification.csv`, `desk_checks.csv`)

| | |
|---|---|
| Dùng để làm gì | Thu 422 quán về danh sách ngắn: quán nào xem tay Google Maps trước (`desk_priority`), quán nào phải đi tận nơi (`field_priority`, mặc định 40, kèm `route_order` đi bộ từ Vincom Mega Mall ở OP1, từ cụm quán dày nhất quanh Phở Lý Quốc Sư ở OP2) |
| Từ đâu | Suy ra bằng `crawl/verify.py` từ `places.csv`, Foody, `desk_checks.csv` (nhóm mở link Google Maps trên trình duyệt và ghi trạng thái, số review, độ mới review, có ảnh menu bằng chế độ "Kiểm tại bàn" của `tools/field_form.html`), `field_visits.csv`. Google Places API: **không dùng, nhóm không có key thanh toán**; `crawl/google_verify.py` để sẵn, chỉ chạy `--dry-run` |
| Xử lý những bước gì | Bảng luật, luật đầu đúng thì dùng: `field_verified` → `closed` → `desk_verified` (Maps mở, review < 6 tháng) → `auto_verified` (chỉ khi có Google API) → `uncertain` → `unverified`. `reasons` ghi tín hiệu. Độ nổi bật = log số review Maps + log số review Foody + số nguồn + có trên OSM; ưu tiên thực địa trừ 1 điểm mỗi km tới trung tâm khu |
| Số dòng | 422, một dòng một quán; xem số theo trạng thái khi chạy script |
| Giới hạn | Chưa có lần xem tay nào nên mọi quán đang `unverified`, `field_priority` trống; `desk_priority` lúc này gần như chỉ xếp theo khoảng cách vì chỉ 14/391 quán Foody có review. Ngưỡng 6 tháng, 20 lượt đánh giá, 1 điểm/km là chọn tay, chưa hiệu chỉnh |

## Dataset 4 · Ảnh (`data/processed/photos.csv`)

| | |
|---|---|
| Dùng để làm gì | Ảnh minh hoạ quán trên bản đồ; biết quán nào chưa có ảnh để chụp khi đi thực địa |
| Từ đâu | URL ảnh bìa Foody (`PicturePathLarge`), link ảnh trong `field_visits.csv`. Ảnh Google chỉ giữ tên tài nguyên `places/…/photos/…` nếu sau này có API, không tải byte (điều khoản Maps Platform) |
| Giới hạn | Chỉ giữ link, không tải ảnh về repo; ảnh bìa Foody do chủ quán hoặc Foody đăng, có thể cũ |

## Review Google (`data/processed/reviews.csv`, `source=google`)

**Chưa có**: cần Google Places API mà nhóm không có key. Khi có, `crawl/verify.py` thêm tối đa 5 review mỗi quán (đoạn trích ≤2 câu, ≤300 ký tự, không tên người viết, `review_id` = `r_` + sha1 tên review Google), giữ nguyên dòng của nguồn khác, chạy lại không sinh dòng trùng. Foody chỉ có 101 review trên 14/391 quán nên không đủ làm nguồn review.

**Data `synthetic` (nhóm tự sinh):** chưa có. Data tự dựng **không phải bằng chứng pain**.
