# Tóm tắt mô phỏng simulate-1@20261128-094156

Do `python run.py simulate` sinh ra — không sửa tay. Chép bảng sang `cost/cost-estimate.md`.

| Persona | Số phiên mô phỏng | Lượt hỏi / phiên | Token vào / phiên | Token ra / phiên | Gọi model / phiên | Gọi công cụ / phiên |
|---|---:|---:|---:|---:|---:|---:|
| dung_it | 13 | 1 | 451 | 72 | 0.9 | 4.5 |
| dung_vua | 10 | 2 | 940 | 122 | 1.9 | 8.6 |
| dung_nhieu | 27 | 2 | 1088 | 147 | 2.0 | 9.8 |

Tỉ lệ đạt dùng để tính: 15/20 (75%) — lượt run-3@20261128-093712

- Tỉ lệ đạt lấy từ lượt nhóm chọn: cp4/results/run-3-graded-draft.csv (--rate-from).

| Model (giá) | Chi phí / phiên | Chi phí / task thành công | Chi phí / câu hỏi đạt | Chi phí / tháng — thấp (100 người) | Chi phí / tháng — cơ sở (300 người) | Chi phí / tháng — cao (1.000 người) | Chi phí / người / tháng (cơ sở) |
|---|---:|---:|---:|---:|---:|---:|---:|
| gpt-6-luna (vào 0.1 · ra 0.5 $/1M) | $0.00015 | $0.00020 | $0.00012 | $0.2526 | $0.7579 | $2.53 | $0.0025 |
| gpt-6.1-sol (vào 2.0 · ra 10.0 $/1M) | $0.0030 | $0.0040 | $0.0023 | $5.05 | $15.16 | $50.52 | $0.0505 |

- Chi phí / task thành công = chi phí / phiên ÷ tỉ lệ đạt. Chi phí / câu hỏi đạt = chi phí / phiên ÷ số lượt hỏi trung bình mỗi phiên (1.7) ÷ tỉ lệ đạt — tỉ lệ đạt đo theo từng câu thử.
- Token đo trên model: gpt-6-luna. Giá tính theo từng model trong bảng — model khác bộ tách token thì số token thật có thể lệch; ghi rõ "đo trên model X, tính giá model Y" trong cost/cost-estimate.md.
- Phiên lỗi (không tính vào trung bình): 0/50.
