/**
 * ============================================================
 *  FILE: js/services/cart.js
 *  MỤC ĐÍCH: Giỏ hàng và danh sách yêu thích – lưu trong "trí nhớ tài khoản" (userState)
 *  nên đăng nhập ở máy khác vẫn thấy giỏ hàng cũ.
 *  Lưu ý (đặc tả): "Thêm vào giỏ không giữ hàng và không có nghĩa đã đặt mua".
 * ============================================================
 */
import { getState, patchState } from './userstate.js';
import { getProduct, variantsOf, totalStock } from './products.js';

/** Tổng số dòng trong giỏ (hiện trên biểu tượng giỏ hàng) */
export const cartCount = () => getState().cart.reduce((n, l) => n + l.qty, 0);

/** Thêm vào giỏ: cùng sản phẩm + cùng phiên bản thì cộng dồn số lượng, không vượt tồn kho */
export async function addToCart(productId, variantId, qty, maxStock) {
  const cart = [...getState().cart];
  const line = cart.find((l) => l.productId === productId && l.variantId === variantId);
  const next = Math.min((line?.qty || 0) + qty, maxStock);
  if (line) line.qty = next; else cart.push({ productId, variantId, qty: next });
  await patchState({ cart });
  return next;
}

export const setQty = async (productId, variantId, qty) => {
  const cart = getState().cart.map((l) => (l.productId === productId && l.variantId === variantId ? { ...l, qty } : l));
  await patchState({ cart });
};

export const removeLine = async (productId, variantId) => {
  await patchState({ cart: getState().cart.filter((l) => !(l.productId === productId && l.variantId === variantId)) });
};

/** Bỏ các dòng đã đặt hàng khỏi giỏ */
export const removeLines = async (keys) => {
  await patchState({ cart: getState().cart.filter((l) => !keys.includes(l.productId + '|' + l.variantId)) });
};

/**
 * Chuyển giỏ hàng thành các dòng "đầy đủ thông tin" bằng dữ liệu MỚI NHẤT của sản phẩm.
 * Mỗi dòng có cờ `problem` nếu hết hàng / ngừng bán / quá tồn kho để giao diện hiện lý do.
 */
export async function resolveCart() {
  const lines = [];
  for (const l of getState().cart) {
    const p = await getProduct(l.productId).catch(() => null);
    const v = p ? variantsOf(p).find((x) => x.id === l.variantId) : null;
    let problem = '';
    if (!p || p.status !== 'visible') problem = 'Sản phẩm đã ngừng bán hoặc bị ẩn';
    else if (!v || v.active === false) problem = 'Phiên bản này đã ngừng bán';
    else if (totalStock(p) <= 0 || v.stock <= 0) problem = 'Hết hàng';
    else if (l.qty > v.stock) problem = `Chỉ còn ${v.stock} sản phẩm`;
    lines.push({ ...l, key: l.productId + '|' + l.variantId, product: p, variant: v, problem, price: v?.price ?? 0 });
  }
  return lines;
}

// ---------- Yêu thích ----------
export const isFavorite = (id) => getState().favorites.includes(id);
export async function toggleFavorite(id) {
  const fav = getState().favorites;
  const next = fav.includes(id) ? fav.filter((x) => x !== id) : [id, ...fav];
  await patchState({ favorites: next });
  return next.includes(id);
}
