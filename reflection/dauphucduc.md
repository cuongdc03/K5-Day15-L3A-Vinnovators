# Reflection — Đậu Phúc Đức

1. **Vai trò + phần mình làm:**
   Thành viên, phụ trách crawl dữ liệu quán và phần đánh giá. Crawl 422 quán ở Ocean Park 1, 2 từ OSM và Foody (`crawl/overpass.py`, `crawl/foody.py`, `crawl/merge.py`, commit `457c404`), mở rộng schema (`d89e44f`, `fdf203a`). Nhóm không có key Google Places nên mình đổi sang kiểm tay trên Google Maps theo hàng đợi ưu tiên (`crawl/verify.py`, `tools/field_form.html`, commit `9b9ed0a`). Phần đánh giá: viết 20 câu thử và 4 metric (`eval/benchmark.csv`, `eval/metric_spec.yaml`, commit `b7f30d6`). Sau CP4 mình viết luật local trong `cp4/agent.py` kèm test `cp4/test_local_rule.py`, chạy lượt 4 và gắn nhãn cho cả 412 quán (`cp4/label_all.py`), rồi cập nhật `eval/report.md` và slide.

2. **AI hỗ trợ mình thế nào:**
   Mình dùng Claude Code để viết script crawl, `label_all.py`, luật local và test, chấm nháp cột `pass` lượt 4, viết báo cáo và kịch bản demo. Agent gọi model Claude Haiku 5.5, tổng chi phí khoảng 0,18 USD. Ba chỗ mình phải tự kiểm:
   - Lỗi `cp3/agent.py` không nhận mã `mon_viet` trong cột `cuisine` chỉ lộ ra khi sửa luật local. Qua hai lượt đầu không ai thấy.
   - Bản chấm lượt 4 (19/20) do Claude chấm, nên mình ghi là bản nháp và chờ người thứ hai chấm lại.
   - Trong 23 quán được gắn local có vài quán giống quán cà phê hay quán kem (An Coffee, Kem Dừa Côn Đảo CoCoo), vì Foody gắn thẻ món Việt cho chúng. Danh sách này cần kiểm tay.

3. **Một câu thử trượt và mình học được gì:**
   B13 là câu do chính mình viết: Bánh Cuốn Cao Bằng & Phở Vịt Quay có 2 địa chỉ, expected là `local`. Ở lượt 4 câu này vẫn ra `unsure`, vì Foody để trống `cuisine` của quán. Muốn biết quán bán món Việt thì chỉ còn cách đọc tên quán. Nhóm chọn không đoán món từ tên để Phở Lý Quốc Sư (B10, là chuỗi nhưng chưa có nguồn chính thức) không bị gắn local nhầm, nên B10 đạt còn B13 trượt. Mình học được rằng khi viết expected, phải kiểm xem dữ liệu agent đọc được có thật sự chứa tín hiệu đó không. Lúc viết B13, mình suy ra "món Việt" từ tên quán, nhưng công cụ không trả thông tin đó cho agent.
