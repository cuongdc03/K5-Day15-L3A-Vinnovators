"""Nối model — chỗ DUY NHẤT trong bản chạy thử gọi model AI. NHÓM VIẾT phần gọi model thật.

Hợp đồng (giữ nguyên để khung đo được token):
    call_model(system: str, user: str) -> dict với 4 khoá
        "text":       str   chữ model trả về
        "model":      str   tên model đã gọi (để tra giá ở bảng giá model)
        "tokens_in":  int   số token vào, lấy từ trường usage trong phản hồi API — KHÔNG ước lượng
        "tokens_out": int   số token ra, gồm cả token suy luận / suy nghĩ nếu API tính riêng
    @model_call (từ tracing.py) tự ghi mỗi lần gọi vào trace; agent.py gọi call_model bao nhiêu lần
    cũng được, khung tự cộng token.
    Lỗi gọi model (hết lượt, sai key, mất mạng): cứ để exception bay ra — khung ghi lỗi vào cột error.

Chế độ giả (mặc định khi .env chưa có MODEL_PROVIDER, hoặc MODEL_PROVIDER=fake):
    trả một câu giả cố định, model "fake", token 0 — để luồng chạy hết từ trước CP2 (guide bước 3.2).
    Lượt `run.py eval` / `run.py simulate` chạy bằng model giả KHÔNG được tính.

Nối model thật: điền .env (chép từ .env.example), rồi viết nhánh gọi API ở dưới theo docs/connect-model.md
(có ví dụ OpenAI, Claude, model chạy trên máy, và cách nối nhà cung cấp khác). Không dán API key vào file này.
"""
import os
import json
import urllib.error
import urllib.request

from tracing import model_call

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_env(path=os.path.join(ROOT, ".env")):
    """Đọc file .env (KEY=VALUE mỗi dòng) vào biến môi trường, không ghi đè biến đã có. Khung — không cần sửa."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env()
MODEL_PROVIDER = (os.environ.get("MODEL_PROVIDER") or "fake").strip().lower()
MODEL_NAME = (os.environ.get("MODEL_NAME") or "").strip()
API_KEY = (os.environ.get("API_KEY") or "").strip()


@model_call
def call_model(system: str, user: str) -> dict:
    if MODEL_PROVIDER == "fake":
        last = (user.strip().splitlines() or [""])[-1]
        return {"text": "[câu trả lời giả — chưa nối model] " + last[:60], "model": "fake", "tokens_in": 0, "tokens_out": 0}

    if not MODEL_NAME:
        raise ValueError("Thiếu MODEL_NAME trong môi trường hoặc .env")
    if MODEL_PROVIDER in {"openai", "anthropic"} and not API_KEY:
        raise ValueError("Thiếu API_KEY; không ghi key vào code hoặc chat")
    messages = ([{"role":"system", "content":system}] if system else []) + [{"role":"user", "content":user}]
    if MODEL_PROVIDER == "openai":
        data = post_json("https://api.openai.com/v1/chat/completions",
                         {"Authorization":"Bearer " + API_KEY}, {"model":MODEL_NAME,"messages":messages})
        text = data["choices"][0]["message"]["content"]
        tokens_in, tokens_out = usage_pair(data["usage"], "prompt_tokens", "completion_tokens")
    elif MODEL_PROVIDER == "anthropic":
        data = post_json("https://api.anthropic.com/v1/messages",
                         {"x-api-key":API_KEY,"anthropic-version":"2023-06-01"},
                         {"model":MODEL_NAME,"system":system,"max_tokens":2048,"messages":[{"role":"user","content":user}]})
        text = "".join(block["text"] for block in data["content"] if block["type"] == "text")
        tokens_in, tokens_out = usage_pair(data["usage"], "input_tokens", "output_tokens")
    elif MODEL_PROVIDER == "ollama":
        data = post_json("http://127.0.0.1:11434/api/chat", {},
                         {"model":MODEL_NAME,"messages":messages,"stream":False,"format":"json",
                          "options":{"num_gpu":int(os.environ.get("CP3_NUM_GPU", "-1")),
                                     "num_ctx":4096,"num_predict":512,"temperature":0,"seed":42}}, timeout=300)
        text = data["message"]["content"]
        tokens_in, tokens_out = usage_pair(data, "prompt_eval_count", "eval_count")
    else:
        raise ValueError("MODEL_PROVIDER chỉ nhận fake/openai/anthropic/ollama")
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Model không trả nội dung văn bản")
    return {"text":text,"model":data.get("model") or MODEL_NAME,"tokens_in":tokens_in,"tokens_out":tokens_out}


def usage_pair(usage, input_key, output_key):
    """Usage bắt buộc lấy từ API. Không điền 0 hoặc ước lượng khi API thiếu số."""
    values = usage[input_key], usage[output_key]
    if any(not isinstance(v, int) or isinstance(v, bool) or v < 0 for v in values):
        raise ValueError("API usage phải là số nguyên không âm")
    return values


def post_json(url, headers, body, timeout=90):
    """Gọi một lần; không retry tự động để tránh tính phí lặp."""
    request = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), method="POST",
                                     headers={"Content-Type":"application/json", **headers})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Model API HTTP {exc.code}; kiểm cấu hình/key/ngân sách") from None
    except urllib.error.URLError:
        raise RuntimeError("Không kết nối được model API; kiểm mạng hoặc Ollama đang chạy") from None
