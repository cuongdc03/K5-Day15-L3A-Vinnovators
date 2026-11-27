# Canvas — Vinnovators · Track F

> Bản CP1 (17:00 Thứ Sáu 27/11), sửa lại trước CP2 (27/11): đề tài thành **Bản đồ ăn uống**, thêm khu Ocean Park 1 và 2. Thay đổi ghi ở dòng *(CP2)*.
> Mọi thứ về người dùng và nỗi đau dưới đây là **giả thuyết chưa kiểm**. Chưa có phỏng vấn hay khảo sát nào được làm.

| # | Dòng | Nhóm điền |
|---|---|---|
| 1 | Track + lát cắt dự kiến | **Track F (ăn uống), Bản đồ ăn uống.** Phạm vi data: 4 quận Cầu Giấy, Hai Bà Trưng, Hoàng Mai, Gia Lâm và hai khu đô thị Vinhomes Ocean Park 1 (Gia Lâm, Hà Nội), Ocean Park 2 (Nghĩa Trụ, Văn Giang, Hưng Yên). Lát cắt: xem dòng 5 |
| 2 | Người dùng chính (một vai cụ thể — không phải "học viên nói chung") | Học viên AI20K đang sống hoặc học quanh Ocean Park, tìm quán ăn quanh chỗ ở, chỗ học. Mở rộng sau: sinh viên và người đi làm ở Ocean Park và 4 quận, rồi mọi người *(chưa kiểm)* |
| 3 | Pain một câu: ai — đang làm gì — vướng đâu — hậu quả | Dân văn phòng và sinh viên ở Hà Nội đang chọn quán ăn trưa bằng Google Maps hoặc Foody, nhưng kết quả xếp theo số sao và độ nổi tiếng nên lẫn chuỗi và quán chăng khách du lịch với quán local. Họ phải đọc review từng quán, mất thời gian giữa giờ nghỉ ngắn, và vẫn có thể ăn phải quán không như mong đợi *(chưa kiểm)* |
| 4 | Bằng chứng đầu — CP1: giả thuyết + nguồn sẽ kiểm | **Giả thuyết:** hơn nửa số người ăn trưa quanh Hoàn Kiếm từng chọn nhầm chuỗi hoặc quán chăng khách khi đang tìm quán local. **Sẽ kiểm bằng:** (a) khảo sát ≥20 người ngoài nhóm đang ăn trưa ở Hà Nội, câu hỏi về lần gần nhất; (b) phỏng vấn ≥3 người; (c) đào N review công khai của quán ở Hoàn Kiếm, đếm tỷ lệ review nhắc "chuỗi", "du lịch", "đắt", "bị chèo kéo". Ngưỡng và câu hỏi ghi trong `evidence/hypothesis.md` trước khi thu |
| 5 | **Lát cắt MỘT CÂU** (1 người dùng · 1 việc · 1 quyết định AI · 1 kết quả) | Một dân văn phòng ở Hoàn Kiếm · chọn quán ăn trưa local gần chỗ làm · AI quyết định từng quán là local thật, chuỗi, bẫy du lịch hay chưa chắc, kèm lý do và chuyển cho người xem khi chưa chắc · người dùng chọn được quán local mà không phải đọc review từng quán, đo bằng % phán quyết khớp nhãn tay trên bộ câu thử |
| 6 | AI tự làm đến đâu + 1 dòng lý do: sai thì ai chịu gì | AI chỉ **đề xuất** phán quyết và lý do, người dùng tự chọn quán; khi độ chắc thấp thì ghi "chưa chắc, cần người xem" thay vì đoán. Lý do: sai thì người dùng mất một bữa ăn và vài chục nghìn, nhẹ; nhưng gắn nhãn "chuỗi" hoặc "bẫy" sai làm thiệt quán nhỏ, nên mọi nhãn phải kèm lý do kiểm lại được |
| 7 | Phân công có tên | Đỗ Cao Cường (đội trưởng): điều phối, schema, agent và công cụ, slide · Đậu Phúc Đức: crawl OSM và Google Places, bộ câu thử, metric, báo cáo đánh giá · Trần Xuân Trường: giao diện web-demo · Hà Huy Thái: crawl review, bằng chứng pain (khảo sát, phỏng vấn), mô phỏng chi phí. Chi tiết và mã học viên ở `TEAMS.md` |
| — | *(CP2)* Đã đổi gì so với CP1 | (1) Đề tài thành **Bản đồ ăn uống**; phạm vi data thêm Ocean Park 1, 2 bên cạnh 4 quận. (2) Người dùng chính từ dân văn phòng Hoàn Kiếm thành học viên AI20K quanh Ocean Park, mở rộng dần. (3) Nguồn data thêm **Foody** (trang tìm kiếm công khai, chỉ thông tin quán) và **dữ liệu thực địa**: nhóm đến tận quán ghi giá, ảnh, trạng thái bằng form trên điện thoại. Facebook, TikTok chỉ lưu link fanpage, video do nhóm dán, không cào tự động. (4) Dòng 3, 5, 6 *chờ nhóm chốt lại* cho đề tài mới |

---

## Thẻ đề Track F

**Lĩnh vực.** Ăn uống: bản đồ quán ăn đã kiểm thực tế (giá, ảnh, còn mở hay không) ở Ocean Park 1, 2 và 4 quận Hà Nội.

**Pain.** Dân văn phòng và sinh viên ở Hà Nội đang tìm quán ăn trưa local bằng Google Maps hoặc Foody, nhưng kết quả lẫn chuỗi và quán chăng khách du lịch, nên phải đọc review từng quán và có thể ăn phải quán không như mong đợi. *(giả thuyết)*

**Insight từ người dùng thật.** **Chưa có.** Đến CP1 nhóm chưa phỏng vấn hay khảo sát ai. Kế hoạch thu: khảo sát ≥20 người và phỏng vấn ≥3 người ngoài nhóm trong tối nay và sáng mai, ghi ở `evidence/`.

**Người dùng.** Học viên AI20K sống hoặc học quanh Ocean Park, sau đó sinh viên, người đi làm và mọi người ăn ngoài ở khu này. Gặp họ ở: lớp AI20K, nhóm cư dân Ocean Park, đồng nghiệp và bạn bè của các thành viên *(cần xác nhận số người thật sự ở Ocean Park)*.

**Data.**
- Để đào bằng chứng: review công khai trên Google Maps của một mẫu quán ở Hoàn Kiếm. Ghi trước cách chọn mẫu và cách đếm, không chép tên người viết, trích tối đa 2 câu, ghi link và ngày xem.
- Để chạy thử: danh sách quán ở Ocean Park 1, 2 và 4 quận, gộp từ OpenStreetMap (Overpass), Google Places API (khi có key) và trang tìm kiếm công khai của Foody (`crawl/`, ra `data/processed/places.csv`). Ghi nguồn và cách dựng trong `data/DATA_CARD.md`.
- Dữ liệu thực địa: nhóm đến từng quán ở Ocean Park, ghi trạng thái, giá theo menu, món, ảnh, link fanpage Facebook và video TikTok vào form trên điện thoại (`data/processed/field_visits.csv`). Đây là nguồn sự thật cho giá và ảnh.
- Không làm: cào tự động Facebook, TikTok (cần đăng nhập, có dữ liệu cá nhân) hay cào trang Google Maps (dùng API chính thức). Từ Foody chỉ lấy thông tin quán, không lấy review, tên hay ảnh người dùng. Không chụp mặt người, biển số xe; không ghi tên chủ quán, khách.

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
