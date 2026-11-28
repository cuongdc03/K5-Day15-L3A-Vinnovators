# Phần bổ sung CP3 — giữ nguyên starter

Ngày kiểm: 28/11/2026. Các file codebase/agent.py, codebase/tools.py, codebase/ai.py và khung run/eval/simulate giữ nguyên bản Git. Toàn bộ triển khai mới ở thư mục này.

## Chạy

```powershell
$env:PYTHONUTF8='1'
python -m cp3.run check
python -m unittest cp3.test_workflow

# Model có sẵn trong Ollama; CPU khi GPU không đủ bộ nhớ
$env:MODEL_PROVIDER='ollama'
$env:MODEL_NAME='qwen2.5:3b'
$env:CP3_NUM_GPU='0'
python -m cp3.run eval --try 1

# Chỉ chạy cả bộ khi lượt thử thành công và token > 0
python -m cp3.run eval
```

`cp3.run` thực thi file khung gốc trong cùng tiến trình và chọn agent bổ sung qua module import. `python run.py` vẫn chạy khung mẫu nguyên bản. Không sửa benchmark, metric hay chuẩn đạt.

## Đã triển khai

- Tra quán theo place_id/tên, lấy dữ liệu từ 422 quán, menu online đã nối, review và registry chuỗi.
- Kết nối OpenAI, Anthropic hoặc Ollama bằng thư viện chuẩn. Token bắt buộc lấy từ usage API; thiếu usage là lỗi, không ước lượng.
- AI chọn nhãn và độ chắc; chặn nhãn chain không có nguồn, tourist thiếu hai tín hiệu, local thiếu review, độ chắc thấp và JSON lỗi. Các ca thiếu dữ liệu trả unsure và gọi flag_for_human để tạo bản nháp hàng đợi trong output/trace.
- Lý do được dựng từ tín hiệu công cụ, không dùng con số do model tự sinh. Không có nhãn độc lập/toàn Hà Nội được suy ra chỉ từ một bản ghi địa chỉ trong mẫu.
- Review và câu hỏi được gửi dưới dạng dữ liệu, không được thay đổi luật hệ thống. Từ chối yêu cầu an toàn thực phẩm hoặc viết review xấu.
- `chain_registry_additions.csv`: bốn nguồn thương hiệu chính thức bổ sung; không sửa registry gốc. Số chi nhánh chưa kiểm đếm được để trống.

## Kết quả kiểm thực tế

- 12 test luồng/model mới và 26 test crawl đạt.
- Bộ câu thử gốc: 20 câu, 4 metric; lệnh check đạt. Schema hiện tại đạt.
- Dữ liệu: 422 quán, menu nguồn ShopeeFood 150 quán/4.308 dòng; 138 menu đọc đủ, 10 URL nối chính xác. Review thật: 0.
- Máy có qwen2.5:3b, qwen3:4b-instruct, qwen3.5:4b-q4_K_M. Đã khởi động Ollama nền cho thử nghiệm, không tải model mới.
- Thử 1 câu trên qwen2.5:3b gặp HTTP 500: GPU thiếu khoảng cấp phát 1.058.564.096 byte; CPU thiếu khoảng cấp phát 1.327.104.000 byte. Chưa có output AI thật hoặc token thành công. Đây là lỗi tài nguyên, không phải một lượt eval đạt.
- Log kỹ thuật ở data/raw/ollama-cp3.stderr.log (không commit), lượt thử ở eval/run-try.csv và traces/run-try.jsonl (không tính lượt nộp).

## Điều kiện CP3 còn thiếu

1. Bằng chứng pain: chưa có khảo sát/phỏng vấn/review thật. Dữ liệu menu không chứng minh thời gian hoặc khó khăn của người dùng.
2. Nhãn L1/final chưa có; expected của bộ benchmark đang là nhãn nháp L2, giữ nguyên để nhóm duyệt.
3. Lượt eval AI thật: cần đủ RAM/VRAM cho model hiện có hoặc API key của nhóm. Không dùng kết quả test fixture làm kết quả AI thật.

CP3 chưa hoàn tất cho đến khi các điều kiện trên có bằng chứng. Sau khi lượt thử thành công, chạy eval thật, chấm theo metric đã chốt và ghi run ID; không sửa các lượt đã chạy.
