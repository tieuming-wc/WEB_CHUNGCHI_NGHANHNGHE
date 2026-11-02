/**
 * ============================================================
 *  FILE: js/pages/shop.js
 *  TRANG: Danh sách sản phẩm – "Mua hàng" (pages/shop.html)
 *  Bám đặc tả người mua mục 3: tìm kiếm, cây danh mục, bộ lọc (giá, chất liệu, làng nghề,
 *  đánh giá, tình trạng), sắp xếp, phân trang 12 sản phẩm/trang, trạng thái đang tải / trống / lỗi.
 *  Mọi lựa chọn được ghi vào địa chỉ trang (URL) nên có thể chia sẻ / quay lại đúng kết quả.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { listVisible, filterProducts, sortProducts, paginate } from '../services/products.js';
import { toggleFavorite, isFavorite } from '../services/cart.js';
import { productCard, paginationHtml, skeletonGrid, errorBox } from '../components/product-card.js';
import { toast } from '../components/toast.js';
import { CATEGORIES, findCategory, parentOf } from '../data/categories.js';
import { APP } from '../config/app-config.js';
import { $, $$, esc, qs, on } from '../utils/dom.js';
import { gotoLogin, pageUrl } from '../utils/paths.js';

const session = await initLayout({ active: 'shop', title: 'Mua hàng', search: qs('q') || '' });
const role = session?.profile?.role;

// ----- Trạng thái bộ lọc, đọc từ URL -----
const params = new URLSearchParams(location.search);
const state = {
  q: params.get('q') || '', category: params.get('cat') || '', sort: params.get('sort') || 'newest',
  page: Number(params.get('page')) || 1, minPrice: params.get('min') ?? '', maxPrice: params.get('max') ?? '',
  materials: params.getAll('mat'), villages: params.getAll('vil'), minRating: Number(params.get('rating')) || 0,
  modes: params.getAll('mode')
};
let all = [];

/** Ghi trạng thái lên URL (không tải lại trang) */
function syncUrl() {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.category) p.set('cat', state.category);
  if (state.sort !== 'newest') p.set('sort', state.sort);
  if (state.page > 1) p.set('page', state.page);
  if (state.minPrice !== '') p.set('min', state.minPrice);
  if (state.maxPrice !== '') p.set('max', state.maxPrice);
  state.materials.forEach((m) => p.append('mat', m));
  state.villages.forEach((v) => p.append('vil', v));
  if (state.minRating) p.set('rating', state.minRating);
  state.modes.forEach((m) => p.append('mode', m));
  history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
}

// ----- Vẽ cây danh mục -----
function renderCategories() {
  const active = state.category;
  const activeParent = parentOf(active)?.id || active;
  $('#cat-tree').innerHTML = `
    <li><button class="cat ${!active ? 'on' : ''}" data-cat="">Tất cả sản phẩm</button></li>
    ${CATEGORIES.map((c) => `
      <li><button class="cat ${active === c.id ? 'on' : ''}" data-cat="${c.id}">${esc(c.name)}</button>
        ${activeParent === c.id ? `<ul>${c.children.map((k) => `<li><button class="cat sub ${active === k.id ? 'on' : ''}" data-cat="${k.id}">${esc(k.name)}</button></li>`).join('')}</ul>` : ''}
      </li>`).join('')}`;
}

// ----- Vẽ các nhóm lọc (chất liệu, làng nghề lấy từ dữ liệu thật) -----
function renderFilters() {
  const uniq = (key) => [...new Set(all.map((p) => p[key]).filter(Boolean))].sort();
  const checks = (name, list, chosen) => list.map((v) => `<label class="check"><input type="checkbox" name="${name}" value="${esc(v)}" ${chosen.includes(v) ? 'checked' : ''}> <span>${esc(v)}</span></label>`).join('') || '<p class="muted small">Chưa có dữ liệu</p>';
  $('#f-materials').innerHTML = checks('mat', uniq('material'), state.materials);
  $('#f-villages').innerHTML = checks('vil', uniq('village'), state.villages);
  $('#f-min').value = state.minPrice; $('#f-max').value = state.maxPrice;
  $('#f-rating').checked = state.minRating >= 4;
  $$('input[name="mode"]').forEach((i) => { i.checked = state.modes.includes(i.value); });
  $('#sort').value = state.sort;
}

// ----- Vẽ kết quả -----
function renderResults() {
  const filtered = sortProducts(filterProducts(all, state), state.sort);
  const pg = paginate(filtered, state.page, APP.PAGE_SIZE);
  state.page = pg.page;
  const cat = state.category ? findCategory(state.category) : null;
  $('#crumb').innerHTML = `<a href="${pageUrl('shop')}">Trang chủ</a> › <a href="${pageUrl('shop')}">Mua hàng</a>${cat ? ' › ' + esc(parentOf(cat.id) && parentOf(cat.id).id !== cat.id ? parentOf(cat.id).name + ' › ' : '') + esc(cat.name) : ''}`;
  $('#result-title').textContent = state.q ? `Kết quả cho "${state.q}"` : cat ? cat.name : 'Tất cả sản phẩm';
  $('#result-count').textContent = `${pg.total} sản phẩm`;

  if (!pg.total) {
    $('#grid').innerHTML = `<div class="empty-state"><div class="big">🔍</div><p>Không tìm thấy sản phẩm phù hợp</p><button class="btn btn-primary" id="clear-all">Xóa bộ lọc</button></div>`;
  } else {
    const loggedBuyer = role === 'buyer';
    $('#grid').innerHTML = `<div class="grid-products">${pg.items.map((p) => productCard(p, loggedBuyer ? { favorite: isFavorite(p.id) } : {})).join('')}</div>`;
  }
  $('#pager').innerHTML = paginationHtml(pg.page, pg.pages);
  renderCategories();
  syncUrl();
}

async function load() {
  $('#grid').innerHTML = skeletonGrid(6);                        // khung chờ, không hiện "trống" khi chưa tải xong
  try { all = await listVisible(); }
  catch (e) { console.error(e); $('#grid').innerHTML = errorBox(); $('#grid [data-retry]').onclick = load; return; }
  renderFilters(); renderResults();
}

// ----- Sự kiện -----
on(document, 'click', '[data-cat]', (e, el) => { state.category = el.dataset.cat; state.page = 1; renderResults(); });
on(document, 'click', '[data-page]', (e, el) => { if (el.disabled) return; state.page = Number(el.dataset.page); renderResults(); scrollTo({ top: 0, behavior: 'smooth' }); });
on(document, 'click', '#clear-all', () => clearFilters(true));
$('#sort').addEventListener('change', (e) => { state.sort = e.target.value; state.page = 1; renderResults(); });

/** Xóa bộ lọc: đưa về mặc định nhưng GIỮ từ khóa và danh mục (trừ khi clearAll = true) */
function clearFilters(clearAll = false) {
  state.minPrice = state.maxPrice = ''; state.materials = []; state.villages = []; state.minRating = 0; state.modes = [];
  if (clearAll) { state.q = ''; state.category = ''; }
  state.page = 1; renderFilters(); renderResults();
}
$('#clear-filters').addEventListener('click', () => clearFilters(false));

$('#filter-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const min = $('#f-min').value.trim(), max = $('#f-max').value.trim();
  const err = $('#price-err'); err.textContent = '';
  // Khoảng giá chỉ nhận số không âm; thấp nhất không được lớn hơn cao nhất
  if ((min !== '' && (isNaN(min) || Number(min) < 0)) || (max !== '' && (isNaN(max) || Number(max) < 0))) { err.textContent = 'Giá chỉ nhận số không âm.'; return; }
  if (min !== '' && max !== '' && Number(min) > Number(max)) { err.textContent = 'Giá thấp nhất không được lớn hơn giá cao nhất.'; return; }
  state.minPrice = min === '' ? '' : Number(min); state.maxPrice = max === '' ? '' : Number(max);
  state.materials = $$('input[name="mat"]:checked').map((i) => i.value);
  state.villages = $$('input[name="vil"]:checked').map((i) => i.value);
  state.minRating = $('#f-rating').checked ? 4 : 0;
  state.modes = $$('input[name="mode"]:checked').map((i) => i.value);
  state.page = 1; renderResults();
  $('#filters').classList.remove('open');
});
$('#toggle-filters').addEventListener('click', () => $('#filters').classList.toggle('open'));

// Yêu thích: khách → yêu cầu đăng nhập
on(document, 'click', '[data-fav]', async (e, el) => {
  e.preventDefault();
  if (!session) { gotoLogin(); return; }
  const on = await toggleFavorite(el.dataset.fav);
  el.classList.toggle('on', on); el.textContent = on ? '♥' : '♡'; el.setAttribute('aria-pressed', on);
  toast(on ? 'Đã thêm vào yêu thích.' : 'Đã bỏ khỏi yêu thích.', 'info', 2000);
});

await load();
