/**
 * ============================================================
 *  FILE: js/pages/contact.js
 *  TRANG: Liên hệ / Hỗ trợ (pages/contact.html)
 *  Một biểu mẫu dùng cho: câu hỏi chung, liên hệ người bán, hỗ trợ đơn hàng, BÁO CÁO sản phẩm vi phạm /
 *  giả mạo / xâm phạm bản quyền (theo giải pháp pháp lý của dự án). Tin nhắn lưu vào CSDL cho quản trị xem.
 *  Các tham số ?order= ?shop= ?report= được điền sẵn từ nơi người dùng bấm vào.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { backend } from '../services/db.js';
import { APP } from '../config/app-config.js';
import { mountCaptcha } from '../components/captcha.js';
import { $, qs, setBusy, esc } from '../utils/dom.js';
import { validateName, validateEmail, validateText } from '../utils/validators.js';
import { bindValidation, validateAll } from '../utils/form.js';
import { MSG } from '../utils/messages.js';

const session = await initLayout({ active: '', title: 'Liên hệ / Hỗ trợ' });
$('#support-mail').innerHTML = `<a href="mailto:${esc(APP.SUPPORT_EMAIL)}">${esc(APP.SUPPORT_EMAIL)}</a> · ${esc(APP.SUPPORT_PHONE)}<br>${esc(APP.ADDRESS)}`;

// Điền sẵn theo ngữ cảnh
let ref = '', type = 'Câu hỏi chung', pre = '';
if (qs('report')) { type = 'Báo cáo sản phẩm vi phạm'; ref = 'Sản phẩm ' + qs('report'); pre = `Tôi muốn báo cáo sản phẩm "${qs('product') || ''}" vì: `; }
else if (qs('order')) { type = 'Hỗ trợ đơn hàng'; ref = 'Đơn ' + qs('order'); }
else if (qs('shop')) { type = 'Liên hệ người bán'; ref = 'Gian hàng ' + qs('shop'); pre = `Tôi muốn hỏi về sản phẩm "${qs('product') || ''}": `; }
$('#type').value = type; $('#message').value = pre;
if (session) { $('#name').value = session.profile?.name || ''; $('#email').value = session.profile?.email || session.user.email; }
if (ref) { $('#ref').hidden = false; $('#ref').textContent = 'Nội dung liên quan: ' + ref; }

const captcha = mountCaptcha($('#captcha'));
const f = { name: $('#name'), email: $('#email'), message: $('#message') };
const checks = { name: () => validateName(f.name.value), email: () => validateEmail(f.email.value), message: () => validateText(f.message.value, 'Nội dung', { min: 10, max: 1500 }) };
Object.entries(checks).forEach(([k, fn]) => bindValidation(f[k], fn));

$('#contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateAll(Object.entries(checks).map(([k, fn]) => [f[k], fn])) | !captcha.check()) return;
  const btn = $('#submit-btn'); setBusy(btn, true, 'Đang gửi…');
  try {
    await backend.add('supportTickets', { type: $('#type').value, name: f.name.value.trim(), email: f.email.value.trim(), message: f.message.value.trim(), ref, userId: session?.user.uid || '', createdAt: Date.now() });
    $('#contact-form').hidden = true; $('#done').hidden = false;
  } catch (err) { console.error(err); setBusy(btn, false); captcha.reset(); const a = $('.form-alert'); a.hidden = false; a.textContent = MSG.system; }
});
