// ============================================================
// SHARED.JS — MINDBUDDY — TIỆN ÍCH DÙNG CHUNG
// ============================================================

// ── THƯƠNG HIỆU ──────────────────────────────────────────────
const MS = {
  navy:    '#0F2744',
  teal:    '#0D9488',
  tealLt:  '#CCFBF1',
  sky:     '#E0F2FE',
  warn:    '#F59E0B',
  danger:  '#DC2626',
  safe:    '#16A34A',
  bg:      '#F0F9FF',
};

// ── LOCAL STORAGE ─────────────────────────────────────────────
const Store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }
};

// ── TIỆN ÍCH NGÀY ────────────────────────────────────────────
const DateUtil = {
  today() { return new Date().toISOString().slice(0, 10); },
  fmt(iso) {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
};

// ── SCROLL REVEAL ─────────────────────────────────────────────
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

// ── MOBILE MENU ───────────────────────────────────────────────
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const btn  = document.getElementById('hamburger-btn');
  if (!menu || !btn) return;
  const open = menu.classList.toggle('open');
  btn.classList.toggle('active', open);
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const colors = { info: '#0D9488', warn: '#F59E0B', danger: '#DC2626' };
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);
    background:#fff;border-left:4px solid ${colors[type]||colors.info};border-radius:8px;
    box-shadow:0 4px 20px rgba(0,0,0,.12);padding:12px 20px;font-size:.8rem;font-weight:600;
    color:#1e293b;z-index:9999;opacity:0;transition:all .3s;white-space:nowrap;max-width:90vw;`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── RENDER HEADER ─────────────────────────────────────────────
function renderHeader(activePage) {
  const pages = [
    { href: 'index.html',      label: 'Trang Chủ',   id: 'home'       },
    { href: 'assessment.html', label: 'Sàng Lọc',    id: 'assessment' },
    { href: 'clinics.html',    label: 'Tìm Phòng Khám', id: 'clinics' },
    { href: 'privacy.html',    label: 'Bảo Mật',     id: 'privacy'    },
  ];

  const navLinks = pages.map(p =>
    `<a href="${p.href}" class="nav-link${activePage === p.id ? ' active' : ''}">${p.label}</a>`
  ).join('');

  const mobileLinks = pages.map(p =>
    `<div class="mobile-nav-item">
      <a href="${p.href}" onclick="toggleMobileMenu()"
          class="mobile-nav-link${activePage === p.id ? ' active' : ''}">${p.label}</a>
    </div>`
  ).join('');

  return `
  <div class="hotline-bar">
    ⚠️ Nếu bạn đang trong tình huống khẩn cấp — <strong>Gọi ngay: 1900 9095</strong>
    &nbsp;·&nbsp; Đường dây miễn phí 24/7 của Bộ Y tế Việt Nam
  </div>
  <header class="site-header">
    <div class="header-inner">
      <a href="index.html" class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <span class="brand-name">MindBuddy</span>
      </a>
      <nav class="desktop-nav">${navLinks}</nav>
      <div class="header-actions">
        <a href="assessment.html" class="btn-cta">Bắt Đầu Sàng Lọc</a>
        <button id="hamburger-btn" onclick="toggleMobileMenu()" class="hamburger" aria-label="Menu">
          <span class="h-line l1"></span>
          <span class="h-line l2"></span>
          <span class="h-line l3"></span>
        </button>
      </div>
    </div>
    <div id="mobile-menu" class="mobile-menu">
        <nav class="mobile-nav-container">
          ${mobileLinks}
        </nav>
      </div>
    </div>
  </header>`;
}

// ── RENDER FOOTER ─────────────────────────────────────────────
function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <span class="brand-name-sm">MindBuddy</span>
        <p>Công cụ sàng lọc sức khỏe tâm thần dựa trên tiêu chuẩn lâm sàng.<br>
           Không thay thế chẩn đoán y tế từ chuyên gia.</p>
      </div>
      <div class="footer-links">
        <a href="index.html">Trang Chủ</a>
        <a href="assessment.html">Sàng Lọc</a>
        <a href="clinics.html">Tìm Phòng Khám</a>
        <a href="privacy.html">Bảo Mật</a>
      </div>
    </div>
    <div class="footer-disclaimer">
      ⚕️ Kết quả sàng lọc chỉ mang tính tham khảo. Để được chẩn đoán chính xác, vui lòng tham khảo bác sĩ hoặc chuyên gia tâm lý có chứng chỉ hành nghề.
      &nbsp;·&nbsp; Đường dây khẩn: <strong>1900 9095</strong>
    </div>
  </footer>`;
}

// ── GLOBAL CSS (inject once) ──────────────────────────────────
(function injectGlobalCSS() {
  if (document.getElementById('ms-global-css')) return;
  const style = document.createElement('style');
  style.id = 'ms-global-css';
  style.textContent = `
    /* RESET & BASE */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: 'Be Vietnam Pro', 'Inter', sans-serif; background: #F0F9FF; color: #1e293b; -webkit-font-smoothing: antialiased; }

    /* HOTLINE BAR */
    .hotline-bar {
      background: #FEF3C7; border-bottom: 1.5px solid #FDE68A;
      padding: .45rem 1rem; text-align: center;
      font-size: .7rem; font-weight: 500; color: #92400E;
    }

    /* HEADER */
    .site-header { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,.92); backdrop-filter: blur(12px); border-bottom: 1px solid #e2e8f0; }
    .header-inner { max-width: 1100px; margin: 0 auto; padding: .9rem 1.25rem; display: flex; align-items: center; gap: 1.5rem; }
    .brand { display: flex; align-items: center; gap: .6rem; text-decoration: none; }
    .brand-icon { width: 34px; height: 34px; background: linear-gradient(135deg,#0F2744,#0D9488); border-radius: 9px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
    .brand-name { font-size: 1.1rem; font-weight: 800; color: #0F2744; letter-spacing: -.5px; }
    .desktop-nav { display: none; align-items: center; gap: .25rem; margin-left: auto; }
    @media (min-width: 768px) { .desktop-nav { display: flex; } }
    .nav-link { padding: .45rem .9rem; border-radius: 8px; font-size: .82rem; font-weight: 500; color: #475569; text-decoration: none; transition: all .2s; }
    .nav-link:hover { background: #f1f5f9; color: #0F2744; }
    .nav-link.active { background: #CCFBF1; color: #0D9488; font-weight: 600; }
    .header-actions { display: flex; align-items: center; gap: .75rem; margin-left: auto; }
    @media (min-width: 768px) { .header-actions { margin-left: 0; } }
    .btn-cta { background: linear-gradient(135deg,#0D9488,#0F766E); color: #fff; padding: .55rem 1.1rem; border-radius: 8px; font-size: .78rem; font-weight: 700; text-decoration: none; display: inline-block; transition: all .2s; white-space: nowrap; border: none; cursor: pointer; }
    .btn-cta:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(13,148,136,.35); }
    .hamburger { display: flex; flex-direction: column; gap: 5px; justify-content: center; align-items: center; width: 36px; height: 36px; border: none; background: none; cursor: pointer; border-radius: 8px; padding: 6px; }
    @media (min-width: 768px) { .hamburger { display: none; } }
    .h-line { display: block; width: 20px; height: 2px; background: #475569; border-radius: 2px; transition: all .3s; }
    #hamburger-btn.active .l1 { transform: translateY(7px) rotate(45deg); }
    #hamburger-btn.active .l2 { opacity: 0; }
    #hamburger-btn.active .l3 { transform: translateY(-7px) rotate(-45deg); }
    .mobile-menu { max-height: 0; overflow: hidden; opacity: 0; background: #ffffff; border-top: 1px solid #f1f5f9; transition: max-height 0.35s ease-in-out, opacity 0.25s ease; display: flex; flex-direction: column; gap: 0.5rem; padding: 0; }
    .mobile-menu.open { max-index: 999; max-height: 450px; opacity: 1; padding: 1rem 1.25rem; }
    .mobile-nav-container { display: flex; flex-direction: column; gap: 0.25rem; }
    .mobile-nav-link { display: block; padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.88rem; font-weight: 500; color: #334155; text-decoration: none; transition: all .2s; }
    .mobile-nav-link:hover { background: #f8fafc; color: #0F2744; }
    .mobile-nav-link.active { background: #f0fdfa; color: #0D9488; font-weight: 600; }
    .mobile-menu-cta { margin-top: 0.5rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; }
    .mobile-menu-cta .btn-cta { display: block; text-align: center; width: 100%; padding: 0.75rem; font-size: 0.85rem; }

    /* FOOTER */
    .site-footer { background: #0F2744; color: #94a3b8; margin-top: 5rem; }
    .footer-inner { max-width: 1100px; margin: 0 auto; padding: 3rem 1.25rem 2rem; display: flex; flex-wrap: wrap; gap: 2rem; justify-content: space-between; }
    .brand-name-sm { font-size: 1.1rem; font-weight: 800; color: #fff; display: block; margin-bottom: .6rem; }
    .footer-brand p { font-size: .78rem; line-height: 1.7; max-width: 280px; }
    .footer-links { display: flex; flex-direction: column; gap: .6rem; }
    .footer-links a { font-size: .8rem; color: #94a3b8; text-decoration: none; transition: color .2s; }
    .footer-links a:hover { color: #5eead4; }
    .footer-disclaimer { border-top: 1px solid #1e3a5f; padding: 1rem 1.25rem; text-align: center; font-size: .68rem; max-width: 1100px; margin: 0 auto; }

    /* REVEAL ANIMATION */
    .reveal { opacity: 0; transform: translateY(22px); transition: opacity .6s ease, transform .6s ease; }
    .reveal.revealed { opacity: 1; transform: translateY(0); }
    .reveal-delay-1 { transition-delay: .1s; }
    .reveal-delay-2 { transition-delay: .2s; }
    .reveal-delay-3 { transition-delay: .3s; }

    /* UTILITY */
    .container { max-width: 1100px; margin: 0 auto; padding: 0 1.25rem; }
    .section { padding: 4rem 0; }
    .section-sm { padding: 2.5rem 0; }
  `;
  document.head.appendChild(style);
})();

// ── EXPORTS ───────────────────────────────────────────────────
window.Store = Store;
window.DateUtil = DateUtil;
window.MS = MS;
window.initScrollReveal = initScrollReveal;
window.toggleMobileMenu = toggleMobileMenu;
window.showToast = showToast;
window.renderHeader = renderHeader;
window.renderFooter = renderFooter;
