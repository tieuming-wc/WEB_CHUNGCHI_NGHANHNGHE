/**
 * ============================================================
 *  FILE: js/pages/admin.js
 *  TRANG: Quản trị (pages/admin.html) – chỉ tài khoản có vai trò "admin"
 *  Vì web chưa tích hợp cổng thanh toán / hãng vận chuyển / hội đồng đánh giá thật, quản trị viên
 *  đóng vai trò xác nhận các sự kiện đó:
 *    1. Thanh toán chuyển khoản: xác nhận đã nhận tiền (đặc tả: người bán KHÔNG tự đánh dấu đã thanh toán)
 *    2. Vận chuyển: xác nhận giao thành công; thu tiền COD
 *    3. Hoàn tiền: xác nhận đã hoàn
 *    4. Đăng ký chứng nhận: duyệt / từ chối / cấp chứng nhận nội bộ (có mã tra cứu)
 *    5. Bài thực hành: chấm điểm (≥ 7.5 đạt)
 *    6. Hỗ trợ: xem các phản ánh/báo cáo
 *  Cách tạo tài khoản quản trị: xem README (đặt role = "admin" trong Firestore).
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { requireAuth } from '../services/session.js';
import * as O from '../services/orders.js';
import * as C from '../services/certs.js';
import { pendingSubmissions, gradeSubmission } from '../services/courses.js';
import { backend } from '../services/db.js';
import { openModal, promptReason } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { APP } from '../config/app-config.js';
import { $, esc, on, setBusy } from '../utils/dom.js';
import { formatVND, formatDateTime } from '../utils/format.js';
import { pageUrl } from '../utils/paths.js';

const auth = await requireAuth({ roles: ['admin'] });
if (!auth) throw new Error('stop');
await initLayout({ kind: 'admin', title: 'Quản trị' });

const TABS = [['pay', 'Thanh toán'], ['ship', 'Vận chuyển / COD'], ['refund', 'Hoàn tiền'], ['cert', 'Đăng ký chứng nhận'], ['grade', 'Chấm bài thực hành'], ['support', 'Hỗ trợ']];
let tab = 'pay';
const view = $('#view');

const orderRow = (o, btns) => `<tr><td><a href="${pageUrl('order-detail', { id: o.id })}">${esc(o.id)}</a><br><span class="muted small">${formatDateTime(o.createdAt)}</span></td><td>${esc(o.shopName)}<br><span class="muted small">${esc(o.buyerName)}</span></td><td>${formatVND(o.total)}<br><span class="muted small">${O.PAY_METHOD[o.payMethod]}</span></td><td>${O.STATUS[o.status]}<br><span class="badge badge-gray">${O.PAY[o.payStatus]}</span></td><td>${btns}</td></tr>`;
const table = (head, rows) => rows ? `<div class="table-wrap"><table class="table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty-state"><p>Không có mục nào cần xử lý. 🎉</p></div>';
const ORDER_HEAD = ['Mã đơn', 'Gian hàng / Người mua', 'Số tiền', 'Trạng thái', 'Thao tác'];

async function render() {
  $('#tabs').innerHTML = TABS.map(([k, l]) => `<button class="tab ${k === tab ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('');
  view.innerHTML = '<p class="muted">Đang tải…</p>';
  try {
    if (tab === 'pay') {
      const list = await backend.list('orders', [['payStatus', '==', 'proof']]);
      view.innerHTML = table(ORDER_HEAD.concat([]), list.map((o) => orderRow(o, `<button class="btn btn-primary btn-sm" data-do="pay|${o.id}">Xác nhận đã nhận tiền</button> <button class="btn btn-ghost btn-sm" data-proof="${o.id}">Xem chứng từ</button>`)).join(''));
      window.__proofs = Object.fromEntries(list.map((o) => [o.id, o.proofImage]));
    } else if (tab === 'ship') {
      const ship = await O.ordersByStatus('shipping');
      const cod = (await O.ordersByStatus('delivered')).filter((o) => o.payMethod === 'cod' && o.payStatus === 'unpaid');
      view.innerHTML = '<h2>Đang giao – chờ xác nhận giao thành công</h2>' + table(ORDER_HEAD, ship.map((o) => orderRow(o, `<button class="btn btn-primary btn-sm" data-do="delivered|${o.id}">Giao thành công</button>`)).join(''))
        + '<h2>Đã giao COD – chờ xác nhận thu tiền</h2>' + table(ORDER_HEAD, cod.map((o) => orderRow(o, `<button class="btn btn-primary btn-sm" data-do="cod|${o.id}">Đã thu tiền COD</button>`)).join(''));
    } else if (tab === 'refund') {
      const list = await backend.list('orders', [['payStatus', '==', 'refund_pending']]);
      view.innerHTML = table(ORDER_HEAD, list.map((o) => orderRow(o, `<button class="btn btn-primary btn-sm" data-do="refund|${o.id}">Đã hoàn tiền</button>`)).join(''));
    } else if (tab === 'cert') {
      const [a, b] = await Promise.all([C.regsByStatus('received'), C.regsByStatus('approved')]);
      const row = (r, btns) => `<tr><td><strong>${esc(r.code)}</strong><br><span class="muted small">${formatDateTime(r.createdAt)}</span></td><td>${esc(r.fullName)}<br><span class="small">CCCD ${esc(r.cccd)} · ĐT ${esc(r.phone)}</span><br><span class="small muted">${esc(r.hometown)}</span></td><td>${esc(r.craft)}<br>Nơi thi: ${esc(r.location)}</td><td>${formatVND(r.fee)}<br><button class="link-btn" data-bill="${r.code}">Xem bill</button></td><td>${btns}</td></tr>`;
      window.__bills = Object.fromEntries([...a, ...b].map((r) => [r.code, r.billImage]));
      window.__regs = Object.fromEntries([...a, ...b].map((r) => [r.code, r]));
      view.innerHTML = '<h2>Mới tiếp nhận</h2>' + table(['Mã', 'Người đăng ký', 'Nghề / Nơi thi', 'Lệ phí', 'Thao tác'], a.map((r) => row(r, `<button class="btn btn-primary btn-sm" data-do="regok|${r.code}">Xác nhận lệ phí</button> <button class="btn btn-ghost btn-sm" data-do="regno|${r.code}">Từ chối</button>`)).join(''))
        + '<h2>Đã xác nhận – chờ cấp chứng nhận sau kỳ thi</h2>' + table(['Mã', 'Người đăng ký', 'Nghề / Nơi thi', 'Lệ phí', 'Thao tác'], b.map((r) => row(r, `<button class="btn btn-gold btn-sm" data-do="issue|${r.code}">Cấp chứng nhận</button>`)).join(''));
    } else if (tab === 'grade') {
      const subs = await pendingSubmissions();
      window.__subs = Object.fromEntries(subs.map((s) => [s.id, s]));
      view.innerHTML = table(['Học viên', 'Bài', 'Sản phẩm', 'Thao tác'], subs.map((s) => `<tr><td>${esc(s.userName)}<br><span class="muted small">Lần ${s.attempt + 1} · ${formatDateTime(s.createdAt)}</span></td><td>${esc(s.courseTitle)}<br>${esc(s.lessonTitle)}</td>
        <td><strong>${esc(s.title)}</strong><br>${(s.images || []).map((i) => `<img class="review-img" src="${esc(i)}" alt="">`).join('')}<br><a href="${esc(s.videoUrl)}" target="_blank" rel="noopener">▶ Video</a>${s.note ? `<br><span class="small">${esc(s.note)}</span>` : ''}</td>
        <td><button class="btn btn-primary btn-sm" data-do="grade|${s.id}">Chấm điểm</button></td></tr>`).join(''));
    } else {
      const t = (await backend.list('supportTickets')).sort((a, b) => b.createdAt - a.createdAt);
      view.innerHTML = table(['Thời gian', 'Loại', 'Người gửi', 'Nội dung'], t.map((x) => `<tr><td>${formatDateTime(x.createdAt)}</td><td>${esc(x.type)}</td><td>${esc(x.name)}<br><span class="small muted">${esc(x.email)}</span></td><td>${esc(x.message)}${x.ref ? `<br><span class="small muted">Tham chiếu: ${esc(x.ref)}</span>` : ''}</td></tr>`).join(''));
    }
  } catch (e) { console.error(e); view.innerHTML = '<div class="alert alert-error">Chưa tải được dữ liệu. Kiểm tra quy tắc bảo mật Firestore (xem README) và đảm bảo tài khoản có role = admin.</div>'; }
}

async function run(fn, msg) { try { await fn(); toast(msg, 'success'); } catch (e) { toast(e.message || 'Có sự cố', 'error'); } render(); }
on(document, 'click', '[data-tab]', (e, el) => { tab = el.dataset.tab; render(); });
on(document, 'click', '[data-proof]', (e, el) => openModal(`<img class="proof" src="${esc(window.__proofs[el.dataset.proof])}" alt="Chứng từ">`, { title: 'Chứng từ chuyển khoản' }));
on(document, 'click', '[data-bill]', (e, el) => openModal(`<img class="proof" src="${esc(window.__bills[el.dataset.bill])}" alt="Bill">`, { title: 'Bill chuyển khoản lệ phí' }));

on(document, 'click', '[data-do]', async (e, el) => {
  const [act, id] = el.dataset.do.split('|');
  if (act === 'pay') run(() => O.adminConfirmPayment(id), 'Đã xác nhận thanh toán.');
  else if (act === 'delivered') run(() => O.adminMarkDelivered(id), 'Đã xác nhận giao thành công.');
  else if (act === 'cod') run(() => O.adminCollectCod(id), 'Đã xác nhận thu COD.');
  else if (act === 'refund') run(() => O.adminRefund(id), 'Đã xác nhận hoàn tiền.');
  else if (act === 'regok') run(() => C.approveRegistration(id), 'Đã xác nhận lệ phí.');
  else if (act === 'regno') { const r = await promptReason({ title: 'Từ chối đăng ký', options: ['Bill chuyển khoản không hợp lệ', 'Thông tin cá nhân chưa chính xác'], confirmText: 'Từ chối' }); if (r) run(() => C.rejectRegistration(id, r), 'Đã từ chối.'); }
  else if (act === 'issue') openIssue(window.__regs[id]);
  else if (act === 'grade') openGrade(window.__subs[id]);
});

/** Cấp chứng nhận nội bộ: tạo mã BTV-năm-số để tra cứu công khai */
function openIssue(reg) {
  const { el, close } = openModal(`
    <p>Cấp chứng nhận cho <strong>${esc(reg.fullName)}</strong> – ${esc(reg.craft)}</p>
    <div class="field"><label for="lv">Cấp độ (thang 7 bậc nội bộ)</label><select id="lv">${['Bậc 1', 'Bậc 2', 'Bậc 3 – Thợ cơ bản', 'Bậc 4', 'Bậc 5', 'Bậc 6', 'Bậc 7 – Nghệ nhân tiêu biểu'].map((x) => `<option>${x}</option>`).join('')}</select></div>
    <div class="field"><label for="as">Tên đánh giá viên</label><input id="as" type="text" maxlength="80"><p class="field-error" id="as-err"></p></div>
    <p class="small muted">Đây là chứng nhận NỘI BỘ của nền tảng, không phải chứng chỉ kỹ năng nghề quốc gia.</p>
    <div class="modal-actions"><button class="btn btn-ghost" data-x>Hủy</button><button class="btn btn-primary" data-ok>Cấp chứng nhận</button></div>`, { title: 'Cấp chứng nhận' });
  $('[data-x]', el).onclick = close;
  $('[data-ok]', el).onclick = async (ev) => {
    if (!$('#as', el).value.trim()) { $('#as-err', el).textContent = 'Vui lòng nhập tên đánh giá viên.'; return; }
    setBusy(ev.target, true);
    let code; do { code = `BTV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`; } while (await C.lookupCertificate(code));
    await C.issueCertificate({ code, holderName: reg.fullName, craft: reg.craft, level: $('#lv', el).value, assessor: $('#as', el).value.trim() });
    await backend.update('certRegs', reg.code, { status: 'approved', certificateCode: code });
    close(); toast(`Đã cấp chứng nhận mã ${code}.`, 'success'); render();
  };
}

/** Chấm bài thực hành: ≥ 7.5 → đạt và mở khóa tiến độ cho học viên */
function openGrade(sub) {
  const { el, close } = openModal(`
    <p><strong>${esc(sub.title)}</strong> – ${esc(sub.userName)}</p>
    <div class="field"><label for="sc">Điểm (0–10)</label><input id="sc" type="number" min="0" max="10" step="0.5"><p class="field-error" id="sc-err"></p></div>
    <div class="field"><label for="cm">Nhận xét</label><textarea id="cm" rows="3" maxlength="500"></textarea></div>
    <p class="small muted">Điểm ≥ ${APP.PASS_SCORE}: đạt. Dưới ${APP.PASS_SCORE}: trả về, học viên được nộp lại (tối đa ${APP.MAX_RESUBMIT} lần).</p>
    <div class="modal-actions"><button class="btn btn-ghost" data-x>Hủy</button><button class="btn btn-primary" data-ok>Lưu điểm</button></div>`, { title: 'Chấm điểm' });
  $('[data-x]', el).onclick = close;
  $('[data-ok]', el).onclick = async () => {
    const v = Number($('#sc', el).value);
    if ($('#sc', el).value === '' || v < 0 || v > 10) { $('#sc-err', el).textContent = 'Điểm phải từ 0 đến 10.'; return; }
    const passed = await gradeSubmission(sub, v, $('#cm', el).value.trim());
    close(); toast(passed ? 'Đã chấm: ĐẠT.' : 'Đã chấm: trả về để nộp lại.', 'success'); render();
  };
}
await render();
