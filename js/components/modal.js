/**
 * ============================================================
 *  FILE: js/components/modal.js
 *  MỤC ĐÍCH: Hộp thoại (popup) dùng chung: mở hộp tùy biến và hộp xác nhận Có/Không.
 *  Hỗ trợ bàn phím: Esc để đóng, Tab không thoát ra ngoài hộp (đạt WCAG cơ bản).
 * ============================================================
 */
import { esc } from '../utils/dom.js';

/**
 * Mở hộp thoại với nội dung HTML. Trả về {el, close}.
 * onClose được gọi khi hộp đóng (bằng bất kỳ cách nào).
 */
export function openModal(html, { title = '', onClose, wide = false } = {}) {
  const previouslyFocused = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <button class="modal-x" type="button" aria-label="Đóng">×</button>
      ${title ? `<h2 class="modal-title">${esc(title)}</h2>` : ''}
      <div class="modal-body">${html}</div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');

  const modal = overlay.querySelector('.modal');
  const close = () => {
    overlay.remove();
    if (!document.querySelector('.modal-overlay')) document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onKey);
    previouslyFocused?.focus?.();
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {                                       // giữ con trỏ bên trong hộp
      const f = [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', onKey);
  overlay.querySelector('.modal-x').onclick = close;
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  (modal.querySelector('[autofocus], input, select, textarea, button.btn') || modal).focus();
  return { el: modal, close };
}

/**
 * Hộp xác nhận. Trả về Promise<boolean>.
 * Ví dụ: if (await confirmDialog({ title:'Xóa sản phẩm', message:'…', danger:true })) {...}
 */
export function confirmDialog({ title = 'Xác nhận', message = '', confirmText = 'Đồng ý', cancelText = 'Hủy', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const { el, close } = openModal(`
      <p>${message}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-act="no">${esc(cancelText)}</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="yes" autofocus>${esc(confirmText)}</button>
      </div>`, { title, onClose: () => { if (!answered) resolve(false); } });
    el.querySelector('[data-act="yes"]').onclick = () => { answered = true; resolve(true); close(); };
    el.querySelector('[data-act="no"]').onclick = () => { answered = true; resolve(false); close(); };
  });
}

/**
 * Hộp nhập lý do (dùng khi hủy đơn, từ chối...). Trả về Promise<string|null>.
 * options: danh sách lý do chọn nhanh (tùy chọn). Bắt buộc phải có lý do.
 */
export function promptReason({ title, message = '', options = [], confirmText = 'Xác nhận', danger = true }) {
  return new Promise((resolve) => {
    let answered = false;
    const opts = options.length
      ? `<div class="field"><label for="reason-sel">Chọn lý do</label><select id="reason-sel"><option value="">— Chọn —</option>${options.map((o) => `<option>${esc(o)}</option>`).join('')}<option value="__other">Lý do khác…</option></select></div>` : '';
    const { el, close } = openModal(`
      ${message ? `<p>${message}</p>` : ''}${opts}
      <div class="field" id="reason-box" ${options.length ? 'hidden' : ''}><label for="reason-txt">Lý do</label><textarea id="reason-txt" rows="3" maxlength="300"></textarea></div>
      <p class="field-error" id="reason-err" role="alert"></p>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-act="no">Quay lại</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="yes">${esc(confirmText)}</button>
      </div>`, { title, onClose: () => { if (!answered) resolve(null); } });
    const sel = el.querySelector('#reason-sel'), box = el.querySelector('#reason-box'), txt = el.querySelector('#reason-txt');
    if (sel) sel.onchange = () => { box.hidden = sel.value !== '__other'; if (!box.hidden) txt.focus(); };
    el.querySelector('[data-act="no"]').onclick = () => close();
    el.querySelector('[data-act="yes"]').onclick = () => {
      const value = sel && sel.value && sel.value !== '__other' ? sel.value : txt.value.trim();
      if (!value) { el.querySelector('#reason-err').textContent = 'Vui lòng chọn hoặc nhập lý do.'; return; }
      answered = true; resolve(value); close();
    };
  });
}
