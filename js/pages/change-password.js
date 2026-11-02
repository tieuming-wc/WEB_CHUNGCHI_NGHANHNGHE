/**
 * ============================================================
 *  FILE: js/pages/change-password.js
 *  TRANG: Đổi mật khẩu (pages/change-password.html)
 *  Phải nhập đúng mật khẩu hiện tại; mật khẩu mới theo quy tắc 8–64 ký tự, không quá dễ đoán.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { requireAuth } from '../services/session.js';
import { changePassword } from '../services/auth.js';
import { $, setBusy } from '../utils/dom.js';
import { MSG } from '../utils/messages.js';
import { toast } from '../components/toast.js';
import { validatePassword, passwordStrength } from '../utils/validators.js';
import { bindValidation, validateAll, showFieldError, bindPasswordToggles } from '../utils/form.js';

const auth = await requireAuth();
if (!auth) throw new Error('stop');
await initLayout({ active: '', title: 'Đổi mật khẩu' });

const form = $('#pw-form');
bindPasswordToggles(form);
const old = $('#old'), pw = $('#new'), pw2 = $('#new2');
const cOld = () => (old.value ? '' : MSG.required('mật khẩu hiện tại'));
const cNew = () => validatePassword(pw.value) || (pw.value === old.value ? 'Mật khẩu mới phải khác mật khẩu hiện tại.' : '');
const cNew2 = () => (pw2.value !== pw.value ? MSG.pwMismatch : '');
bindValidation(old, cOld); bindValidation(pw, cNew); bindValidation(pw2, cNew2);
pw.addEventListener('input', () => { const s = passwordStrength(pw.value); $('#pw-meter').dataset.score = s.score; $('#pw-label').textContent = s.label ? `Độ mạnh: ${s.label}` : ''; });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateAll([[old, cOld], [pw, cNew], [pw2, cNew2]])) return;
  const btn = $('#save-btn'); setBusy(btn, true);
  try {
    await changePassword(old.value, pw.value);
    form.reset(); $('#pw-meter').dataset.score = 0; $('#pw-label').textContent = '';
    toast('Đổi mật khẩu thành công.', 'success');
  } catch (error) {
    if (['auth/invalid-credential', 'auth/wrong-password'].includes(error.code)) showFieldError(old, 'Mật khẩu hiện tại không đúng.');
    else if (error.code === 'auth/weak-password') showFieldError(pw, MSG.pwLength);
    else { const a = $('.form-alert'); a.hidden = false; a.textContent = MSG.system; }
  }
  setBusy(btn, false);
});
