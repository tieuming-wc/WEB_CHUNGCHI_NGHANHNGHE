/**
 * ============================================================
 *  FILE: js/pages/seller-returns.js
 *  TRANG: Trả hàng / Hoàn tiền (pages/seller-returns.html) – Kênh người bán
 *  Danh sách yêu cầu: mã đơn, sản phẩm, lý do, minh chứng, số tiền, trạng thái.
 *  Người bán Chấp thuận hoặc Từ chối (từ chối bắt buộc nhập lý do). Việc "đã hoàn tiền"
 *  do hệ thống/quản trị xác nhận – người bán không tự đánh dấu.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { requireAuth } from '../services/session.js';
import { sellerOrders, sellerDecideReturn, RETURN_STATUS } from '../services/orders.js';
import { confirmDialog, promptReason } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { $, esc, on } from '../utils/dom.js';
import { formatVND, formatDateTime } from '../utils/format.js';
import { pageUrl } from '../utils/paths.js';

const auth = await requireAuth({ roles: ['seller'] });
if (!auth) throw new Error('stop');
await initLayout({ kind: 'seller', active: 'returns', title: 'Trả hàng/Hoàn tiền' });

let rows = [];
async function load() {
  rows = (await sellerOrders(auth.user.uid)).filter((o) => o.returnReq).sort((a, b) => b.returnReq.at - a.returnReq.at);
  if (!rows.length) { $('#list').innerHTML = '<div class="empty-state"><p>Chưa có yêu cầu trả hàng/hoàn tiền nào.</p></div>'; return; }
  $('#list').innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Đơn</th><th>Sản phẩm</th><th>Lý do</th><th>Số tiền</th><th>Trạng thái</th><th></th></tr></thead><tbody>
  ${rows.map((o) => { const r = o.returnReq; return `<tr><td><a href="${pageUrl('order-detail', { id: o.id })}">${esc(o.id)}</a><br><span class="muted small">${formatDateTime(r.at)}</span></td>
    <td>${o.items.map((i) => esc(i.name) + ' ×' + i.qty).join('<br>')}</td>
    <td>${esc(r.reason)}${r.desc ? '<br><span class="muted small">' + esc(r.desc) + '</span>' : ''}${r.image ? `<br><img class="review-img" src="${esc(r.image)}" alt="Minh chứng">` : ''}</td>
    <td>${formatVND(r.amount)}<br><span class="muted small">${r.kind === 'return' ? 'Trả hàng + hoàn tiền' : 'Hoàn tiền'}</span></td>
    <td><span class="badge badge-blue">${RETURN_STATUS[r.status]}</span></td>
    <td>${r.status === 'pending' ? `<button class="btn btn-primary btn-sm" data-ok="${o.id}">Chấp thuận</button> <button class="btn btn-ghost btn-sm" data-no="${o.id}">Từ chối</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
}
async function act(fn, msg) { try { await fn(); toast(msg, 'success'); } catch (e) { toast(e.message, 'error'); } await load(); }
on(document, 'click', '[data-ok]', async (e, el) => { if (await confirmDialog({ title: 'Chấp thuận yêu cầu', message: 'Đơn sẽ chuyển sang chờ hoàn tiền.', confirmText: 'Chấp thuận' })) act(() => sellerDecideReturn(el.dataset.ok, true), 'Đã chấp thuận.'); });
on(document, 'click', '[data-no]', async (e, el) => { const r = await promptReason({ title: 'Từ chối yêu cầu', confirmText: 'Từ chối' }); if (r) act(() => sellerDecideReturn(el.dataset.no, false, r), 'Đã từ chối.'); });
await load();
