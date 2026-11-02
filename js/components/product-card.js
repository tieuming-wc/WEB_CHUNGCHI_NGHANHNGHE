/**
 * ============================================================
 *  FILE: js/components/product-card.js
 *  MỤC ĐÍCH: Vẽ "ô sản phẩm" và các thành phần nhỏ liên quan (sao, phân trang).
 *  Thứ tự trong ô (đặc tả 3.6): ảnh vuông → tên (tối đa 2 dòng) → giá → điểm & lượt đánh giá → gian hàng + địa phương.
 * ============================================================
 */
import { esc } from '../utils/dom.js';
import { formatVND } from '../utils/format.js';
import { pageUrl } from '../utils/paths.js';
import { placeholderImage } from '../utils/image.js';
import { minPrice, hasPriceRange, isSoldOut, avgRating } from '../services/products.js';
import { categoryHue } from '../data/categories.js';

/** Vẽ hàng sao: renderStars(4.3) → ★★★★☆ */
export function renderStars(value) {
  const full = Math.round(value);
  return `<span class="stars" aria-label="${value.toFixed(1)} trên 5 sao">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span>`;
}

/** Ảnh bìa sản phẩm (hoặc ảnh giữ chỗ nếu thiếu) */
export const coverOf = (p) => p.images?.[0] || placeholderImage(p.name, categoryHue(p.categoryId));

/**
 * HTML của một ô sản phẩm.
 * opts.favorite: true/false → có hiện nút trái tim; undefined → ẩn trái tim
 */
export function productCard(p, { favorite } = {}) {
  const soldOut = isSoldOut(p);
  const price = (hasPriceRange(p) ? 'Từ ' : '') + formatVND(minPrice(p));
  const rating = p.ratingCount
    ? `${renderStars(avgRating(p))} <span class="muted">(${p.ratingCount})</span>`
    : '<span class="muted">Chưa có đánh giá</span>';                // không tự tạo sao
  return `
  <article class="p-card ${soldOut ? 'is-soldout' : ''}">
    <a class="p-img" href="${pageUrl('product', { id: p.id })}" aria-label="${esc(p.name)}">
      <img src="${esc(coverOf(p))}" alt="${esc(p.name)}" loading="lazy">
      ${soldOut ? '<span class="badge badge-gray">Hết hàng</span>' : ''}
      ${p.mode === 'made_to_order' ? '<span class="badge badge-gold">Làm theo đơn</span>' : ''}
    </a>
    ${favorite === undefined ? '' : `<button class="fav-btn ${favorite ? 'on' : ''}" type="button" data-fav="${esc(p.id)}" aria-pressed="${favorite}" aria-label="Yêu thích">${favorite ? '♥' : '♡'}</button>`}
    <div class="p-body">
      <h3 class="p-name"><a href="${pageUrl('product', { id: p.id })}">${esc(p.name)}</a></h3>
      <p class="p-price">${price}</p>
      <p class="p-rating">${rating}</p>
      <p class="p-shop muted">${esc(p.shopName || '')}${p.village ? ' · ' + esc(p.village) : ''}</p>
    </div>
  </article>`;
}

/**
 * Thanh phân trang. Trả về HTML; gắn sự kiện bằng data-page ở nơi gọi.
 * "Trước" khóa ở trang đầu, "Sau" khóa ở trang cuối; chỉ 1 trang thì ẩn.
 */
export function paginationHtml(page, pages) {
  if (pages <= 1) return '';
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return `<nav class="pagination" aria-label="Phân trang">
    <button class="btn btn-ghost btn-sm" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹ Trước</button>
    ${nums.map((n) => n === '…' ? '<span class="muted">…</span>' : `<button class="btn btn-sm ${n === page ? 'btn-primary' : 'btn-ghost'}" data-page="${n}" ${n === page ? 'aria-current="page"' : ''}>${n}</button>`).join('')}
    <button class="btn btn-ghost btn-sm" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>Sau ›</button>
  </nav>`;
}

/** Khung chờ khi đang tải (đặc tả 10.1: không hiện "trống" như thể đã tải xong) */
export const skeletonGrid = (n = 6) => `<div class="grid-products">${Array.from({ length: n }, () => '<div class="p-card skeleton"><div class="p-img"></div><div class="p-body"><div class="sk-line"></div><div class="sk-line short"></div></div></div>').join('')}</div>`;

/** Trạng thái lỗi tải dữ liệu + nút Thử lại */
export const errorBox = (msg = 'Chưa tải được dữ liệu') => `<div class="empty-state"><p>${esc(msg)}</p><button class="btn btn-primary" data-retry>Thử lại</button></div>`;
