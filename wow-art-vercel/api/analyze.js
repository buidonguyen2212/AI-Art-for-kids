// Vercel Serverless Function — proxy Gemini API call

export default async function handler(req, res) {
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
          },
          // Tắt thinking mode → response nhanh gấp 3-5 lần
          thinkingConfig: {
            thinkingBudget: 0
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
  return `Bạn là nhà giáo dục nghệ thuật trẻ em, am hiểu Lowenfeld, Kellogg, Alschuler & Hattwick, Gardner MI, Vygotsky ZPD, Reggio Emilia.

THÔNG TIN: ${name}, ${age} tuổi, ${gender || "không rõ giới tính"}. Chủ đề: ${theme || "tự do"}. ${context || ""}

PHÂN TÍCH bức tranh theo 4 góc: Developmental (Lowenfeld) → Emotional (Alschuler) → Strengths (Gardner) → Next Steps (Vygotsky).

QUY TẮC GIỌNG VĂN:
- Nói về BỨC TRANH, không nói về bé. VD: "Bức tranh cho thấy..." chứ không "Bé rất giỏi..."
- Dùng ngôn ngữ khả năng: "có thể cho thấy", "gợi ý rằng", "thường gặp ở trẻ..."
- Cấu trúc: quan sát cụ thể → kiến thức framework → gợi ý cho ba mẹ
- KHÔNG dùng: tuyệt vời, xuất sắc, phi thường, toàn diện, vượt trội, thần đồng, minh chứng tuyệt vời
- NÊN dùng: "đáng chú ý là", "một điểm thú vị", "theo Lowenfeld, ở tuổi này trẻ thường..."
- Không chẩn đoán tâm lý, chỉ quan sát và gợi mở
- Giọng như nhà giáo dục chia sẻ góc nhìn, trung lập, thực tế, không phóng đại

OUTPUT JSON:
{
  "color_emotion":{"score":<1-10>,"summary":"<1 câu quan sát>","details":"<2-3 câu>","dominant_colors":["<màu>"],"emotional_tone":"<trung lập>"},
  "line_motor":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>"},
  "cognitive":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>"},
  "imagination":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>"},
  "developmental_stage":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>","lowenfeld_stage":"<Scribbling|Pre-schematic|Schematic|Gang Age|Pseudo-naturalistic>","stage_index":<0-4>,"age_appropriate":<true|false>,"stage_note":"<nhận xét trung lập>"},
  "emotional_expression":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>"},
  "overall_highlight":"<2 câu điểm đáng chú ý, ngôn ngữ quan sát>",
  "overall_score":<1-10>,
  "art_style_tendency":{"style":"<phong cách>","description":"<1-2 câu, dùng gợi nhớ đến>","famous_artists":["<họa sĩ>"]},
  "intelligence_mapping":[{"type":"<Gardner MI>","level":"<high|medium|emerging>","description":"<1 câu dùng có thể cho thấy>"}],
  "parent_tips":[{"tip":"<tiêu đề>","activity":"<hoạt động>","why":"<lý do từ quan sát tranh>"},{"tip":"<2>","activity":"<2>","why":"<2>"},{"tip":"<3>","activity":"<3>","why":"<3>"}],
  "weekly_challenge":{"title":"<tên>","description":"<chi tiết>","materials":["<vật liệu>"],"learning_goal":"<mục tiêu>"},
  "conversation_starters":["<câu hỏi mở>","<câu 2>","<câu 3>"],
  "overall_message":"<2-3 câu thực tế, như nhà giáo dục chia sẻ góc nhìn, kết bằng gợi ý hành động nhỏ cho ba mẹ>"
}`;
}