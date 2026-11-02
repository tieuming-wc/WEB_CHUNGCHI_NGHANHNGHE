/**
 * ============================================================
 *  FILE: js/data/categories.js
 *  MỤC ĐÍCH: Cây danh mục sản phẩm (cha → con), DÙNG CHUNG cho phía người mua và người bán
 *  (đặc tả: "Danh mục dùng cùng cây phân cấp với phía người mua").
 * ============================================================
 */

export const CATEGORIES = [
  { id: 'gom', name: 'Gốm sứ', hue: 22, children: [
    { id: 'gom-binh', name: 'Bình / lọ' },
    { id: 'gom-am-chen', name: 'Bộ ấm chén' },
    { id: 'gom-trang-tri', name: 'Đồ trang trí' } ] },
  { id: 'may-tre', name: 'Mây tre đan', hue: 42, children: [
    { id: 'may-tre-gio', name: 'Giỏ' },
    { id: 'may-tre-khay', name: 'Khay' },
    { id: 'may-tre-den', name: 'Đèn' } ] },
  { id: 'det', name: 'Dệt & thêu', hue: 340, children: [
    { id: 'det-lua', name: 'Lụa' },
    { id: 'det-tho-cam', name: 'Thổ cẩm' },
    { id: 'det-theu', name: 'Thêu tay' } ] },
  { id: 'go', name: 'Sơn mài & gỗ mỹ nghệ', hue: 8, children: [
    { id: 'go-son-mai', name: 'Tranh sơn mài' },
    { id: 'go-chap-khac', name: 'Tượng & chạm khắc' },
    { id: 'go-kham-trai', name: 'Đồ khảm trai' } ] }
];

/** Danh sách phẳng tất cả danh mục (cha + con) */
export const flatCategories = () => CATEGORIES.flatMap((c) => [c, ...c.children]);

/** Tìm danh mục theo id */
export const findCategory = (id) => flatCategories().find((c) => c.id === id) || null;

/** Tìm danh mục cha của một id (nếu id là con) */
export const parentOf = (id) => CATEGORIES.find((p) => p.children.some((c) => c.id === id)) || null;

/** Chọn danh mục cha → gồm cả các con; chọn con → chỉ nhóm đó */
export function expandCategory(id) {
  const parent = CATEGORIES.find((c) => c.id === id);
  return parent ? [parent.id, ...parent.children.map((c) => c.id)] : [id];
}

/** Tên đầy đủ "Gốm sứ › Bình / lọ" */
export function categoryPath(id) {
  const c = findCategory(id); if (!c) return '';
  const p = parentOf(id);
  return p ? `${p.name} › ${c.name}` : c.name;
}

/** Màu chủ đạo của danh mục (dùng cho ảnh giữ chỗ) */
export const categoryHue = (id) => (parentOf(id) || findCategory(id) || { hue: 28 }).hue;
