/**
 * ============================================================
 *  FILE: js/utils/form.js
 *  MỤC ĐÍCH: Hiện / xóa lỗi dưới ô nhập (inline validation) theo đúng đặc tả:
 *  "mỗi trường được kiểm tra ngay khi người dùng rời ô, lỗi hiện ngay dưới ô đó".
 *
 *  Quy ước HTML cho mỗi ô:
 *    <div class="field">
 *      <label for="x">Nhãn</label>
 *      <input id="x" ...>
 *      <p class="field-hint">Gợi ý</p>
 *      <p class="field-error" role="alert"></p>
 *    </div>
 * ============================================================
 */

/** Hiện lỗi dưới ô. message rỗng = xóa lỗi. Trả về true nếu hợp lệ */
export function showFieldError(input, message) {
  const field = input.closest('.field');
  if (!field) return !message;
  let box = field.querySelector('.field-error');
  if (!box) {                                // chưa có khung lỗi thì tự tạo
    box = document.createElement('p');
    box.className = 'field-error';
    box.setAttribute('role', 'alert');
    field.appendChild(box);
  }
  box.textContent = message || '';
  field.classList.toggle('has-error', Boolean(message));
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  return !message;
}

/**
 * Gắn kiểm tra tức thì: chạy validator khi rời ô (blur) và chạy lại khi gõ nếu đang có lỗi.
 * validator: () => chuỗi lỗi hoặc ''
 */
export function bindValidation(input, validator) {
  const run = () => showFieldError(input, validator());
  input.addEventListener('blur', run);
  input.addEventListener('input', () => { if (input.closest('.field')?.classList.contains('has-error')) run(); });
  input.addEventListener('change', run);
  return run;
}

/** Chạy một loạt kiểm tra [ô, hàm] → trả về true nếu tất cả đều hợp lệ */
export function validateAll(pairs) {
  let ok = true;
  for (const [input, validator] of pairs) {
    if (!showFieldError(input, validator())) ok = false;
  }
  return ok;
}

/** Hiện khung thông báo chung của form (lỗi/ thành công), id="form-alert" */
export function showFormAlert(container, message, type = 'error') {
  const box = container.querySelector('.form-alert') || container;
  box.className = `form-alert alert alert-${type}`;
  box.hidden = !message;
  box.textContent = message || '';
}

/** Nút hiện/ẩn mật khẩu: gắn vào mọi nút có data-toggle-password="#idOChuaMatKhau" */
export function bindPasswordToggles(root = document) {
  root.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = root.querySelector(btn.dataset.togglePassword);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Ẩn' : 'Hiện';
      btn.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    });
  });
}

/** Đổ danh sách Ngày / Tháng / Năm vào 3 ô chọn ngày sinh */
export function fillDobSelects(daySel, monthSel, yearSel) {
  const opt = (v, t) => `<option value="${v}">${t}</option>`;
  daySel.innerHTML = opt('', 'Ngày') + Array.from({ length: 31 }, (_, i) => opt(i + 1, i + 1)).join('');
  monthSel.innerHTML = opt('', 'Tháng') + Array.from({ length: 12 }, (_, i) => opt(i + 1, 'Tháng ' + (i + 1))).join('');
  const thisYear = new Date().getFullYear();
  yearSel.innerHTML = opt('', 'Năm') + Array.from({ length: 100 }, (_, i) => opt(thisYear - i, thisYear - i)).join('');
}
