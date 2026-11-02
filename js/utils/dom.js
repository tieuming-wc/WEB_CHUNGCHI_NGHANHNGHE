/**
 * ============================================================
 *  FILE: js/utils/dom.js
 *  MỤC ĐÍCH: Các hàm nhỏ dùng chung để thao tác với giao diện (DOM).
 * ============================================================
 */

/** Tìm 1 phần tử. Ví dụ: $('#form') */
export const $ = (selector, root = document) => root.querySelector(selector);

/** Tìm nhiều phần tử, trả về mảng. Ví dụ: $$('.card') */
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/**
 * Chống XSS: biến ký tự đặc biệt của HTML thành chữ thường.
 * LUÔN dùng esc() khi chèn dữ liệu do người dùng nhập (tên, mô tả, đánh giá...) vào innerHTML.
 */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Đọc tham số trên thanh địa chỉ. Ví dụ ?id=abc → qs('id') = 'abc' */
export const qs = (name) => new URLSearchParams(location.search).get(name);

/** Hoãn chạy hàm cho tới khi người dùng ngừng thao tác N mili-giây (dùng cho ô tìm kiếm) */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

/**
 * Gắn sự kiện kiểu "ủy quyền": lắng nghe ở phần tử cha, áp dụng cho con khớp selector.
 * Hữu ích vì nội dung được vẽ lại bằng JS nhiều lần.
 */
export function on(root, eventName, selector, handler) {
  root.addEventListener(eventName, (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(event, target);
  });
}

/** Khóa/mở nút bấm khi đang xử lý (tránh bấm nhiều lần tạo dữ liệu trùng) */
export function setBusy(button, busy, busyText = 'Đang xử lý…') {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.innerHTML;
    button.disabled = true;
    button.classList.add('is-busy');
    button.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${esc(busyText)}`;
  } else {
    button.disabled = false;
    button.classList.remove('is-busy');
    if (button.dataset.label) button.innerHTML = button.dataset.label;
  }
}

/** Tạo mã ngẫu nhiên ngắn (dùng làm id) */
export function randomId(prefix = '') {
  const rnd = crypto.getRandomValues(new Uint32Array(2));
  return prefix + Date.now().toString(36) + rnd[0].toString(36).slice(0, 4);
}

/** Cuộn mượt tới một phần tử và đưa con trỏ vào đó (dùng khi form có lỗi) */
export function focusFirstError(root = document) {
  const bad = root.querySelector('.field.has-error input, .field.has-error select, .field.has-error textarea');
  if (bad) { bad.scrollIntoView({ behavior: 'smooth', block: 'center' }); bad.focus({ preventScroll: true }); }
}
