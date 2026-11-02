/**
 * ============================================================
 *  FILE: js/pages/checkout.js
 *  TRANG: Đặt hàng & thanh toán (pages/checkout.html) – chỉ người mua
 *  Nguồn sản phẩm: từ giỏ hàng (?from=cart) hoặc "Mua ngay" (?now=&v=&q=).
 *  Bám đặc tả mục 6: địa chỉ nhận hàng, ghi chú cho từng người bán, phương thức thanh toán
 *  (COD / chuyển khoản trước), giỏ nhiều gian hàng → TÁCH thành nhiều đơn, khóa nút khi đang xử lý
 *  (tránh tạo đơn trùng), cảnh báo nếu giá thay đổi.
 * ============================================================
 */
import { initLayout, refreshCartBadge } from '../components/layout.js';
import { requireAuth } from '../services/session.js';
import { resolveCart, removeLines } from '../services/cart.js';
import { getProduct, variantsOf, totalStock } from '../services/products.js';
import { createOrders, PAY_METHOD } from '../services/orders.js';
import { getState, patchState } from '../services/userstate.js';
import { flash } from '../components/toast.js';
import { APP } from '../config/app-config.js';
import { $, esc, qs, setBusy, focusFirstError } from '../utils/dom.js';
import { formatVND } from '../utils/format.js';
import { goto, pageUrl } from '../utils/paths.js';
import { validateName, validatePhone, validateText, normalizePhone } from '../utils/validators.js';
import { bindValidation, validateAll } from '../utils/form.js';

const auth = await requireAuth({ roles: ['buyer'] });
if (!auth) throw new Error('stop');
await initLayout({ active: 'shop', title: 'Đặt hàng' });
const { user, profile } = auth;

// ----- 1. Xác định các dòng cần đặt -----
let lines = [];
let priceSnapshot = null;                                        // giá lúc người mua xem ở giỏ hàng
if (qs('now')) {                                                  // "Mua ngay"
  const p = await getProduct(qs('now')).catch(() => null);
  const v = p ? variantsOf(p).find((x) => x.id === qs('v')) : null;
  const q = Number(qs('q')) || 1;
  let problem = '';
  if (!p || p.status !== 'visible') problem = 'Sản phẩm đã ngừng bán';
  else if (!v || v.stock <= 0 || totalStock(p) <= 0) problem = 'Hết hàng';
  else if (q > v.stock) problem = `Chỉ còn ${v.stock} sản phẩm`;
  lines = p ? [{ productId: p.id, variantId: qs('v'), qty: q, key: p.id + '|' + qs('v'), product: p, variant: v, problem, price: v?.price || 0 }] : [];
} else {                                                          // từ giỏ hàng
  const saved = JSON.parse(sessionStorage.getItem('btv_checkout') || 'null');
  if (!saved) { goto('pages/cart.html'); throw new Error('stop'); }
  priceSnapshot = saved.prices;
  lines = (await resolveCart()).filter((l) => saved.keys.includes(l.key));
}
if (!lines.length) { $('#checkout').innerHTML = `<div class="empty-state"><p>Không có sản phẩm nào để đặt hàng.</p><a class="btn btn-primary" href="${pageUrl('shop')}">Tiếp tục mua sắm</a></div>`; throw new Error('stop'); }

const bad = lines.filter((l) => l.problem);
const good = lines.filter((l) => !l.problem);

// Nhóm theo gian hàng (mỗi gian hàng = 1 đơn)
const groups = new Map();
good.forEach((l) => { const k = l.product.sellerId; if (!groups.has(k)) groups.set(k, { shop: l.product.shopName, lines: [] }); groups.get(k).lines.push(l); });
const itemsTotal = good.reduce((s, l) => s + l.price * l.qty, 0);
const shipTotal = groups.size * APP.SHIP_FEE;

// Phát hiện giá đã thay đổi so với lúc xem ở giỏ
const changed = priceSnapshot ? good.filter((l) => priceSnapshot[l.key] !== undefined && priceSnapshot[l.key] !== l.price) : [];
let needReconfirm = changed.length > 0;

// ----- 2. Vẽ giao diện -----
const addr = getState().address || { name: profile.name, phone: profile.phone || '', detail: '' };
$('#checkout').innerHTML = `
  ${bad.length ? `<div class="alert alert-warn"><strong>Một số sản phẩm không thể đặt:</strong><ul>${bad.map((l) => `<li>${esc(l.product?.name || 'Sản phẩm')} – ${esc(l.problem)}</li>`).join('')}</ul><p>Các sản phẩm này sẽ được bỏ qua.</p></div>` : ''}
  ${changed.length ? `<div class="alert alert-warn" id="price-alert"><strong>Giá sản phẩm đã thay đổi.</strong> Vui lòng kiểm tra lại trước khi đặt hàng (giá mới đã được cập nhật bên dưới), sau đó bấm Đặt hàng lần nữa.</div>` : ''}
  <form id="order-form" novalidate class="checkout-grid">
    <div>
      <section class="card"><h2>📍 Địa chỉ nhận hàng</h2>
        <div class="field"><label for="a-name">Họ tên người nhận <span class="req">*</span></label><input id="a-name" type="text" value="${esc(addr.name)}" autocomplete="name"><p class="field-error"></p></div>
        <div class="field"><label for="a-phone">Số điện thoại <span class="req">*</span></label><input id="a-phone" type="tel" value="${esc(addr.phone)}" autocomplete="tel" placeholder="0912345678 hoặc +84912345678"><p class="field-error"></p></div>
        <div class="field"><label for="a-detail">Địa chỉ chi tiết <span class="req">*</span></label><textarea id="a-detail" rows="2" autocomplete="street-address" placeholder="Số nhà, đường, xã/phường, tỉnh/thành phố">${esc(addr.detail)}</textarea><p class="field-error"></p></div>
      </section>
      ${[...groups.entries()].map(([sid, g]) => `
      <section class="card"><h2>🏺 ${esc(g.shop)}</h2>
        ${g.lines.map((l) => `<div class="co-line"><img src="${esc(l.product.images?.[0] || '')}" alt=""><div><strong>${esc(l.product.name)}</strong>${l.variant.name ? `<p class="muted small">Phiên bản: ${esc(l.variant.name)}</p>` : ''}
          ${l.product.mode === 'made_to_order' ? `<p class="small"><span class="badge badge-gold">Làm theo đơn</span> Chế tác ${l.product.prepDays || 0} ngày, giao dự kiến sau khoảng ${(l.product.prepDays || 0) + 3} ngày kể từ khi người bán nhận đơn.</p>` : ''}</div>
          <span>${formatVND(l.price)} × ${l.qty}</span><strong>${formatVND(l.price * l.qty)}</strong></div>`).join('')}
        <div class="field"><label for="note-${esc(sid)}">Ghi chú cho người bán</label><input id="note-${esc(sid)}" data-note="${esc(sid)}" type="text" maxlength="200" placeholder="Ví dụ: đóng gói kỹ giúp mình"></div>
        <p class="muted small">Vận chuyển: Giao hàng tiêu chuẩn · ${formatVND(APP.SHIP_FEE)}</p>
      </section>`).join('')}
      <section class="card"><h2>💳 Phương thức thanh toán</h2>
        <div class="radio-stack">
          <label class="radio-card"><input type="radio" name="pay" value="cod" checked> <span><strong>${PAY_METHOD.cod}</strong><br><span class="muted small">Trả tiền mặt cho shipper khi nhận hàng. Đơn vào “Chờ xác nhận”.</span></span></label>
          <label class="radio-card"><input type="radio" name="pay" value="bank"> <span><strong>${PAY_METHOD.bank}</strong><br><span class="muted small">Chuyển khoản trong ${APP.PAY_DEADLINE_HOURS} giờ kể từ khi đặt, nếu quá hạn đơn tự hủy.</span></span></label>
        </div>
      </section>
    </div>
    <aside class="card summary">
      <h2>Tóm tắt đơn hàng</h2>
      <dl class="sum"><dt>Tiền hàng</dt><dd>${formatVND(itemsTotal)}</dd><dt>Phí vận chuyển (${groups.size} gian hàng)</dt><dd>${formatVND(shipTotal)}</dd><dt>Giảm giá</dt><dd>0đ</dd></dl>
      <p class="sum-total"><span>Tổng thanh toán</span><strong>${formatVND(itemsTotal + shipTotal)}</strong></p>
      ${groups.size > 1 ? `<p class="small muted">Giỏ có ${groups.size} gian hàng nên sẽ tách thành ${groups.size} đơn riêng, mỗi đơn có mã, phí vận chuyển và trạng thái riêng.</p>` : ''}
      <div class="form-alert alert alert-error" hidden role="alert"></div>
      <button class="btn btn-primary btn-lg btn-block" id="place-btn" type="submit" ${good.length ? '' : 'disabled'}>Đặt hàng</button>
      <p class="small muted center">Bằng việc đặt hàng, bạn đồng ý với <a href="${pageUrl('terms')}" target="_blank">Điều khoản</a> và <a href="${pageUrl('returns')}" target="_blank">chính sách đổi trả</a>.</p>
    </aside>
  </form>`;

// ----- 3. Kiểm tra & gửi đơn -----
const f = { name: $('#a-name'), phone: $('#a-phone'), detail: $('#a-detail') };
const checks = {
  name: () => validateName(f.name.value, 'Họ tên người nhận'),
  phone: () => validatePhone(f.phone.value, { required: true }),
  detail: () => validateText(f.detail.value, 'Địa chỉ', { min: 10, max: 250 })
};
Object.entries(checks).forEach(([k, fn]) => bindValidation(f[k], fn));

$('#order-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertBox = $('.form-alert'); alertBox.hidden = true;
  if (!validateAll(Object.entries(checks).map(([k, fn]) => [f[k], fn]))) { focusFirstError(); return; }
  if (needReconfirm) { needReconfirm = false; $('#price-alert')?.scrollIntoView({ behavior: 'smooth' }); $('#place-btn').textContent = 'Xác nhận đặt hàng'; return; }

  const btn = $('#place-btn'); setBusy(btn, true, 'Đang xử lý…');   // khóa nút để không tạo đơn trùng
  try {
    const address = { name: f.name.value.trim(), phone: normalizePhone(f.phone.value), detail: f.detail.value.trim() };
    const notes = {}; document.querySelectorAll('[data-note]').forEach((i) => { notes[i.dataset.note] = i.value.trim(); });
    const payMethod = document.querySelector('input[name="pay"]:checked').value;
    const orders = await createOrders({ buyer: { uid: user.uid, name: profile.name }, lines: good, address, payMethod, notes });

    await patchState({ address });                               // nhớ địa chỉ cho lần sau
    if (!qs('now')) { await removeLines(good.map((l) => l.key)); sessionStorage.removeItem('btv_checkout'); refreshCartBadge(); }
    flash(orders.length > 1 ? `Đặt hàng thành công! Đã tạo ${orders.length} đơn.` : 'Đặt hàng thành công!', 'success');
    goto(orders.length === 1 ? `pages/order-detail.html?id=${orders[0].id}` : 'pages/orders.html');
  } catch (error) {
    setBusy(btn, false);
    alertBox.hidden = false;
    alertBox.textContent = ['out-of-stock', 'unavailable', 'variant-missing'].includes(error.code) ? error.message + ' Vui lòng quay lại kiểm tra.' : 'Có sự cố, vui lòng thử lại sau ít phút.';
    if (!['out-of-stock', 'unavailable', 'variant-missing'].includes(error.code)) console.error(error);
  }
});
