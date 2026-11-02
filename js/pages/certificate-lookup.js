/**
 * ============================================================
 *  FILE: js/pages/certificate-lookup.js
 *  TRANG: Tra cứu chứng nhận (pages/certificate-lookup.html) – công khai, không cần đăng nhập
 *  Nhập mã (hoặc quét QR dẫn tới ?code=...) → hiện: họ tên (che bớt), nghề, cấp độ, ngày cấp,
 *  hiệu lực, đơn vị đánh giá/cấp. Luôn kèm cảnh báo: đây là chứng nhận NỘI BỘ của nền tảng.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { lookupCertificate } from '../services/certs.js';
import { $, esc, qs, setBusy } from '../utils/dom.js';
import { formatDate, maskName } from '../utils/format.js';

await initLayout({ active: 'certificate', title: 'Tra cứu chứng nhận' });
const input = $('#code');
const out = $('#result');

async function search(code) {
  code = code.trim().toUpperCase();
  if (!code) { $('#code-err').textContent = 'Vui lòng nhập mã chứng nhận.'; return; }
  $('#code-err').textContent = '';
  const btn = $('#search-btn'); setBusy(btn, true, 'Đang tra cứu…');
  try {
    const c = await lookupCertificate(code);
    out.innerHTML = !c ? `<div class="alert alert-error"><strong>Không tìm thấy chứng nhận có mã ${esc(code)}.</strong><p>Hãy kiểm tra lại mã. Nếu bạn nghi ngờ chứng nhận giả, vui lòng <a href="../pages/contact.html">báo cho chúng tôi</a>.</p></div>`
      : `<div class="card cert-card"><p class="badge ${c.status === 'valid' ? 'badge-green' : 'badge-red'}">${c.status === 'valid' ? '✔ Còn hiệu lực' : '✖ Đã thu hồi / hết hiệu lực'}</p>
        <h2>${esc(c.code)}</h2>
        <dl class="specs"><dt>Họ tên</dt><dd>${esc(maskName(c.holderName))}</dd><dt>Nghề được đánh giá</dt><dd>${esc(c.craft)}</dd><dt>Cấp độ</dt><dd>${esc(c.level)}</dd>
        <dt>Ngày cấp</dt><dd>${formatDate(c.issuedAt)}</dd><dt>Đánh giá viên</dt><dd>${esc(c.assessor || '—')}</dd><dt>Đơn vị cấp</dt><dd>${esc(c.issuer)}</dd></dl></div>`;
  } catch (e) { console.error(e); out.innerHTML = '<div class="alert alert-error">Có sự cố khi tra cứu, vui lòng thử lại.</div>'; }
  setBusy(btn, false);
}
$('#lookup-form').addEventListener('submit', (e) => { e.preventDefault(); search(input.value); });
if (qs('code')) { input.value = qs('code'); search(qs('code')); }
