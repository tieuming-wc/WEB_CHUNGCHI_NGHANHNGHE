/**
 * ============================================================
 *  FILE: js/components/toast.js
 *  MỤC ĐÍCH: Thông báo nhỏ nổi ở góc màn hình (thành công / lỗi / thông tin),
 *  và "thông báo chờ" – hiện ở trang KẾ TIẾP sau khi chuyển trang
 *  (vd: "Bạn đã đăng xuất thành công." hiện ở trang đăng nhập).
 * ============================================================
 */
import { esc } from '../utils/dom.js';

function getHost() {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    host.setAttribute('aria-live', 'polite');                   // trình đọc màn hình sẽ đọc thông báo
    document.body.appendChild(host);
  }
  return host;
}

/** Hiện thông báo. type: 'success' | 'error' | 'info' */
export function toast(message, type = 'info', ms = 4500) {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${esc(message)}</span><button type="button" aria-label="Đóng">×</button>`;
  el.querySelector('button').onclick = () => el.remove();
  getHost().appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/** Đặt thông báo để hiện ở trang kế tiếp */
export function flash(message, type = 'success') {
  try { sessionStorage.setItem('btv_flash', JSON.stringify({ message, type })); } catch { /* bỏ qua */ }
}

/** Gọi khi mỗi trang mở: nếu có thông báo chờ thì hiện ra */
export function showFlash() {
  try {
    const raw = sessionStorage.getItem('btv_flash');
    if (!raw) return;
    sessionStorage.removeItem('btv_flash');
    const { message, type } = JSON.parse(raw);
    toast(message, type);
  } catch { /* bỏ qua */ }
}
