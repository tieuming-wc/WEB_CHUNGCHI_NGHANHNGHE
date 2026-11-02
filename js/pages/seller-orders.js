/**
 * ============================================================
 *  FILE: js/pages/seller-orders.js
 *  TRANG: Quản lý đơn hàng (pages/seller-orders.html) – Kênh người bán
 *  Bám đặc tả người bán mục 6: các thẻ trạng thái, tìm theo mã đơn/tên sản phẩm, lọc theo thời gian,
 *  phương thức & trạng thái thanh toán, sắp xếp (mới nhất / cũ nhất / hạn bàn giao gần nhất),
 *  phân trang. Trạng thái đơn – thanh toán – hoàn tiền hiển thị RIÊNG.
 *  Người bán chỉ thấy đơn thuộc gian hàng của mình.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { requireAuth } from '../services/session.js';
import { sellerOrders, STATUS, PAY, PAY_METHOD, TABS, matchesTab } from '../services/orders.js';
import { fold, paginate } from '../services/products.js';
import { paginationHtml, errorBox } from '../components/product-card.js';
import { APP } from '../config/app-config.js';
import { $, esc, on, debounce } from '../utils/dom.js';
import { formatVND, formatDateTime } from '../utils/format.js';
import { pageUrl } from '../utils/paths.js';

const auth = await requireAuth({ roles: ['seller'] });
if (!auth) throw new Error('stop');
await initLayout({ kind: 'seller', active: 'orders', title: 'Quản lý đơn hàng' });

let orders = [];
const F = { tab: 'all', q: '', from: '', to: '', pay: '', payStatus: '', sort: 'newest', page: 1 };

async function load() {
  try { orders = await sellerOrders(auth.user.uid); } catch (e) { console.error(e); $('#list').innerHTML = errorBox(); $('#list [data-retry]').onclick = load; return; }
  render();
}

function render() {
  const key = fold(F.q);
  const t0 = F.from ? new Date(F.from).getTime() : 0, t1 = F.to ? new Date(F.to).getTime() + 86399999 : Infinity;
  const base = orders.filter((o) => (!key || fold(o.id + ' ' + o.items.map((i) => i.name).join(' ')).includes(key)) && o.createdAt >= t0 && o.createdAt <= t1
    && (!F.pay || o.payMethod === F.pay) && (!F.payStatus || o.payStatus === F.payStatus));
  $('#tabs').innerHTML = TABS.filter(([k]) => k !== 'return').map(([k, l]) => `<button class="tab ${F.tab === k ? 'active' : ''}" data-tab="${k}">${l}<span class="count">${base.filter((o) => matchesTab(o, k)).length}</span></button>`).join('');

  // Sắp xếp: hạn bàn giao gần nhất ưu tiên đơn CÓ hạn cụ thể, đơn chưa có hạn xếp cuối
  const cmp = { newest: (a, b) => b.createdAt - a.createdAt, oldest: (a, b) => a.createdAt - b.createdAt,
    due: (a, b) => (a.handoverDue ? 0 : 1) - (b.handoverDue ? 0 : 1) || (a.handoverDue || 0) - (b.handoverDue || 0) }[F.sort];
  const list = base.filter((o) => matchesTab(o, F.tab)).sort((a, b) => cmp(a, b) || a.id.localeCompare(b.id));
  const pg = paginate(list, F.page, APP.PAGE_SIZE); F.page = pg.page;

  if (!pg.total) { $('#list').innerHTML = `<div class="empty-state"><p>${orders.length ? 'Không có đơn hàng nào trong thẻ đang chọn.' : 'Chưa có đơn hàng nào.'}</p></div>`; $('#pager').innerHTML = ''; return; }
  $('#list').innerHTML = pg.items.map((o) => `
  <article class="card order-card">
    <header class="row row-between"><span><strong>${esc(o.id)}</strong> <span class="muted small">· ${formatDateTime(o.createdAt)} · ${esc(o.address.name)}</span></span>
      <span><span class="badge badge-gold">${STATUS[o.status]}</span> <span class="badge badge-gray">${PAY[o.payStatus]}</span>${o.returnReq ? ' <span class="badge badge-blue">Trả hàng</span>' : ''}${o.cancelRequest?.status === 'pending' ? ' <span class="badge badge-red">Yêu cầu hủy</span>' : ''}</span></header>
    ${o.items.map((i) => `<div class="co-line tight"><img src="${esc(i.image)}" alt=""><div><strong>${esc(i.name)}</strong>${i.variantName ? `<span class="muted small"> · ${esc(i.variantName)}</span>` : ''}</div><span>× ${i.qty}</span></div>`).join('')}
    <footer class="row row-between"><span>${PAY_METHOD[o.payMethod]} · Tổng <strong>${formatVND(o.total)}</strong>${o.handoverDue && o.status === 'awaiting_shipment' ? ` · Hạn bàn giao ${formatDateTime(o.handoverDue)}${Date.now() > o.handoverDue ? ' <span class="badge badge-red">Quá hạn</span>' : ''}` : ''}</span>
      <a class="btn btn-primary btn-sm" href="${pageUrl('order-detail', { id: o.id })}">${o.status === 'pending_confirm' ? 'Xử lý đơn' : 'Xem chi tiết'}</a></footer>
  </article>`).join('');
  $('#pager').innerHTML = paginationHtml(pg.page, pg.pages);
}

const reset = () => { F.page = 1; render(); };
on(document, 'click', '[data-tab]', (e, el) => { F.tab = el.dataset.tab; reset(); });
on(document, 'click', '[data-page]', (e, el) => { if (!el.disabled) { F.page = Number(el.dataset.page); render(); } });
$('#q').addEventListener('input', debounce((e) => { F.q = e.target.value; reset(); }, 250));
$('#pay').addEventListener('change', (e) => { F.pay = e.target.value; reset(); });
$('#paystatus').addEventListener('change', (e) => { F.payStatus = e.target.value; reset(); });
$('#sort').addEventListener('change', (e) => { F.sort = e.target.value; reset(); });
for (const id of ['from', 'to']) $('#' + id).addEventListener('change', () => {
  const from = $('#from').value, to = $('#to').value;
  if (from && to && from > to) { $('#date-err').textContent = 'Ngày bắt đầu không được sau ngày kết thúc.'; return; }   // lỗi dưới bộ lọc, chưa áp dụng
  $('#date-err').textContent = ''; F.from = from; F.to = to; reset();
});
await load();
