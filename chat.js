document.getElementById('header-root').innerHTML = renderHeader('chat');
document.getElementById('footer-root').innerHTML = renderFooter();

const SCALES_MAX = { pss14: 56, phq9: 27, gad7: 21, dass21: 42, isi: 28 };
let chatMessages = Store.get('ms_chat_messages', []);

function getLastResult() {
  return Store.get('ms_last_result');
}

function getStoredPreferences() {
  const result = getLastResult();
  return Store.get('ms_user_preferences', result?.chatContext?.userPreferences || '');
}

function persistUserPreferences(value) {
  const preferences = String(value || '').trim();
  Store.set('ms_user_preferences', preferences);
  const result = getLastResult();
  if (result?.chatContext) {
    result.chatContext.userPreferences = preferences;
    result.chatContext.userProfile = {
      ...(result.chatContext.userProfile || {}),
      preferences,
    };
    result.userPreferences = preferences;
    Store.set('ms_last_result', result);
  }
  return preferences;
}

function getChatContext() {
  const result = getLastResult();
  if (!result?.chatContext) return null;
  const preferences = getStoredPreferences();
  return {
    ...result.chatContext,
    userPreferences: preferences,
    userProfile: {
      ...(result.chatContext.userProfile || {}),
      preferences,
    },
  };
}

function persistChatMessages() {
  Store.set('ms_chat_messages', chatMessages.slice(-30));
}

function renderMarkdown(content) {
  if (!window.marked || !window.DOMPurify) return content;
  const rawHtml = window.marked.parse(content || '', { breaks: true, gfm: true });
  return window.DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['target', 'rel'] });
}

function secureAssistantLinks(bubble) {
  bubble.querySelectorAll('a').forEach((link) => {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
}

function setBubbleContent(bubble, role, content) {
  if (role === 'assistant' && !bubble.classList.contains('loading')) {
    bubble.innerHTML = renderMarkdown(content);
    secureAssistantLinks(bubble);
  } else {
    bubble.textContent = content;
  }
}

function appendChatMessage(role, content, extraClass = '') {
  const list = document.getElementById('chat-messages');
  if (!list) return null;
  const bubble = document.createElement('div');
  bubble.className = `chat-msg ${role} ${extraClass}`.trim();
  setBubbleContent(bubble, role, content);
  list.appendChild(bubble);
  list.scrollTop = list.scrollHeight;
  return bubble;
}

function setChatSending(isSending) {
  const button = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');
  if (button) {
    button.disabled = isSending;
    button.textContent = isSending ? 'Đang gửi...' : 'Gửi';
  }
  if (input) input.disabled = isSending;
}

function sendSuggestedChat(text) {
  const input = document.getElementById('chat-input');
  if (!input) return;
  input.value = text;
  sendChatMessage(new Event('submit'));
}

function handleChatKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendChatMessage(new Event('submit'));
  }
}

function updateUserPreferences(value) {
  persistUserPreferences(value);
}

function addPreferenceSuggestion(text) {
  const input = document.getElementById('chat-preference-input');
  if (!input) return;
  const current = input.value.trim();
  const parts = current ? current.split(',').map((p) => p.trim()) : [];
  if (!parts.some((p) => p.toLowerCase() === text.toLowerCase())) {
    parts.push(text);
  }
  input.value = parts.filter(Boolean).join(', ');
  persistUserPreferences(input.value);
}

function clearChatHistory() {
  chatMessages = [];
  persistChatMessages();
  renderChatMessages();
  showToast('Đã xóa lịch sử chat trên trình duyệt này.', 'info');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendChatMessage(event) {
  event.preventDefault();
  const input = document.getElementById('chat-input');
  if (!input || input.disabled) return;

  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  chatMessages.push({ role: 'user', content: text });
  persistChatMessages();
  appendChatMessage('user', text);
  const loadingBubble = appendChatMessage('assistant', 'MindBuddy đang suy nghĩ...', 'loading');
  setChatSending(true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatMessages, assessment: getChatContext() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Không gọi được API chat.');

    const reply = data.reply || 'Mình chưa tạo được phản hồi. Bạn thử hỏi lại nhé.';
    if (loadingBubble) {
      loadingBubble.classList.remove('loading');
      setBubbleContent(loadingBubble, 'assistant', reply);
    } else {
      appendChatMessage('assistant', reply);
    }
    chatMessages.push({ role: 'assistant', content: reply });
    persistChatMessages();
  } catch (error) {
    const fallback = `${error.message}\n\nHãy kiểm tra server đang chạy bằng npm start/vercel và đã cấu hình GROQ_API_KEY.`;
    if (loadingBubble) {
      loadingBubble.classList.remove('loading');
      loadingBubble.textContent = fallback;
    } else {
      appendChatMessage('assistant', fallback);
    }
    chatMessages.push({ role: 'assistant', content: fallback });
    persistChatMessages();
  } finally {
    setChatSending(false);
    input.focus();
  }
}

function renderChatMessages() {
  const list = document.getElementById('chat-messages');
  if (!list) return;
  list.innerHTML = '';
  if (!chatMessages.length) {
    appendChatMessage('assistant', 'Mình đã sẵn sàng trò chuyện dựa trên kết quả trắc nghiệm gần nhất của bạn. Bạn có thể hỏi về động viên, giải pháp thực tế, hoặc gợi ý nhạc/podcast/phim phù hợp.');
    return;
  }
  chatMessages.forEach((m) => appendChatMessage(m.role, m.content));
}

function renderPage() {
  const result = getLastResult();
  const content = document.getElementById('chat-content');
  if (!result?.chatContext) {
    content.innerHTML = `
      <div class="empty-state">
        <span class="emoji">🧭</span>
        <h2>Chưa có dữ liệu trắc nghiệm</h2>
        <p>Để MindBuddy trò chuyện sát hơn với tình trạng của bạn, hãy hoàn thành một bài sàng lọc trước. Sau đó bạn có thể quay lại Chat AI bất cứ lúc nào.</p>
        <a class="primary-link" href="assessment.html">Làm trắc nghiệm ngay →</a>
      </div>`;
    return;
  }

  const ctx = getChatContext();
  const preferences = getStoredPreferences();
  const escapedPreferences = escapeHtml(preferences);
  const scoreText = typeof ctx.scores === 'number'
    ? `${ctx.scores}/${SCALES_MAX[ctx.scale.id] || ''}`
    : Object.entries(ctx.scores || {}).map(([k, v]) => `${k}: ${v}`).join(' · ');

  content.innerHTML = `
    <section class="summary-card">
      <span class="summary-pill">${ctx.scale.name}</span>
      <span class="summary-pill">${ctx.result.levelLabel || 'Đã hoàn thành'}</span>
      <span class="summary-text">Kết quả gần nhất: <strong>${scoreText}</strong>. MindBuddy sẽ dùng dữ liệu trắc nghiệm và sở thích của bạn làm ngữ cảnh chat.</span>
      <a class="head-btn" href="assessment.html">Làm lại trắc nghiệm</a>
    </section>

    <section class="preference-panel">
      <h2>Sở thích cá nhân hóa phản hồi</h2>
      <p>Bạn có thể cập nhật bất cứ lúc nào. MindBuddy sẽ ưu tiên gợi ý hoạt động, nhạc, podcast hoặc phim dựa trên phần này.</p>
      <textarea id="chat-preference-input" placeholder="Ví dụ: Tôi thích nghe nhạc indie, xem phim hoạt hình nhẹ nhàng, đi dạo buổi tối..." oninput="updateUserPreferences(this.value)">${escapedPreferences}</textarea>
      <div class="preference-chip-row">
        <button type="button" onclick="addPreferenceSuggestion('nghe nhạc thư giãn')">Nhạc thư giãn</button>
        <button type="button" onclick="addPreferenceSuggestion('xem phim nhẹ nhàng')">Phim nhẹ nhàng</button>
        <button type="button" onclick="addPreferenceSuggestion('podcast tâm lý')">Podcast tâm lý</button>
        <button type="button" onclick="addPreferenceSuggestion('đi bộ')">Đi bộ</button>
        <button type="button" onclick="addPreferenceSuggestion('viết nhật ký')">Viết nhật ký</button>
        <button type="button" onclick="addPreferenceSuggestion('vẽ hoặc làm đồ thủ công')">Vẽ / thủ công</button>
      </div>
    </section>

    <section class="chat-card">
      <div class="chat-head">
        <div class="chat-head-title">
          <div class="chat-avatar">💬</div>
          <div>
            <h2>Trò chuyện với MindBuddy</h2>
            <p>Dựa trên kết quả ${ctx.scale.name} gần nhất lưu trên trình duyệt này.</p>
          </div>
        </div>
        <div class="head-actions">
          <button class="head-btn" type="button" onclick="clearChatHistory()">Xóa lịch sử chat</button>
          <a class="head-btn" href="assessment.html">Trắc nghiệm khác</a>
        </div>
      </div>

      <div class="chat-messages" id="chat-messages" aria-live="polite"></div>

      <div class="suggestions">
        <button type="button" onclick="sendSuggestedChat('Hãy động viên tôi và giải thích kết quả này nhẹ nhàng')">Động viên tôi</button>
        <button type="button" onclick="sendSuggestedChat('Cho tôi giải pháp thực tế trong 24 giờ và 7 ngày tới')">Giải pháp thực tế</button>
        <button type="button" onclick="sendSuggestedChat('Gợi ý nhạc, podcast và phim nhẹ nhàng phù hợp với tình trạng của tôi')">Nhạc · podcast · phim</button>
        <button type="button" onclick="sendSuggestedChat('Tôi thích nghe nhạc và xem phim, hãy gợi ý theo sở thích đó')">Theo sở thích của tôi</button>
        <button type="button" onclick="sendSuggestedChat('Tìm trên web vài tài nguyên mới phù hợp với sở thích và kết quả trắc nghiệm của tôi')">Tìm web theo sở thích</button>
      </div>

      <form class="chat-form" onsubmit="sendChatMessage(event)">
        <textarea id="chat-input" rows="1" placeholder="Nhập câu hỏi của bạn..." onkeydown="handleChatKeydown(event)"></textarea>
        <button id="chat-send" type="submit">Gửi</button>
      </form>
      <div class="chat-note">Nếu bạn đang có ý nghĩ tự làm hại bản thân hoặc đang trong tình huống khẩn cấp, hãy gọi <strong>1900 9095</strong>, đến cơ sở y tế gần nhất, hoặc nhờ người thân ở cạnh ngay.</div>
    </section>`;

  renderChatMessages();
}

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  renderPage();
});
