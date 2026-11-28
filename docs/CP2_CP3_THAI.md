# CP2 và CP3 — bàn giao phần Thái

Bản làm việc sau khi đồng bộ `main` tại commit `1f8cf1d`, ngày 27/11/2026. Phân công theo `docs/PLAN.md`: Thái phụ trách review, ngôn ngữ, nguồn chuỗi và bằng chứng pain; mô phỏng chi phí sau crawl.

## CP2

- Bản nhóm có 422 quán (364 Gia Lâm, 58 Văn Giang), 20 câu benchmark và 4 metric. `python run.py check` và validator schema đều đạt.
- Đã thêm importer `crawl/reviews.py`, nhận CSV review công khai đã bỏ định danh, kiểm `place_id`, URL, sao, ngôn ngữ và giới hạn 2 câu/300 ký tự. Trùng nội dung cùng quán/nguồn/ngày được khử trùng; tối đa 5 review/quán. File cũ được giữ khi không có nguồn mới.
- Đã thêm 6 thương hiệu có nguồn vào `chain_registry.csv`. Đây là phần bổ sung ban đầu; mục tiêu 100–150 chuỗi của Cường chưa đạt.
- Bộ câu hỏi và hướng dẫn phỏng vấn ở `evidence/survey/questions.md`, `evidence/interviews/GUIDE.md`.
- Dữ liệu ShopeeFood được thu lại từ danh sách URL gốc vì backup ở vùng tạm phiên trước không còn tồn tại. Bản thu mới có thời điểm riêng; không gọi đó là snapshot cũ.

## CP3 — đầu vào thật còn thiếu

Kết quả menu mới: 151 URL (150 quán + 1 khu vực), 4.308 dòng, 138 quán có menu đọc đủ. Nối chính xác 10 quán với places.csv; 140 quán chưa nối được vẫn giữ đầy đủ dữ liệu nguồn. Snapshot mới thay đổi 1 dòng so với số 4.307 của phiên trước. Kiểm các khóa nối và tổng số dòng đã đạt.

Người dùng xác nhận chưa có khảo sát, phỏng vấn, API key hoặc nguồn nào khác ngoài repo. Vì vậy hiện có **0 review, 0/150 quán có ≥3 review**, chưa có bằng chứng pain từ người thật. Không tính menu/giá là câu trả lời khảo sát hoặc review.

Agent/model ở `codebase/` vẫn là khung mẫu; `.env` chưa có. Vì vậy chưa thể chạy lượt AI thật có token đo từ API. Không đánh dấu CP3 hoàn thành. Bộ benchmark có nhãn nháp L2 đang chờ L1/final; giữ nguyên expected, metric và ngưỡng đã chốt.

## Chạy lại

```powershell
$env:PYTHONUTF8='1'
python crawl/reviews.py --input data/raw/reviews_input.csv
python data/schema/validate.py data/processed
python -m unittest crawl.test_reviews
python evidence/count_data.py
python run.py check
```

Review CSV đầu vào: `place_id,source,rating,text_excerpt,lang,published_at,url`. Nguồn được nhận: google/youtube/blog/other. Không có đầu vào thì `python crawl/reviews.py` tạo/giữ header và báo đúng coverage bằng 0.

Thu lại menu cần Node, Playwright và Chrome: `node crawl/shopee_menus.mjs`. Sau đó `python crawl/link_shopee.py` nối quán theo slug URL chính xác, giữ trống những quán chưa ghép; `places.csv` và giá thực địa được giữ nguyên.

Cài phụ thuộc menu (chỉ khi cần thu lại): `npm install --no-save --package-lock=false playwright`, dùng Chrome đã cài. Các lệnh Python không cần pip. Trong phiên Codex này đã dùng Playwright đi kèm runtime.

## Trước khi nộp

Kiểm ngày 27/11/2026: 26 test crawl đạt; validator schema đạt; `python run.py check` đạt (20 câu/4 metric). `python run.py eval --try` chạy 3 câu bằng model fake, token 0; chỉ là thử khung và không tính lượt CP3.

Thái cần thu người thật và nhập review có nguồn. Cường cần agent/model và nhãn L1; Đức cần nhãn final và chạy đánh giá. Các bước này là điều kiện còn thiếu, không phải kết quả đã có. Không push thẳng `main` theo quy ước nhóm.
