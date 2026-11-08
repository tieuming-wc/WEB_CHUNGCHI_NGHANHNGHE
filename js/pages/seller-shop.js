/**
 * ============================================================
 *  FILE: js/pages/seller-shop.js
 *  TRANG: Thông tin gian hàng (pages/seller-shop.html) – Kênh người bán
 *  Thông tin hiển thị CÔNG KHAI trên trang sản phẩm: tên gian hàng, làng nghề, nghệ nhân,
 *  câu chuyện nghề, địa chỉ gửi hàng. Theo hướng dẫn pháp lý: KHÔNG công khai CCCD/địa chỉ nhà riêng –
 *  chỉ nhập địa chỉ kho/xưởng gửi hàng ở mức cần thiết.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { requireAuth } from '../services/session.js';
import { backend } from '../services/db.js';
import { submitSellerApplication } from '../../admin/js/admin-workflows.js';
import { toast } from '../components/toast.js';
import { VILLAGES } from '../data/villages.js';
import { validateText } from '../utils/validators.js';
import { $, esc, setBusy } from '../utils/dom.js';
import { bindValidation, validateAll } from '../utils/form.js';

const auth = await requireAuth({ roles: ['seller'] });
if (!auth) throw new Error('stop');
await initLayout({ kind: 'seller', active: 'shop', title: 'Thông tin gian hàng' });
const uid = auth.user.uid;
const shop = (await backend.get('shops', uid)) || { name: '' };

$('#village').innerHTML = '<option value="">— Chọn —</option>' + VILLAGES.map((v) => `<option ${shop.village === v ? 'selected' : ''}>${esc(v)}</option>`).join('');
$('#name').value = shop.name || ''; $('#artisan').value = shop.artisan || ''; $('#story').value = shop.story || '';
$('#address').value = shop.address || ''; $('#phone').value = shop.phone || '';

const checks = { name: () => validateText($('#name').value, 'Tên gian hàng', { min: 3, max: 60 }), artisan: () => validateText($('#artisan').value, 'Tên nghệ nhân/cơ sở', { max: 80 }),
  story: () => ($('#story').value.length > 1500 ? 'Câu chuyện tối đa 1.500 ký tự.' : '') };
Object.entries(checks).forEach(([k, fn]) => bindValidation($('#' + k), fn));

$('#shop-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateAll(Object.entries(checks).map(([k, fn]) => [$('#' + k), fn]))) return;
  const btn = $('#save-btn'); setBusy(btn, true);
  try {
    await backend.set('shops', uid, { sellerId: uid, name: $('#name').value.trim(), village: $('#village').value, artisan: $('#artisan').value.trim(), story: $('#story').value.trim(), address: $('#address').value.trim(), phone: $('#phone').value.trim(), createdAt: shop.createdAt || Date.now() }, { merge: true });
    toast('Đã lưu thông tin gian hàng. Sản phẩm đăng sau sẽ dùng tên mới.', 'success');
  } catch (err) { console.error(err); toast('Có sự cố, vui lòng thử lại.', 'error'); }
  setBusy(btn, false);
});

// [BTV-ADMIN] Hồ sơ xét duyệt chỉ chủ gian hàng và quản trị xem được.
const application = await backend.get('sellerApplications', uid).catch(() => null);
const sellerStatus = auth.profile.sellerStatus || 'pending';
$('#verify-status').textContent = sellerStatus === 'approved' ? '✅ Gian hàng đã được xác minh.' :
  application?.status === 'pending' ? '⏳ Hồ sơ đang chờ quản trị xem xét.' :
  application?.status === 'rejected' ? `❌ Hồ sơ chưa được chấp thuận: ${application.reviewReason || 'Vui lòng bổ sung minh chứng.'}` :
  'Chưa được duyệt bán hàng. Gửi hồ sơ để quản trị kiểm tra trước khi đăng sản phẩm.';
if (sellerStatus === 'approved' || application?.status === 'pending') $('#verify-form').hidden = true;
$('#verify-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const proofType = $('#proof-type').value;
  const description = $('#proof-note').value.trim();
  const proofLink = $('#proof-link').value.trim();
  if (!proofType || description.length < 20 || (proofLink && !/^https:\/\/[^\s]+$/i.test(proofLink))) {
    toast('Chọn loại minh chứng, nhập mô tả tối thiểu 20 ký tự và link HTTPS hợp lệ (nếu có).', 'error'); return;
  }
  const btn = $('#verify-submit'); setBusy(btn, true);
  try { await submitSellerApplication(uid, { proofType, description, proofLink });
    toast('Đã gửi hồ sơ, đang chờ kiểm duyệt.', 'success'); $('#verify-form').hidden = true;
    $('#verify-status').textContent = '⏳ Hồ sơ đang chờ quản trị xem xét.';
  } catch(err) { console.error(err); toast('Không gửi được hồ sơ xác minh.', 'error'); setBusy(btn, false); }
});
