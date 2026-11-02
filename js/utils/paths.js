/**
 * ============================================================
 *  FILE: js/utils/paths.js
 *  MỤC ĐÍCH: Tính đường dẫn đúng cho mọi trang.
 *  Vì sao cần? GitHub Pages thường chạy ở địa chỉ dạng
 *     https://ten-ban.github.io/ten-repo/
 *  (có thêm "/ten-repo/"), nên KHÔNG được viết link bắt đầu bằng "/".
 *  File này tự dò thư mục gốc của web dựa vào vị trí của chính nó,
 *  nên chạy đúng ở: Live Server (VS Code), GitHub Pages, tên miền riêng...
 * ============================================================
 */

// Thư mục gốc của web (kết thúc bằng "/"). File này nằm ở js/utils/ → lùi 2 cấp là gốc.
export const ROOT = new URL('../../', import.meta.url).href;

/** Tạo link tới một trang trong thư mục pages/. Ví dụ pageUrl('shop', {q:'gốm'}) */
export function pageUrl(name, params) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return `${ROOT}pages/${name}.html${qs}`;
}

/** Link tới trang chủ */
export const homeUrl = () => ROOT + 'index.html';

/** Link tới file trong thư mục assets/ */
export const assetUrl = (file) => ROOT + 'assets/' + file;

/** Đường dẫn trang hiện tại, TÍNH TỪ THƯ MỤC GỐC (dùng để nhớ "trang đã xem cuối") */
export function currentRelative() {
  const full = location.href.split('#')[0];
  return full.startsWith(ROOT) ? full.slice(ROOT.length) : '';
}

/**
 * Làm sạch tham số "next" (trang cần quay lại sau khi đăng nhập).
 * Chỉ chấp nhận đường dẫn nội bộ → chống lỗi "open redirect" (bị dẫn sang web lạ).
 */
export function safeNext(next) {
  if (!next) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(next) || next.startsWith('//')) return '';
  return next.replace(/^\/+/, '');
}

/** Chuyển trang. Nhận đường dẫn tính từ gốc (vd 'pages/shop.html') hoặc link đầy đủ. */
export function goto(target) {
  location.href = /^https?:/i.test(target) ? target : ROOT + target.replace(/^\/+/, '');
}

/** Chuyển tới trang đăng nhập, kèm theo trang hiện tại để quay lại sau khi đăng nhập xong */
export function gotoLogin(extra = {}) {
  const next = currentRelative();
  goto('pages/login.html?' + new URLSearchParams({ ...(next ? { next } : {}), ...extra }).toString());
}
