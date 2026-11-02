/**
 * ============================================================
 *  FILE: js/pages/auth-action.js
 *  TRANG: Xử lý liên kết trong email (pages/auth-action.html)
 *    ?mode=verifyEmail   → kích hoạt tài khoản (liên kết dùng 1 lần, hạn 24 giờ)
 *    ?mode=resetPassword → đặt lại mật khẩu (dùng 1 lần, hạn 30 phút) – 2 ô mật khẩu mới theo đúng quy tắc
 *  Đặc tả: đặt mật khẩu xong → đăng xuất mọi thiết bị → về màn Đăng nhập.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { backend } from '../services/db.js';
import { flash } from '../components/toast.js';
import { $, qs, setBusy } from '../utils/dom.js';
import { goto, pageUrl } from '../utils/paths.js';
import { MSG } from '../utils/messages.js';
import { validatePassword, passwordStrength } from '../utils/validators.js';
import { bindValidation, validateAll, bindPasswordToggles } from '../utils/form.js';

await initLayout({ active: '', title: 'Xác nhận từ email' });
const mode = qs('mode'), code = qs('oobCode');
const box = $('#action-box');

function show(html) { box.innerHTML = html; }
const expiredHtml = (what) => `<div class="alert alert-error"><strong>Liên kết không còn hiệu lực.</strong><p>${what} Liên kết chỉ dùng được một lần và có thời hạn.</p></div>
  <p><a class="btn btn-primary" href="${pageUrl('login')}">Về trang đăng nhập</a></p>`;

if (!mode || !code) {
  show(expiredHtml('Địa chỉ không hợp lệ.'));
} else if (mode === 'verifyEmail') {
  try {
    await backend.verifyEmailCode(code);
    show(`<div class="alert alert-success"><strong>Xác minh thành công!</strong><p>Tài khoản của bạn đã được kích hoạt.</p></div>
      <p><a class="btn btn-primary btn-lg" href="${pageUrl('login', { verified: 1 })}">Đăng nhập</a></p>`);
  } catch {
    show(expiredHtml('Liên kết xác minh đã hết hạn hoặc đã được dùng.') + `<p class="muted">Ở màn hình đăng nhập, bấm <strong>Gửi lại email xác minh</strong> để nhận liên kết mới.</p>`);
  }
} else if (mode === 'resetPassword') {
  try {
    await backend.checkResetCode(code);
    show(`<form id="reset-form" novalidate>
        <h2>Đặt mật khẩu mới</h2>
        <div class="form-alert alert alert-error" hidden role="alert"></div>
        <div class="field"><label for="pw">Mật khẩu mới</label>
          <div class="input-group"><input id="pw" type="password" autocomplete="new-password" required><button class="toggle" type="button" data-toggle-password="#pw">Hiện</button></div>
          <div class="pw-meter" id="pw-meter" data-score="0"><span></span><span></span><span></span><span></span></div><p class="pw-label" id="pw-label"></p>
          <p class="field-hint">Từ 8 đến 64 ký tự (khuyên dùng 12 trở lên). Có thể dán từ trình quản lý mật khẩu.</p><p class="field-error"></p></div>
        <div class="field"><label for="pw2">Nhập lại mật khẩu mới</label>
          <div class="input-group"><input id="pw2" type="password" autocomplete="new-password" required><button class="toggle" type="button" data-toggle-password="#pw2">Hiện</button></div><p class="field-error"></p></div>
        <button class="btn btn-primary btn-block btn-lg" id="reset-btn" type="submit">Đặt lại mật khẩu</button>
      </form>`);
    const form = $('#reset-form'), pw = $('#pw'), pw2 = $('#pw2');
    bindPasswordToggles(form);
    const c1 = () => validatePassword(pw.value);
    const c2 = () => (pw2.value !== pw.value ? MSG.pwMismatch : '');
    bindValidation(pw, c1); bindValidation(pw2, c2);
    pw.addEventListener('input', () => { const s = passwordStrength(pw.value); $('#pw-meter').dataset.score = s.score; $('#pw-label').textContent = s.label ? `Độ mạnh: ${s.label}` : ''; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateAll([[pw, c1], [pw2, c2]])) return;
      const btn = $('#reset-btn'); setBusy(btn, true);
      try {
        await backend.confirmReset(code, pw.value);              // đổi xong → mọi phiên cũ trên mọi thiết bị hết hiệu lực
        flash('Mật khẩu của bạn vừa được thay đổi. Hãy đăng nhập lại.', 'success');
        goto('pages/login.html?reset=1');
      } catch (error) {
        setBusy(btn, false);
        if (error.code === 'auth/invalid-action-code' || error.code === 'auth/expired-action-code') show(expiredHtml('Liên kết đặt lại mật khẩu đã hết hạn.'));
        else { const a = $('.form-alert', form); a.hidden = false; a.textContent = error.code === 'auth/weak-password' ? MSG.pwLength : MSG.system; }
      }
    });
  } catch {
    show(expiredHtml('Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được dùng.') + `<p><a href="${pageUrl('forgot-password')}">Yêu cầu liên kết mới</a></p>`);
  }
} else {
  show(expiredHtml('Yêu cầu không được hỗ trợ.'));
}
