/**
 * ============================================================
 *  FILE: js/pages/home.js
 *  TRANG: Trang chủ (index.html)
 *  Gồm: banner với 2 lối vào "Mua hàng" / "Bán hàng", danh mục, sản phẩm mới, 3 điểm khác biệt
 *  của dự án, chứng nhận & tra cứu, học nghề, và — khi đã đăng nhập — khối
 *  "Tiếp tục nơi bạn đã dừng" (trang xem gần nhất + sản phẩm đã xem), lấy từ tài khoản trên máy chủ.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { listVisible, sortProducts, getProduct } from '../services/products.js';
import { getState } from '../services/userstate.js';
import { productCard } from '../components/product-card.js';
import { CATEGORIES } from '../data/categories.js';
import { APP } from '../config/app-config.js';
import { $, esc } from '../utils/dom.js';
import { pageUrl, goto, ROOT } from '../utils/paths.js';

const session = await initLayout({ active: 'home', title: 'Trang chủ' });
const role = session?.profile?.role;

// ----- Lối vào Mua / Bán theo vai trò -----
$('#cta-buy').href = pageUrl('shop');
$('#cta-sell').href = role === 'seller' ? pageUrl('seller-products') : session ? pageUrl('seller-products') : pageUrl('register', { role: 'seller' });
if (role === 'seller') $('#cta-sell').textContent = 'Vào Kênh người bán';

// ----- Danh mục -----
$('#cats').innerHTML = CATEGORIES.map((c) => `<a class="cat-tile" href="${pageUrl('shop', { cat: c.id })}" style="--h:${c.hue}"><span class="cat-icon">${{ gom: '🏺', 'may-tre': '🧺', det: '🧵', go: '🪵' }[c.id]}</span><strong>${esc(c.name)}</strong><span class="small">${esc(c.children.map((k) => k.name).join(' · '))}</span></a>`).join('');

// ----- Tra cứu nhanh chứng nhận -----
$('#quick-lookup').addEventListener('submit', (e) => { e.preventDefault(); const c = $('#quick-code').value.trim(); goto(`pages/certificate-lookup.html${c ? '?code=' + encodeURIComponent(c) : ''}`); });

// ----- Sản phẩm mới + "Tiếp tục nơi bạn đã dừng" -----
try {
  const all = await listVisible();
  const latest = sortProducts(all, 'newest').slice(0, 8);
  $('#latest').innerHTML = latest.length ? `<div class="grid-products cols-4">${latest.map((p) => productCard(p)).join('')}</div>` : `<div class="empty-state"><p>Chưa có sản phẩm nào. Nghệ nhân hãy là người đầu tiên đăng bán!</p><a class="btn btn-primary" href="${pageUrl('register', { role: 'seller' })}">Đăng ký bán hàng</a></div>`;

  if (session) {
    const st = getState();
    const recent = (await Promise.all(st.recent.slice(0, 4).map((id) => getProduct(id).catch(() => null)))).filter((p) => p && p.status === 'visible');
    if (st.lastPage || recent.length) {
      const box = $('#continue');
      box.hidden = false;
      box.innerHTML = `<div class="container"><div class="card continue-card"><h2>👋 Chào mừng trở lại, ${esc(session.profile?.name || '')}!</h2>
        ${st.lastPage ? `<p>Lần trước bạn đang xem: <a href="${ROOT + st.lastPage}"><strong>${esc(st.lastPageTitle || 'Trang gần nhất')}</strong></a></p>` : ''}
        ${recent.length ? `<p class="muted">Sản phẩm bạn đã xem gần đây:</p><div class="grid-products cols-4">${recent.map((p) => productCard(p)).join('')}</div>` : ''}</div></div>`;
    }
  }
} catch (e) { console.error(e); $('#latest').innerHTML = '<div class="empty-state"><p>Chưa tải được dữ liệu</p><button class="btn btn-primary" onclick="location.reload()">Thử lại</button></div>'; }
