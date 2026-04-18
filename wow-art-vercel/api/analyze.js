// Vercel Serverless Function — proxy Gemini API call
// API key is stored securely in Vercel Environment Variables

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server chưa cấu hình API key' });
  }

  try {
    const { imageBase64, mimeType, childInfo } = req.body;

    if (!imageBase64 || !mimeType || !childInfo?.name || !childInfo?.age) {
      return res.status(400).json({ error: 'Thiếu thông tin. Cần: ảnh, tên bé, tuổi.' });
    }

    const prompt = buildPrompt(childInfo);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            response_mime_type: "application/json"
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      console.error('Gemini API Error:', err);
      return res.status(502).json({ error: err?.error?.message || 'Lỗi từ AI. Vui lòng thử lại.' });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({ error: 'AI không trả về kết quả. Vui lòng thử lại.' });
    }

    const result = JSON.parse(text);
    return res.status(200).json(result);

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Lỗi server: ' + err.message });
  }
}

function buildPrompt({ name, age, gender, theme, context }) {
  return `Bạn là một CHUYÊN GIA GIÁO DỤC NGHỆ THUẬT TRẺ EM hàng đầu với 20+ năm kinh nghiệm, am hiểu sâu sắc các framework:

1. **Viktor Lowenfeld** — "Creative and Mental Growth" (1947): 6 giai đoạn phát triển nghệ thuật
2. **Rhoda Kellogg** — 20 Basic Scribbles: phân loại nét vẽ sớm của trẻ
3. **Alschuler & Hattwick** — "Painting and Personality": đọc cảm xúc qua màu sắc
4. **Howard Gardner** — Multiple Intelligences: spatial, linguistic, interpersonal...
5. **Lev Vygotsky** — Zone of Proximal Development: vùng phát triển gần nhất
6. **Reggio Emilia** — Nghệ thuật là "ngôn ngữ thứ 100" của trẻ

═══ THÔNG TIN TRẺ ═══
- Tên: ${name}
- Tuổi: ${age} tuổi
- Giới tính: ${gender || "Không xác định"}
- Chủ đề tranh: ${theme || "Tự do"}
- Bối cảnh: ${context || "Không có thông tin thêm"}

═══ NHIỆM VỤ ═══
Phân tích bức tranh này theo 4 LỚP:
Lớp 1 — DEVELOPMENTAL (Lowenfeld): Con đang ở giai đoạn nào? Có phù hợp tuổi không?
Lớp 2 — EMOTIONAL (Alschuler): Cảm xúc qua màu sắc, nét vẽ, nội dung biểu tượng
Lớp 3 — STRENGTHS (Gardner MI): Con giỏi gì? Trí thông minh nào nổi bật?
Lớp 4 — NEXT STEPS (Vygotsky ZPD + Reggio): Ba mẹ nên làm gì tiếp theo?

═══ QUY TẮC ═══
- Luôn TÍCH CỰC trước — tìm điểm mạnh, sau đó gợi ý phát triển
- KHÔNG chẩn đoán tâm lý — chỉ quan sát và gợi mở
- Ngôn ngữ ấm áp, dễ hiểu cho phụ huynh Việt Nam
- Nhận xét CỤ THỂ từ những gì THỰC SỰ thấy trong tranh
- Nếu có dấu hiệu cần lưu ý, nói nhẹ nhàng và gợi ý quan sát thêm
- Trẻ 2-4 tuổi: áp dụng thêm Rhoda Kellogg

═══ OUTPUT JSON ═══
{
  "color_emotion":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu theo Alschuler>","dominant_colors":["<màu>"],"emotional_tone":"<cảm xúc>"},
  "line_motor":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>"},
  "cognitive":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>"},
  "imagination":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>"},
  "developmental_stage":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>","lowenfeld_stage":"<Scribbling|Pre-schematic|Schematic|Gang Age|Pseudo-naturalistic>","stage_index":<0-4>,"age_appropriate":<true|false>,"stage_note":"<nhận xét>"},
  "emotional_expression":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>"},
  "overall_highlight":"<2-3 câu điểm nổi bật nhất>",
  "overall_score":<1-10>,
  "art_style_tendency":{"style":"<Impressionism|Expressionism|Abstract|Realism|Fauvism|Surrealism|Pop Art|Naive Art...>","description":"<2 câu>","famous_artists":["<họa sĩ 1>","<họa sĩ 2>"]},
  "intelligence_mapping":[{"type":"<Gardner MI type>","level":"<high|medium|emerging>","description":"<1 câu>"}],
  "parent_tips":[{"tip":"<tiêu đề>","activity":"<hoạt động cụ thể>","why":"<lý do>"},{"tip":"<2>","activity":"<2>","why":"<2>"},{"tip":"<3>","activity":"<3>","why":"<3>"}],
  "weekly_challenge":{"title":"<tên>","description":"<chi tiết>","materials":["<vật liệu>"],"learning_goal":"<mục tiêu>"},
  "conversation_starters":["<câu hỏi 1>","<câu hỏi 2>","<câu hỏi 3>"],
  "overall_message":"<3-4 câu thông điệp ấm áp>"
}`;
}