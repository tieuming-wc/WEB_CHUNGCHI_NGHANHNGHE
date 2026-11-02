/**
 * ============================================================
 *  FILE: js/pages/favorites.js
 *  TRANG: Sản phẩm yêu thích (pages/favorites.html) – chỉ người mua
 *  Danh sách lưu trên tài khoản → đồng bộ mọi thiết bị. Sản phẩm đã ẩn/bị khóa không hiển thị.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { requireAuth } from '../services/session.js';
import { getState } from '../services/userstate.js';
import { toggleFavorite } from '../services/cart.js';
import { getProduct } from '../services/products.js';
import { productCard, skeletonGrid } from '../components/product-card.js';
import { $, on } from '../utils/dom.js';
import { pageUrl } from '../utils/paths.js';

const auth = await requireAuth({ roles: ['buyer'] });
if (!auth) throw new Error('stop');
await initLayout({ active: 'shop', title: 'Sản phẩm yêu thích' });

async function render() {
  const ids = getState().favorites;
  if (!ids.length) { $('#grid').innerHTML = `<div class="empty-state"><div class="big">♡</div><p>Bạn chưa có sản phẩm yêu thích nào.</p><a class="btn btn-primary" href="${pageUrl('shop')}">Khám phá sản phẩm</a></div>`; return; }
  $('#grid').innerHTML = skeletonGrid(3);
  const items = (await Promise.all(ids.map((id) => getProduct(id).catch(() => null)))).filter((p) => p && p.status === 'visible');
  $('#grid').innerHTML = items.length ? `<div class="grid-products">${items.map((p) => productCard(p, { favorite: true })).join('')}</div>` : '<div class="empty-state"><p>Các sản phẩm yêu thích hiện không còn bán.</p></div>';
}
on(document, 'click', '[data-fav]', async (e, el) => { e.preventDefault(); await toggleFavorite(el.dataset.fav); render(); });
await render();
