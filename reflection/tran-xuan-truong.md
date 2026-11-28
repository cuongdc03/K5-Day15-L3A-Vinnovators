# Reflection — Trần Xuân Trường

Nhóm: Vinnovators · Lớp: L3A · Vai trò: Frontend - UX/UI

1. **Vai trò và phần mình làm**

   Tôi chịu trách nhiệm toàn bộ UX/UI của web-demo, từ tổ chức thông tin, thiết kế luồng sử dụng, bố cục và hướng hình ảnh đến triển khai giao diện trên Desktop/Mobile.
   Tôi thiết kế và triển khai trang giới thiệu, danh sách và thẻ thông tin quán, bộ lọc, bản đồ 2D/3D, trang Menu và điều hướng giữa các trang.
   Phần việc nằm trong [index.html](../web-demo/index.html), [ui.js](../web-demo/ui.js), [menu.html](../web-demo/menu.html) và các file CSS, JavaScript trong `web-demo/`.
   Tôi ghép dữ liệu nguồn vào giao diện và rà lại trải nghiệm thực tế: đọc hết thông tin quán, thao tác bộ lọc, chuyển danh sách/bản đồ, xử lý lỗi cuộn, chồng nút và ghim quán che cảnh quan.
   Các commit thể hiện phần việc gồm [`cd9028c`](https://github.com/cuongdc03/K5-Day15-L3A-Vinnovators/commit/cd9028c) và [`371e5b9`](https://github.com/cuongdc03/K5-Day15-L3A-Vinnovators/commit/371e5b9); các chỉnh sửa giao diện sau đó tiếp tục được thực hiện trên nhánh `truong`.

2. **AI hỗ trợ mình thế nào**

   Tôi chủ động xác định yêu cầu UX/UI và dùng Codex để hỗ trợ đọc code, đối chiếu phiên bản trên GitHub, ghép dữ liệu và viết, sửa mã giao diện theo yêu cầu cụ thể.
   AI hỗ trợ xử lý bộ lọc, liên kết giữa danh sách và Menu, gom cụm quán trên bản đồ 3D và kiểm tra giao diện ở nhiều kích thước màn hình.
   Tôi phải phản hồi và yêu cầu sửa lại nhiều lần: menu mobile ban đầu đặt chưa đúng vị trí mong muốn, các nút bản đồ chồng nhau, trang Menu chưa đồng bộ khung điện thoại và thẻ quán không cuộn hết thông tin.
   Qua đó, tôi thấy cần đưa ảnh chụp và mô tả rõ thao tác bị lỗi, rồi kiểm tra lại kết quả hiển thị; lời báo hoàn thành của AI chưa đủ để kết luận trải nghiệm đã ổn.

3. **Một câu thử trượt của nhóm và bài học của mình**

   Trong [eval/run-2.csv](../eval/run-2.csv), câu **B01** hỏi quán Bún Bò Huế Cố Đô có phải quán Local không; kỳ vọng là `local`, nhưng hệ thống trả `unsure`, độ chắc 40, với lý do đã thu 0 review và quan sát 1 địa chỉ trong mẫu.
   Câu này có `pass = 0`; ghi chú của lượt chạy nêu rõ kết quả chấm do Claude thực hiện và cần người duyệt. Tôi dùng đây làm ví dụ về lỗi đã ghi nhận, không coi phần chấm tự động là kết luận đã được cả nhóm xác nhận.
   Bài học với phần giao diện là phải giúp người dùng phân biệt việc thiếu dữ liệu, kết quả AI chưa chắc và nhãn do nhóm duyệt; nếu chỉ đưa một nhãn mà không có lý do, người dùng khó biết nên dựa vào đâu.
   Tôi áp dụng điều này vào cách hiển thị nguồn, lý do đánh giá và nhãn “Local · nhóm duyệt”, đồng thời giữ riêng kết quả AI đã lưu để người dùng có thể mở thông tin và đối chiếu.
