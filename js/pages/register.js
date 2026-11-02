/**
 * ============================================================
 *  FILE: js/pages/register.js
 *  TRANG: Đăng ký tài khoản (pages/register.html)
 *  Bám đặc tả: 9 trường, kiểm tra tức thì khi rời ô, ô đồng ý điều khoản không tích sẵn,
 *  CAPTCHA, báo lỗi dưới từng ô, sau đăng ký chuyển sang màn "Kiểm tra hộp thư".
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { mountCaptcha } from '../components/captcha.js';
import { register } from '../services/auth.js';
import { $, qs, setBusy, focusFirstError } from '../utils/dom.js';
import { goto, homeUrl } from '../utils/paths.js';
import { MSG } from '../utils/messages.js';
import { APP } from '../config/app-config.js';
import { validateName, validateEmail, validatePhone, validateDob, validatePassword, passwordStrength, validateText } from '../utils/validators.js';
import { bindValidation, validateAll, showFieldError, bindPasswordToggles, fillDobSelects } from '../utils/form.js';

const session = await initLayout({ active: '', title: 'Đăng ký' });
if (session) location.replace(homeUrl());                        // đã đăng nhập thì không cần đăng ký

const form = $('#register-form');
$('#site-name').textContent = APP.NAME;
fillDobSelects($('#dob-d'), $('#dob-m'), $('#dob-y'));
bindPasswordToggles(form);

// ----- Chọn vai trò: người mua hoặc người bán (mỗi tài khoản chỉ một vai trò) -----
const shopField = $('#shop-field');
const roleInputs = [...form.querySelectorAll('input[name="role"]')];
const currentRole = () => roleInputs.find((r) => r.checked).value;
function applyRole() { shopField.hidden = currentRole() !== 'seller'; }
if (qs('role') === 'seller') roleInputs.find((r) => r.value === 'seller').checked = true;
roleInputs.forEach((r) => r.addEventListener('change', applyRole));
applyRole();

// ----- CAPTCHA -----
const captcha = mountCaptcha($('#captcha'));

// ----- Kiểm tra tức thì từng ô -----
const f = {
  name: $('#name'), email: $('#email'), phone: $('#phone'), gender: $('#gender'),
  pw: $('#password'), pw2: $('#password2'), terms: $('#terms'), shop: $('#shopName'),
  d: $('#dob-d'), m: $('#dob-m'), y: $('#dob-y')
};
const checks = {
  name: () => validateName(f.name.value),
  email: () => validateEmail(f.email.value),
  phone: () => validatePhone(f.phone.value),
  dob: () => validateDob(f.d.value, f.m.value, f.y.value),
  pw: () => validatePassword(f.pw.value),
  pw2: () => (!f.pw2.value ? MSG.required('nhập lại mật khẩu') : f.pw2.value !== f.pw.value ? MSG.pwMismatch : ''),
  terms: () => (f.terms.checked ? '' : MSG.needTerms),
  shop: () => (currentRole() === 'seller' ? validateText(f.shop.value, 'Tên gian hàng', { min: 3, max: 60 }) : '')
};
bindValidation(f.name, checks.name);
bindValidation(f.email, checks.email);
bindValidation(f.phone, checks.phone);
bindValidation(f.pw, checks.pw);
bindValidation(f.pw2, checks.pw2);
bindValidation(f.shop, checks.shop);
[f.d, f.m, f.y].forEach((s) => s.addEventListener('change', () => { if (f.d.value && f.m.value && f.y.value) showFieldError(f.d, checks.dob()); }));
f.pw.addEventListener('input', () => { if (f.pw2.value) showFieldError(f.pw2, checks.pw2()); });
f.terms.addEventListener('change', () => { showFieldError(f.terms, checks.terms()); syncSubmit(); });

// Thanh đo độ mạnh mật khẩu
f.pw.addEventListener('input', () => {
  const s = passwordStrength(f.pw.value);
  $('#pw-meter').dataset.score = s.score;
  $('#pw-label').textContent = s.label ? `Độ mạnh: ${s.label}` : '';
});

// Nút Đăng ký chỉ bấm được khi đã tích đồng ý điều khoản
const submitBtn = $('#submit-btn');
function syncSubmit() { submitBtn.disabled = !f.terms.checked; }
syncSubmit();

// ----- Gửi form -----
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertBox = $('.form-alert', form);
  alertBox.hidden = true;

  const ok = validateAll([[f.name, checks.name], [f.email, checks.email], [f.phone, checks.phone], [f.d, checks.dob],
    [f.pw, checks.pw], [f.pw2, checks.pw2], [f.terms, checks.terms], [f.shop, checks.shop]]);
  const capOk = captcha.check();
  if (!ok || !capOk) { focusFirstError(form); return; }

  setBusy(submitBtn, true);                                      // chỉ bấm 1 lần, tránh gửi trùng
  try {
    const dob = `${f.y.value}-${String(f.m.value).padStart(2, '0')}-${String(f.d.value).padStart(2, '0')}`;
    await register({
      name: f.name.value, email: f.email.value, phone: f.phone.value.trim(), dob, gender: f.gender.value,
      password: f.pw.value, role: currentRole(), shopName: f.shop.value
    });
    // Thành công → màn hình "Kiểm tra hộp thư của bạn"
    goto(`pages/verify-email.html?email=${encodeURIComponent(f.email.value.trim().toLowerCase())}&new=1`);
  } catch (error) {
    setBusy(submitBtn, false);
    captcha.reset();                                             // bắt xác minh lại sau khi thất bại
    if (error.code === 'auth/email-already-in-use') {
      showFieldError(f.email, MSG.emailTaken);
      const link = document.createElement('a'); link.href = 'login.html'; link.textContent = ' Đăng nhập';
      f.email.closest('.field').querySelector('.field-error').appendChild(link);
      focusFirstError(form);
    } else if (error.code === 'phone-taken') { showFieldError(f.phone, MSG.phoneTaken); focusFirstError(form); }
    else if (error.code === 'auth/weak-password') { showFieldError(f.pw, MSG.pwLength); }
    else if (error.code === 'auth/network-request-failed') { alertBox.hidden = false; alertBox.textContent = 'Không có kết nối mạng. Vui lòng kiểm tra và thử lại.'; }
    else { console.error(error); alertBox.hidden = false; alertBox.textContent = MSG.system; }
  }
});
