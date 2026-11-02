/**
 * ============================================================
 *  FILE: js/pages/login.js
 *  TRANG: Đăng nhập (pages/login.html)
 *  Bám đặc tả: email + mật khẩu (ẩn/hiện, dán được), "Quên mật khẩu?", "Ghi nhớ đăng nhập",
 *  CAPTCHA, nút chỉ bấm được khi đủ điều kiện, lỗi chung "Email hoặc mật khẩu không đúng",
 *  khóa 15 phút sau 5 lần sai (có đồng hồ đếm ngược), chặn tài khoản chưa xác minh,
 *  đăng nhập Google/Facebook, và SAU KHI ĐĂNG NHẬP mở lại trang đã dùng gần nhất.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { mountCaptcha } from '../components/captcha.js';
import { openModal } from '../components/modal.js';
import { login, loginSocial, completeSocialProfile, lockRemaining, resendVerification, logout } from '../services/auth.js';
import { resetSessionCache, getSession } from '../services/session.js';
import { loadState } from '../services/userstate.js';
import { backend } from '../services/db.js';
import { $, qs, setBusy, esc } from '../utils/dom.js';
import { goto, safeNext, homeUrl } from '../utils/paths.js';
import { MSG } from '../utils/messages.js';
import { formatCountdown } from '../utils/format.js';
import { validateEmail, validateText } from '../utils/validators.js';
import { bindValidation, showFieldError, bindPasswordToggles } from '../utils/form.js';
import { flash } from '../components/toast.js';

await initLayout({ active: '', title: 'Đăng nhập' });
const form = $('#login-form');
const alertBox = $('.form-alert', form);
const emailEl = $('#email'), pwEl = $('#password'), btn = $('#submit-btn');
bindPasswordToggles(form);

// ----- Thông báo theo tham số trên địa chỉ -----
function banner(message, type) { const b = $('#page-banner'); b.className = `alert alert-${type}`; b.textContent = message; b.hidden = false; }
if (qs('out')) banner(MSG.loggedOut, 'success');
if (qs('timeout')) banner('Phiên làm việc đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.', 'warn');
if (qs('verified')) banner('Xác minh thành công! Bạn có thể đăng nhập ngay bây giờ.', 'success');
if (qs('reset')) banner('Mật khẩu đã được đặt lại. Hãy đăng nhập bằng mật khẩu mới.', 'success');
if (qs('email')) emailEl.value = qs('email');

// ----- Hàm quyết định đi đâu sau khi đăng nhập -----
async function afterLogin(user) {
  resetSessionCache();
  await getSession();
  const state = await loadState(user.uid);
  const next = safeNext(qs('next'));
  // Ưu tiên: trang đang định vào → trang đã xem gần nhất (nếu bật) → trang chủ
  const target = next || (state.prefs.restoreLast && state.lastPage) || homeUrl();
  flash(MSG.hello((await getSession()).profile?.name || ''), 'success');
  goto(target.startsWith('http') ? target : target);
}

// Nếu đã đăng nhập sẵn ở thiết bị này → vào thẳng (trừ khi đang ở bước hoàn tất hồ sơ)
const existing = await backend.waitForUser();
if (existing && existing.emailVerified) {
  const s = await getSession();
  if (s?.profile) await afterLogin(existing);
  else askRole(existing);                                        // đăng nhập mạng xã hội nhưng chưa có hồ sơ
}

// ----- CAPTCHA + trạng thái nút -----
const captcha = mountCaptcha($('#captcha'));
function syncBtn() {
  // REQ-LOG-05: chỉ bấm được khi 2 ô đã có nội dung và CAPTCHA đã qua
  btn.disabled = !(emailEl.value.trim() && pwEl.value && captcha.isPassed()) || locked;
}
[emailEl, pwEl].forEach((el) => el.addEventListener('input', syncBtn));
captcha.onChange(syncBtn);
bindValidation(emailEl, () => (emailEl.value.trim() ? validateEmail(emailEl.value) : MSG.required('email')));

// ----- Khóa tạm thời + đồng hồ đếm ngược -----
let locked = false, timer = null;
function checkLock() {
  const email = emailEl.value.trim().toLowerCase();
  const left = email ? lockRemaining(email) : 0;
  clearInterval(timer);
  if (left <= 0) { locked = false; $('#lock-box').hidden = true; syncBtn(); return; }
  locked = true; syncBtn();
  const until = Date.now() + left;
  const tick = () => {
    const rest = until - Date.now();
    if (rest <= 0) { checkLock(); return; }
    $('#lock-box').hidden = false; $('#lock-box').textContent = MSG.locked(formatCountdown(rest));
  };
  tick(); timer = setInterval(tick, 1000);
}
emailEl.addEventListener('blur', checkLock);
checkLock();

// ----- Gửi form -----
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.hidden = true; $('#resend-wrap').hidden = true;
  if (!captcha.check()) return;
  setBusy(btn, true, 'Đang đăng nhập…');
  try {
    const { user, profile } = await login({ email: emailEl.value, password: pwEl.value, remember: $('#remember').checked });
    if (!profile) { askRole(user); return; }
    await afterLogin(user);
  } catch (error) {
    setBusy(btn, false);
    captcha.reset(); pwEl.value = '';                            // giữ email, xóa mật khẩu, bắt xác minh lại
    alertBox.hidden = false;
    if (error.code === 'bad-credentials') alertBox.textContent = MSG.loginFail;
    else if (error.code === 'locked') { alertBox.hidden = true; checkLock(); }
    else if (error.code === 'unverified') {
      alertBox.textContent = MSG.unverified;
      $('#resend-wrap').hidden = false;
    } else if (error.code === 'auth/network-request-failed') alertBox.textContent = 'Không có kết nối mạng. Vui lòng thử lại.';
    else { console.error(error); alertBox.textContent = MSG.system; }
    syncBtn();
  }
});

// Gửi lại email xác minh (cần nhập lại mật khẩu ở ô, vì phải đăng nhập tạm để gửi)
$('#resend-btn').addEventListener('click', async (e) => {
  if (!pwEl.value) { alertBox.hidden = false; alertBox.textContent = 'Hãy nhập mật khẩu rồi bấm lại "Gửi lại email xác minh".'; pwEl.focus(); return; }
  setBusy(e.target, true);
  try { await resendVerification(emailEl.value, pwEl.value); banner('Đã gửi lại email xác minh. Hãy kiểm tra hộp thư.', 'success'); }
  catch { alertBox.hidden = false; alertBox.textContent = MSG.system; }
  setBusy(e.target, false);
});

// ----- Đăng nhập Google / Facebook -----
document.querySelectorAll('[data-social]').forEach((b) => b.addEventListener('click', async () => {
  alertBox.hidden = true;
  try {
    const { user, profile } = await loginSocial(b.dataset.social);
    if (!profile) askRole(user); else await afterLogin(user);
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return;
    alertBox.hidden = false;
    alertBox.textContent = error.code === 'local/unsupported' ? error.message
      : error.code === 'auth/operation-not-allowed' ? 'Phương thức đăng nhập này chưa được bật trong Firebase (xem README).'
      : error.code === 'auth/account-exists-with-different-credential' ? 'Email này đã đăng ký bằng cách khác. Hãy đăng nhập bằng email và mật khẩu.'
      : MSG.system;
  }
}));

// ----- Lần đầu đăng nhập mạng xã hội: hỏi vai trò để tạo hồ sơ -----
function askRole(user) {
  const { el, close } = openModal(`
    <p>Chào mừng bạn! Hãy chọn vai trò sử dụng website (mỗi tài khoản chỉ có một vai trò):</p>
    <div class="field radio-row" role="radiogroup">
      <label><input type="radio" name="r" value="buyer" checked> Người mua</label>
      <label><input type="radio" name="r" value="seller"> Người bán</label>
    </div>
    <div class="field" id="m-shop" hidden><label for="m-shop-in">Tên gian hàng</label><input id="m-shop-in" type="text" maxlength="60"><p class="field-error"></p></div>
    <div class="modal-actions"><button class="btn btn-ghost" id="m-cancel" type="button">Hủy</button><button class="btn btn-primary" id="m-ok" type="button">Tiếp tục</button></div>`,
    { title: 'Hoàn tất tài khoản', onClose: async () => { if (!done) { await logout(); resetSessionCache(); } } });
  let done = false;
  el.querySelectorAll('input[name="r"]').forEach((r) => r.addEventListener('change', () => { $('#m-shop', el).hidden = r.value !== 'seller' || !r.checked; }));
  $('#m-cancel', el).onclick = () => close();
  $('#m-ok', el).onclick = async () => {
    const role = el.querySelector('input[name="r"]:checked').value;
    const shopName = $('#m-shop-in', el).value;
    if (role === 'seller') { const m = validateText(shopName, 'Tên gian hàng', { min: 3, max: 60 }); if (!showFieldError($('#m-shop-in', el), m)) return; }
    await completeSocialProfile(user, { role, shopName });
    done = true; close(); await afterLogin(user);
  };
}
if (qs('complete') && !existing) banner('Vui lòng đăng nhập để hoàn tất tài khoản.', 'info');
