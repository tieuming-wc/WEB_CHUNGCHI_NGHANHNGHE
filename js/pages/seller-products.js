/**
 * ============================================================
 *  FILE: js/pages/seller-products.js
 *  TRANG: Sản phẩm của tôi (pages/seller-products.html) – Kênh người bán
 *  Bám đặc tả người bán mục 3: thẻ trạng thái (Tất cả / Đang hiển thị / Đã ẩn / Bản nháp / Bị khóa),
 *  tìm theo tên hoặc mã, lọc danh mục/tình trạng hàng, sắp xếp, phân trang 12/trang,
 *  nút Sửa – Xem trước – Ẩn/Hiển thị lại – Xóa (xóa có xác nhận; đã có đơn thì chỉ lưu trữ).
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { requireAuth } from '../services/session.js';
import { listBySeller, setStatus, deleteProduct, fold, minPrice, totalStock, paginate } from '../services/products.js';
import { confirmDialog } from '../components/modal.js';
import { paginationHtml, coverOf, errorBox } from '../components/product-card.js';
import { toast } from '../components/toast.js';
import { CATEGORIES, flatCategories, categoryPath, expandCategory } from '../data/categories.js';
import { APP } from '../config/app-config.js';
import { $, esc, on, debounce } from '../utils/dom.js';
import { formatVND } from '../utils/format.js';
import { pageUrl } from '../utils/paths.js';

const auth = await requireAuth({ roles: ['seller'] });
if (!auth) throw new Error('stop');
await initLayout({ kind: 'seller', active: 'products', title: 'Sản phẩm của tôi' });

const STATUS_LABEL = { visible: 'Đang hiển thị', hidden: 'Đã ẩn', draft: 'Bản nháp', locked: 'Bị khóa' };
const STATUS_BADGE = { visible: 'badge-green', hidden: 'badge-gray', draft: 'badge-gold', locked: 'badge-red' };
let all = [], tab = 'all', q = '', cat = '', stock = '', sort = 'newest', page = 1;

$('#cat').innerHTML = '<option value="">Tất cả danh mục</option>' + CATEGORIES.map((c) => `<option value="${c.id}">${esc(c.name)} (gồm các nhóm con)</option>` + c.children.map((k) => `<option value="${k.id}">&nbsp;&nbsp;— ${esc(k.name)}</option>`).join('')).join('');

async function load() {
  try { all = await listBySeller(auth.user.uid); } catch (e) { console.error(e); $('#list').innerHTML = errorBox(); $('#list [data-retry]').onclick = load; return; }
  render();
}

function render() {
  $('#total').textContent = `${all.length} sản phẩm`;
  // Thẻ trạng thái kèm số lượng
  $('#tabs').innerHTML = [['all', 'Tất cả'], ...Object.entries(STATUS_LABEL)].map(([k, l]) => {
    const n = k === 'all' ? all.length : all.filter((p) => p.status === k).length;
    return `<button class="tab ${tab === k ? 'active' : ''}" data-tab="${k}">${l}<span class="count">${n}</span></button>`;
  }).join('');

  const key = fold(q), cats = cat ? expandCategory(cat) : null;
  let list = all.filter((p) => (tab === 'all' || p.status === tab) && (!key || fold(p.name + ' ' + p.id).includes(key)) && (!cats || cats.includes(p.categoryId)) &&
    (!stock || (stock === 'made' ? p.mode === 'made_to_order' : stock === 'in' ? totalStock(p) > 0 && p.mode !== 'made_to_order' : totalStock(p) <= 0 && p.mode !== 'made_to_order')));
  const byId = (a, b) => a.id.localeCompare(b.id);                // thứ tự phụ để danh sách ổn định
  const cmp = { newest: (a, b) => (b.createdAt || 0) - (a.createdAt || 0), updated: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
    'price-asc': (a, b) => (a.status === 'draft' && !a.price ? 1 : 0) || minPrice(a) - minPrice(b), 'price-desc': (a, b) => (a.status === 'draft' && !a.price ? 1 : 0) || minPrice(b) - minPrice(a) }[sort];
  list = list.sort((a, b) => cmp(a, b) || byId(a, b));
  const pg = paginate(list, page, APP.PAGE_SIZE); page = pg.page;

  if (!all.length) { $('#list').innerHTML = `<div class="empty-state"><div class="big">🏺</div><p>Bạn chưa có sản phẩm nào.</p><a class="btn btn-primary btn-lg" href="${pageUrl('seller-product-form')}">+ Đăng sản phẩm đầu tiên</a></div>`; $('#pager').innerHTML = ''; return; }
  if (!pg.total) { $('#list').innerHTML = `<div class="empty-state"><p>Không tìm thấy sản phẩm phù hợp</p><button class="btn btn-primary" id="clear-f">Xóa bộ lọc</button></div>`; $('#pager').innerHTML = ''; return; }

  $('#list').innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Tồn kho</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
    ${pg.items.map((p) => `<tr><td><div class="co-line tight"><img src="${esc(coverOf(p))}" alt=""><div><strong>${esc(p.name)}</strong><br><span class="muted small">Mã: ${esc(p.id)}</span></div></div></td>
      <td>${esc(categoryPath(p.categoryId))}</td><td>${p.price || p.variants?.length ? formatVND(minPrice(p)) : '—'}</td>
      <td>${p.mode === 'made_to_order' ? '<span class="badge badge-gold">Làm theo đơn</span>' : totalStock(p) > 0 ? totalStock(p) : '<span class="badge badge-gray">Hết hàng</span>'}</td>
      <td><span class="badge ${STATUS_BADGE[p.status]}">${STATUS_LABEL[p.status]}</span>${p.status === 'locked' ? `<br><span class="small muted">${esc(p.lockReason || 'Vui lòng liên hệ hỗ trợ')}</span>` : ''}</td>
      <td class="actions"><a class="btn btn-ghost btn-sm" href="${pageUrl('seller-product-form', { id: p.id })}">Sửa</a>
        <a class="btn btn-ghost btn-sm" href="${pageUrl('product', { id: p.id, preview: 1 })}">Xem trước</a>
        ${p.status === 'visible' ? `<button class="btn btn-ghost btn-sm" data-hide="${p.id}">Ẩn</button>` : ''}
        ${p.status === 'hidden' ? `<button class="btn btn-ghost btn-sm" data-show="${p.id}">Hiển thị lại</button>` : ''}
        <button class="btn btn-danger btn-sm" data-del="${p.id}">Xóa</button></td></tr>`).join('')}</tbody></table></div>`;
  $('#pager').innerHTML = paginationHtml(pg.page, pg.pages);
}

// Bộ lọc: đổi bất kỳ điều kiện nào → về trang 1
const reset = () => { page = 1; render(); };
on(document, 'click', '[data-tab]', (e, el) => { tab = el.dataset.tab; reset(); });
on(document, 'click', '[data-page]', (e, el) => { if (!el.disabled) { page = Number(el.dataset.page); render(); } });
$('#q').addEventListener('input', debounce((e) => { q = e.target.value; reset(); }, 250));
$('#cat').addEventListener('change', (e) => { cat = e.target.value; reset(); });
$('#stock').addEventListener('change', (e) => { stock = e.target.value; reset(); });
$('#sort').addEventListener('change', (e) => { sort = e.target.value; reset(); });
on(document, 'click', '#clear-f', () => { q = cat = stock = ''; tab = 'all'; $('#q').value = ''; $('#cat').value = ''; $('#stock').value = ''; reset(); });

on(document, 'click', '[data-hide]', async (e, el) => { await setStatus(el.dataset.hide, 'hidden'); toast('Đã ẩn sản phẩm. Dữ liệu đơn cũ vẫn còn nguyên.', 'success'); await load(); });
on(document, 'click', '[data-show]', async (e, el) => {
  const p = all.find((x) => x.id === el.dataset.show);
  if (!p.price && !p.variants?.length || !p.desc || !p.images?.length) { toast('Sản phẩm chưa đủ thông tin hợp lệ để hiển thị. Hãy bấm Sửa để bổ sung.', 'error'); return; }
  await setStatus(p.id, 'visible'); toast('Sản phẩm đã hiển thị lại.', 'success'); await load();
});
on(document, 'click', '[data-del]', async (e, el) => {
  const p = all.find((x) => x.id === el.dataset.del);
  if (!(await confirmDialog({ title: 'Xóa sản phẩm', message: `Xóa <strong>${esc(p.name)}</strong> (mã ${esc(p.id)})? Nếu sản phẩm đã có đơn hàng, nó sẽ chỉ được lưu trữ (ẩn).`, confirmText: 'Xóa', danger: true }))) return;
  const result = await deleteProduct(p.id);
  toast(result === 'archived' ? 'Sản phẩm đã có đơn nên được lưu trữ (ẩn) thay vì xóa.' : 'Đã xóa sản phẩm.', 'success'); await load();
});

await load();
