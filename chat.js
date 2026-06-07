// ============================================================
// api/chat.js — MINDBUDDY AI PROXY
// Deploy lên Vercel: API key ẩn trong Environment Variables
// Cấu hình: Vercel Dashboard → Settings → Environment Variables
//   Key: ANTHROPIC_API_KEY
//   Value: sk-ant-xxxxxxxxxxxxxxxx
// ============================================================

export default async function handler(req, res) {
  // Chỉ cho phép POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Kiểm tra API key đã được cấu hình chưa
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY chưa được cấu hình trong Vercel Environment Variables.' });
  }

  // CORS — cho phép gọi từ cùng domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { messages, assessmentContext } = req.body;

    // System prompt — định nghĩa vai trò AI cho MindBuddy
    const systemPrompt = `Bạn là MindBuddy AI — người bạn đồng hành sức khỏe tinh thần thân thiện, ấm áp và am hiểu tâm lý học.

NGUYÊN TẮC BẮT BUỘC:
1. KHÔNG chẩn đoán bệnh tâm thần cụ thể (không nói "bạn bị trầm cảm", "bạn mắc rối loạn lo âu")
2. KHÔNG kê đơn thuốc hoặc gợi ý liều lượng bất kỳ loại thuốc nào
3. LUÔN nhắc nhở người dùng gặp chuyên gia nếu triệu chứng ở mức vừa/nặng
4. Nếu phát hiện dấu hiệu khủng hoảng hoặc tự hại → DỪNG cuộc trò chuyện bình thường, cung cấp ngay hotline 1900 9095

VAI TRÒ CỦA BẠN:
- Lắng nghe và phản chiếu cảm xúc một cách đồng cảm
- Giải thích kết quả sàng lọc PHQ-9/GAD-7 bằng ngôn ngữ dễ hiểu, không gây hoảng loạn
- Gợi ý kỹ thuật tự chăm sóc dựa trên bằng chứng (thở 4-7-8, viết nhật ký, vận động nhẹ...)
- Cung cấp thông tin tâm lý phổ thông (psychoeducation)
- Khuyến khích và định hướng đến chuyên gia khi cần

GIỚI HẠN RÕ RÀNG (nói thẳng nếu được hỏi vượt giới hạn):
"Mình là công cụ hỗ trợ, không phải bác sĩ hay nhà trị liệu. Để được đánh giá chính xác, bạn nên gặp chuyên gia tâm lý hoặc bác sĩ tâm thần."

${assessmentContext ? `\nKẾT QUẢ SÀNG LỌC CỦA NGƯỜI DÙNG:\n${assessmentContext}\n\nHãy dùng thông tin này để cá nhân hóa phản hồi, nhưng KHÔNG đưa ra chẩn đoán.` : ''}

PHONG CÁCH: Ấm áp, ngắn gọn (2-4 đoạn tối đa), sử dụng tiếng Việt tự nhiên. Đặt câu hỏi mở để khuyến khích người dùng chia sẻ thêm.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Lỗi từ Anthropic API' });
    }

    const data = await response.json();
    const text = data.content?.map(b => b.text || '').join('') || '';

    return res.status(200).json({ reply: text });

  } catch (err) {
    console.error('MindBuddy API error:', err);
    return res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại.' });
  }
}
