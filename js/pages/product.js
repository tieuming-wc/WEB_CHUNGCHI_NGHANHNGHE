/**
 * ============================================================
 *  FILE: js/pages/product.js
 *  TRANG: Chi tiết sản phẩm (pages/product.html?id=...)
 *  Bám đặc tả người mua mục 4 + người bán mục 5.2 (chế độ Xem trước ?preview=1):
 *    - Ảnh lớn + ảnh nhỏ, chọn phiên bản, số lượng (min 1, max tồn kho)
 *    - Nút: Thêm vào giỏ, Mua ngay, Yêu thích, Liên hệ người bán – mỗi nút có điều kiện riêng
 *    - Thông tin nghệ nhân/gian hàng, đánh giá, sản phẩm liên quan
 * ============================================================
 */
import { initLayout, refreshCartBadge } from '../components/layout.js';
import { getProduct, getShop, activeVariants, variantsOf, totalStock, minPrice, hasPriceRange, avgRating, listReviews, listVisible } from '../services/products.js';
import { addToCart, toggleFavorite, isFavorite } from '../services/cart.js';
import { pushRecent } from '../services/userstate.js';
import { productCard, renderStars, coverOf } from '../components/product-card.js';
import { toast } from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';
import { logout } from '../services/auth.js';
import { resetSessionCache } from '../services/session.js';
import { categoryPath } from '../data/categories.js';
import { $, esc, qs, on } from '../utils/dom.js';
import { formatVND, formatDate } from '../utils/format.js';
import { gotoLogin, pageUrl, goto } from '../utils/paths.js';

const session = await initLayout({ active: 'shop', title: 'Chi tiết sản phẩm' });
const role = session?.profile?.role;
const id = qs('id');
const preview = qs('preview') === '1';                           // xem trước của người bán: không giao dịch
const root = $('#product');

let product;
try { product = id ? await getProduct(id) : null; } catch { product = null; }

// Sản phẩm không tồn tại / không được phép xem
const isOwner = product && session && product.sellerId === session.user.uid;
if (!product || (product.status !== 'visible' && !isOwner)) {
  root.innerHTML = `<div class="empty-state"><div class="big">😕</div><p>Sản phẩm không tồn tại hoặc đã ngừng bán.</p><a class="btn btn-primary" href="${pageUrl('shop')}">Quay lại mua hàng</a></div>`;
  throw new Error('stop');
}
document.title = `${product.name} – ${document.title.split('–').pop().trim()}`;
if (role === 'buyer') pushRecent(product.id);                    // nhớ "đã xem gần đây" trên tài khoản

const shop = await getShop(product.sellerId).catch(() => null);
const reviews = await listReviews(product.id).catch(() => []);
const variants = activeVariants(product);
const multi = (product.variants || []).length > 0;
let chosen = multi ? null : variants[0];                          // nhiều phiên bản thì bắt buộc chọn
let qty = 1;

/** Điều kiện mua: lý do khóa nút (chuỗi rỗng = mua được) */
function blockedReason() {
  if (preview) return 'Đây là bản xem trước, không thể giao dịch.';
  if (product.status !== 'visible') return 'Sản phẩm đang ẩn hoặc ngừng bán.';
  if (product.mode === 'made_to_order' && product.accepting === false) return 'Người bán đang tạm ngừng nhận đơn.';
  if (totalStock(product) <= 0) return 'Hết hàng.';
  return '';
}

function render() {
  const sold = totalStock(product) <= 0;
  const maxQty = chosen ? chosen.stock : 0;
  const price = chosen ? formatVND(chosen.price) : (hasPriceRange(product) ? 'Từ ' : '') + formatVND(minPrice(product));
  const imgs = product.images?.length ? product.images : [coverOf(product)];
  const block = blockedReason();
  root.innerHTML = `
  ${preview ? `<div class="alert alert-info"><strong>Xem trước</strong> – giao diện như người mua nhìn thấy. <a href="${pageUrl('seller-product-form', { id: product.id })}">← Quay lại chỉnh sửa</a></div>` : ''}
  <p class="breadcrumb"><a href="${pageUrl('shop')}">Mua hàng</a> › ${esc(categoryPath(product.categoryId))}</p>
  <div class="pd-top">
    <div class="pd-gallery">
      <div class="pd-main"><img id="main-img" src="${esc(imgs[0])}" alt="${esc(product.name)}"></div>
      <div class="thumbs">${imgs.map((src, i) => `<button class="thumb ${i === 0 ? 'cover' : ''}" type="button" data-img="${i}" aria-label="Ảnh ${i + 1}"><img src="${esc(src)}" alt=""></button>`).join('')}</div>
      ${product.videoUrl ? `<p><a href="${esc(product.videoUrl)}" target="_blank" rel="noopener">▶ Xem video sản phẩm</a></p>` : ''}
    </div>
    <div class="pd-info">
      <h1>${esc(product.name)}</h1>
      <p>${product.ratingCount ? `${renderStars(avgRating(product))} <span class="muted">${avgRating(product).toFixed(1)} · ${product.ratingCount} đánh giá</span>` : '<span class="muted">Chưa có đánh giá</span>'}
         ${product.mode === 'made_to_order' ? '<span class="badge badge-gold">Làm theo đơn</span>' : ''}${sold ? '<span class="badge badge-gray">Hết hàng</span>' : ''}</p>
      <p class="pd-price" id="pd-price">${price}</p>
      <p class="muted">Bán bởi: <strong>${esc(product.shopName || shop?.name || '')}</strong>${product.village ? ' · ' + esc(product.village) : ''}</p>
      ${product.mode === 'made_to_order' ? `<div class="alert alert-info">Làm theo đơn: thời gian chế tác dự kiến <strong>${product.prepDays || 0} ngày</strong>. Người bán nhận tối đa theo số lượng còn nhận làm hiển thị bên dưới.</div>` : ''}
      ${multi ? `<div class="field"><span class="field-label">Chọn mẫu / màu / kích thước <span class="req">*</span></span>
        <div class="variant-row">${variants.map((v) => `<button type="button" class="chip ${chosen?.id === v.id ? 'on' : ''}" data-variant="${esc(v.id)}" ${v.stock <= 0 ? 'disabled' : ''}>${esc(v.name)}${v.stock <= 0 ? ' (hết hàng)' : ''}</button>`).join('')}</div>
        <p class="field-error" id="variant-err" role="alert"></p></div>` : ''}
      <div class="field"><span class="field-label">Số lượng</span>
        <div class="qty"><button type="button" id="qty-minus" aria-label="Giảm" ${qty <= 1 || block ? 'disabled' : ''}>−</button>
          <input id="qty" type="number" min="1" max="${maxQty || ''}" value="${qty}" inputmode="numeric" ${block ? 'disabled' : ''} aria-label="Số lượng">
          <button type="button" id="qty-plus" aria-label="Tăng" ${!chosen || qty >= maxQty || block ? 'disabled' : ''}>+</button>
          <span class="muted small">${chosen ? (product.mode === 'made_to_order' ? `Còn nhận làm: ${chosen.stock}` : `Còn ${chosen.stock} sản phẩm`) : (sold ? 'Hết hàng' : `Tổng còn ${totalStock(product)}`)}</span></div>
        <p class="field-error" id="qty-err" role="alert"></p></div>
      ${block ? `<div class="alert alert-warn">${esc(block)}</div>` : ''}
      <div class="row pd-actions">
        <button class="btn btn-ghost btn-lg" id="add-cart" ${block ? 'disabled' : ''}>🛒 Thêm vào giỏ hàng</button>
        <button class="btn btn-primary btn-lg" id="buy-now" ${block ? 'disabled' : ''}>Mua ngay</button>
        <button class="btn btn-ghost" id="fav" aria-pressed="${isFavorite(product.id)}">${isFavorite(product.id) ? '♥ Đã yêu thích' : '♡ Yêu thích'}</button>
        <button class="btn btn-ghost" id="contact">💬 Liên hệ người bán</button>
      </div>
    </div>
  </div>

  <div class="grid-2 pd-details">
    <section class="card"><h2>Mô tả chi tiết</h2><div class="prewrap">${esc(product.desc)}</div>
      <hr><dl class="specs">
        <dt>Chất liệu</dt><dd>${esc(product.material || '—')}</dd>
        <dt>Kích thước</dt><dd>${esc(product.size || '—')}</dd>
        ${product.weight ? `<dt>Trọng lượng</dt><dd>${esc(product.weight)}</dd>` : ''}
        <dt>Làng nghề / nơi sản xuất</dt><dd>${esc(product.village || '—')}</dd>
        <dt>Bảo quản</dt><dd>${esc(product.care || '—')}</dd>
        <dt>Giao hàng</dt><dd>Chuẩn bị hàng ${product.prepDays || 0} ngày${product.fragile ? ' · Hàng dễ vỡ, được đóng gói cẩn thận' : ''}</dd>
      </dl></section>
    <section class="card"><h2>Nghệ nhân / Gian hàng</h2>
      <p><strong>${esc(shop?.name || product.shopName || '')}</strong></p>
      <p class="muted">Nghệ nhân/cơ sở chế tác: ${esc(product.artisan || shop?.artisan || '—')}</p>
      <p>${esc(shop?.story || 'Người bán chưa cập nhật câu chuyện nghề.')}</p>
      <p class="small muted">Thông tin do người bán tự khai báo. Nhãn "Đã xác minh" chỉ hiển thị khi nền tảng thực sự xác minh hồ sơ.</p>
      <hr><h3>Giao hàng &amp; đổi trả</h3>
      <p>Phí vận chuyển cố định ${formatVND(30000)}/gian hàng. Hỗ trợ trả hàng/hoàn tiền trong 48 giờ sau khi giao thành công (xem <a href="${pageUrl('returns')}">chính sách</a>).</p>
      <p><button class="link-btn" id="report">⚑ Báo cáo sản phẩm vi phạm</button></p></section>
  </div>

  <section class="card"><h2>Đánh giá (${reviews.length})</h2>
    ${reviews.length ? reviews.sort((a, b) => b.createdAt - a.createdAt).map((r) => `<div class="review"><p>${renderStars(r.rating)} <strong>${esc(r.userName)}</strong> <span class="muted small">· ${formatDate(r.createdAt)}${r.variantName ? ' · ' + esc(r.variantName) : ''}</span></p>
      <p class="prewrap">${esc(r.text || '')}</p>${(r.images || []).map((s) => `<img class="review-img" src="${esc(s)}" alt="Ảnh đánh giá">`).join('')}</div>`).join('') : '<p class="muted">Chưa có đánh giá nào.</p>'}
  </section>
  <section id="related"></section>`;
}
render();

// ----- Sản phẩm liên quan (cùng danh mục) -----
listVisible().then((list) => {
  const rel = list.filter((p) => p.id !== product.id && p.categoryId === product.categoryId).slice(0, 4);
  if (rel.length) $('#related').innerHTML = `<h2>Sản phẩm liên quan</h2><div class="grid-products cols-4">${rel.map((p) => productCard(p)).join('')}</div>`;
}).catch(() => {});

// ----- Kiểm tra quyền mua: khách / người bán / người mua -----
/** Trả về true nếu được phép mua; ngược lại hiện hướng dẫn phù hợp */
async function ensureBuyer() {
  if (!session) { gotoLogin(); return false; }
  if (role !== 'buyer') {
    const yes = await confirmDialog({ title: 'Cần tài khoản người mua', message: 'Vui lòng đăng xuất và đăng nhập bằng tài khoản người mua.', confirmText: 'Đăng xuất' });
    if (yes) { await logout(); resetSessionCache(); goto('pages/login.html?out=1'); }
    return false;
  }
  return true;
}

/** Kiểm tra đã chọn phiên bản + số lượng hợp lệ */
function validateChoice() {
  $('#variant-err') && ($('#variant-err').textContent = ''); $('#qty-err').textContent = '';
  if (multi && !chosen) { $('#variant-err').textContent = 'Vui lòng chọn đầy đủ mẫu, màu hoặc kích thước.'; return false; }
  qty = Number($('#qty').value);
  if (!Number.isInteger(qty) || qty < 1) { $('#qty-err').textContent = 'Số lượng phải là số nguyên từ 1 trở lên.'; return false; }
  if (qty > chosen.stock) { $('#qty-err').textContent = `Số lượng tối đa hiện có là ${chosen.stock}.`; return false; }
  return true;
}

// ----- Sự kiện -----
on(root, 'click', '[data-img]', (e, el) => {
  $('#main-img').src = el.querySelector('img').src;
  root.querySelectorAll('[data-img]').forEach((b) => b.classList.toggle('cover', b === el));
});
on(root, 'click', '[data-variant]', (e, el) => {
  chosen = variants.find((v) => v.id === el.dataset.variant); qty = 1; render();
});
on(root, 'click', '#qty-minus', () => { qty = Math.max(1, Number($('#qty').value) - 1); render(); });
on(root, 'click', '#qty-plus', () => { qty = Math.min(chosen.stock, Number($('#qty').value) + 1); render(); });
on(root, 'change', '#qty', () => { validateChoice(); });

on(root, 'click', '#add-cart', async () => {
  if (!(await ensureBuyer()) || !validateChoice()) return;
  const n = await addToCart(product.id, chosen.id, qty, chosen.stock);
  refreshCartBadge();
  toast(`Đã thêm vào giỏ hàng (trong giỏ: ${n}).`, 'success');
});
on(root, 'click', '#buy-now', async () => {
  if (!(await ensureBuyer()) || !validateChoice()) return;
  // "Mua ngay": chuyển sang đặt hàng với đúng sản phẩm/phiên bản/số lượng đã chọn (không đụng tới giỏ)
  goto(`pages/checkout.html?now=${encodeURIComponent(product.id)}&v=${encodeURIComponent(chosen.id)}&q=${qty}`);
});
on(root, 'click', '#fav', async (e, el) => {
  if (!(await ensureBuyer())) return;
  const on = await toggleFavorite(product.id);
  el.textContent = on ? '♥ Đã yêu thích' : '♡ Yêu thích'; el.setAttribute('aria-pressed', on);
});
on(root, 'click', '#contact', async () => {
  if (!session) { gotoLogin(); return; }
  // Chưa có hệ thống chat: dẫn tới trang hỗ trợ kèm tên gian hàng
  goto(`pages/contact.html?shop=${encodeURIComponent(product.shopName || '')}&product=${encodeURIComponent(product.name)}`);
});
on(root, 'click', '#report', () => {
  goto(`pages/contact.html?report=${encodeURIComponent(product.id)}&product=${encodeURIComponent(product.name)}`);
});
