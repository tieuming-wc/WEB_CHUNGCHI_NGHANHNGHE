/**
 * ============================================================
 *  FILE: js/pages/order-detail.js
 *  TRANG: Chi tiết đơn hàng (pages/order-detail.html?id=...) – dùng chung cho NGƯỜI MUA, NGƯỜI BÁN, QUẢN TRỊ
 *  Các nút chỉ xuất hiện đúng theo trạng thái (đặc tả mục 7–9). Mọi thao tác kiểm tra lại trạng thái
 *  mới nhất; nếu đơn đã đổi thì báo "Trạng thái đơn đã thay đổi" và tải lại.
 *  Chứa: tiến trình đơn, địa chỉ, sản phẩm (giá chốt lúc đặt), thanh toán (QR/chuyển khoản), lịch sử,
 *  hủy/yêu cầu hủy, bàn giao vận chuyển, xác nhận đã nhận, đánh giá, trả hàng/hoàn tiền.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { getSession } from '../services/session.js';
import * as O from '../services/orders.js';
import { openModal, confirmDialog, promptReason } from '../components/modal.js';
import { toast, flash } from '../components/toast.js';
import { addToCart } from '../services/cart.js';
import { getProduct, variantsOf } from '../services/products.js';
import { APP } from '../config/app-config.js';
import { compressImage, validateImageFile } from '../utils/image.js';
import { $, $$, esc, qs, on, setBusy } from '../utils/dom.js';
import { formatVND, formatDateTime } from '../utils/format.js';
import { pageUrl, goto, gotoLogin } from '../utils/paths.js';
import { renderStars } from '../components/product-card.js';

const s0 = await getSession();
if (!s0) { gotoLogin(); throw new Error('stop'); }
const role = s0.profile?.role;
await initLayout({ kind: role === 'seller' ? 'seller' : role === 'admin' ? 'admin' : 'public', active: role === 'seller' ? 'orders' : 'shop', title: 'Chi tiết đơn hàng' });
const uid = s0.user.uid;
const root = $('#order');
let order = null;

async function load() {
  try { order = await O.getOrder(qs('id')); } catch { order = null; }
  const allowed = order && (order.buyerId === uid || order.sellerId === uid || role === 'admin');
  if (!allowed) { root.innerHTML = '<div class="empty-state"><p>Không tìm thấy đơn hàng.</p><a class="btn btn-primary" href="' + pageUrl(role === 'seller' ? 'seller-orders' : 'orders') + '">Quay lại danh sách</a></div>'; return; }
  render();
}

const isBuyer = () => order.buyerId === uid;
const isSeller = () => order.sellerId === uid;

/** Thanh tiến trình đơn */
function progress() {
  if (order.status === 'cancelled') return `<div class="alert alert-error"><strong>Đơn đã hủy</strong> lúc ${formatDateTime(order.cancel?.at)} bởi ${{ buyer: 'người mua', seller: 'người bán', system: 'hệ thống' }[order.cancel?.by] || ''}. Lý do: ${esc(order.cancel?.reason || '')}</div>`;
  const steps = [['Đặt hàng', true], ['Xác nhận', !['pending_payment', 'pending_confirm'].includes(order.status)], ['Chuẩn bị', ['shipping', 'delivered', 'completed'].includes(order.status)],
    ['Bàn giao vận chuyển', ['shipping', 'delivered', 'completed'].includes(order.status)], ['Giao thành công', ['delivered', 'completed'].includes(order.status)], ['Hoàn thành', order.status === 'completed']];
  return `<ol class="steps">${steps.map(([l, done]) => `<li class="${done ? 'done' : ''}"><span>${done ? '✔' : ''}</span>${l}</li>`).join('')}</ol>`;
}

/** Khối thanh toán chuyển khoản (chỉ người mua, chờ thanh toán) */
function bankPanel() {
  const b = APP.BANK;
  const qr = b.ACCOUNT_NO ? `<img class="qr" alt="Mã QR chuyển khoản" src="https://img.vietqr.io/image/${encodeURIComponent(b.BIN)}-${encodeURIComponent(b.ACCOUNT_NO)}-compact2.png?amount=${order.total}&addInfo=${encodeURIComponent(order.id)}&accountName=${encodeURIComponent(b.ACCOUNT_NAME)}" onerror="this.remove()">` : '';
  return `<section class="card"><h2>Thanh toán chuyển khoản</h2>
    <div class="grid-2"><div>
      <p>Số tiền: <strong class="p-price">${formatVND(order.total)}</strong></p>
      <p>Nội dung chuyển khoản: <strong>${esc(order.id)}</strong></p>
      ${b.ACCOUNT_NO ? `<p>${esc(b.BANK_LABEL)} · STK <strong>${esc(b.ACCOUNT_NO)}</strong><br>Chủ tài khoản: ${esc(b.ACCOUNT_NAME)}</p>` : '<p class="alert alert-warn">Quản trị website chưa cấu hình số tài khoản nhận tiền (js/config/app-config.js). Vui lòng liên hệ hỗ trợ.</p>'}
      <p>Hạn thanh toán: <strong>${formatDateTime(order.payDeadline)}</strong></p></div>${qr}</div>
    ${order.payStatus === 'proof' ? `<div class="alert alert-info">Đã gửi chứng từ – đang chờ hệ thống xác nhận đã nhận tiền.</div><img class="proof" src="${esc(order.proofImage)}" alt="Ảnh chuyển khoản đã gửi">`
      : `<div class="field"><label for="proof">Tải ảnh chụp màn hình chuyển khoản (JPG/PNG, ≤ ${APP.MAX_IMAGE_MB}MB)</label><input id="proof" type="file" accept="image/jpeg,image/png"><p class="field-error" id="proof-err"></p></div>
         <button class="btn btn-primary" id="send-proof">Tôi đã chuyển khoản</button>`}</section>`;
}

function render() {
  const o = order;
  const buyerView = isBuyer();
  root.innerHTML = `
  <p class="breadcrumb"><a href="${pageUrl(role === 'seller' ? 'seller-orders' : role === 'admin' ? 'admin' : 'orders')}">← Danh sách đơn</a></p>
  <div class="row row-between"><h1>Đơn ${esc(o.id)}</h1>
    <div><span class="badge badge-gold">${O.STATUS[o.status]}</span> <span class="badge badge-gray">${O.PAY[o.payStatus]}</span>${o.returnReq ? ` <span class="badge badge-blue">Trả hàng: ${O.RETURN_STATUS[o.returnReq.status]}</span>` : ''}</div></div>
  ${progress()}
  ${o.status === 'delivered' && o.payStatus !== 'paid' ? '<div class="alert alert-warn">Đã giao — thanh toán đang chờ xác nhận. Đơn chưa thể hoàn thành.</div>' : ''}
  ${o.cancelRequest ? `<div class="alert alert-info">Yêu cầu hủy: <strong>${{ pending: 'Đang chờ xử lý yêu cầu hủy', approved: 'Đã chấp thuận', rejected: 'Bị từ chối' }[o.cancelRequest.status]}</strong> – lý do của người mua: ${esc(o.cancelRequest.reason)}${o.cancelRequest.rejectReason ? `<br>Người bán từ chối vì: ${esc(o.cancelRequest.rejectReason)}` : ''}</div>` : ''}
  ${o.status === 'awaiting_shipment' && o.handoverDue ? `<p class="muted">Hạn bàn giao dự kiến: <strong>${formatDateTime(o.handoverDue)}</strong>${Date.now() > o.handoverDue && isSeller() ? ' <span class="badge badge-red">Quá hạn bàn giao</span>' : ''}</p>` : ''}
  ${o.tracking ? `<p>🚚 Vận chuyển: <strong>${esc(o.tracking.carrier)}</strong> · Mã vận đơn <strong>${esc(o.tracking.code)}</strong></p>` : ''}

  ${buyerView && o.status === 'pending_payment' && o.payMethod === 'bank' ? bankPanel() : ''}

  <div class="grid-2">
    <section class="card"><h2>📍 Nhận hàng</h2><p><strong>${esc(o.address.name)}</strong><br>${esc(o.address.phone)}<br>${esc(o.address.detail)}</p>
      ${o.note ? `<p class="muted">Ghi chú của người mua: ${esc(o.note)}</p>` : ''}
      <p class="muted small">Gian hàng: ${esc(o.shopName)} · Người mua: ${esc(o.buyerName)}</p></section>
    <section class="card"><h2>💳 Thanh toán</h2>
      <dl class="sum"><dt>Phương thức</dt><dd>${O.PAY_METHOD[o.payMethod]}</dd><dt>Tiền hàng</dt><dd>${formatVND(o.itemsTotal)}</dd><dt>Phí vận chuyển</dt><dd>${formatVND(o.shipFee)}</dd><dt>Giảm giá</dt><dd>${formatVND(o.discount)}</dd></dl>
      <p class="sum-total"><span>Tổng tiền đã chốt</span><strong>${formatVND(o.total)}</strong></p>
      <p class="small muted">Giá, phiên bản và số lượng giữ theo thời điểm đặt, không đổi khi người bán sửa sản phẩm.</p></section>
  </div>

  <section class="card"><h2>Sản phẩm</h2>
    ${o.items.map((i) => `<div class="co-line"><img src="${esc(i.image)}" alt=""><div><a href="${pageUrl('product', { id: i.productId })}"><strong>${esc(i.name)}</strong></a>${i.variantName ? `<p class="muted small">Phiên bản: ${esc(i.variantName)}</p>` : ''}</div><span>${formatVND(i.price)} × ${i.qty}</span><span class="right">
      <strong>${formatVND(i.price * i.qty)}</strong>
      ${buyerView && o.status === 'completed' ? (O.hasReviewed(o, i) ? '<br><span class="badge badge-green">Đã đánh giá</span>' : `<br><button class="btn btn-ghost btn-sm" data-review="${esc(i.productId)}|${esc(i.variantId)}">Đánh giá</button>`) : ''}</span></div>`).join('')}
  </section>

  ${o.returnReq ? `<section class="card"><h2>Yêu cầu trả hàng / hoàn tiền</h2><p>Hình thức: <strong>${o.returnReq.kind === 'return' ? 'Trả hàng rồi hoàn tiền' : 'Hoàn tiền không cần trả hàng'}</strong> · Trạng thái: <span class="badge badge-blue">${O.RETURN_STATUS[o.returnReq.status]}</span></p>
    <p>Lý do: ${esc(o.returnReq.reason)}${o.returnReq.desc ? ' – ' + esc(o.returnReq.desc) : ''}</p><p>Số tiền yêu cầu: ${formatVND(o.returnReq.amount)}</p>
    ${o.returnReq.image ? `<img class="proof" src="${esc(o.returnReq.image)}" alt="Minh chứng">` : ''}${o.returnReq.sellerNote ? `<p>Người bán từ chối: ${esc(o.returnReq.sellerNote)}</p>` : ''}</section>` : ''}

  <section class="card"><h2>Hành động</h2><div class="row" id="actions">${actions()}</div></section>
  <section class="card"><h2>Lịch sử đơn hàng</h2><ul class="history">${[...(o.history || [])].reverse().map((h) => `<li><span class="muted small">${formatDateTime(h.t)} · ${{ buyer: 'Người mua', seller: 'Người bán', admin: 'Hệ thống', system: 'Hệ thống' }[h.by] || h.by}</span><br>${esc(h.action)}</li>`).join('')}</ul></section>`;
}

/** Các nút theo vai trò + trạng thái (không đúng điều kiện thì ẩn) */
function actions() {
  const o = order, b = [];
  const btn = (id, label, cls = 'btn-ghost') => b.push(`<button class="btn ${cls}" data-act="${id}">${label}</button>`);
  if (isBuyer()) {
    if (o.status === 'pending_payment') btn('cancel', 'Hủy đơn', 'btn-danger');
    if (o.status === 'pending_confirm') { btn('cancel', 'Hủy đơn', 'btn-danger'); btn('contact', 'Liên hệ người bán'); }
    if (o.status === 'awaiting_shipment') o.cancelRequest?.status === 'pending' ? b.push('<span class="badge badge-gold">Đang chờ xử lý yêu cầu hủy</span>') : btn('reqcancel', 'Yêu cầu hủy', 'btn-danger');
    if (o.status === 'shipping') btn('support', 'Yêu cầu hỗ trợ');
    if (o.status === 'delivered') { btn('received', '✔ Đã nhận hàng', 'btn-primary'); btn('support', 'Yêu cầu hỗ trợ'); }
    if (O.canRequestReturn(o)) btn('return', 'Trả hàng / Hoàn tiền');
    else if (['delivered', 'completed'].includes(o.status) && !o.returnReq) b.push(`<span class="muted small">Đã quá hạn yêu cầu trả hàng (${formatDateTime(O.returnDeadline(o))}). <a href="${pageUrl('contact')}">Liên hệ hỗ trợ</a></span>`);
    if (['completed', 'cancelled'].includes(o.status)) btn('rebuy', 'Mua lại');
    if (['delivered', 'completed'].includes(o.status) && o.status === 'delivered' && !o.returnReq) b.push(`<span class="muted small">Có thể yêu cầu trả hàng đến ${formatDateTime(O.returnDeadline(o))}</span>`);
  }
  if (isSeller()) {
    if (o.status === 'pending_confirm') { btn('confirm', 'Xác nhận đơn', 'btn-primary'); btn('reject', 'Từ chối', 'btn-danger'); }
    if (o.status === 'awaiting_shipment') {
      if (o.cancelRequest?.status === 'pending') { btn('cancel-ok', 'Chấp thuận hủy', 'btn-danger'); btn('cancel-no', 'Từ chối yêu cầu hủy'); }
      else btn('handover', '🚚 Bàn giao vận chuyển', 'btn-primary');
    }
    if (o.returnReq?.status === 'pending') { btn('ret-ok', 'Chấp thuận trả hàng/hoàn tiền', 'btn-primary'); btn('ret-no', 'Từ chối'); }
  }
  if (role === 'admin') {
    if (o.payStatus === 'proof') btn('a-pay', 'Xác nhận đã nhận tiền', 'btn-primary');
    if (o.status === 'shipping') btn('a-delivered', 'Xác nhận giao thành công', 'btn-primary');
    if (o.payMethod === 'cod' && o.payStatus === 'unpaid' && ['delivered', 'completed'].includes(o.status)) btn('a-cod', 'Xác nhận đã thu tiền COD', 'btn-primary');
    if (o.payStatus === 'refund_pending') btn('a-refund', 'Xác nhận đã hoàn tiền', 'btn-primary');
  }
  return b.join('') || '<span class="muted">Không có thao tác nào khả dụng ở trạng thái này.</span>';
}

/** Chạy một thao tác: khóa nút, xử lý lỗi "stale" (đơn đã đổi) bằng cách tải lại */
async function run(fn, okMsg) {
  try { await fn(); if (okMsg) toast(okMsg, 'success'); }
  catch (e) {
    if (e.code === 'stale') toast(e.message, 'error'); else if (['unpaid', 'dup', 'late', 'expired', 'cancel-pending', 'reason'].includes(e.code)) toast(e.message, 'error');
    else { console.error(e); toast('Có sự cố, vui lòng thử lại sau ít phút.', 'error'); }
  }
  await load();
}

on(root, 'click', '[data-act]', async (e, el) => {
  const a = el.dataset.act, id = order.id;
  const CANCEL_REASONS = ['Muốn thay đổi địa chỉ nhận hàng', 'Muốn đổi sản phẩm / phiên bản', 'Đặt nhầm', 'Tìm được giá tốt hơn', 'Không còn nhu cầu'];
  if (a === 'cancel') { const r = await promptReason({ title: 'Hủy đơn hàng', options: CANCEL_REASONS, confirmText: 'Hủy đơn' }); if (r) await run(() => O.buyerCancel(id, r), 'Đã hủy đơn.'); }
  else if (a === 'reqcancel') { const r = await promptReason({ title: 'Yêu cầu hủy đơn', message: 'Yêu cầu chưa hủy ngay — đơn chỉ hủy khi người bán chấp thuận.', options: CANCEL_REASONS, confirmText: 'Gửi yêu cầu' }); if (r) await run(() => O.buyerRequestCancel(id, r), 'Yêu cầu hủy đã được gửi. Đơn chưa được hủy cho đến khi có xác nhận.'); }
  else if (a === 'received') { if (await confirmDialog({ title: 'Xác nhận đã nhận hàng', message: 'Bạn xác nhận đã nhận đủ hàng và hàng đúng như mô tả?', confirmText: 'Đã nhận hàng' })) await run(() => O.buyerConfirmReceived(id), 'Cảm ơn bạn! Đơn hàng đã hoàn thành.'); }
  else if (a === 'rebuy') await rebuy();
  else if (a === 'return') openReturnForm();
  else if (a === 'contact' || a === 'support') goto(`pages/contact.html?order=${encodeURIComponent(id)}`);
  else if (a === 'confirm') { if (await confirmDialog({ title: 'Xác nhận đơn', message: 'Bạn xác nhận nhận đơn này và sẽ chuẩn bị/chế tác hàng?', confirmText: 'Xác nhận' })) await run(() => O.sellerConfirm(id), 'Đã xác nhận đơn.'); }
  else if (a === 'reject') { const r = await promptReason({ title: 'Từ chối đơn', options: ['Hết hàng', 'Không đủ năng lực chế tác theo hạn', 'Thông tin đơn không hợp lệ'], confirmText: 'Từ chối đơn' }); if (r) await run(() => O.sellerReject(id, r), 'Đã từ chối đơn.'); }
  else if (a === 'handover') openHandover();
  else if (a === 'cancel-ok') { if (await confirmDialog({ title: 'Chấp thuận hủy', message: 'Hãy chắc chắn hàng CHƯA bàn giao cho vận chuyển. Đơn sẽ bị hủy và hàng giữ được trả lại kho.', confirmText: 'Chấp thuận', danger: true })) await run(() => O.sellerDecideCancel(id, true), 'Đã chấp thuận hủy.'); }
  else if (a === 'cancel-no') { const r = await promptReason({ title: 'Từ chối yêu cầu hủy', confirmText: 'Từ chối', danger: false }); if (r) await run(() => O.sellerDecideCancel(id, false, r), 'Đã từ chối yêu cầu hủy.'); }
  else if (a === 'ret-ok') { if (await confirmDialog({ title: 'Chấp thuận trả hàng/hoàn tiền', message: 'Đơn sẽ chuyển sang chờ hoàn tiền.', confirmText: 'Chấp thuận' })) await run(() => O.sellerDecideReturn(id, true), 'Đã chấp thuận.'); }
  else if (a === 'ret-no') { const r = await promptReason({ title: 'Từ chối trả hàng/hoàn tiền', confirmText: 'Từ chối' }); if (r) await run(() => O.sellerDecideReturn(id, false, r), 'Đã từ chối.'); }
  else if (a === 'a-pay') await run(() => O.adminConfirmPayment(id), 'Đã xác nhận thanh toán.');
  else if (a === 'a-delivered') await run(() => O.adminMarkDelivered(id), 'Đã xác nhận giao thành công.');
  else if (a === 'a-cod') await run(() => O.adminCollectCod(id), 'Đã xác nhận thu tiền COD.');
  else if (a === 'a-refund') await run(() => O.adminRefund(id), 'Đã xác nhận hoàn tiền.');
});

// ----- Gửi ảnh chuyển khoản -----
on(root, 'click', '#send-proof', async (e, btn) => {
  const input = $('#proof'), err = $('#proof-err'); err.textContent = '';
  const file = input.files[0];
  const msg = validateImageFile(file, { maxMB: APP.MAX_IMAGE_MB, types: ['image/jpeg', 'image/png'] });
  if (msg) { err.textContent = file ? msg : 'Vui lòng chọn ảnh chụp chuyển khoản.'; return; }
  setBusy(btn, true);
  const image = await compressImage(file, { maxSide: 1000, quality: 0.7 });
  await run(() => O.buyerSubmitProof(order.id, image), 'Đã gửi chứng từ. Vui lòng chờ xác nhận.');
});

// ----- Bàn giao vận chuyển (người bán) -----
function openHandover() {
  const { el, close } = openModal(`
    <div class="field"><label for="carrier">Đơn vị vận chuyển <span class="req">*</span></label><select id="carrier"><option value="">— Chọn —</option><option>Giao Hàng Nhanh</option><option>Giao Hàng Tiết Kiệm</option><option>Viettel Post</option><option>J&T Express</option><option>Khác</option></select><p class="field-error"></p></div>
    <div class="field"><label for="track">Mã vận đơn <span class="req">*</span></label><input id="track" type="text" maxlength="40"><p class="field-error"></p></div>
    <p class="small muted">Đơn chỉ chuyển sang "Đang giao" khi bạn đã bàn giao thật cho đơn vị vận chuyển. ${order.items.some((i) => i.made) ? '' : ''}</p>
    <div class="modal-actions"><button class="btn btn-ghost" data-x>Hủy</button><button class="btn btn-primary" data-ok>Xác nhận bàn giao</button></div>`, { title: 'Bàn giao vận chuyển' });
  $('[data-x]', el).onclick = close;
  $('[data-ok]', el).onclick = async (ev) => {
    const c = $('#carrier', el), t = $('#track', el); let ok = true;
    [[c, 'Vui lòng chọn đơn vị vận chuyển.'], [t, 'Vui lòng nhập mã vận đơn.']].forEach(([i, m]) => { const bad = !i.value.trim(); i.closest('.field').querySelector('.field-error').textContent = bad ? m : ''; if (bad) ok = false; });
    if (!ok) return;
    setBusy(ev.target, true); close();
    await run(() => O.sellerHandover(order.id, c.value, t.value.trim()), 'Đã bàn giao vận chuyển.');
  };
}

// ----- Đánh giá sản phẩm -----
on(root, 'click', '[data-review]', (e, el) => {
  const [pid, vid] = el.dataset.review.split('|');
  const item = order.items.find((i) => i.productId === pid && i.variantId === vid);
  let rating = 0, images = [];
  const { el: m, close } = openModal(`
    <p><strong>${esc(item.name)}</strong></p>
    <div class="field"><span class="field-label">Chất lượng sản phẩm <span class="req">*</span></span><div class="star-pick" role="radiogroup">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} sao">☆</button>`).join('')}</div><p class="field-error" id="r-err"></p></div>
    <div class="field"><label for="r-text">Nhận xét (tối đa ${APP.MAX_REVIEW_CHARS} ký tự)</label><textarea id="r-text" rows="4" maxlength="${APP.MAX_REVIEW_CHARS}"></textarea></div>
    <div class="field"><label for="r-img">Thêm ảnh (tối đa 5, JPG/PNG, ≤ ${APP.MAX_IMAGE_MB}MB)</label><input id="r-img" type="file" accept="image/jpeg,image/png" multiple><p class="field-error" id="r-img-err"></p><div class="thumbs" id="r-thumbs"></div></div>
    <div class="modal-actions"><button class="btn btn-ghost" data-x>Hủy</button><button class="btn btn-primary" data-ok>Gửi đánh giá</button></div>`, { title: 'Đánh giá sản phẩm' });
  const paint = () => m.querySelectorAll('[data-star]').forEach((b) => { b.textContent = Number(b.dataset.star) <= rating ? '★' : '☆'; });
  on(m, 'click', '[data-star]', (ev, b) => { rating = Number(b.dataset.star); paint(); $('#r-err', m).textContent = ''; });
  $('#r-img', m).addEventListener('change', async (ev) => {
    const err = $('#r-img-err', m); err.textContent = '';
    for (const f of ev.target.files) {
      if (images.length >= 5) { err.textContent = 'Tối đa 5 ảnh.'; break; }
      const msg = validateImageFile(f, { maxMB: APP.MAX_IMAGE_MB, types: ['image/jpeg', 'image/png'] });
      if (msg) { err.textContent = msg; continue; }
      images.push(await compressImage(f, { maxSide: 700, quality: 0.65 }));
    }
    ev.target.value = ''; $('#r-thumbs', m).innerHTML = images.map((s) => `<div class="thumb"><img src="${s}" alt=""></div>`).join('');
  });
  $('[data-x]', m).onclick = close;
  $('[data-ok]', m).onclick = async (ev) => {
    if (!rating) { $('#r-err', m).textContent = 'Vui lòng chọn số sao.'; return; }
    setBusy(ev.target, true);
    try { await O.submitReview(order, item, { rating, text: $('#r-text', m).value.trim(), images, userName: s0.profile.name, userId: uid }); close(); toast('Cảm ơn bạn đã đánh giá!', 'success'); }
    catch (er) { toast(er.message, 'error'); close(); }
    await load();
  };
});

// ----- Yêu cầu trả hàng / hoàn tiền -----
function openReturnForm() {
  let image = '';
  const { el, close } = openModal(`
    <p class="muted small">Có thể yêu cầu đến <strong>${formatDateTime(O.returnDeadline(order))}</strong>. Số tiền hoàn tối đa: ${formatVND(order.itemsTotal)}.</p>
    <div class="field"><label for="rt-kind">Hình thức <span class="req">*</span></label><select id="rt-kind"><option value="refund">Hoàn tiền, không cần trả hàng</option><option value="return">Trả hàng rồi hoàn tiền</option></select></div>
    <div class="field"><label for="rt-reason">Lý do <span class="req">*</span></label><select id="rt-reason"><option value="">— Chọn —</option><option>Hàng vỡ / hỏng khi vận chuyển</option><option>Không đúng mô tả / hình ảnh</option><option>Thiếu hàng</option><option>Khác</option></select><p class="field-error" id="rt-err"></p></div>
    <div class="field"><label for="rt-desc">Mô tả thêm</label><textarea id="rt-desc" rows="3" maxlength="500"></textarea></div>
    <div class="field"><label for="rt-img">Ảnh minh chứng (JPG/PNG)</label><input id="rt-img" type="file" accept="image/jpeg,image/png"><p class="field-error" id="rt-img-err"></p></div>
    <div class="modal-actions"><button class="btn btn-ghost" data-x>Hủy</button><button class="btn btn-primary" data-ok>Gửi yêu cầu</button></div>`, { title: 'Trả hàng / Hoàn tiền' });
  $('#rt-img', el).addEventListener('change', async (ev) => {
    const f = ev.target.files[0]; if (!f) return; const msg = validateImageFile(f, { maxMB: APP.MAX_IMAGE_MB, types: ['image/jpeg', 'image/png'] });
    $('#rt-img-err', el).textContent = msg; image = msg ? '' : await compressImage(f, { maxSide: 800 });
  });
  $('[data-x]', el).onclick = close;
  $('[data-ok]', el).onclick = async (ev) => {
    const reason = $('#rt-reason', el).value;
    if (!reason) { $('#rt-err', el).textContent = 'Vui lòng chọn lý do.'; return; }
    if (reason !== 'Khác' && !image) { $('#rt-img-err', el).textContent = 'Lý do này cần ảnh minh chứng.'; return; }     // minh chứng bắt buộc theo loại lý do
    setBusy(ev.target, true); close();
    await run(() => O.requestReturn(order.id, { kind: $('#rt-kind', el).value, reason, desc: $('#rt-desc', el).value.trim(), image }), 'Đã gửi yêu cầu trả hàng/hoàn tiền.');
  };
}

// ----- Mua lại: kiểm tra giá/tồn kho hiện tại rồi đưa vào giỏ (không tự đặt) -----
async function rebuy() {
  let added = 0;
  for (const i of order.items) {
    const p = await getProduct(i.productId).catch(() => null);
    const v = p && p.status === 'visible' ? variantsOf(p).find((x) => x.id === i.variantId && x.active !== false) : null;
    if (v && v.stock > 0) { await addToCart(i.productId, i.variantId, Math.min(i.qty, v.stock), v.stock); added++; }
  }
  if (added) { flash(`Đã thêm ${added} sản phẩm vào giỏ hàng với giá hiện tại.`, 'success'); goto('pages/cart.html'); }
  else toast('Các sản phẩm này hiện không còn bán hoặc đã hết hàng.', 'error');
}

await load();
