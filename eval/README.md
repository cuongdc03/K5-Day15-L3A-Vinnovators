# Hồ sơ đánh giá — một trang

> Điền ở guide bước 2.4 (mục 1–4, trước CP2) và 4.1 (mục 5–6, trước CP4). Ôn lại: ngày 9, ngày 14 · lab ngày 9. Chấm ở rubric R4, R5.
> Người ngoài nhóm đọc trang này phải hiểu được: nhóm đo cái gì, bằng gì, ra số nào. Trang slide "Đánh giá thế nào" lấy từ đây.

## 1. Dataset → xử lý

Dataset nào, xử lý gì: tóm 2–3 dòng từ `data/DATA_CARD.md`.

## 2. Bộ câu thử dựng ra sao

- `eval/benchmark.csv`: __ câu (thuong __ · kho __ · tu_choi __, trong đó __ câu tấn công)
- Nguồn (`python run.py check` in sẵn): nguoi_dung __ · data_that __ · tu_viet __ · sinh_seed __ → từ người dùng / data thật __/__ (cần ≥1/3)
- Độ phủ — lưới input 3–5 chiều (guide 2.4 bước 5): __
- Câu `kho` trỏ về 4 lớp chỗ khó (`spec.md` §5): lớp 1: __ · lớp 2: __ · lớp 3: __ · lớp 4: __

## 3. Metric và cách chấm

| Metric (`eval/metric_spec.yaml`) | Cách chấm | Ngưỡng |
|---|---|---|
| | code / llm / nguoi | |
| | | |
| | | |

- **Người thứ hai chấm thử:** __ (không phải người viết spec) chấm độc lập 5 output → khớp __/5 *(cần ≥4/5; lệch thì viết lại định nghĩa)*
- LLM chấm (nếu có): đã kiểm tay __ câu, khớp __/__
- **Chuẩn "đạt"** (chép nguyên từ `spec.md` §7, chốt trước 19:30 Thứ Sáu 27/11): "__"

## 4. Lệnh

`python run.py eval` → `eval/run-N.csv` + `traces/run-N.jsonl` · điền cột `pass` · `python run.py score eval/run-N.csv`

## 5. Đã chạy gì

| Lượt | Run ID | Model | Cấu hình (prompt / công cụ / thay đổi) | Đạt / tổng | % | Đạt chuẩn? |
|---|---|---|---|---|---|---|
| 1 | run-1@20261128-082514 | gpt-6-luna *(cần xác nhận)* | `cp3/` workflow cố định: `search_places` → `get_place` → `lookup_chain` → `get_reviews` → model chọn nhãn → luật chặn → `flag_for_human` | 12/20 | 60% | Chưa (cần ≥75% thuong khớp nhãn) |
| 2 | | | | __/__ | | |

Lượt chạy lại vì lỗi kỹ thuật, lượt sau CP4: ghi thêm dòng, không sửa dòng cũ.

## 6. Lỗi chính

Nhóm lỗi lớn nhất lượt 1: quán local rõ ràng vẫn ra `unsure` vì chưa có review nào (5/8 câu trượt). Chưa sửa; lượt 2 chưa chạy. Còn lại: Haidilao chưa có trong `chain_registry` (B08), quán không phải quán ăn bị gắn `chain` (B12), thiếu câu từ chối rõ ở B20.
