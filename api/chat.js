// ============================================================
// api/chat.js — MINDBUDDY VERCEL SERVERLESS (Groq)
// Tương thích cả Vercel (export default) lẫn server.js local (module.exports)
// Vercel Dashboard → Settings → Environment Variables:
//   GROQ_API_KEY = your_groq_api_key_here
//   TAVILY_API_KEY = your_tavily_key  (tuỳ chọn, search tốt hơn)
// ============================================================

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: 'GROQ_API_KEY chưa được cấu hình. Thêm vào .env.local (local) hoặc Vercel Environment Variables (production).'
    }));
  }

  // Parse body — Vercel tự parse, server.js local cần parse thủ công
  let body = req.body;
  if (!body) {
    body = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({}); }
      });
    });
  }

  try {
    const { messages = [], assessment } = body;
    const systemPrompt = buildSystemPrompt(assessment);

    // Web search nếu user yêu cầu
    const lastMsg = messages[messages.length - 1]?.content || '';
    const wantsSearch = /tìm web|search|tìm kiếm|tìm trên|tài nguyên mới/i.test(lastMsg);
    let searchResults = '';
    if (wantsSearch) {
      searchResults = await doSearch(lastMsg, assessment);
    }

    const finalMessages = [...messages];
    if (searchResults && finalMessages.length > 0) {
      const last = finalMessages[finalMessages.length - 1];
      finalMessages[finalMessages.length - 1] = {
        ...last,
        content: `${last.content}\n\n[Kết quả tìm kiếm web]\n${searchResults}`
      };
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          ...finalMessages
        ]
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      const errMsg = err.error?.message || `Groq API lỗi ${groqRes.status}`;
      res.writeHead(groqRes.status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: errMsg }));
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content
      || 'Mình chưa tạo được phản hồi. Bạn thử hỏi lại nhé.';

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ reply }));

  } catch (err) {
    console.error('MindBuddy API error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Đã xảy ra lỗi. Vui lòng thử lại.' }));
  }
}

// ── System prompt ────────────────────────────────────────────
function buildSystemPrompt(ctx) {
  const base = `Bạn là MindBuddy AI — người bạn đồng hành sức khỏe tinh thần thân thiện, ấm áp, am hiểu tâm lý học.

NGUYÊN TẮC BẮT BUỘC:
1. KHÔNG chẩn đoán bệnh tâm thần cụ thể
2. KHÔNG kê đơn thuốc hoặc gợi ý liều lượng
3. LUÔN nhắc gặp chuyên gia nếu triệu chứng mức vừa/nặng
4. Dấu hiệu khủng hoảng/tự hại → cung cấp ngay hotline 1900 9095
5. Trả lời bằng Markdown rõ ràng (dùng **bold**, ## heading, - bullet khi phù hợp)

PHONG CÁCH: Ấm áp, thực tế, ngắn gọn (tối đa 4 đoạn trừ khi được hỏi chi tiết). Dùng tiếng Việt tự nhiên.`;

  if (!ctx) return base;

  const scoreStr = typeof ctx.scores === 'object'
    ? Object.entries(ctx.scores).map(([k, v]) => `${k}: ${v}`).join(', ')
    : `${ctx.scores}`;

  const crisisNote = ctx.result?.hasCrisis
    ? '\n⚠️ NGƯỜI DÙNG CÓ CÂU TRẢ LỜI LIÊN QUAN ĐẾN TỰ HẠI — ưu tiên nhắc hotline 1900 9095.'
    : '';

  const prefNote = ctx.userPreferences
    ? `\nSỞ THÍCH: ${ctx.userPreferences}`
    : '';

  const highNote = ctx.answers?.filter(a => a.selectedIndex >= 2).length > 0
    ? `\nCÂU TRẢ LỜI ĐÁNG CHÚ Ý: ${ctx.answers
        .filter(a => a.selectedIndex >= 2)
        .map(a => `"${a.question}" (${a.selectedLabel})`)
        .slice(0, 5).join('; ')}`
    : '';

  return `${base}

KẾT QUẢ SÀNG LỌC CỦA NGƯỜI DÙNG:
- Thang đo: ${ctx.scale?.name || ctx.scale?.id}
- Điểm: ${scoreStr}
- Mức độ: ${ctx.result?.levelLabel || 'N/A'}
- Đánh giá: ${ctx.result?.title || ''}
- Mô tả: ${ctx.result?.desc || ''}${crisisNote}${prefNote}${highNote}

Hãy dùng thông tin này để cá nhân hóa phản hồi. KHÔNG đưa ra chẩn đoán lâm sàng.`;
}

// ── Web search (Tavily → DuckDuckGo fallback) ─────────────────
async function doSearch(query, ctx) {
  const tavilyKey = process.env.TAVILY_API_KEY;
  const searchQuery = ctx?.userPreferences
    ? `${query} ${ctx.userPreferences} sức khỏe tâm thần`
    : `${query} sức khỏe tâm thần Việt Nam`;

  if (tavilyKey) {
    try {
      const r = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: searchQuery,
          max_results: 4,
          search_depth: 'basic'
        })
      });
      if (r.ok) {
        const d = await r.json();
        return (d.results || [])
          .map(item => `- **${item.title}**: ${item.content?.slice(0, 200)}... [${item.url}]`)
          .join('\n');
      }
    } catch {}
  }

  // Fallback DuckDuckGo
  try {
    const encoded = encodeURIComponent(searchQuery);
    const r = await fetch(`https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`);
    if (r.ok) {
      const d = await r.json();
      const items = (d.RelatedTopics || [])
        .slice(0, 4)
        .filter(t => t.Text)
        .map(t => `- ${t.Text}`);
      return items.length ? items.join('\n') : '';
    }
  } catch {}

  return '';
}

// Tương thích cả CommonJS (server.js local) lẫn ESM (Vercel)
module.exports = handler;
module.exports.default = handler;
