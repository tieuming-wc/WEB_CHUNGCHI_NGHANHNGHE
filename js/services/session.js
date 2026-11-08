/**
 * ============================================================
 *  FILE: js/services/session.js
 *  MỤC ĐÍCH: Quản lý phiên đăng nhập của TRANG hiện tại:
 *    - getSession()    : ai đang đăng nhập? (dùng để vẽ thanh đầu trang)
 *    - requireAuth()   : "bảo vệ" trang riêng tư; chưa đăng nhập thì đẩy sang trang đăng nhập
 *    - watchIdle()     : tự đăng xuất sau 30 phút không hoạt động (REQ-SES-04)
 *    - hết hạn 30 ngày khi tích "Ghi nhớ đăng nhập" (COND-SES-01)
 * ============================================================
 */
import { backend } from './db.js';
import { APP } from '../config/app-config.js';
import { getProfile, logout } from './auth.js';
import { loadState, applyPrefs } from './userstate.js';
import { gotoLogin, pageUrl, goto } from '../utils/paths.js';
import { esc } from '../utils/dom.js';

let sessionCache; // undefined = chưa tải; null = khách; object = {user, profile}

/**
 * Lấy phiên hiện tại. Trả về null nếu là khách; ngược lại {user, profile}
 * (profile có thể là null nếu đăng nhập mạng xã hội mà chưa chọn vai trò).
 */
export async function getSession() {
  if (sessionCache !== undefined) return sessionCache;
  const user = await backend.waitForUser();
  if (!user || !user.emailVerified) { sessionCache = null; return null; }

  // COND-SES-01: tích "Ghi nhớ" chỉ giữ 30 ngày
  const loginAt = Number(localStorage.getItem('btv_login_at') || 0);
  if (localStorage.getItem('btv_remember') === '1' && loginAt && Date.now() - loginAt > APP.REMEMBER_DAYS * 86400000) {
    await logout(); sessionCache = null; return null;
  }

  const profile = await getProfile(user.uid).catch(() => null);
  const state = await loadState(user.uid);
  applyPrefs(state.prefs);                                       // áp dụng cài đặt chữ lớn đã lưu trên tài khoản
  sessionCache = { user, profile };
  return sessionCache;
}

/** Xóa bộ nhớ tạm (gọi sau khi đăng nhập/đăng xuất) */
export const resetSessionCache = () => { sessionCache = undefined; };

/**
 * Bảo vệ trang riêng tư.
 *   roles: ['buyer'] | ['seller'] | ['admin'] | null (chỉ cần đã đăng nhập)
 * - Chưa đăng nhập → chuyển sang trang đăng nhập (kèm ?next= để quay lại)
 * - Sai vai trò → hiện thông báo "Vui lòng đăng xuất và đăng nhập bằng tài khoản ..." (không có công tắc đổi vai trò)
 * Trả về {user, profile} nếu được phép; trả về null nếu bị chặn.
 */
export async function requireAuth({ roles = null } = {}) {
  const session = await getSession();
  if (!session) { gotoLogin(); return null; }
  if (!session.profile) { goto('pages/login.html?complete=1'); return null; }
  // [BTV-ADMIN] Frontend guard for suspended accounts; Firestore rules independently enforce access.
  if (session.profile.accountStatus === 'suspended' || session.profile.accountStatus === 'pending') {
    const main = document.getElementById('main') || document.body;
    main.innerHTML = `<section class="container narrow section"><div class="alert alert-error"><strong>${session.profile.accountStatus === 'pending' ? 'Tài khoản đang chờ quản trị xác nhận.' : 'Tài khoản đang tạm khóa.'}</strong> ${esc(session.profile.accountStatus === 'pending' ? 'Bạn có thể xem các trang công khai trong lúc chờ phê duyệt.' : (session.profile.accountNote || 'Liên hệ hỗ trợ để được xem xét.'))}</div><button class="btn btn-primary" id="suspended-out">Đăng xuất</button></section>`;
    document.getElementById('suspended-out').onclick = async () => { await logout(); resetSessionCache(); goto('pages/login.html?out=1'); };
    return null;
  }

  if (roles && !roles.includes(session.profile.role)) {
    const need = { buyer: 'người mua', seller: 'người bán', admin: 'quản trị' }[roles[0]] || 'phù hợp';
    const main = document.getElementById('main') || document.body;
    main.innerHTML = `
      <div class="container narrow section">
        <div class="alert alert-warn" role="alert">
          <strong>Vui lòng đăng xuất và đăng nhập bằng tài khoản ${esc(need)}.</strong>
          <p>Mỗi tài khoản chỉ có một vai trò; quyền quản trị được cấp riêng bởi hệ thống. Không có công tắc đổi vai trò.</p>
        </div>
        <p><button class="btn btn-primary" id="role-logout">Đăng xuất</button>
           <a class="btn btn-ghost" href="${pageUrl('login')}">Về trang đăng nhập</a></p>
      </div>`;
    document.getElementById('role-logout').onclick = async () => { await logout(); resetSessionCache(); goto('pages/login.html?out=1'); };
    return null;
  }
  watchIdle();
  return session;
}

// ============================================================
//  TỰ ĐỘNG HẾT PHIÊN KHI KHÔNG HOẠT ĐỘNG
// ============================================================
let idleStarted = false;
export function watchIdle() {
  // Chỉ áp dụng khi KHÔNG tích "Ghi nhớ đăng nhập"
  if (idleStarted || localStorage.getItem('btv_remember') === '1') return;
  idleStarted = true;
  const limit = APP.IDLE_MINUTES * 60000;
  const warnAt = limit - APP.IDLE_WARN_SECONDS * 1000;
  let last = Date.now();
  let warning = null;

  const touch = () => { last = Date.now(); if (warning) { warning.remove(); warning = null; } };
  ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach((e) => addEventListener(e, touch, { passive: true }));

  setInterval(async () => {
    const idle = Date.now() - last;
    if (idle >= limit) {                                         // hết phiên → đăng xuất
      await logout(); resetSessionCache();
      goto('pages/login.html?timeout=1');
    } else if (idle >= warnAt && !warning) {                     // báo trước 1 phút, có nút gia hạn
      warning = document.createElement('div');
      warning.className = 'idle-warning';
      warning.setAttribute('role', 'alertdialog');
      warning.innerHTML = `<p><strong>Phiên sắp hết hạn.</strong> Bạn sẽ bị đăng xuất sau 1 phút nếu không thao tác.</p>
        <button class="btn btn-primary btn-sm" type="button">Tiếp tục sử dụng</button>`;
      warning.querySelector('button').onclick = touch;
      document.body.appendChild(warning);
    }
  }, 5000);
}
