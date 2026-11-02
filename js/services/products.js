/**
 * ============================================================
 *  FILE: js/services/products.js
 *  MỤC ĐÍCH: Nghiệp vụ sản phẩm: đọc, lưu, tìm kiếm – lọc – sắp xếp, phiên bản, tồn kho, đánh giá.
 *  (Bám đặc tả người mua mục 3–4 và người bán mục 3–5.)
 * ============================================================
 */
import { backend } from './db.js';
import { expandCategory } from '../data/categories.js';

// ---------- Đọc dữ liệu ----------
/** Sản phẩm đang được phép hiển thị cho người mua */
export const listVisible = () => backend.list('products', [['status', '==', 'visible']]);
/** Sản phẩm của một người bán (mọi trạng thái) */
export const listBySeller = (sellerId) => backend.list('products', [['sellerId', '==', sellerId]]);
export const getProduct = (id) => backend.get('products', id);
export const getShop = (sellerId) => backend.get('shops', sellerId);

// ---------- Phiên bản & tồn kho ----------
/**
 * Mọi sản phẩm đều quy về danh sách phiên bản.
 * Không có nhiều mẫu → có 1 phiên bản ẩn id 'default' lấy giá/tồn kho của sản phẩm.
 */
export function variantsOf(p) {
  if (p.variants && p.variants.length) return p.variants.map((v) => ({ active: true, ...v }));
  return [{ id: 'default', name: '', price: p.price, stock: p.stock ?? 0, active: true }];
}

/** Phiên bản đang bán (người mua chọn được) */
export const activeVariants = (p) => variantsOf(p).filter((v) => v.active !== false);

/** Giá thấp nhất trong các phiên bản đang bán (dùng để hiển thị "Từ …" và sắp xếp giá) */
export function minPrice(p) {
  const prices = activeVariants(p).map((v) => v.price);
  return prices.length ? Math.min(...prices) : p.price || 0;
}
export const hasPriceRange = (p) => new Set(activeVariants(p).map((v) => v.price)).size > 1;

/** Tổng số lượng có thể bán; hàng "làm theo đơn" chỉ bán được khi đang nhận đơn */
export function totalStock(p) {
  if (p.mode === 'made_to_order' && p.accepting === false) return 0;
  return activeVariants(p).reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
}
export const isSoldOut = (p) => totalStock(p) <= 0;

// ---------- Đánh giá ----------
export const avgRating = (p) => (p.ratingCount ? p.ratingSum / p.ratingCount : 0);

// ============================================================
//  TÌM KIẾM – LỌC – SẮP XẾP – PHÂN TRANG  (hàm thuần, chạy trên danh sách đã tải)
// ============================================================
/** Bỏ dấu tiếng Việt + chữ thường để tìm không phân biệt hoa/thường/dấu */
export const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

/**
 * params: { q, category, minPrice, maxPrice, materials[], villages[], minRating, modes[], sort }
 * Trong 1 nhóm chọn nhiều → khớp ÍT NHẤT MỘT; giữa các nhóm → phải đáp ứng ĐỒNG THỜI.
 */
export function filterProducts(list, params = {}) {
  const q = fold(params.q);
  const cats = params.category ? expandCategory(params.category) : null;
  return list.filter((p) => {
    if (q && !fold([p.name, p.material, p.shopName, p.village, p.artisan].join(' ')).includes(q)) return false;
    if (cats && !cats.includes(p.categoryId)) return false;
    // Khớp giá nếu có ÍT NHẤT MỘT phiên bản đang bán nằm trong khoảng giá
    const prices = activeVariants(p).map((v) => v.price);
    if (params.minPrice !== undefined && params.minPrice !== '' && !prices.some((x) => x >= params.minPrice)) return false;
    if (params.maxPrice !== undefined && params.maxPrice !== '' && !prices.some((x) => x <= params.maxPrice)) return false;
    if (params.materials?.length && !params.materials.includes(p.material)) return false;
    if (params.villages?.length && !params.villages.includes(p.village)) return false;
    // Sản phẩm chưa có đánh giá KHÔNG coi là 0 sao, cũng không lọt vào nhóm "từ 4 sao"
    if (params.minRating && !(p.ratingCount && avgRating(p) >= params.minRating)) return false;
    if (params.modes?.length && !params.modes.includes(p.mode)) return false;
    return true;
  });
}

/** Sắp xếp ổn định: nếu bằng nhau thì xét tiếp, cuối cùng dùng mã sản phẩm */
export function sortProducts(list, sort = 'newest') {
  const byId = (a, b) => String(a.id).localeCompare(String(b.id));
  const cmp = {
    newest: (a, b) => (b.publishedAt || b.createdAt || 0) - (a.publishedAt || a.createdAt || 0),
    'price-asc': (a, b) => minPrice(a) - minPrice(b),
    'price-desc': (a, b) => minPrice(b) - minPrice(a),
    rating: (a, b) => {
      if (!a.ratingCount && !b.ratingCount) return 0;
      if (!a.ratingCount) return 1;                              // chưa có đánh giá xếp cuối
      if (!b.ratingCount) return -1;
      return avgRating(b) - avgRating(a) || b.ratingCount - a.ratingCount;
    }
  }[sort] || (() => 0);
  return [...list].sort((a, b) => cmp(a, b) || byId(a, b));
}

/** Cắt trang: trả về {items, page, pages, total} */
export function paginate(list, page, size) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { items: list.slice((p - 1) * size, p * size), page: p, pages, total: list.length };
}

// ============================================================
//  LƯU SẢN PHẨM (người bán)
// ============================================================
export async function saveProduct(id, data) {
  const now = Date.now();
  if (id) { await backend.update('products', id, { ...data, updatedAt: now }); return id; }
  return backend.add('products', { ...data, ratingSum: 0, ratingCount: 0, createdAt: now, updatedAt: now });
}

/** Đổi trạng thái hiển thị: draft | visible | hidden */
export const setStatus = (id, status) => backend.update('products', id, { status, updatedAt: Date.now(), ...(status === 'visible' ? { publishedAt: Date.now() } : {}) });

/** Xóa: chỉ bản nháp chưa có đơn; sản phẩm đã có đơn chỉ được ẩn/lưu trữ */
export async function deleteProduct(id) {
  const orders = await backend.list('orders', [['sellerId', '==', (await getProduct(id)).sellerId]]);
  const linked = orders.some((o) => o.items.some((i) => i.productId === id));
  if (linked) { await setStatus(id, 'hidden'); return 'archived'; }
  await backend.remove('products', id);
  return 'deleted';
}

// ---------- Đánh giá sản phẩm ----------
export const listReviews = (productId) => backend.list('reviews', [['productId', '==', productId]]);
