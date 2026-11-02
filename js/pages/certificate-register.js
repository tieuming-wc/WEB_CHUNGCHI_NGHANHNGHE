/**
 * ============================================================
 *  FILE: js/pages/certificate-register.js
 *  TRANG: Đăng ký chứng nhận tay nghề (pages/certificate-register.html)
 *  Luồng theo ghi chú dự án:
 *    điền thông tin cá nhân, quê quán, CCCD, chọn nơi thi (Hà Nội / TP.HCM), tải ảnh bill chuyển khoản
 *    → bấm gửi → thông tin "báo về hệ thống" (lưu CSDL) → hệ thống báo lại ĐÃ ĐĂNG KÝ THÀNH CÔNG kèm mã đăng ký.
 *  Quyền riêng tư: CCCD chỉ chủ hồ sơ và quản trị có thẩm quyền xem; không hiện công khai.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { requireAuth } from '../services/session.js';
import { submitRegistration, myRegistrations, REG_STATUS } from '../services/certs.js';
import { APP } from '../config/app-config.js';
import { CATEGORIES } from '../data/categories.js';
import { compressImage, validateImageFile } from '../utils/image.js';
import { validateName, validateEmail, validatePhone, validateDob, validateCccd, validateText, normalizePhone } from '../utils/validators.js';
import { $, esc, setBusy, focusFirstError } from '../utils/dom.js';
import { formatVND, formatDateTime } from '../utils/format.js';
import { bindValidation, validateAll, showFieldError, fillDobSelects } from '../utils/form.js';
import { pageUrl } from '../utils/paths.js';

const auth = await requireAuth();
if (!auth) throw new Error('stop');
await initLayout({ active: 'certificate', title: 'Đăng ký chứng nhận' });
const { user, profile } = auth;

// ----- Điền sẵn từ hồ sơ -----
fillDobSelects($('#dob-d'), $('#dob-m'), $('#dob-y'));
$('#fullName').value = profile.name || ''; $('#email').value = profile.email || user.email; $('#phone').value = profile.phone || '';
if (profile.dob) { const [y, m, d] = profile.dob.split('-').map(Number); $('#dob-y').value = y; $('#dob-m').value = m; $('#dob-d').value = d; }
$('#gender').value = profile.gender || '';
$('#craft').innerHTML = '<option value="">— Chọn nghề —</option>' + [...CATEGORIES.map((c) => c.name), 'Nghề thủ công khác'].map((n) => `<option>${esc(n)}</option>`).join('');
$('#locations').innerHTML = APP.EXAM_LOCATIONS.map((l, i) => `<label class="radio-card"><input type="radio" name="location" value="${esc(l)}" ${i === 0 ? 'checked' : ''}> <strong>${esc(l)}</strong></label>`).join('');
$('#fee').textContent = formatVND(APP.CERT_FEE);
$('#bank').innerHTML = APP.BANK.ACCOUNT_NO ? `${esc(APP.BANK.BANK_LABEL)} · STK <strong>${esc(APP.BANK.ACCOUNT_NO)}</strong> · ${esc(APP.BANK.ACCOUNT_NAME)}<br>Nội dung: <strong>CHUNGNHAN ${esc(user.uid.slice(-6).toUpperCase())}</strong>` : '<span class="alert alert-warn">Quản trị website chưa cấu hình tài khoản nhận lệ phí (js/config/app-config.js → BANK).</span>';

const f = ['fullName', 'email', 'phone', 'hometown', 'cccd', 'craft', 'terms'].reduce((o, id) => ({ ...o, [id]: $('#' + id) }), {});
const d = $('#dob-d'), m = $('#dob-m'), y = $('#dob-y');
const checks = {
  fullName: () => validateName(f.fullName.value), email: () => validateEmail(f.email.value), phone: () => validatePhone(f.phone.value, { required: true }),
  hometown: () => validateText(f.hometown.value, 'Quê quán', { min: 5, max: 150 }), cccd: () => validateCccd(f.cccd.value),
  craft: () => (f.craft.value ? '' : 'Vui lòng chọn nghề đăng ký.'), terms: () => (f.terms.checked ? '' : 'Bạn cần xác nhận thông tin đúng và đồng ý để tiếp tục.')
};
Object.entries(checks).forEach(([k, fn]) => bindValidation(f[k], fn));
[d, m, y].forEach((s) => s.addEventListener('change', () => showFieldError(d, validateDob(d.value, m.value, y.value))));

// ----- Ảnh bill chuyển khoản -----
let bill = '';
$('#bill').addEventListener('change', async (e) => {
  const file = e.target.files[0], err = $('#bill-err'); bill = ''; $('#bill-prev').innerHTML = '';
  if (!file) return;
  const msg = validateImageFile(file, { maxMB: APP.MAX_IMAGE_MB, types: ['image/jpeg', 'image/png'] });
  err.textContent = msg; if (msg) return;
  bill = await compressImage(file, { maxSide: 1000, quality: 0.7 });
  $('#bill-prev').innerHTML = `<img class="proof" src="${bill}" alt="Ảnh bill đã chọn">`;
});

// ----- Gửi đăng ký -----
$('#reg-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const okFields = validateAll([...Object.entries(checks).map(([k, fn]) => [f[k], fn]), [d, () => validateDob(d.value, m.value, y.value)]]);
  if (!bill) $('#bill-err').textContent = 'Vui lòng tải ảnh bill chuyển khoản lệ phí.';
  if (!okFields || !bill) { focusFirstError(); return; }
  const btn = $('#submit-btn'); setBusy(btn, true, 'Đang gửi…');
  try {
    const code = await submitRegistration(user.uid, {
      fullName: f.fullName.value.trim(), dob: `${y.value}-${String(m.value).padStart(2, '0')}-${String(d.value).padStart(2, '0')}`, gender: $('#gender').value,
      hometown: f.hometown.value.trim(), cccd: f.cccd.value.trim(), phone: normalizePhone(f.phone.value), email: f.email.value.trim().toLowerCase(),
      craft: f.craft.value, experience: $('#experience').value.trim(), location: document.querySelector('input[name="location"]:checked').value, billImage: bill, fee: APP.CERT_FEE
    });
    // Hệ thống báo lại: đã đăng ký thành công
    $('#form-wrap').hidden = true;
    $('#success').hidden = false;
    $('#success-code').textContent = code;
    $('#success-loc').textContent = document.querySelector('input[name="location"]:checked').value;
    await loadMine();
    scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) { console.error(err); setBusy(btn, false); const a = $('.form-alert'); a.hidden = false; a.textContent = 'Có sự cố, vui lòng thử lại sau ít phút.'; }
});

// ----- Danh sách đăng ký của tôi -----
async function loadMine() {
  const list = (await myRegistrations(user.uid).catch(() => [])).sort((a, b) => b.createdAt - a.createdAt);
  $('#mine').innerHTML = list.length ? `<h2>Đăng ký của tôi</h2><div class="table-wrap"><table class="table"><thead><tr><th>Mã đăng ký</th><th>Nghề</th><th>Nơi thi</th><th>Gửi lúc</th><th>Trạng thái</th></tr></thead><tbody>
    ${list.map((r) => `<tr><td><strong>${esc(r.code)}</strong></td><td>${esc(r.craft)}</td><td>${esc(r.location)}</td><td>${formatDateTime(r.createdAt)}</td><td><span class="badge badge-gold">${REG_STATUS[r.status]}</span>${r.rejectReason ? `<br><span class="small">${esc(r.rejectReason)}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '';
}
await loadMine();
