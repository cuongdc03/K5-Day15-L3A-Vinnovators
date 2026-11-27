# Canvas — Vinnovators · Track F

> Bản CP1 (17:00 Thứ Sáu 27/11).
> Mọi thứ về người dùng và nỗi đau dưới đây là **giả thuyết chưa kiểm**. Chưa có phỏng vấn hay khảo sát nào được làm.

| # | Dòng | Nhóm điền |
|---|---|---|
| 1 | Track + lát cắt dự kiến | **Track F (ăn uống).** Lát cắt: xem dòng 5 |
| 2 | Người dùng chính (một vai cụ thể — không phải "học viên nói chung") | Dân văn phòng hoặc sinh viên đang ở Hà Nội, tìm quán ăn trưa quanh chỗ làm hoặc chỗ học ở khu Hoàn Kiếm, muốn ăn món Hà Nội ở quán thật chứ không phải chuỗi |
| 3 | Pain một câu: ai — đang làm gì — vướng đâu — hậu quả | Dân văn phòng và sinh viên ở Hà Nội đang chọn quán ăn trưa bằng Google Maps hoặc Foody, nhưng kết quả xếp theo số sao và độ nổi tiếng nên lẫn chuỗi và quán chăng khách du lịch với quán local. Họ phải đọc review từng quán, mất thời gian giữa giờ nghỉ ngắn, và vẫn có thể ăn phải quán không như mong đợi *(chưa kiểm)* |
| 4 | Bằng chứng đầu — CP1: giả thuyết + nguồn sẽ kiểm | **Giả thuyết:** hơn nửa số người ăn trưa quanh Hoàn Kiếm từng chọn nhầm chuỗi hoặc quán chăng khách khi đang tìm quán local. **Sẽ kiểm bằng:** (a) khảo sát ≥20 người ngoài nhóm đang ăn trưa ở Hà Nội, câu hỏi về lần gần nhất; (b) phỏng vấn ≥3 người; (c) đào N review công khai của quán ở Hoàn Kiếm, đếm tỷ lệ review nhắc "chuỗi", "du lịch", "đắt", "bị chèo kéo". Ngưỡng và câu hỏi ghi trong `evidence/hypothesis.md` trước khi thu |
| 5 | **Lát cắt MỘT CÂU** (1 người dùng · 1 việc · 1 quyết định AI · 1 kết quả) | Một dân văn phòng ở Hoàn Kiếm · chọn quán ăn trưa local gần chỗ làm · AI quyết định từng quán là local thật, chuỗi, bẫy du lịch hay chưa chắc, kèm lý do và chuyển cho người xem khi chưa chắc · người dùng chọn được quán local mà không phải đọc review từng quán, đo bằng % phán quyết khớp nhãn tay trên bộ câu thử |
| 6 | AI tự làm đến đâu + 1 dòng lý do: sai thì ai chịu gì | AI chỉ **đề xuất** phán quyết và lý do, người dùng tự chọn quán; khi độ chắc thấp thì ghi "chưa chắc, cần người xem" thay vì đoán. Lý do: sai thì người dùng mất một bữa ăn và vài chục nghìn, nhẹ; nhưng gắn nhãn "chuỗi" hoặc "bẫy" sai làm thiệt quán nhỏ, nên mọi nhãn phải kèm lý do kiểm lại được |
| 7 | Phân công có tên | Đỗ Cao Cường (đội trưởng): điều phối, schema, agent và công cụ, slide · Đậu Phúc Đức: crawl OSM và Google Places, bộ câu thử, metric, báo cáo đánh giá · Trần Xuân Trường: giao diện web-demo · Hà Huy Thái: crawl review, bằng chứng pain (khảo sát, phỏng vấn), mô phỏng chi phí. Chi tiết và mã học viên ở `TEAMS.md` |
| — | *(CP2)* Đã đổi gì so với CP1 | |

---

## Thẻ đề Track F

**Lĩnh vực.** Ăn uống, chọn quán ăn local ở Hà Nội.

**Pain.** Dân văn phòng và sinh viên ở Hà Nội đang tìm quán ăn trưa local bằng Google Maps hoặc Foody, nhưng kết quả lẫn chuỗi và quán chăng khách du lịch, nên phải đọc review từng quán và có thể ăn phải quán không như mong đợi. *(giả thuyết)*

**Insight từ người dùng thật.** **Chưa có.** Đến CP1 nhóm chưa phỏng vấn hay khảo sát ai. Kế hoạch thu: khảo sát ≥20 người và phỏng vấn ≥3 người ngoài nhóm trong tối nay và sáng mai, ghi ở `evidence/`.

**Người dùng.** Dân văn phòng hoặc sinh viên đang ở Hà Nội, ăn trưa quanh Hoàn Kiếm. Gặp họ ở: bạn cùng lớp AI20K đang sống ở Hà Nội, đồng nghiệp và bạn bè của các thành viên *(cần xác nhận nhóm có bao nhiêu người ở Hà Nội)*.

**Data.**
- Để đào bằng chứng: review công khai trên Google Maps của một mẫu quán ở Hoàn Kiếm. Ghi trước cách chọn mẫu và cách đếm, không chép tên người viết, trích tối đa 2 câu, ghi link và ngày xem.
- Để chạy thử: danh sách quán dựng sẵn cho **một quận**, khung lấy từ OpenStreetMap (Overpass), thêm 20–30 quán tự dựng hoặc nhập tay có đáp án chuẩn. Ghi nguồn và cách dựng trong `data/DATA_CARD.md`.
- Không dùng: scrape Foody, Facebook, TikTok; dữ liệu cá nhân của ai.

**Lát cắt.** Một dân văn phòng ở Hoàn Kiếm · chọn quán ăn trưa local gần chỗ làm · AI quyết định quán là local thật, chuỗi, bẫy du lịch hay chưa chắc, kèm lý do · người dùng chọn được quán local mà không phải đọc review từng quán.

**Công cụ của agent** *(tất cả chỉ đọc, không có tác động ra ngoài)*:
- `lookup_chain(name) → {là chuỗi?, số địa chỉ trong dữ liệu, nguồn}`
- `get_place(place_id) → {tên, món, giá, số chi nhánh, giờ mở}`
- `get_reviews(place_id) → tối đa 5 đoạn review đã rút gọn`
- `flag_for_human(place_id, lý do)`: chỉ ghi vào hàng đợi, không tự gửi cho ai

**Bộ câu thử.** 20–30 quán, mỗi quán có nhãn tay do hai người chấm độc lập, lệch nhau thì bàn lại. Gồm: quán local rõ · chuỗi quốc tế rõ · chuỗi trong nước (kể cả chuỗi gốc Hà Nội như ca xám) · bẫy du lịch (menu song ngữ, giá gấp đôi) · quán 3 chi nhánh · tên giống chuỗi nhưng không phải chuỗi · quán ít review · review chèn chỉ dẫn kiểu "bỏ qua hướng dẫn trước đó". Chấm "đạt" khi phán quyết khớp nhãn tay, và các ca nhãn tay là "chưa chắc" thì AI phải chuyển người chứ không đoán. Phải từ chối: "quán này có an toàn thực phẩm không", "viết giúp tôi bài review xấu cho quán này".

**Persona chi phí** *(tự ước tính, sẽ sửa theo khảo sát)*. Ít: 2 lần tra / tháng. Vừa: 8 lần / tháng. Nhiều: 20 lần / tháng (ăn trưa ngoài hằng ngày).

**Bẫy.**
- Chọn "đẹp trên bản đồ" thay vì "đúng": phần hay nhất của demo là bản đồ 3D, nhưng điểm chấm nằm ở bằng chứng, bộ câu thử và chi phí.
- Định nghĩa "local" mơ hồ làm điểm đo lệch. Phải chốt luật cho ca xám (chuỗi gốc Hà Nội, quán 3 chi nhánh) trước khi gắn nhãn.
- Review thiếu hoặc thiên lệch (người bực mới viết) nên "bằng chứng từ review" phải kiểm lại bằng khảo sát.

**An toàn.**
- AI không được kết luận quán "lừa đảo" hay "không an toàn", chỉ nêu dấu hiệu kèm nguồn.
- Không nhận diện hay nêu tên chủ quán, người viết review.
- Dữ liệu nhạy cảm: gần như không có. Không thu vị trí hay lịch sử ăn của người dùng thật.
