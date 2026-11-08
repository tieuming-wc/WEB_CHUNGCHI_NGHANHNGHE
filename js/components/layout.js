/**
 * ============================================================
 *  FILE: js/components/layout.js
 *  MỤC ĐÍCH: Vẽ phần chung của MỌI trang: thanh đầu trang (logo, tìm kiếm, giỏ hàng,
 *  "Xin chào, [Tên]"), thanh điều hướng, chân trang, menu người bán, thông báo chờ.
 *  Mỗi trang chỉ cần gọi: const session = await initLayout({ active: 'shop' });
 *
 *  Các kiểu giao diện (kind):
 *    'public' – khách + người mua (có tìm kiếm, giỏ hàng, thanh điều hướng)
 *    'seller' – Kênh người bán (có menu trái)
 *    'admin'  – Quản trị
 * ============================================================
 */
import { APP } from '../config/app-config.js';
import { backend, isCloud, backendError } from '../services/db.js';
import { getSession, resetSessionCache } from '../services/session.js';
import { logout } from '../services/auth.js';
import { rememberPage, getState } from '../services/userstate.js';
import { cartCount } from '../services/cart.js';
import { pageUrl, homeUrl, assetUrl, goto } from '../utils/paths.js';
import { esc, $ } from '../utils/dom.js';
import { truncate, initialOf } from '../utils/format.js';
import { showFlash, flash } from './toast.js';

// Áp dụng cỡ chữ đã lưu NGAY LẬP TỨC (trước khi tải xong tài khoản) để không bị "nháy" chữ
try { document.documentElement.dataset.bigText = localStorage.getItem('btv_bigText') === '1' ? '1' : '0'; } catch { /* bỏ qua */ }

const ROLE_LABEL = { buyer: 'Người mua', seller: 'Người bán', admin: 'Quản trị' };

/** Các mục menu tài khoản theo vai trò (đặc tả REQ-SES-02 và đặc tả người mua 2.1) */
function accountMenu(role) {
  const common = [['Hồ sơ của tôi', 'profile'], ['Cài đặt tài khoản', 'settings'], ['Đổi mật khẩu', 'change-password']];
  if (role === 'buyer') return [['Hồ sơ của tôi', 'profile'], ['Đơn mua', 'orders'], ['Sản phẩm yêu thích', 'favorites'], ['Cài đặt tài khoản', 'settings'], ['Đổi mật khẩu', 'change-password']];
  if (role === 'seller') return [['Hồ sơ của tôi', 'profile'], ['Thông tin gian hàng', 'seller-shop'], ['Cài đặt tài khoản', 'settings'], ['Đổi mật khẩu', 'change-password']];
  if (role === 'admin') return [['Trang quản trị', 'admin'], ...common];
  return common;
}

/** Khối bên phải thanh đầu trang: nút Đăng nhập/Đăng ký (khách) hoặc "Xin chào, [Tên]" (đã đăng nhập) */
function accountBlock(session) {
  if (!session) {
    return `<a class="btn btn-ghost btn-sm" href="${pageUrl('login')}">Đăng nhập</a>
            <a class="btn btn-primary btn-sm" href="${pageUrl('register')}">Đăng ký</a>`;
  }
  const profile = session.profile;
  const name = profile?.name || session.user.email;
  const role = profile?.role;
  return `
  <div class="account" id="account">
    <button class="account-btn" id="account-btn" type="button" aria-haspopup="true" aria-expanded="false">
      <span class="avatar" aria-hidden="true">${esc(initialOf(name))}</span>
      <span class="account-text">
        <span class="hello" title="${esc(name)}">Xin chào, ${esc(truncate(name, 20))}</span>
        ${role ? `<span class="role-badge role-${role}">${ROLE_LABEL[role]}</span>` : ''}
      </span>
    </button>
    <ul class="account-menu" id="account-menu" hidden>
      ${accountMenu(role).map(([label, page]) => `<li><a href="${pageUrl(page)}">${label}</a></li>`).join('')}
      <li><button type="button" id="logout-btn">Đăng xuất</button></li>
    </ul>
  </div>`;
}

/** Thanh điều hướng chính (dưới thanh đầu trang) */
function mainNav(active, session) {
  const role = session?.profile?.role;
  const items = [
    ['home', 'Trang chủ', homeUrl()],
    ['shop', 'Mua hàng', pageUrl('shop')],
    ['auction', 'Đấu giá <span class="badge badge-gold">Sắp ra mắt</span>', pageUrl('auction')],
    ['certificate', 'Chứng chỉ', pageUrl('certificate-register')],
    ['courses', 'Học nghề', pageUrl('courses')],
    ['about', 'Về chúng tôi', pageUrl('about')]
  ];
  if (role === 'seller') items.splice(2, 0, ['seller', 'Kênh người bán', pageUrl('seller-products')]);
  else if (!role) items.splice(2, 0, ['seller', 'Bán hàng', pageUrl('seller-products')]);
  // [BTV-ADMIN] V5.2: Chỉ tài khoản admin thấy nút "Trang quản trị" ngay trên menu website.
  // Đây là một trang nội bộ thuộc CÙNG website, không phải website admin riêng.
  // Người mua và người bán không được hiển thị liên kết này.
  if (role === 'admin') items.push(['admin', '🛡 Trang quản trị', pageUrl('admin')]);
  return `<nav class="main-nav" aria-label="Điều hướng chính"><div class="container"><ul>
    ${items.map(([key, label, href]) => `<li><a href="${href}" class="${key === active ? 'active' : ''}" ${key === active ? 'aria-current="page"' : ''}>${label}</a></li>`).join('')}
  </ul></div></nav>`;
}

function headerHtml(kind, active, session, searchValue) {
  const role = session?.profile?.role;
  const showCart = kind === 'public' && (!role || role === 'buyer');
  const cart = showCart ? `<a class="cart-link" href="${pageUrl('cart')}" aria-label="Giỏ hàng">🛒<span class="cart-count" id="cart-count" ${cartCount() ? '' : 'hidden'}>${cartCount()}</span></a>` : '';
  const search = kind === 'public' ? `
    <form class="header-search" id="header-search" role="search">
      <input type="search" name="q" value="${esc(searchValue || '')}" placeholder="Tìm tên sản phẩm, chất liệu hoặc gian hàng…" aria-label="Tìm kiếm sản phẩm">
      <button type="submit" aria-label="Tìm kiếm">🔍</button>
    </form>` : '<div class="header-search-spacer"></div>';
  return `
  <header class="site-header">
    <div class="container header-row">
      <a class="brand" href="${homeUrl()}" aria-label="${esc(APP.NAME)} – về trang chủ">
        <img src="${assetUrl('logo.svg')}" alt="" width="44" height="44">
        <span class="brand-text"><span class="brand-name">${esc(APP.NAME)}</span>${kind === 'seller' ? '<span class="brand-sub">Kênh người bán</span>' : kind === 'admin' ? '<span class="brand-sub">Quản trị</span>' : ''}</span>
      </a>
      ${search}
      <div class="header-right">${cart}${accountBlock(session)}</div>
    </div>
  </header>
  ${kind === 'public' ? mainNav(active, session) : ''}`;
}

function footerHtml() {
  return `
  <footer class="site-footer">
    <div class="container footer-grid">
      <div>
        <p class="footer-brand">${esc(APP.NAME)}</p>
        <p>${esc(APP.TAGLINE)}</p>
        <p class="muted-light">${esc(APP.ADDRESS)}</p>
        <p class="muted-light">Email: <a href="mailto:${esc(APP.SUPPORT_EMAIL)}">${esc(APP.SUPPORT_EMAIL)}</a> · ĐT: ${esc(APP.SUPPORT_PHONE)}</p>
      </div>
      <div>
        <p class="footer-title">Khám phá</p>
        <ul><li><a href="${pageUrl('shop')}">Mua hàng</a></li><li><a href="${pageUrl('certificate-register')}">Đăng ký chứng nhận</a></li>
        <li><a href="${pageUrl('certificate-lookup')}">Tra cứu chứng nhận</a></li><li><a href="${pageUrl('courses')}">Học nghề</a></li><li><a href="${pageUrl('about')}">Về chúng tôi</a></li></ul>
      </div>
      <div>
        <p class="footer-title">Hỗ trợ &amp; chính sách</p>
        <ul><li><a href="${pageUrl('terms')}">Điều khoản sử dụng</a></li><li><a href="${pageUrl('privacy')}">Chính sách quyền riêng tư</a></li>
        <li><a href="${pageUrl('returns')}">Đổi trả &amp; hoàn tiền</a></li><li><a href="${pageUrl('contact')}">Liên hệ / Hỗ trợ</a></li></ul>
      </div>
    </div>
    <div class="container footer-note">
      <p>Huy hiệu và chứng nhận trên website là <strong>chứng nhận nội bộ của nền tảng</strong>, không phải chứng chỉ kỹ năng nghề quốc gia do Nhà nước cấp.</p>
      <p>© ${new Date().getFullYear()} ${esc(APP.NAME)}. Dự án khởi nghiệp sinh viên.</p>
    </div>
  </footer>`;
}

/** Menu trái của Kênh người bán */
function sellerMenuHtml(active) {
  const items = [
    ['products', 'Sản phẩm của tôi', 'seller-products'], ['new', 'Đăng sản phẩm', 'seller-product-form'],
    ['orders', 'Đơn hàng', 'seller-orders'], ['returns', 'Trả hàng/Hoàn tiền', 'seller-returns'],
    ['shop', 'Thông tin gian hàng', 'seller-shop'], ['auction', 'Đấu giá <span class="badge badge-gold">Sắp ra mắt</span>', 'auction']
  ];
  return `<nav aria-label="Menu người bán"><ul>${items.map(([k, label, page]) =>
    `<li><a href="${pageUrl(page)}" class="${k === active ? 'active' : ''}" ${k === active ? 'aria-current="page"' : ''}>${label}</a></li>`).join('')}</ul></nav>`;
}

/**
 * Khởi tạo khung trang. Trả về session ({user, profile} hoặc null).
 * options: { kind, active, title, search }
 */
export async function initLayout({ kind = 'public', active = '', title = '', search = '' } = {}) {
  const session = await getSession().catch(() => null);

  // ----- Đầu trang -----
  const headerHost = $('#site-header');
  if (headerHost) headerHost.innerHTML = headerHtml(kind, active, session, search);
  // ----- Chân trang -----
  const footerHost = $('#site-footer');
  if (footerHost) footerHost.innerHTML = footerHtml();
  // ----- Menu người bán -----
  const sm = $('#seller-menu');
  if (sm) sm.innerHTML = sellerMenuHtml(active);

  // ----- Thanh cảnh báo chế độ thử nghiệm / lỗi kết nối -----
  if (!isCloud) {
    const bar = document.createElement('div');
    bar.className = 'env-bar';
    bar.innerHTML = backendError
      ? `⚠ Không kết nối được máy chủ Firebase (${esc(backendError.message || '')}). Đang chạy chế độ thử nghiệm.`
      : '⚠ <strong>Chế độ thử nghiệm</strong>: dữ liệu chỉ lưu trên trình duyệt này, chưa đồng bộ giữa các thiết bị. Xem README để bật Firebase.';
    document.body.prepend(bar);
  }

  // ----- Sự kiện -----
  $('#header-search')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = new FormData(e.target).get('q').toString().trim();
    goto(q ? `pages/shop.html?q=${encodeURIComponent(q)}` : 'pages/shop.html');
  });
  const btn = $('#account-btn'), menu = $('#account-menu');
  if (btn && menu) {
    const setOpen = (open) => { menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(menu.hidden); });
    document.addEventListener('click', (e) => { if (!menu.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }
  $('#logout-btn')?.addEventListener('click', async () => {
    await logout(); resetSessionCache();
    flash('Bạn đã đăng xuất.', 'success');                       // đặc tả: hiện "Bạn đã đăng xuất"
    goto('pages/login.html?out=1');
  });

  if (title) document.title = `${title} – ${APP.NAME}`;
  showFlash();
  if (session) rememberPage(title || document.title);          // nhớ trang đang xem trên tài khoản
  return session;
}

/** Cập nhật số hiển thị trên biểu tượng giỏ hàng (gọi sau khi thêm/xóa) */
export function refreshCartBadge() {
  const el = $('#cart-count');
  if (!el) return;
  const n = cartCount();
  el.textContent = n; el.hidden = !n;
}

export { getState };
