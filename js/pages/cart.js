/**
 * ============================================================
 *  FILE: js/pages/cart.js
 *  TRANG: Giỏ hàng (pages/cart.html) – chỉ người mua
 *  Bám đặc tả mục 5: sản phẩm nhóm theo gian hàng, ô chọn từng dòng, "Chọn tất cả", tạm tính,
 *  dòng hết hàng/ngừng bán không chọn được, xóa có xác nhận, giỏ trống có nút "Tiếp tục mua sắm".
 *  Lưu ý: thêm vào giỏ KHÔNG giữ hàng.
 * ============================================================
 */
import { initLayout, refreshCartBadge } from '../components/layout.js';
import { requireAuth } from '../services/session.js';
import { resolveCart, setQty, removeLine } from '../services/cart.js';
import { confirmDialog } from '../components/modal.js';
import { skeletonGrid, errorBox } from '../components/product-card.js';
import { coverOf } from '../components/product-card.js';
import { $, esc, on } from '../utils/dom.js';
import { formatVND } from '../utils/format.js';
import { goto, pageUrl } from '../utils/paths.js';
import { toast } from '../components/toast.js';

const auth = await requireAuth({ roles: ['buyer'] });
if (!auth) throw new Error('stop');
await initLayout({ active: 'shop', title: 'Giỏ hàng' });

let lines = [];
const selected = new Set();                                      // các dòng được tick

async function load(keepSelection = false) {
  $('#cart').innerHTML = skeletonGrid(2);
  try { lines = await resolveCart(); }
  catch (e) { $('#cart').innerHTML = errorBox(); $('#cart [data-retry]').onclick = () => load(); return; }
  if (!keepSelection) { selected.clear(); lines.filter((l) => !l.problem).forEach((l) => selected.add(l.key)); }
  [...selected].forEach((k) => { const l = lines.find((x) => x.key === k); if (!l || l.problem) selected.delete(k); });
  render();
}

function render() {
  if (!lines.length) {
    $('#cart').innerHTML = `<div class="empty-state"><div class="big">🛒</div><p>Giỏ hàng của bạn chưa có sản phẩm</p><a class="btn btn-primary btn-lg" href="${pageUrl('shop')}">Tiếp tục mua sắm</a></div>`;
    return;
  }
  // Nhóm theo gian hàng
  const groups = new Map();
  lines.forEach((l) => { const k = l.product?.sellerId || 'unknown'; if (!groups.has(k)) groups.set(k, { name: l.product?.shopName || 'Gian hàng', lines: [] }); groups.get(k).lines.push(l); });

  const chosen = lines.filter((l) => selected.has(l.key));
  const subtotal = chosen.reduce((s, l) => s + l.price * l.qty, 0);
  const selectable = lines.filter((l) => !l.problem);

  $('#cart').innerHTML = `
  ${[...groups.values()].map((g) => `
    <section class="card cart-group"><h2 class="cart-shop">🏺 ${esc(g.name)}</h2>
      ${g.lines.map((l) => `
      <div class="cart-line ${l.problem ? 'is-bad' : ''}">
        <input type="checkbox" class="cart-check" data-key="${esc(l.key)}" ${selected.has(l.key) ? 'checked' : ''} ${l.problem ? 'disabled' : ''} aria-label="Chọn ${esc(l.product?.name || '')}">
        <img src="${esc(l.product ? coverOf(l.product) : '')}" alt="" class="cart-img">
        <div class="cart-info">
          <a href="${pageUrl('product', { id: l.productId })}"><strong>${esc(l.product?.name || 'Sản phẩm không còn tồn tại')}</strong></a>
          ${l.variant?.name ? `<p class="muted small">Phiên bản: ${esc(l.variant.name)}</p>` : ''}
          ${l.problem ? `<p class="field-error">${esc(l.problem)}</p>` : ''}
        </div>
        <div class="cart-price">${formatVND(l.price)}</div>
        <div class="qty qty-sm"><button type="button" data-dec="${esc(l.key)}" ${l.qty <= 1 || l.problem ? 'disabled' : ''} aria-label="Giảm">−</button>
          <input type="number" min="1" max="${l.variant?.stock || 1}" value="${l.qty}" data-qty="${esc(l.key)}" ${l.problem && !l.variant ? 'disabled' : ''} aria-label="Số lượng">
          <button type="button" data-inc="${esc(l.key)}" ${l.problem || l.qty >= (l.variant?.stock || 0) ? 'disabled' : ''} aria-label="Tăng">+</button></div>
        <div class="cart-total">${formatVND(l.price * l.qty)}</div>
        <button class="btn btn-ghost btn-sm" data-del="${esc(l.key)}">Xóa</button>
      </div>`).join('')}
    </section>`).join('')}
  <div class="cart-bar card">
    <label class="check"><input type="checkbox" id="select-all" ${selectable.length && selectable.every((l) => selected.has(l.key)) ? 'checked' : ''} ${selectable.length ? '' : 'disabled'}> <span>Chọn tất cả</span></label>
    <div class="cart-sum"><span class="muted">${chosen.length} sản phẩm được chọn · Tạm tính</span> <strong class="p-price">${formatVND(subtotal)}</strong>
      <span class="muted small">(phí vận chuyển hiển thị chính xác ở bước đặt hàng)</span></div>
    <button class="btn btn-primary btn-lg" id="go-checkout" ${chosen.length ? '' : 'disabled'}>Mua hàng</button>
  </div>`;
}

const find = (key) => lines.find((l) => l.key === key);

on($('#cart'), 'change', '.cart-check', (e, el) => { el.checked ? selected.add(el.dataset.key) : selected.delete(el.dataset.key); render(); });
on($('#cart'), 'change', '#select-all', (e, el) => { lines.filter((l) => !l.problem).forEach((l) => (el.checked ? selected.add(l.key) : selected.delete(l.key))); render(); });

/** Đổi số lượng, luôn giới hạn trong 1..tồn kho */
async function changeQty(key, qty) {
  const l = find(key); if (!l?.variant) return;
  const q = Math.max(1, Math.min(l.variant.stock, Math.floor(qty) || 1));
  if (q !== qty) toast(`Số lượng tối đa hiện có là ${l.variant.stock}.`, 'info');
  await setQty(l.productId, l.variantId, q); l.qty = q; refreshCartBadge(); render();
}
on($('#cart'), 'click', '[data-dec]', (e, el) => changeQty(el.dataset.dec, find(el.dataset.dec).qty - 1));
on($('#cart'), 'click', '[data-inc]', (e, el) => changeQty(el.dataset.inc, find(el.dataset.inc).qty + 1));
on($('#cart'), 'change', '[data-qty]', (e, el) => changeQty(el.dataset.qty, Number(el.value)));

// Xóa dòng: có xác nhận
on($('#cart'), 'click', '[data-del]', async (e, el) => {
  const l = find(el.dataset.del);
  if (!(await confirmDialog({ title: 'Xóa khỏi giỏ hàng', message: `Bạn muốn xóa <strong>${esc(l.product?.name || 'sản phẩm này')}</strong> khỏi giỏ hàng?`, confirmText: 'Xóa', danger: true }))) return;
  await removeLine(l.productId, l.variantId); refreshCartBadge(); selected.delete(l.key);
  await load(true); toast('Đã xóa khỏi giỏ hàng.', 'success', 2000);
});

on($('#cart'), 'click', '#go-checkout', () => {
  // Kiểm tra lại giá/số lượng trước khi sang đặt hàng: lưu "ảnh chụp" giá để bước sau phát hiện thay đổi
  const chosen = lines.filter((l) => selected.has(l.key) && !l.problem);
  if (!chosen.length) return;
  sessionStorage.setItem('btv_checkout', JSON.stringify({ keys: chosen.map((l) => l.key), prices: Object.fromEntries(chosen.map((l) => [l.key, l.price])) }));
  goto('pages/checkout.html?from=cart');
});

await load();
