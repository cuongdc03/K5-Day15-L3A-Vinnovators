# CP4 — phần bổ sung, giữ nguyên khung gốc

Mở **bản tích hợp dữ liệu thật**:

```powershell
python -m cp4.server
# Mở http://127.0.0.1:8765/web-demo/live.html
```

`web-demo/index.html` và `ui.js` vẫn là bản gốc của nhóm. Bản tích hợp riêng là `live.html` + `ui-live.js`; không lấy quán minh họa từ `places_verdicts.json`. Danh mục đủ menu: `/web-demo/menu.html`. Hồ sơ, slide, video: `/cp4/public/status.html`.

## Kiểm tra không tốn API

```powershell
python data/schema/validate.py data/processed
python -m cp4.run check
python -m unittest cp3.test_workflow cp4.test_integration crawl.test_verify crawl.test_reviews crawl.test_link_shopee
python -m cp4.audit
```

## Tạo lại bản tích hợp sau khi nhóm đổi data

```powershell
python -m cp4.export_data
python -m cp4.build_ui
python -m cp4.build_report
```

Export lấy các kết quả model thành công trong `eval/run-N.csv`, ưu tiên lượt mới; không suy diễn nhãn `final` thành đầu ra AI. Có 17 địa điểm đã đánh giá. 10 điểm hỗ trợ tài xế được tách khỏi danh sách quán. Giá chưa có để trống. Có 10 quán ghép với địa điểm cũ bằng slug; 140 quán còn lại được bổ sung thành bản ghi ShopeeFood riêng, không ghi đè dữ liệu nguồn.

### Cập nhật theo yêu cầu gắn toàn bộ ShopeeFood

Đã đọc metadata công khai: **150/150 quán có tọa độ**, lưu nguồn và thời điểm tại `data/processed/shopee_locations.json`. Link ToCoToCo 100 Cổ Bi ban đầu ở `shopeefood.com.vn` được tìm lại trên danh sách chính thức `shopeefood.vn`; lưu cả link gốc và link đã phân giải. Tổng danh sách hiện tại **552 bản ghi địa điểm**, đủ **4.308 dòng món**; 12 quán vẫn chưa có menu đọc được, không bịa món.

Mốc người dùng đã chọn: **VinUni (20.9889, 105.9447)**. Khoảng cách Haversine đường chim bay, làm tròn khi hiển thị; dùng cùng một mốc cho mọi khu vực, không đổi theo tâm quận. Danh sách chính và menu xếp gần → xa. Có bộ lọc “Chỉ quán ShopeeFood”. Khoảng cách không phải quãng đường chạy xe hoặc phí/thời gian giao.

Để thu lại vị trí bằng Chrome/Playwright có sẵn: chạy `node cp4/collect_locations.mjs`, rồi `node cp4/resolve_missing_location.mjs`; sau đó export/build UI như trên. Kiểm tra: `python -m unittest cp4.test_locations` và `node cp4/test_shopee_ui.mjs`. Các slide/video CP4 trước đó là ảnh chụp của thời điểm trước lần bổ sung này.

3D là mô hình minh họa, dùng 2D để xem vị trí địa lý. Văn Giang chuyển về 2D vì chưa có mô hình riêng; không mượn mô hình Gia Lâm để hiển thị khu vực này.

## Chạy AI thật (có tính phí)

```powershell
python -m cp4.run eval
python -m cp4.run simulate --rate-from cp4/results/run-3-graded-draft.csv
```

Lượt đã chạy xong: `eval/run-3.csv`, `traces/run-3.jsonl`, `cost/simulate-1.csv`, `traces/simulate-1.jsonl`. Không cần chạy lại chỉ để xem demo. `cp4/ai.py` dùng cấu hình `.env` hiện có, chỉ nhận OpenAI/gpt-6-luna và chặn theo sổ chi phí tích lũy `cp4/results/api_budget.json` ở 1 USD. Không xóa sổ để chạy lại. Giá tính token không bao gồm thuế, hạ tầng, thu thập data hoặc phí khác. Không đưa key vào frontend.

## Cải tiến đã đo

Ba thay đổi trong `cp4/agent.py`: thêm nguồn chính thức Haidilao vào registry phụ; loại điểm hỗ trợ/nghỉ tài xế khỏi nhận diện chuỗi quán ăn; từ chối yêu cầu ép nhãn. Giữ nguyên điều kiện thiếu review thì chưa kết luận local. Bộ thử, expected và metric không đổi.

`cp4/results/run-3-graded-draft.csv` là **bản chấm nháp**, không thay thế lượt gốc. 15/20 so với 12/20 baseline, nhưng chỉ 5/9 câu thường đạt nhãn (55,6% < 75%). B16 chưa gợi ý được quán; nháp cho qua theo tiêu chí hẹp giống baseline, người duyệt cần xem lại. Nếu không chấp nhận B16 thì cả baseline và CP4 giảm 1 câu, chênh lệch vẫn +3. `python -m cp4.measure_metrics` đối chiếu số review/địa chỉ và registry với các trường trace còn đọc đủ: grounded_reason 15/15 câu có nhãn (16 verdicts), bản nháp chờ người duyệt. Không suy diễn giá trị từ phần trace bị cắt.

Mô phỏng đủ 50 phiên/87 lượt hỏi, 0 lỗi. Tính chi phí / task dùng tỷ lệ **nháp** 75%, chưa phải số đo task thành công ngoài đời. Mô hình giá thứ hai chỉ áp giá lên token Luna đã đo, không đo chất lượng hay token của model thứ hai. Chi tiết và nguồn ở `cp4/public/status.html`.

## Kiểm tra UI, PDF và video

`cp4/test_ui.mjs` dùng Playwright + Chrome có sẵn; Node dependencies nằm trong runtime Codex hiện tại. Máy khác cần `npm install --no-save playwright` và browser/ffmpeg tương ứng; không phải dependency của agent Python. Script kiểm số bản ghi, bộ lọc, menu, refusal, viewport điện thoại, JS errors, và đường dẫn riêng tư trả 404; ghi screenshot và video thật. `cp4/render_slides.mjs` in HTML thành PDF và chụp từng slide để kiểm tra.

## Phần cần người thật trước khi xác nhận nộp đủ

- Duyệt bản chấm và chấm độc lập ít nhất 5 output; xác nhận các nhãn chuẩn.
- Bổ sung khảo sát đúng đối tượng (19 hợp lệ < 20), phỏng vấn thật (0/3), số phút tiết kiệm chưa đo. Không đổi ngưỡng 60% để khớp 58%.
- Thu review có nguồn: hiện 0, so với mục tiêu ≥3 review cho 150 quán; bổ sung độ phủ 3 quận còn thiếu.
- Điền thông tin phòng/zone, phân công người nói slide, reflection cá nhân, chạy trên máy thứ hai và nộp form CP4. Agent không thể xác nhận thay trải nghiệm/người thật.

Không commit/push hoặc nộp bài tự động. Các báo cáo gốc còn nội dung cũ; phần cập nhật CP4 nằm ở thư mục này theo yêu cầu chỉ bổ sung file.
