# SSG105_SU26
## 🚀 Hướng Dẫn Chạy Trên Máy

### Cách 1 — Nhanh nhất
1. Tải file `index.html` về máy
2. Nhấn **đúp chuột** vào file
3. Trình duyệt tự mở — xong!

### Cách 2 — Dùng VS Code + Live Server
1. Mở VS Code
2. Cài extension "Live Server" (nếu chưa có)
   → Nhấn biểu tượng Extensions (Ctrl+Shift+X)
   → Tìm "Live Server" → Install
3. Mở thư mục chứa index.html
4. Chuột phải vào index.html → "Open with Live Server"

### Chạy chatbot Groq trong Zed
Chatbot cần backend `/api/chat`, vì vậy không chạy được đầy đủ bằng cách mở file HTML trực tiếp hoặc `python3 -m http.server`.

Trong terminal của Zed:

```bash
cd /Users/nguyenquy1411/Documents/dev/SSG105_SU26
cp .env.example .env.local
```

Thêm key Groq vào `.env.local`:

```bash
GROQ_API_KEY=your_groq_api_key_here
```

Web search có fallback miễn phí bằng DuckDuckGo. Nếu muốn kết quả search tốt hơn, thêm Tavily key (không bắt buộc):

```bash
TAVILY_API_KEY=your_tavily_api_key_here
```

Sau đó chạy:

```bash
npm start
```

Mở:

```text
http://localhost:3000
```

#### Deploy Vercel
Trong Vercel Project Settings → Environment Variables, thêm:

```text
GROQ_API_KEY=your_groq_key
```

Nếu dùng Tavily để search web tốt hơn, thêm tiếp:

```text
TAVILY_API_KEY=your_tavily_key
```

Không đưa API key vào file `.html` hoặc `.js` phía frontend.
