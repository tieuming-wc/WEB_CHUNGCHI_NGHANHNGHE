/**
 * ============================================================
 *  FILE: js/pages/profile.js
 *  TRANG: Hồ sơ của tôi (pages/profile.html)
 *  Xem và sửa: Họ tên, ngày sinh, giới tính, số điện thoại.
 *  Email chỉ xem (đổi email cần xác minh lại – chưa hỗ trợ ở bản này).
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { requireAuth, resetSessionCache } from '../services/session.js';
import { updateProfile } from '../services/auth.js';
import { flash } from '../components/toast.js';
import { $, setBusy } from '../utils/dom.js';
import { goto } from '../utils/paths.js';
import { MSG } from '../utils/messages.js';
import { formatDate } from '../utils/format.js';
import { validateName, validatePhone, validateDob } from '../utils/validators.js';
import { bindValidation, validateAll, showFieldError, fillDobSelects } from '../utils/form.js';

const auth = await requireAuth();
if (!auth) throw new Error('stop');                              // đã chuyển sang trang đăng nhập
await initLayout({ active: '', title: 'Hồ sơ của tôi' });
const { user, profile } = auth;

const f = { name: $('#name'), phone: $('#phone'), gender: $('#gender'), d: $('#dob-d'), m: $('#dob-m'), y: $('#dob-y') };
fillDobSelects(f.d, f.m, f.y);

// Đổ dữ liệu hiện tại vào form
f.name.value = profile.name || '';
f.phone.value = profile.phone || '';
f.gender.value = profile.gender || '';
if (profile.dob) { const [y, m, d] = profile.dob.split('-').map(Number); f.y.value = y; f.m.value = m; f.d.value = d; }
$('#email').value = profile.email || user.email;
$('#role-text').textContent = { buyer: 'Người mua', seller: 'Người bán', admin: 'Quản trị' }[profile.role];
$('#joined').textContent = formatDate(profile.createdAt);
if (profile.role === 'seller') $('#seller-link').hidden = false;

const checks = {
  name: () => validateName(f.name.value),
  phone: () => validatePhone(f.phone.value),
  dob: () => (profile.dob || f.d.value || f.m.value || f.y.value ? validateDob(f.d.value, f.m.value, f.y.value) : '')   // tài khoản mạng xã hội có thể chưa có ngày sinh
};
bindValidation(f.name, checks.name); bindValidation(f.phone, checks.phone);
[f.d, f.m, f.y].forEach((s) => s.addEventListener('change', () => showFieldError(f.d, checks.dob())));

$('#profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateAll([[f.name, checks.name], [f.phone, checks.phone], [f.d, checks.dob]])) return;
  const btn = $('#save-btn'); setBusy(btn, true);
  try {
    const dob = f.y.value ? `${f.y.value}-${String(f.m.value).padStart(2, '0')}-${String(f.d.value).padStart(2, '0')}` : '';
    await updateProfile(user.uid, { name: f.name.value, phone: f.phone.value.trim(), dob, gender: f.gender.value });
    resetSessionCache();
    flash('Đã lưu hồ sơ.', 'success');
    goto('pages/profile.html');                                  // tải lại để tên mới hiện ở góc phải
  } catch (error) {
    setBusy(btn, false);
    if (error.code === 'phone-taken') showFieldError(f.phone, MSG.phoneTaken);
    else { const a = $('.form-alert'); a.hidden = false; a.textContent = MSG.system; }
  }
});
