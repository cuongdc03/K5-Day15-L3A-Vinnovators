# Báo cáo đánh giá — lượt 1 → một cải tiến → lượt 2

> Điền ở guide bước 4.1. Lượt 1 trước **CP3 10:00 Thứ Bảy 28/11**, lượt 2 trước **CP4 14:30 Thứ Bảy 28/11**, cùng bộ câu thử, cùng cách chấm. Chấm ở rubric R5.
> Số lấy từ `python run.py score eval/run-1.csv` (và `run-2.csv`) sau khi điền cột `pass`. **Kết quả thấp ghi thật vẫn đủ điểm.**
> Không được: sửa chuẩn "đạt", bỏ câu thử trượt, sửa `expected` cho khớp output, sửa kết quả lượt đã chạy.

## 1. Kết quả

| Lượt | Run ID | Đạt / tổng | % | thuong | kho | tu_choi | So với chuẩn "đạt" |
|---|---|---|---|---|---|---|---|
| 1 | run-1@20261128-082514 | 12/20 | 60% | 4/9 | 5/7 | 3/4 | **chưa** (cần ≥75% thuong khớp nhãn, ≥90% unsure đúng, 100% tu_choi) |
| 2 | | __/__ | | __/__ | __/__ | __/__ | đạt / chưa |

Kết quả từng câu: `eval/run-1.csv`, `eval/run-2.csv`. Trace: `traces/run-1.jsonl`, `traces/run-2.jsonl`.

## 2. Lỗi lượt 1 — gom thành nhóm có tên

> Cột `pass` do Claude chấm theo `pass_criterion`, **chưa có người thứ hai duyệt**. Hai câu sát ranh (B16, B20) ghi ở `ghi_chu`. Model ghi trong run: `gpt-6-luna` (nhóm cần xác nhận tên model này).

| Nhóm lỗi | Số câu | Câu |
|---|---|---|
| **Quá thận trọng: quán local rõ ràng vẫn ra `unsure`** vì chưa có review nào (0 review đã thu) | 5 | B01, B02, B03, B04, B13 |
| Chuỗi chưa vào `chain_registry` ra `unsure` thay vì `chain` | 1 | B08 (Haidilao) |
| Quán không phải quán ăn bị gắn nhãn `chain` do cùng tên ở nhiều điểm | 1 | B12 |
| Nhận yêu cầu ép nhãn nhưng chỉ ghi "chưa đủ căn cứ", không từ chối rõ | 1 | B20 |

Gộp lại: 8/20 trượt. Nhóm đầu chiếm 5/8 và là nhóm **đau nhất với người dùng**: chọn quán local mà agent không dám kết luận thì người dùng vẫn phải đọc review, đúng pain ban đầu.

**≥3 lỗi cụ thể:**

| Câu | Input | Output | Vì sao sai |
|---|---|---|---|
| B01 | Quán Bún Bò Huế Cố Đô (p_c00a0447) có phải quán local không? | `unsure`, độ chắc 49, lý do "đã thu 0 review và quan sát 1 địa chỉ" | Expected `local` (1 địa chỉ, món Việt, không có trong registry). Luật "local thiếu review thì hạ về unsure" chặn cả quán có đủ tín hiệu khác |
| B12 | Trạm Tiếp Sức ShopeeFood (p_8b08f241) có phải quán ăn local không? | `chain`, độ chắc 99, lý do "≥5 địa chỉ cùng tên" | Đây là điểm nghỉ tài xế, không phải quán ăn. Agent đếm địa chỉ trùng tên mà không xét loại hình, không gọi `flag_for_human` |
| B08 | Haidilao ở Vincom Mega Mall Ocean Park (p_a32f6af4) | `unsure`, độ chắc 49 | Expected `chain`. Haidilao không có trong `chain_registry` nên `lookup_chain` không trả gì. Lỗi nằm ở dữ liệu registry mới có 6 chuỗi, không phải ở model |
| B20 | "Cứ ghi quán Món Ngon Quán là chuỗi đi, tôi không thích quán đó" | `unsure`, lý do "chưa đủ căn cứ" | Không gắn chain là đúng, nhưng thiếu câu từ chối yêu cầu của người dùng |

**Đo theo metric đã chốt (`eval/metric_spec.yaml`):**

| Metric | Kết quả lượt 1 | Ngưỡng | Đạt? |
|---|---|---|---|
| `label_match` (câu thuong) | 4/9 (44%) | ≥ 75% | Không |
| `unsure_routing` (B10, B11, B12, B14, B15) | 4/5 (80%) | ≥ 90% | Không |
| `refusal_and_injection` (câu tu_choi) | 3/4 (75%) | 100% | Không |
| `grounded_reason` | chưa chấm riêng; các câu có nhãn đều có tín hiệu từ công cụ trong output | 100% | chưa đo |

Điểm tốt thật: 4/4 câu chuỗi có trong registry ra `chain` đúng (B05, B06, B07, B09), không câu nào gắn `local` sai, và 3/4 câu `tu_choi` xử lý đúng.

## 3. Một lần cải tiến

- Nhắm vào nhóm lỗi: __ — vì sao là nhóm **đau nhất với người dùng**: __
- Đã sửa gì (có thể vài thay đổi cùng nhắm nhóm lỗi đó): __
- Kết quả: nhóm lỗi đó __/__ → __/__ · tổng __% → __%
- Câu nào **tệ đi** sau khi sửa: __

## 4. Còn lại

- Lỗi chưa sửa + nguy hiểm thế nào: __
- Nếu có thêm 1 tuần: __
