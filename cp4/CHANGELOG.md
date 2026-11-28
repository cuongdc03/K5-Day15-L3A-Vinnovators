# Bổ sung CP4 · 28/11/2026

Giữ nguyên toàn bộ file đã được git theo dõi tại đầu lượt làm việc, gồm khung Python, spec, benchmark, metric, UI gốc và eval cũ. Không commit hoặc push. Các thay đổi chỉ thêm file.

1. `cp4/agent.py` bổ sung nguồn Haidilao chính thức, nhận diện điểm hỗ trợ tài xế, từ chối ép nhãn. Bộ kiểm thử và luật thiếu review → unsure giữ nguyên.
2. Chạy `run-3@20261128-093712`: 20 câu, 0 lỗi API, 16 lần gọi model. Chấm nháp 15/20 so với baseline 12/20; còn 5 lỗi local. Grounded reason 15/15 câu có nhãn, đối chiếu công cụ trong trace; cần người duyệt.
3. Chạy `simulate-1@20261128-094156`: 50 phiên, 87 lượt hỏi, 0 lỗi. Tổng batch 100 model calls, 53.186 token vào, 7.356 token ra; $0,0089966 tính theo bảng giá ngày thu, trong trần $1 người dùng cho phép.
4. Tạo `web-demo/live.html` từ giao diện gốc: 412 địa điểm có tọa độ, 17 địa điểm có kết quả AI, tách 10 điểm hỗ trợ. Không dùng quán mẫu hoặc tự điền giá thiếu. Mô hình 3D ghi rõ minh họa; Văn Giang tự dùng 2D vì chưa có mô hình riêng.
5. `web-demo/menu.html`: 150 quán, 4.308 dòng món, giá online và giá gốc hiển thị, địa chỉ, nguồn và thời điểm thu; chỉ 10 quán đã ghép tọa độ. Không thay thế link tìm địa chỉ bằng tọa độ đoán.
6. Tạo hồ sơ CP4, deck 8 trang HTML/PDF, screenshot desktop/mobile/3D và video demo thao tác thật. PDF đã render kiểm tra đủ 8 trang; video phát được.

Kiểm tra đã chạy: schema 422 places, 54 labels, 0 reviews hợp lệ; benchmark 20 câu/4 metric hợp lệ; 41 unit tests đạt. UI smoke test đạt số bản ghi, lọc, menu liên kết, từ chối, 3D, chuyển Văn Giang, viewport mobile, không lỗi JS và đường dẫn riêng tư trả 404. Local server chỉ phục vụ thư mục public, không phục vụ `.env`, code hay data khảo sát.

Chưa thể hoàn thành thay người: 19/20 mẫu khảo sát hợp lệ, 0/3 phỏng vấn, thiếu review và độ phủ quận, xác nhận nhãn/chấm độc lập, phân công nói slide và reflection cá nhân, kiểm tra máy thứ hai, nộp form. Bằng chứng hiện tại dẫn đến ITERATE, không tuyên bố đạt toàn bộ rubric.
