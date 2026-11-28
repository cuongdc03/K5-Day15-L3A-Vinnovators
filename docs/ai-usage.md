# Khai báo dùng AI

README của nhóm có mục "Dùng AI vào việc gì" (2–3 dòng, bắt buộc). Ghi chi tiết vào bảng dưới đây.

> Luật của đề: dùng AI để làm bài thoải mái, nhưng **ai không giải thích được phần có tên mình thì phần đó nhận 0 điểm**. Khai thiếu không bị trừ; giấu mới bị.

| Việc | Công cụ AI | AI làm gì | Người kiểm/sửa gì | Ai phụ trách |
|---|---|---|---|---|
| Code bản chạy thử | | | | |
| Prompt / thiết kế lời gọi mô hình | | | | |
| Đào data (viết script đếm, gợi ý nhãn) | | | Kiểm tay __ dòng, khớp __ | |
| Rà câu hỏi phỏng vấn / khảo sát | | Chỉ rà câu dẫn dắt | | |
| Viết câu thử (benchmark) | | | Mỗi câu thử có `source`; câu thử AI viết được ghi rõ | |
| Sinh data `synthetic` (nếu có) | | | Seed __ · kiểm tay __ dòng | |
| Chấm cột `pass` bằng LLM (nếu có) | | | Kiểm tra thủ công __ câu thử, khớp __/__ | |
| Slide, văn bản | | | | |
| Phần Thái CP2/CP3 | Codex | Viết importer review, phát hiện ngôn ngữ, đọc menu công khai, nối slug nguồn và tài liệu bàn giao | Đã kiểm schema và test importer; người trong nhóm chưa duyệt nội dung thực địa/người dùng | Thái |
| Phân tích khảo sát, chấm `pass` lượt 1 | Claude Code | Đọc file kết quả Google Form, đếm số người theo câu hỏi, viết `evidence/summary.md`; đọc 20 output của `eval/run-1.csv` và điền cột `pass` theo `pass_criterion` | Chưa có người kiểm. Cần người thứ hai chấm lại ≥5 câu, nhất là B16 và B20 (sát ranh) | Cường |
| Gán nhãn `L1`, đề xuất `final` (`data/processed/labels.csv`) | Claude Code | Áp luật `data/SCHEMA.md` lên 20 quán trong benchmark, tra web 3 chuỗi (Haidilao, Trung Nguyên E-Coffee, Phở Lý Quốc Sư) để có nguồn | **L1 không phải người chấm độc lập.** Cường đã kiểm tay và chốt `final` ngày 28/11. Còn việc thêm Haidilao, E-Coffee vào `chain_registry` bằng nguồn chính thức | Cường |

**Không dùng AI để:** tạo người được phỏng vấn, trích dẫn, câu trả lời khảo sát; sửa kết quả các lượt đã chạy (`eval/run-*.csv`, `cost/simulate-*.csv`, `traces/`).
