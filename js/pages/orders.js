/**
 * ============================================================
 *  FILE: js/pages/orders.js
 *  TRANG: Đơn mua của tôi (pages/orders.html) – chỉ người mua
 *  Bám đặc tả mục 7: các thẻ Tất cả / Chờ thanh toán / Chờ xác nhận / Chờ giao hàng / Đang giao /
 *  Đã giao / Hoàn thành / Đã hủy / Trả hàng-Hoàn tiền; tìm theo mã đơn, tên sản phẩm, gian hàng;
 *  lọc theo thời gian; mặc định đơn mới nhất trước. Đơn trả trước quá hạn thanh toán tự hủy.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { requireAuth } from '../services/session.js';
import { buyerOrders, expireUnpaid, STATUS, PAY, TABS, matchesTab } from '../services/orders.js';
import { skeletonGrid, errorBox } from '../components/product-card.js';
import { $, esc, on, debounce } from '../utils/dom.js';
import { formatVND, formatDateTime } from '../utils/format.js';
import { pageUrl } from '../utils/paths.js';
import { fold } from '../services/products.js';
import { APP } from '../config/app-config.js';

const auth = await requireAuth({ roles: ['buyer'] });
if (!auth) throw new Error('stop');
await initLayout({ active: 'shop', title: 'Đơn mua' });

let orders = [], tab = 'all', q = '', from = '', to = '';

async function load() {
  $('#list').innerHTML = skeletonGrid(2);
  try { orders = await buyerOrders(auth.user.uid); await expireUnpaid(orders); }
  catch (e) { console.error(e); $('#list').innerHTML = errorBox(); $('#list [data-retry]').onclick = load; return; }
  render();
}

/** Lọc theo từ khóa + khoảng ngày (không đụng tới thẻ trạng thái) */
function baseFilter() {
  const key = fold(q);
  const t0 = from ? new Date(from).getTime() : 0;
  const t1 = to ? new Date(to).getTime() + 86399999 : Infinity;
  return orders.filter((o) => (!key || fold([o.id, o.shopName, ...o.items.map((i) => i.name)].join(' ')).includes(key)) && o.createdAt >= t0 && o.createdAt <= t1);
}

function render() {
  const base = baseFilter().sort((a, b) => b.createdAt - a.createdAt);          // mặc định mới nhất trước
  $('#tabs').innerHTML = TABS.map(([k, label]) => {
    const n = base.filter((o) => matchesTab(o, k)).length;
    return `<button class="tab ${k === tab ? 'active' : ''}" data-tab="${k}" role="tab" aria-selected="${k === tab}">${label}${n ? `<span class="count">${n}</span>` : ''}</button>`;
  }).join('');
  const list = base.filter((o) => matchesTab(o, tab));
  if (!list.length) {
    $('#list').innerHTML = `<div class="empty-state"><div class="big">📦</div><p>Bạn chưa có đơn hàng ở trạng thái này</p><a class="btn btn-primary" href="${pageUrl('shop')}">Mua sắm ngay</a></div>`;
    return;
  }
  $('#list').innerHTML = list.map((o) => `
  <article class="card order-card">
    <header class="row row-between"><strong>🏺 ${esc(o.shopName)}</strong>
      <span><span class="badge ${badgeFor(o.status)}">${STATUS[o.status]}</span> <span class="badge badge-gray">${PAY[o.payStatus]}</span>${o.returnReq ? ' <span class="badge badge-blue">Có yêu cầu trả hàng</span>' : ''}</span></header>
    <p class="muted small">Mã đơn <strong>${esc(o.id)}</strong> · Đặt lúc ${formatDateTime(o.createdAt)}</p>
    ${o.items.map((i) => `<div class="co-line"><img src="${esc(i.image)}" alt=""><div><strong>${esc(i.name)}</strong>${i.variantName ? `<p class="muted small">Phiên bản: ${esc(i.variantName)}</p>` : ''}</div><span>× ${i.qty}</span><strong>${formatVND(i.price * i.qty)}</strong></div>`).join('')}
    ${o.status === 'pending_payment' && o.payStatus === 'unpaid' ? `<p class="alert alert-warn">Hạn thanh toán: <strong>${formatDateTime(o.payDeadline)}</strong> – còn phải trả ${formatVND(o.total)}</p>` : ''}
    ${o.status === 'cancelled' ? `<p class="muted small">Lý do hủy: ${esc(o.cancel?.reason || '')}</p>` : ''}
    ${o.cancelRequest?.status === 'pending' ? '<p class="alert alert-info">Đang chờ xử lý yêu cầu hủy.</p>' : ''}
    <footer class="row row-between"><span>Tổng tiền: <strong class="p-price">${formatVND(o.total)}</strong></span>
      <a class="btn btn-primary btn-sm" href="${pageUrl('order-detail', { id: o.id })}">${o.status === 'pending_payment' ? 'Thanh toán / Chi tiết' : 'Xem chi tiết'}</a></footer>
  </article>`).join('');
}

const badgeFor = (s) => ({ completed: 'badge-green', cancelled: 'badge-red', shipping: 'badge-blue', delivered: 'badge-blue' }[s] || 'badge-gold');

on(document, 'click', '[data-tab]', (e, el) => { tab = el.dataset.tab; render(); });
$('#q').addEventListener('input', debounce((e) => { q = e.target.value; render(); }, 250));
for (const id of ['from', 'to']) {
  $('#' + id).addEventListener('change', () => {
    from = $('#from').value; to = $('#to').value;
    const err = $('#date-err');
    if (from && to && from > to) { err.textContent = 'Ngày bắt đầu không được sau ngày kết thúc.'; return; }
    err.textContent = ''; render();
  });
}
await load();
