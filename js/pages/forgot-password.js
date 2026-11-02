/**
 * ============================================================
 *  FILE: js/pages/forgot-password.js
 *  TRANG: Quên mật khẩu (pages/forgot-password.html)
 *  Luồng (REQ-PWD-01/02): nhập email + qua CAPTCHA → LUÔN hiện cùng một câu thông báo,
 *  dù email có tồn tại hay không (để không lộ ai có tài khoản).
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { mountCaptcha } from '../components/captcha.js';
import { backend } from '../services/db.js';
import { $, esc, setBusy } from '../utils/dom.js';
import { MSG } from '../utils/messages.js';
import { validateEmail } from '../utils/validators.js';
import { bindValidation, showFieldError } from '../utils/form.js';

await initLayout({ active: '', title: 'Quên mật khẩu' });
const form = $('#forgot-form');
const emailEl = $('#email');
const captcha = mountCaptcha($('#captcha'));
bindValidation(emailEl, () => validateEmail(emailEl.value));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const okEmail = showFieldError(emailEl, validateEmail(emailEl.value));
  if (!captcha.check() || !okEmail) return;
  const btn = $('#submit-btn');
  setBusy(btn, true);
  try { await backend.sendReset(emailEl.value); }
  catch (error) { if (error.code === 'auth/too-many-requests') { setBusy(btn, false); $('.form-alert', form).hidden = false; $('.form-alert', form).textContent = 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.'; return; } }
  // Luôn hiện câu thông báo chung
  form.hidden = true;
  const done = $('#done');
  done.hidden = false;
  $('#done-msg').textContent = MSG.resetSent;

  // Chế độ thử nghiệm: hiện liên kết đặt lại trong hộp thư giả lập
  if (backend.mode === 'local') {
    const mail = backend.peekMailbox(emailEl.value).find((m) => m.type === 'reset');
    $('#demo-mailbox').hidden = false;
    $('#demo-mailbox').innerHTML = `<strong>Hộp thư giả lập (chỉ có ở chế độ thử nghiệm)</strong>
      ${mail ? `<p><a class="btn btn-gold btn-sm" href="${esc(mail.link)}">Đặt lại mật khẩu (liên kết trong email, hiệu lực 30 phút)</a></p>` : '<p class="muted">Email này chưa đăng ký nên không có thư (web thật vẫn hiện câu thông báo giống hệt).</p>'}`;
  }
});
