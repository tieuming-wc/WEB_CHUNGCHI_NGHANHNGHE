/**
 * ============================================================
 *  FILE: js/pages/verify-email.js
 *  TRANG: "Kiểm tra hộp thư của bạn" (pages/verify-email.html)
 *  Hiện sau khi đăng ký. Cho phép gửi lại email xác minh (giới hạn 1 lần / 60 giây).
 *  Ở chế độ thử nghiệm (không gửi được email thật) trang hiện "hộp thư giả lập" chứa liên kết kích hoạt.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { resendVerification } from '../services/auth.js';
import { backend } from '../services/db.js';
import { $, qs, esc, setBusy } from '../utils/dom.js';
import { MSG } from '../utils/messages.js';
import { APP } from '../config/app-config.js';
import { pageUrl } from '../utils/paths.js';

await initLayout({ active: '', title: 'Kiểm tra hộp thư' });
const email = (qs('email') || '').toLowerCase();
$('#sent-msg').textContent = email ? MSG.registered(email) : 'Hãy kiểm tra hộp thư và bấm vào liên kết xác minh để kích hoạt tài khoản.';

// ----- Hộp thư giả lập (chỉ chế độ thử nghiệm) -----
function renderMailbox() {
  const mails = backend.peekMailbox(email).filter((m) => m.type === 'verify');
  const box = $('#demo-mailbox');
  if (backend.mode !== 'local') { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<strong>Hộp thư giả lập (chỉ có ở chế độ thử nghiệm)</strong>
    <p class="small">Vì chưa kết nối máy chủ gửi email thật, thư xác minh hiện ở đây. Khi dùng Firebase, thư sẽ về email thật.</p>
    ${mails.length ? mails.slice(0, 1).map((m) => `<p><a class="btn btn-gold btn-sm" href="${esc(m.link)}">Xác minh tài khoản (liên kết trong email)</a></p>`).join('') : '<p class="muted">Chưa có thư.</p>'}`;
}
renderMailbox();

// ----- Gửi lại (cần mật khẩu vì phải đăng nhập tạm để gửi) -----
const btn = $('#resend-btn');
let cooldownTimer;
function startCooldown() {
  let left = APP.RESEND_SECONDS;
  btn.disabled = true;
  clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    left--; btn.textContent = left > 0 ? `Gửi lại sau ${left}s` : 'Gửi lại email xác minh';
    if (left <= 0) { clearInterval(cooldownTimer); btn.disabled = false; }
  }, 1000);
  btn.textContent = `Gửi lại sau ${left}s`;
}
$('#resend-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#resend-msg'); msg.hidden = true;
  const pw = $('#pw').value;
  if (!email || !pw) { msg.hidden = false; msg.className = 'alert alert-error'; msg.textContent = 'Vui lòng nhập mật khẩu của tài khoản.'; return; }
  setBusy(btn, true);
  try {
    await resendVerification(email, pw);
    msg.hidden = false; msg.className = 'alert alert-success'; msg.textContent = 'Đã gửi lại email xác minh.';
    renderMailbox(); setBusy(btn, false); startCooldown();
  } catch (error) {
    setBusy(btn, false);
    msg.hidden = false; msg.className = 'alert alert-error';
    msg.textContent = ['auth/invalid-credential', 'auth/wrong-password'].includes(error.code) ? MSG.loginFail
      : error.code === 'auth/too-many-requests' ? 'Bạn thao tác quá nhanh. Vui lòng đợi một lúc rồi thử lại.' : MSG.system;
  }
});
$('#to-login').href = pageUrl('login', email ? { email } : undefined);
