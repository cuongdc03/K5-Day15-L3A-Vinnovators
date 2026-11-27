# Kế hoạch và chia việc: Vinnovators, track F

Lát cắt: *một dân văn phòng · chọn quán ăn trưa local gần chỗ làm · AI quyết định quán là local thật, chuỗi, bẫy du lịch hay chưa chắc, kèm lý do · người dùng không phải đọc review từng quán, đo bằng % khớp nhãn tay.*

**Phạm vi đã đổi:** thu data ở **Cầu Giấy, Hai Bà Trưng, Hoàng Mai, Gia Lâm** (trước đó chỉ Hoàn Kiếm). Schema: [data/SCHEMA.md](../data/SCHEMA.md).

## Mốc

| Mốc | Hạn | Phải có (theo rubric) |
|---|---|---|
| CP2 | 19:30 Thứ Sáu 27/11 | Canvas cập nhật · schema chốt · `places.csv` bản đầu · ≥10 câu thử · bản đầu `DATA_CARD.md` |
| CP3 | 10:00 Thứ Bảy 28/11 | Số đầu của bằng chứng pain · 20–30 câu thử · agent gọi AI thật chạy được lượt 1 |
| CP4 | 14:30 Thứ Bảy 28/11 | `eval/report.md` lượt 1 → lượt 2 · `cost/` · slide · demo · `run.py eval` và `run.py simulate` chạy được |

## Chia việc

| Người | Vai | Việc chính | Ra file | Xong khi |
|---|---|---|---|---|
| **Cường** | PM, tech lead | Chốt schema và review PR · danh sách `chain_registry` (100–150 chuỗi) · pipeline `features` (chuẩn hoá tên, đếm chi nhánh, khớp OSM với Google) · agent và công cụ gọi AI thật · ghép demo 3D · slide | `data/schema/`, `data/processed/chain_registry.csv`, `data/processed/features.csv`, `codebase/` | Agent đọc `places` + `features` và trả nhãn kèm lý do |
| **Đức** | Crawl A | Lấy khung quán 4 quận từ **OpenStreetMap (Overpass)** · làm giàu bằng **Google Places API** (chi tiết, giá, giờ, tối đa 5 review) cho mẫu 300–500 quán · ghi `crawl_log` | `crawl/overpass.py`, `crawl/places_api.py`, `data/processed/places.csv` | `validate.py` báo OK · mỗi quận có ≥60 quán |
| **Thái** | Crawl B | Review và tín hiệu: review đã rút gọn từ Places API · bình luận YouTube và bài báo ẩm thực công khai cho quán nổi bật · phát hiện ngôn ngữ · nguồn cho `chain_registry` (trang cửa hàng công khai của chuỗi) | `crawl/reviews.py`, `data/processed/reviews.csv` | `validate.py` báo OK · ≥3 review cho 150 quán |
| **Trường** | Bằng chứng và đánh giá | Khảo sát ≥20 người và phỏng vấn ≥3 người (`evidence/`) · gán nhãn `L2` (Cường gán `L1`) · `eval/benchmark.csv` 20–30 câu · `metric_spec.yaml` · báo cáo đánh giá | `evidence/`, `data/processed/labels.csv`, `eval/` | Có số đầu cho dòng 4 của canvas · ≥20 câu thử có nhãn `final` |

**Việc không có người thuộc về, chia khi tới:** mô phỏng chi phí (`cost/`) giao cho Thái sau khi crawl xong, và `DATA_CARD.md` do Đức và Thái điền cho phần data của mình.

## Thứ tự phụ thuộc

1. **Ngay bây giờ, song song:** Cường merge schema · Đức chạy Overpass · Thái viết bộ phát hiện ngôn ngữ và thu nguồn chuỗi · Trường gửi khảo sát.
2. Đức có `places.csv` → Thái lấy review cho mẫu đó · Cường chạy `features`.
3. Có `features` → Cường và Trường chọn 30–60 quán để gán nhãn độc lập, rồi bàn lại thành `final`.
4. Có nhãn `final` → Trường dựng `benchmark.csv`, Cường chạy agent lượt 1.

## Quy ước làm việc

- Nhánh theo việc: `data/crawl-osm`, `data/crawl-reviews`, `feat/features`, `eval/benchmark`… tách từ `main`. Mở PR, Cường review rồi merge. Không push thẳng vào `main`.
- Mọi file CSV đưa lên đã qua `python data/schema/validate.py data/processed`.
- Không commit `data/raw/`, khoá API (`.env`), tên người viết review.
- Mọi lần crawl ghi một dòng vào `crawl_log` và có script chạy lại được.

## Rủi ro và cách chặn

| Rủi ro | Vì sao | Cách chặn |
|---|---|---|
| **Ít quán "bẫy du lịch" ở 4 quận này** | Bẫy du lịch tập trung ở Hoàn Kiếm và quanh Hồ Tây, còn 4 quận này chủ yếu quán cho dân địa phương | Lấy mẫu có chủ đích tối đa khoảng 15 quán `hoan_kiem` cho bộ câu thử, ghi rõ trong `DATA_CARD.md`. Nếu vẫn thiếu, hạ `tourist` thành lớp phụ và đo chính trên local, chuỗi, chưa chắc |
| **Điều khoản Google** | Places API hạn chế lưu và phát lại nội dung ngoài `place_id` | Chỉ lưu đoạn rút gọn đủ cho đánh giá, không phát lại, ghi link và ngày xem. Đức kiểm điều khoản trước khi chạy hàng loạt |
| **OSM thiếu ở Gia Lâm và Hoàng Mai** | Quán vỉa hè ít được gắn thẻ | Ghi giới hạn vào data card. Nếu một quận dưới 30 quán, bổ sung nhập tay có `sources=manual` |
| **Nhãn "local" chủ quan** | Ca xám quyết định điểm đo | Định nghĩa đã chốt ở `data/SCHEMA.md`. Hai người gán độc lập, báo cáo tỷ lệ khớp |
| **Scrape trái điều khoản** | Foody, Facebook, TikTok cấm hoặc chặn | Không dùng. Chỉ nguồn chính thức và trang công khai nhẹ |

## Cần Cường chốt

- Có giữ nhãn `tourist` làm lớp chính không, hay hạ xuống lớp phụ do rủi ro đầu bảng?
- Gia Lâm khá xa trung tâm, có giữ trong 4 quận không? Nếu bỏ, thay bằng một quận có nhiều quán hơn.
