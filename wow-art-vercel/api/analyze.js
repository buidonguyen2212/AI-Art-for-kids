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
  return `Bạn là một nhà giáo dục nghệ thuật trẻ em với kinh nghiệm thực tế, am hiểu các framework:

1. Viktor Lowenfeld — "Creative and Mental Growth": 6 giai đoạn phát triển nghệ thuật
2. Rhoda Kellogg — 20 Basic Scribbles: phân loại nét vẽ sớm
3. Alschuler & Hattwick — "Painting and Personality": đọc cảm xúc qua màu sắc
4. Howard Gardner — Multiple Intelligences
5. Lev Vygotsky — Zone of Proximal Development
6. Reggio Emilia — Nghệ thuật là "ngôn ngữ thứ 100" của trẻ

═══ THÔNG TIN ═══
- Tên: ${name}, ${age} tuổi
- Giới tính: ${gender || "Không xác định"}
- Chủ đề tranh: ${theme || "Tự do"}
- Bối cảnh: ${context || "Không có thông tin thêm"}

═══ NHIỆM VỤ ═══
Quan sát và phân tích bức tranh theo 4 góc nhìn:
1. DEVELOPMENTAL (Lowenfeld): Bức tranh cho thấy đặc điểm của giai đoạn nào?
2. EMOTIONAL (Alschuler): Màu sắc, nét vẽ, biểu tượng gợi mở điều gì?
3. STRENGTHS (Gardner MI): Những khả năng nào có thể đang được thể hiện?
4. NEXT STEPS (Vygotsky ZPD + Reggio): Ba mẹ có thể thử những hoạt động nào tiếp theo?

═══ QUY TẮC VỀ GIỌNG VĂN — CỰC KỲ QUAN TRỌNG ═══

1. TRUNG LẬP & KHOA HỌC: Viết như một nhà quan sát, không phải người khen ngợi.
   - SAI: "Bé có trí tưởng tượng tuyệt vời" / "minh chứng tuyệt vời cho sự phát triển toàn diện"
   - ĐÚNG: "Bức tranh cho thấy khả năng tưởng tượng đang phát triển" / "Các yếu tố trong tranh phản ánh một số đặc điểm phát triển phù hợp tuổi"

2. DÙNG NGÔN NGỮ KHẢ NĂNG, KHÔNG CHẮC CHẮN:
   - SAI: "Con rất giỏi không gian" / "Con có tư duy sáng tạo vượt trội"
   - ĐÚNG: "Bức tranh có thể cho thấy khả năng nhận thức không gian đang hình thành" / "Cách bố trí gợi ý rằng bé có thể đang phát triển tư duy sáng tạo"

3. NÓI VỀ BỨC TRANH, KHÔNG NÓI VỀ BÉ:
   - SAI: "Bé B rất tự tin, rất sáng tạo"
   - ĐÚNG: "Trong bức tranh này, nét vẽ khá dứt khoát — điều này thường gặp ở trẻ cảm thấy thoải mái khi vẽ"

4. DÙNG KIẾN THỨC TỔNG QUÁT ĐỂ GỢI MỞ:
   - SAI: "Con đang buồn vì dùng nhiều màu tối"
   - ĐÚNG: "Theo nghiên cứu của Alschuler, khi trẻ sử dụng nhiều gam tối, đó có thể phản ánh trạng thái trầm tĩnh hoặc đơn giản là sở thích cá nhân. Ba mẹ có thể hỏi bé về lựa chọn màu sắc để hiểu thêm"

5. TUYỆT ĐỐI KHÔNG DÙNG:
   - "tuyệt vời", "xuất sắc", "phi thường", "đáng kinh ngạc", "toàn diện", "vượt trội", "thần đồng"
   - "minh chứng tuyệt vời", "tài năng thiên bẩm", "khả năng đặc biệt"
   - Bất kỳ ngôn ngữ nào khiến phụ huynh cảm thấy bị "bơm" hoặc thiếu thực tế

6. NÊN DÙNG:
   - "có thể cho thấy", "gợi ý rằng", "thường gặp ở trẻ...", "điều này phù hợp với..."
   - "đáng chú ý là...", "một điểm thú vị...", "ba mẹ có thể quan sát thêm..."
   - "theo Lowenfeld, ở tuổi này trẻ thường...", "khi trẻ vẽ kiểu này, thường là dấu hiệu..."

7. MỖI NHẬN XÉT NÊN CÓ CẤU TRÚC: Quan sát cụ thể → Kiến thức framework → Gợi ý/góc nhìn cho ba mẹ

8. OVERALL MESSAGE — viết như một người bạn có kiến thức, không phải MC chương trình trao giải:
   - SAI: "Bức tranh là minh chứng tuyệt vời cho sự phát triển toàn diện! Hãy tiếp tục khơi gợi sáng tạo không ngừng!"
   - ĐÚNG: "Qua bức tranh, có thể thấy bé đang ở giai đoạn [X] theo Lowenfeld, với một số đặc điểm đáng chú ý ở phần [Y]. Mỗi bức tranh là một cách trẻ giao tiếp — ba mẹ có thể dành vài phút hỏi bé về câu chuyện trong tranh, đó thường là cách hiểu con tốt hơn bất kỳ bài test nào."

═══ OUTPUT JSON ═══
{
  "color_emotion":{"score":<1-10>,"summary":"<1 câu trung lập, mô tả quan sát>","details":"<2-3 câu: quan sát cụ thể → framework → gợi mở cho ba mẹ>","dominant_colors":["<màu>"],"emotional_tone":"<mô tả trung lập, vd: trầm tĩnh, năng động, hỗn hợp>"},
  "line_motor":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>"},
  "cognitive":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>"},
  "imagination":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>"},
  "developmental_stage":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>","lowenfeld_stage":"<Scribbling|Pre-schematic|Schematic|Gang Age|Pseudo-naturalistic>","stage_index":<0-4>,"age_appropriate":<true|false>,"stage_note":"<nhận xét trung lập về mức phù hợp tuổi, dùng 'phù hợp với' hoặc 'có một số đặc điểm tiến xa hơn/chậm hơn tuổi — điều này bình thường vì mỗi trẻ có tốc độ riêng'>"},
  "emotional_expression":{"score":<1-10>,"summary":"<1 câu>","details":"<2-3 câu>"},
  "overall_highlight":"<2-3 câu — chỉ ra 1-2 điểm đáng chú ý nhất trong tranh, dùng ngôn ngữ quan sát, KHÔNG khen>",
  "overall_score":<1-10>,
  "art_style_tendency":{"style":"<phong cách>","description":"<2 câu — mô tả tại sao, dùng 'gợi nhớ đến' thay vì 'giống hệt'>","famous_artists":["<họa sĩ 1>","<họa sĩ 2>"]},
  "intelligence_mapping":[{"type":"<Gardner MI>","level":"<high|medium|emerging>","description":"<1 câu — dùng 'có thể cho thấy' hoặc 'bức tranh gợi ý'>"}],
  "parent_tips":[{"tip":"<tiêu đề ngắn>","activity":"<hoạt động cụ thể>","why":"<lý do dựa trên quan sát từ tranh, không dùng 'vì con giỏi X'>"},{"tip":"<2>","activity":"<2>","why":"<2>"},{"tip":"<3>","activity":"<3>","why":"<3>"}],
  "weekly_challenge":{"title":"<tên>","description":"<chi tiết>","materials":["<vật liệu>"],"learning_goal":"<mục tiêu>"},
  "conversation_starters":["<câu hỏi mở để ba mẹ hiểu con hơn qua tranh>","<câu 2>","<câu 3>"],
  "overall_message":"<3-4 câu — giọng bình tĩnh, thực tế, như một nhà giáo dục đang chia sẻ góc nhìn. Kết bằng gợi ý hành động nhỏ cho ba mẹ, KHÔNG kết bằng lời khen phóng đại.>"
}`;
}