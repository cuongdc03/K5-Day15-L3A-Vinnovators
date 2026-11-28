# Đào dữ liệu — phần Thái CP2/CP3

## Phương pháp và mẫu số

Đầu vào là danh sách URL ShopeeFood do người dùng cung cấp. Chuẩn hoá http sang https, bỏ URL trùng: 151 URL, gồm 150 trang quán và 1 trang khu vực. Lượt thu lại ngày 27/11/2026 bằng `node crawl/shopee_menus.mjs`; đọc tên quán, địa chỉ, nhóm món, tên món, mô tả, giá online và giá gốc từ DOM, cuộn menu ảo đến cuối. Trang lỗi mạng được thử lại; trạng thái menu rỗng được giữ.

Đếm lại bằng `python evidence/count_data.py`. Mẫu số độ phủ menu là 150 trang quán. Mẫu số dòng món là số dòng được trang hiển thị, giữ món lặp ở các nhóm menu. Số lượt đánh giá hiển thị không phải số review đã thu.

## Kết quả lượt thu mới

| Chỉ số | Kết quả |
|---|---|
| Quán đọc đủ menu hiển thị | 138/150 (92,0%) |
| Quán chưa trả menu đầy đủ | 12/150 (8,0%) |
| Dòng món/sản phẩm | 4.308 |
| Nối chính xác theo slug URL với places.csv | 10/150 |
| Chưa nối với places.csv | 140/150 |
| Review thật đã thu | 0 |
| Quán có ≥3 review | 0/150 mục tiêu |

Snapshot trước từng có 4.307 dòng nhưng không còn ở vùng tạm; lượt thu mới có 4.308 dòng. Không coi hai lượt là cùng snapshot.

## Năm ví dụ có nguồn

1. [TH true mart – Hà Huy Tập](https://shopeefood.vn/ha-noi/th-true-mart-ha-huy-tap-70000453): 280 dòng sản phẩm; cần phân biệt cửa hàng bán lẻ với quán ăn trưa.
2. [Homefarm – Đặng Xá](https://shopeefood.vn/ha-noi/homefarm-thuc-pham-cao-cap-dang-xa): 304 dòng sản phẩm.
3. [RUTA – Nguyễn Quý Trị](https://shopeefood.vn/ha-noi/ruta-tra-sua-tuoi-nguyen-quy-tri.zwd4is): 29 dòng đồ uống.
4. [Gà Đồi 98](https://shopeefood.vn/ha-noi/ga-doi-98-met-ga-lon-ban): 45 dòng menu; tên món có thể lặp giữa các nhóm.
5. [Trà Bí Đao Mộc An](https://shopeefood.vn/ha-noi/tra-bi-dao-moc-an-tra-bi-dao-phan-dang-luu): chưa có dòng menu trả về, vẫn giữ tên/URL và trạng thái thiếu dữ liệu.

## Giới hạn và kết luận

Mẫu do người dùng đưa, thiên về Gia Lâm và quán giao online. Menu có thể đổi; giá online chưa gồm phí giao/ưu đãi cấp đơn. Không suy ra giá một bữa ăn từ min/max toàn menu. Địa chỉ dạng chữ chưa thay được tọa độ chính xác.

Dữ liệu cho thấy độ phủ menu và nhu cầu lọc loại cửa hàng; chưa đo được hành vi, thời gian chọn quán hoặc pain của người dùng. Khảo sát và phỏng vấn hiện chưa có. Vì vậy giả thuyết pain **chưa được xác nhận**; không dùng các số menu để thay review hoặc câu trả lời người thật.
