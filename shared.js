// ============================================================
// SHARED.JS — MINDBUDDY — TIỆN ÍCH DÙNG CHUNG CHO TOÀN BỘ TRANG
// ============================================================

// ── THƯƠNG HIỆU ─────────────────────────
const MS = { navy:'#0F2744', teal:'#0D9488', tealLt:'#CCFBF1', sky:'#E0F2FE', warn:'#F59E0B', danger:'#DC2626', safe:'#16A34A', bg:'#F0F9FF' };

// ── LOCAL STORAGE ─────────────────────────────────
const Store = {
  get(key, fallback = null) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
};

// ── TIỆN ÍCH NGÀY ────────────────────────────────
const DateUtil = {
  today() { return new Date().toISOString().slice(0, 10); },
  fmt(iso) { return new Date(iso).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' }); }
};

// ── SCROLL REVEAL ────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── MOBILE MENU ──────────────────────────────────
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const btn  = document.getElementById('hamburger-btn');
  if (!menu || !btn) return;
  const open = menu.classList.toggle('open');
  btn.classList.toggle('active', open);
}

// ── TOAST ────────────────────────────────────────
function showToast(message, type = 'info') {
  const colors = { info:'#0D9488', warn:'#F59E0B', danger:'#DC2626' };
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);
    background:#fff;border-left:4px solid ${colors[type]||colors.info};border-radius:8px;
    box-shadow:0 4px 20px rgba(0,0,0,.12);padding:12px 20px;font-size:.8rem;font-weight:600;
    color:#1e293b;z-index:9999;opacity:0;transition:all .3s;white-space:nowrap;max-width:90vw;`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)'; });
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ── RENDER HEADER ────────────────────────
function renderHeader(activePage) {
  const pages = [
    { href:'index.html', label:'Trang Chủ', id:'home' },
    { href:'assessment.html', label:'Sàng Lọc', id:'assessment' },
    { href:'clinics.html', label:'Tìm Phòng Khám', id:'clinics' },
    { href:'privacy.html', label:'Bảo Mật', id:'privacy' }
    { href:'chat.html', label:'Trò Chuyện AI', id:'chat' }
  ];
  const navLinks = pages.map(p => `<a href="${p.href}" class="nav-link${activePage === p.id ? ' active' : ''}">${p.label}</a>`).join('');
  const mobileLinks = pages.map(p => `<div class="mobile-nav-item"><a href="${p.href}" onclick="toggleMobileMenu()" class="mobile-nav-link${activePage === p.id ? ' active' : ''}">${p.label}</a></div>`).join('');
  return `
  <div class="hotline-bar">⚠️ Nếu bạn đang trong tình huống khẩn cấp — <strong>Gọi ngay: 1900 9095</strong> &nbsp;·&nbsp; Đường dây miễn phí 24/7 của Bộ Y tế Việt Nam</div>
  <header class="site-header">
    <div class="header-inner">
      <a href="index.html" class="brand">
        <div class="brand-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 6v6l4 2"/></svg></div>
        <span class="brand-name">MindBuddy</span>
      </a>
      <nav class="desktop-nav">${navLinks}</nav>
      <div class="header-actions">
        <a href="assessment.html" class="btn-cta">Bắt Đầu Sàng Lọc</a>
        <button id="hamburger-btn" onclick="toggleMobileMenu()" class="hamburger" aria-label="Menu"><span class="h-line l1"></span><span class="h-line l2"></span><span class="h-line l3"></span></button>
      </div>
    </div>
    <div id="mobile-menu" class="mobile-menu"><nav class="mobile-nav-container">${mobileLinks}</nav></div>
  </header>`;
}

// ── RENDER FOOTER ────────────────────────
function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand"><span class="brand-name-sm">MindBuddy</span><p>Công cụ sàng lọc sức khỏe tâm thần dựa trên tiêu chuẩn lâm sàng.<br>Không thay thế chẩn đoán y tế từ chuyên gia.</p></div>
      <div class="footer-links"><a href="index.html">Trang Chủ</a><a href="assessment.html">Sàng Lọc</a><a href="clinics.html">Tìm Phòng Khám</a><a href="privacy.html">Bảo Mật</a></div>
    </div>
    <div class="footer-disclaimer">⚕️ Kết quả sàng lọc chỉ mang tính tham khảo. Để được chẩn đoán chính xác, vui lòng tham khảo bác sĩ hoặc chuyên gia tâm lý có chứng chỉ hành nghề. &nbsp;·&nbsp; Đường dây khẩn: <strong>1900 9095</strong></div>
  </footer>`;
}

// ── GLOBAL CSS ───────
(function injectGlobalCSS() {
  if (document.getElementById('ms-global-css')) return;
  const style = document.createElement('style');
  style.id = 'ms-global-css';
  style.textContent = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body{max-width:100%;overflow-x:hidden}
    html{scroll-behavior:smooth}
    body{font-family:'Montserrat','Be Vietnam Pro','Inter',sans-serif;background:#FFF8F6;color:#2D2D2D;-webkit-font-smoothing:antialiased}
    .hotline-bar{background:#FFEDE8;border-bottom:1.5px solid #FFD9D0;padding:.5rem 1rem;text-align:center;font-size:.7rem;font-weight:600;color:#C7434A;animation:gentlePulse 1.8s infinite}
    .site-header{position:sticky;top:0;z-index:100;background:rgba(255,248,246,.92);backdrop-filter:blur(12px);border-bottom:1px solid #FFE0D6}
    .header-inner{max-width:1100px;margin:0 auto;padding:.8rem 1.25rem;display:flex;align-items:center;gap:1.5rem}
    .brand{display:flex;align-items:center;gap:.6rem;text-decoration:none}
    .brand-icon{width:34px;height:34px;background:linear-gradient(135deg,#FFB7B2,#FF7B8E);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1rem;box-shadow:0 4px 8px rgba(255,123,142,.2);transition:all .3s ease}
    .brand:hover .brand-icon{transform:scale(1.05) rotate(5deg)}
    .brand-name{font-size:1.1rem;font-weight:800;font-family:'Playfair Display',serif;background:linear-gradient(135deg,#FF7B8E,#FFB7B2);-webkit-background-clip:text;background-clip:text;color:transparent}
    .desktop-nav{display:none;align-items:center;gap:.25rem;margin-left:auto}
    @media(min-width:768px){.desktop-nav{display:flex}}
    .nav-link{padding:.45rem .9rem;border-radius:40px;font-size:.8rem;font-weight:600;color:#5D4A4A;text-decoration:none;transition:all .2s}
    .nav-link:hover{background:#FFF0EB;color:#FF7B8E;transform:translateY(-2px)}
    .nav-link.active{background:#FFE8E6;color:#FF5A70;font-weight:700}
    .header-actions{display:flex;align-items:center;gap:.75rem;margin-left:auto}
    .btn-cta{background:linear-gradient(135deg,#FF7B8E,#FF5A70);color:#fff;padding:.55rem 1.1rem;border-radius:40px;font-size:.75rem;font-weight:700;text-decoration:none;transition:all .25s;box-shadow:0 4px 8px rgba(255,123,142,.2)}
    .btn-cta:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(255,123,142,.35)}
    .hamburger{display:flex;flex-direction:column;gap:5px;width:36px;height:36px;background:none;border:none;cursor:pointer;border-radius:12px;padding:6px}
    .hamburger:hover{background:#FFE8E6}
    @media(min-width:768px){.hamburger{display:none}}
    .h-line{display:block;width:20px;height:2.5px;background:#5D4A4A;border-radius:4px;transition:all .3s}
    #hamburger-btn.active .l1{transform:translateY(7px) rotate(45deg)}
    #hamburger-btn.active .l2{opacity:0}
    #hamburger-btn.active .l3{transform:translateY(-7px) rotate(-45deg)}
    .mobile-menu{max-height:0;overflow:hidden;opacity:0;background:#fff;border-top:1px solid #FFE0D6;transition:max-height .35s ease,opacity .25s ease}
    .mobile-menu.open{max-height:400px;opacity:1;padding:1rem 1.25rem}
    .mobile-nav-container{display:flex;flex-direction:column;gap:.25rem}
    .mobile-nav-link{display:block;padding:.75rem 1rem;border-radius:16px;font-size:.85rem;font-weight:500;color:#5D4A4A;text-decoration:none}
    .mobile-nav-link:hover{background:#FFF0EB;color:#FF7B8E}
    .mobile-nav-link.active{background:#FFE8E6;color:#FF5A70;font-weight:600}
    .site-footer{background:#FFF0EB;color:#7C6A6A;margin-top:4rem;border-top:2px solid #FFD9D0}
    .footer-inner{max-width:1100px;margin:0 auto;padding:2.5rem 1.25rem 1.5rem;display:flex;flex-wrap:wrap;gap:2rem;justify-content:space-between}
    .brand-name-sm{font-size:1.1rem;font-weight:800;font-family:'Playfair Display',serif;background:linear-gradient(135deg,#FF7B8E,#FFB7B2);-webkit-background-clip:text;background-clip:text;color:transparent;display:inline-block;margin-bottom:.6rem}
    .footer-brand p{font-size:.75rem;line-height:1.7;max-width:280px;color:#8E7A7A}
    .footer-links{display:flex;flex-direction:column;gap:.6rem}
    .footer-links a{font-size:.78rem;color:#8E7A7A;text-decoration:none}
    .footer-links a:hover{color:#FF7B8E}
    .footer-disclaimer{border-top:1px solid #FFD9D0;padding:1rem 1.25rem;text-align:center;font-size:.65rem;max-width:1100px;margin:0 auto;color:#A28B8B}
    @keyframes gentlePulse{0%,100%{opacity:1}50%{opacity:.7}}
    .reveal{opacity:0;transform:translateY(20px);transition:opacity .6s ease,transform .6s ease}
    .reveal.revealed{opacity:1;transform:translateY(0)}
    .reveal-delay-1{transition-delay:.1s}
    .reveal-delay-2{transition-delay:.2s}
    .reveal-delay-3{transition-delay:.3s}
    .container{max-width:1100px;margin:0 auto;padding:0 1.25rem}
    .section{padding:4rem 0}
    .section-sm{padding:2.5rem 0}
  `;
  document.head.appendChild(style);
})();

// ── RATING WIDGET ──
const RATING_URL = 'https://script.google.com/macros/s/AKfycbyoHYpHHw-6ql9IaLUYDNW4_1H_pXdd9AM9sDnFFGe18mst8rzlY84fb397RddY3KX-Jg/exec';

function renderRatingWidget(page) {
  if (!RATING_URL || RATING_URL === 'YOUR_WEBAPP_URL') { console.warn('Chưa cấu hình RATING_URL'); return; }
  const storageKey = 'ms_rated_' + page;
  const lastRated = Store.get(storageKey);
  if (lastRated && (Date.now() - lastRated < 3 * 60 * 60 * 1000)) return;

  const widget = document.createElement('div');
  widget.id = 'ms-rating-widget';
  widget.innerHTML = `
    <style>
      #ms-rating-widget {
        position:fixed;bottom:24px;right:24px;z-index:9998;
        background:#fff;border-radius:24px;padding:1rem 1.25rem 0.85rem;
        box-shadow:0 8px 32px rgba(255,123,142,.22);border:1.5px solid #FFE0D6;
        text-align:center;font-family:'Montserrat',sans-serif;min-width:195px;
        animation:rwUp .35s cubic-bezier(.34,1.56,.64,1) both;
      }
      @keyframes rwUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      #ms-rating-widget .rw-close{
        position:absolute;top:8px;right:10px;background:none;border:none;
        color:#C8AAAA;cursor:pointer;font-size:.82rem;line-height:1;padding:2px 5px;
      }
      #ms-rating-widget .rw-close:hover{color:#FF7B8E;}
      #ms-rating-widget .rw-title{
        font-size:.72rem;font-weight:700;color:#3D2A2A;margin-bottom:.65rem;
      }
      #ms-rating-widget .rw-stars{display:flex;justify-content:center;gap:2px;}
      #ms-rating-widget .rw-star{
        font-size:1.55rem;cursor:pointer;transition:transform .12s;
        filter:grayscale(1);opacity:.4;border:none;background:none;padding:2px;line-height:1;
      }
      #ms-rating-widget .rw-star.lit{filter:none;opacity:1;transform:scale(1.28);}
      #ms-rating-widget .rw-msg{
        font-size:.65rem;color:#B39A9A;margin-top:.55rem;min-height:.9rem;
      }
    </style>
    <button class="rw-close" onclick="document.getElementById('ms-rating-widget').remove()" title="Đóng">✕</button>
    <div class="rw-title">Trang này có hữu ích không?</div>
    <div class="rw-stars" id="rw-stars">
      <button class="rw-star" data-v="1">⭐</button>
      <button class="rw-star" data-v="2">⭐</button>
      <button class="rw-star" data-v="3">⭐</button>
      <button class="rw-star" data-v="4">⭐</button>
      <button class="rw-star" data-v="5">⭐</button>
    </div>
    <div class="rw-msg" id="rw-msg"></div>
  `;
  document.body.appendChild(widget);

  const stars = widget.querySelectorAll('.rw-star');
  stars.forEach((star, idx) => {
    star.addEventListener('mouseenter', () => stars.forEach((s, i) => s.classList.toggle('lit', i <= idx)));
    star.addEventListener('mouseleave', () => stars.forEach(s => s.classList.remove('lit')));
    star.addEventListener('click', () => {
      const rating = star.getAttribute('data-v');
      stars.forEach(s => { s.disabled = true; s.style.cursor = 'default'; });
      stars.forEach((s, i) => s.classList.toggle('lit', i <= idx));
      document.getElementById('rw-msg').textContent = 'Đang gửi...';
      const iframe = document.createElement('iframe');
      iframe.name = 'rw-frame-' + Date.now();
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const form = document.createElement('form');
      form.method = 'POST'; form.action = RATING_URL; form.target = iframe.name; form.style.display = 'none';
      [{ name:'rating', value:rating }, { name:'page', value:page || (window.location.pathname.split('/').pop() || 'index') }, { name:'userAgent', value:navigator.userAgent.slice(0,200) }].forEach(f => { const i = document.createElement('input'); i.type = 'hidden'; i.name = f.name; i.value = f.value; form.appendChild(i); });
      document.body.appendChild(form); form.submit();
      Store.set(storageKey, Date.now());
      setTimeout(() => {
        showToast(`Cảm ơn bạn đã đánh giá ${rating} sao! 🌸`, 'info');
        const w = document.getElementById('ms-rating-widget'); if (w) w.remove();
        setTimeout(() => { form.remove(); iframe.remove(); }, 3000);
      }, 1500);
    });
  });
}

// ── EXPORTS ────────────────────────
window.Store = Store;
window.DateUtil = DateUtil;
window.MS = MS;
window.initScrollReveal = initScrollReveal;
window.toggleMobileMenu = toggleMobileMenu;
window.showToast = showToast;
window.renderHeader = renderHeader;
window.renderFooter = renderFooter;
window.renderRatingWidget = renderRatingWidget;