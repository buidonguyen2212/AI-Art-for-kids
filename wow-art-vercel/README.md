# WOW Art — AI Art Analysis Tool

Phân tích tranh trẻ em bằng AI theo 4 lớp khoa học:
Lowenfeld · Gardner · Vygotsky · Reggio Emilia

## Deploy lên Vercel (5 phút)

### Bước 1: Lấy Gemini API Key
1. Vào https://aistudio.google.com/apikey
2. Nhấn "Create API Key"
3. Copy key

### Bước 2: Push code lên GitHub
```bash
cd wow-art-vercel
git init
git add .
git commit -m "WOW Art AI Analysis Tool"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/wow-art-ai.git
git push -u origin main
```

### Bước 3: Deploy trên Vercel
1. Vào https://vercel.com → Sign in bằng GitHub
2. Nhấn "Add New Project" → Import repo `wow-art-ai`
3. **QUAN TRỌNG** — Thêm Environment Variable:
   - Key: `GEMINI_API_KEY`
   - Value: (dán API key từ Bước 1)
4. Nhấn "Deploy"
5. Nhận link: `https://wow-art-ai.vercel.app` (hoặc tên bạn chọn)

### Bước 4: Custom Domain (tuỳ chọn)
- Vercel Settings → Domains → Thêm `art.wowart.vn`
- Trỏ DNS CNAME về `cname.vercel-dns.com`

## Cấu trúc project

```
wow-art-vercel/
├── api/
│   └── analyze.js      ← Serverless function (giấu API key)
├── public/
│   └── index.html       ← Frontend (PH xài trực tiếp)
├── package.json
├── vercel.json          ← Config routing
└── README.md
```

## Chi phí
- **Vercel**: Free (hobby plan, 100GB bandwidth/tháng)
- **Gemini API**: Free tier 15 RPM, 1M tokens/phút — đủ cho ~500 phân tích/ngày
