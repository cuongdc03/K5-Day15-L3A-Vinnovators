# Tổng hợp bằng chứng pain

> Cập nhật 28/11/2026 sau khi thu khảo sát (Google Form, mở 27/11 từ 17:08, 22 lượt gửi). Số lấy từ `evidence/survey/results.csv` (đã xoá email, bản gốc không commit). Cách đếm chạy lại được ở mục 2.
> Ba nguồn ngang nhau, cần **≥1 nguồn đạt ngưỡng**. Hiện **chưa nguồn nào đạt ngưỡng đã đặt ở `evidence/hypothesis.md`** (khảo sát sát ngưỡng nhưng dưới; xem mục 2 và 5).

## 1. Nguồn đã dùng

| Nguồn | Đạt ngưỡng? | File |
|---|---|---|
| Đào data (x/N, %, cách đếm chạy lại được, ≥5 ví dụ) | ☐ Có số menu, **không đo pain** | `evidence/data-mining.md` |
| Phỏng vấn (≥3 người ngoài nhóm, đúng người dùng) | ☐ Chưa làm (0/3) | `evidence/interviews/` |
| Khảo sát (≥20 người ngoài nhóm, đúng người dùng) | ☐ n = 19 người đúng đối tượng, **58% so với ngưỡng 60%** | `evidence/survey/` |

## 2. Số chính

**Khảo sát: 22 lượt gửi, 19 người ăn ngoài ≥1 buổi/tuần được tính** (3 người chọn "Không buổi nào" bị loại theo câu lọc). Mẫu số bên dưới là 19.

- Ngưỡng ở `hypothesis.md`: ≥12/20 (60%) từng ăn nhầm quán chuỗi / chăng khách / đắt, hoặc mất nhiều thời gian đọc review. Kết quả: **11/19 (58%)** chọn ít nhất một trong "là chuỗi" (4), "chăng khách du lịch, giá đắt" (6), "mất nhiều thời gian đọc review" (6). **Dưới ngưỡng 2 điểm %**, và n = 19 chưa đủ 20.
- Riêng chuỗi hoặc chăng khách: **8/19 (42%)**. Riêng mất nhiều thời gian đọc review: **6/19 (32%)**.
- Tín hiệu mạnh nhất không nằm trong giả thuyết: **11/19 (58%) chọn "đồ ăn không ngon"** là chỗ không như mong đợi.
- Mức hài lòng với cách chọn hiện tại: trung bình **3,8/5**; **7/19 (37%) chấm ≤ 3**.
- Muốn cách khác: **15/19 (79%)** (7 người đang tìm cách tốt hơn, 8 người có nhưng không gấp); **4/19** nói cách hiện tại đã đủ tốt.
- Cách chọn quán (chọn nhiều): quán quen 12/19, Shopee/Grab 9/19, hỏi người quen 8/19, đi bộ gặp quán nào ăn quán đó 8/19, **Google Maps 7/19**, TikTok 5/19.
- Tần suất ăn ngoài: 5 buổi trở lên/tuần 9/19, 3–4 buổi 4/19, 1–2 buổi 6/19.

Cách đếm: mỗi người một dòng trong `results.csv`, loại dòng `tinh_vao_mau` khác `co`, đếm số người có chuỗi con tương ứng trong cột `q4_van_de_1_thang`. Hai người (P17, P19) tick cả một vấn đề lẫn "Không có lần nào"; tôi vẫn đếm vấn đề họ tick. Nếu loại hai người này thì 9/17 (53%).

**Phỏng vấn:** chưa gặp ai (0/3). 9 người để lại email trong form để hẹn phỏng vấn; email giữ ngoài repo.

| | Vai | Gặp pain? | Số lần / 1 tháng qua | Lần gần nhất mất | Đang xoay xở bằng |
|---|---|---|---|---|---|
| P1 | *(chưa phỏng vấn)* | | | | |
| P2 | | | | | |
| P3 | | | | | |

### Giới hạn của mẫu *(đọc trước khi dùng số)*
- Form **không hỏi vai** (dân văn phòng hay sinh viên) và **không hỏi khu vực sống**, nên chưa biết ai thuộc 4 quận. Không kiểm được người trả lời có ngoài nhóm hay không. Người gửi phải xác nhận.
- Form **không hỏi số phút** chọn quán (câu 3 trong `questions.md` của Thái, bản nháp 8 câu). "Mất nhiều thời gian đọc review" chỉ là mốc thay cho ">10 phút" trong giả thuyết.
- Mẫu gom tiện (bạn học, người quen), thu trong ~2 giờ chiều 27/11. n nhỏ, không suy ra cho cả Hà Nội.
- Form đã sửa tay sau lần soạn đầu: không còn "Foody" trong câu 2, nên không biết bao nhiêu người dùng Foody.

## 3. ≥5 trích dẫn nguyên văn (có nguồn, bỏ tên)

1. "đi ăn gần nhà mà ko ngon" — khảo sát P5
2. "Ngồi tìm đồ ăn mà vừa phải so sánh giá vừa phải đọc review, lúc nhận được đồ thì không ngon như mình thấy." — khảo sát P11
3. "Đa phần các quán ăn dễ tìm, xuất hiện đầu mục tìm kiếm đều overpriced" — khảo sát P20
4. "đi ăn theo tiktok, quán vừa đông vừa không ngon" — khảo sát P22
5. "đưa ra quán có đánh giá thật và đưa ra menu có giá tiền sẵn và có những phụ phí nào sau khi ăn" — khảo sát P14 (muốn gì)
6. "Giá có sẵn, ảnh đúng món thật" — khảo sát P18 (muốn gì)

Điều người dùng muốn nhất (câu 6, tự do, 11 người trả lời): giá và menu có sẵn (5), tiết kiệm thời gian đọc review (4), đánh giá thật hoặc quán local (2), món đặc biệt của quán (2). Một người trả lời có thể rơi vào hơn một nhóm.

## 4. Các nguồn có khớp nhau không

Data (`data-mining.md`, menu ShopeeFood) chỉ cho biết độ phủ menu, chưa đo hành vi. Khảo sát cho thấy Shopee/Grab là cách chọn phổ biến thứ hai (9/19), khớp với việc data nhóm thiên về quán giao online. Lệch ở chỗ: giả thuyết dựa trên Google Maps và Foody, nhưng chỉ 7/19 dùng Google Maps và đa số (12/19) đi quán quen. Giá, menu và tiết kiệm thời gian đọc review là điều được nhắc nhiều nhất (mỗi ý 4/12 câu trả lời), trong khi lát cắt hiện tại là phân loại local, chuỗi, chăng khách.

## 5. Kết luận

Giả thuyết ở `evidence/hypothesis.md`: **chưa đạt ngưỡng đã đặt** (11/19 = 58% so với 60%, n = 19 so với 20; phỏng vấn 0/3). Theo luật của chính giả thuyết, dưới ngưỡng nghĩa là phải xem lại lát cắt hoặc người dùng, nhưng khoảng cách chỉ 2 điểm % và mẫu nhỏ nên **nhóm quyết**, tôi không đổi ngưỡng cho khớp số.

Điều số liệu cho thấy rõ: pain có thật ở khoảng một nửa số người (nhất là "đồ ăn không ngon" 58%), nhưng nửa đó phần lớn là **chất lượng món**, thứ lát cắt phân loại local, chuỗi, chăng khách **không giải quyết trực tiếp**. Chuỗi hoặc chăng khách (42%) và tốn thời gian đọc review (32%) đúng vào lát cắt nhưng thấp hơn.

Điều vẫn chưa biết: người trả lời có phải dân văn phòng, sinh viên ở 4 quận không; số phút thật mất mỗi lần chọn; có sẵn lòng dùng sản phẩm phân loại hay không (mới chỉ hỏi "có muốn cách khác"). Việc cần làm: bổ sung ít nhất 1 người và hỏi vai, khu vực, số phút; phỏng vấn ≥3 người trong 9 người để lại email.

## Lịch hẹn (dùng cho CP2 — chỉ ghi vai và giờ, không tên)

| Vai | Giờ hẹn | Đã xong? |
|---|---|---|
| *(chưa hẹn)* | | |
