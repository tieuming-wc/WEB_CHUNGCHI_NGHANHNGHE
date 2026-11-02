/**
 * ============================================================
 *  FILE: js/pages/seller-product-form.js
 *  TRANG: Đăng sản phẩm / Chỉnh sửa sản phẩm (pages/seller-product-form.html[?id=...])
 *  Bám đặc tả người bán mục 4–5:
 *   - Khối: Ảnh, Video, Thông tin cơ bản, Mô tả, Giá & số lượng (có sẵn / làm theo đơn / nhiều phiên bản), Giao hàng
 *   - Ảnh bìa là ảnh đầu tiên; đổi thứ tự; xóa ảnh bìa thì ảnh kế tiếp thành bìa
 *   - "Lưu bản nháp" chỉ cần tên; "Đăng" yêu cầu đủ trường; lỗi hiện dưới đúng ô và cuộn tới ô lỗi đầu tiên
 *   - Rời trang khi có thay đổi chưa lưu → hỏi xác nhận; khóa nút khi đang lưu (tránh trùng)
 *  Giới hạn bản này: ảnh được nén và lưu trực tiếp trong CSDL (tối đa 5 ảnh); video dùng liên kết YouTube/Vimeo.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { requireAuth } from '../services/session.js';
import { getProduct, saveProduct, getShop, variantsOf } from '../services/products.js';
import { confirmDialog } from '../components/modal.js';
import { toast, flash } from '../components/toast.js';
import { CATEGORIES } from '../data/categories.js';
import { VILLAGES } from '../data/villages.js';
import { APP } from '../config/app-config.js';
import { compressImage, validateImageFile } from '../utils/image.js';
import { validateText, validateInt } from '../utils/validators.js';
import { $, $$, esc, qs, on, setBusy, randomId, focusFirstError } from '../utils/dom.js';
import { goto, pageUrl } from '../utils/paths.js';
import { showFieldError, bindValidation } from '../utils/form.js';

const auth = await requireAuth({ roles: ['seller'] });
if (!auth) throw new Error('stop');
await initLayout({ kind: 'seller', active: qs('id') ? 'products' : 'new', title: qs('id') ? 'Chỉnh sửa sản phẩm' : 'Đăng sản phẩm' });
const uid = auth.user.uid;
const shop = await getShop(uid).catch(() => null);
const root = $('#form-root');

// ----- Trạng thái của form -----
const editId = qs('id');
let existing = null;
if (editId) {
  existing = await getProduct(editId).catch(() => null);
  if (!existing || existing.sellerId !== uid) { root.innerHTML = '<div class="empty-state"><p>Không tìm thấy sản phẩm của bạn.</p><a class="btn btn-primary" href="' + pageUrl('seller-products') + '">Về danh sách</a></div>'; throw new Error('stop'); }
}
const locked = existing?.status === 'locked';
const S = {
  images: existing?.images ? [...existing.images] : [],
  variants: (existing?.variants || []).map((v) => ({ ...v })),
  multi: !!existing?.variants?.length,
  mode: existing?.mode || 'available'
};
let dirty = false;                                               // có thay đổi chưa lưu?

// ----- Vẽ form -----
const catOptions = '<option value="">— Chọn danh mục —</option>' + CATEGORIES.map((c) => `<optgroup label="${esc(c.name)}">${c.children.map((k) => `<option value="${k.id}">${esc(c.name)} › ${esc(k.name)}</option>`).join('')}</optgroup>`).join('');
const E = existing || {};
root.innerHTML = `
  <h1>${editId ? 'Chỉnh sửa sản phẩm' : 'Đăng sản phẩm mới'}</h1>
  ${editId ? `<p class="muted">Mã: <strong>${esc(editId)}</strong> · Trạng thái: <span class="badge badge-gold">${{ draft: 'Bản nháp', visible: 'Đang hiển thị', hidden: 'Đã ẩn', locked: 'Bị khóa' }[E.status]}</span></p>` : ''}
  ${locked ? `<div class="alert alert-error"><strong>Sản phẩm đang bị khóa.</strong> ${esc(E.lockReason || '')} Bạn không tự bật bán lại được; hãy liên hệ hỗ trợ.</div>` : ''}
  ${E.status === 'visible' ? '<div class="alert alert-info">Đổi giá chỉ áp dụng cho lượt đặt MỚI; đơn đã đặt giữ nguyên giá, phiên bản và số lượng đã chốt.</div>' : ''}
  <form id="pf" novalidate>
   <fieldset ${locked ? 'disabled' : ''}>
    <section class="card"><h2>1. Ảnh sản phẩm <span class="req">*</span></h2>
      <div class="uploader" id="drop" tabindex="0" role="button" aria-label="Thêm ảnh sản phẩm">📷 <strong>Thêm ảnh sản phẩm</strong> hoặc kéo thả vào đây<br><span class="muted small">JPG/PNG/WebP, mỗi ảnh ≤ ${APP.MAX_IMAGE_MB}MB, tối đa ${APP.MAX_IMAGES} ảnh (ảnh được tự nén). Ảnh đầu tiên là ảnh bìa.</span></div>
      <input id="file" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden>
      <div class="thumbs" id="thumbs"></div><p class="field-error" id="img-err" role="alert"></p></section>

    <section class="card"><h2>2. Video (tùy chọn)</h2>
      <div class="field"><label for="video">Liên kết video YouTube / Vimeo</label><input id="video" type="url" value="${esc(E.videoUrl || '')}" placeholder="https://www.youtube.com/watch?v=..."><p class="field-hint">Video chỉ phát khi người mua chọn, không tự phát có âm thanh.</p><p class="field-error"></p></div></section>

    <section class="card"><h2>3. Thông tin cơ bản</h2>
      <div class="field"><label for="name">Tên sản phẩm <span class="req">*</span></label><input id="name" type="text" maxlength="140" value="${esc(E.name || '')}"><p class="field-hint">5–120 ký tự.</p><p class="field-error"></p></div>
      <div class="field"><label for="cat">Danh mục <span class="req">*</span></label><select id="cat">${catOptions}</select><p class="field-error"></p></div>
      <div class="grid-2">
        <div class="field"><label for="material">Chất liệu <span class="req">*</span></label><input id="material" type="text" maxlength="60" value="${esc(E.material || '')}" placeholder="Ví dụ: Gốm men rạn, Mây tự nhiên"><p class="field-error"></p></div>
        <div class="field"><label for="village">Làng nghề / địa phương sản xuất <span class="req">*</span></label><select id="village"><option value="">— Chọn —</option>${VILLAGES.map((v) => `<option ${E.village === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select><p class="field-error"></p></div>
      </div>
      <div class="field"><label for="artisan">Nghệ nhân / cơ sở chế tác <span class="req">*</span></label><input id="artisan" type="text" maxlength="80" value="${esc(E.artisan || shop?.artisan || '')}"><p class="field-hint">Tên gian hàng lấy từ hồ sơ gian hàng của bạn (${esc(shop?.name || '')}). Nhãn "Đã xác minh" do nền tảng cấp, bạn không tự tích.</p><p class="field-error"></p></div></section>

    <section class="card"><h2>4. Mô tả</h2>
      <div class="field"><label for="short">Mô tả ngắn (tối đa 300 ký tự)</label><textarea id="short" rows="3" maxlength="300">${esc(E.shortDesc || '')}</textarea><p class="field-error"></p></div>
      <div class="field"><label for="desc">Mô tả chi tiết <span class="req">*</span></label><textarea id="desc" rows="8" maxlength="5000">${esc(E.desc || '')}</textarea><p class="field-hint">50–5.000 ký tự. Nên có: công dụng, chất liệu, đặc điểm chế tác, hướng dẫn bảo quản.</p><p class="field-error"></p></div>
      <div class="grid-3">
        <div class="field"><label for="size">Kích thước (ghi rõ đơn vị cm)</label><input id="size" type="text" maxlength="60" value="${esc(E.size || '')}" placeholder="Cao 30 cm, rộng 15 cm"></div>
        <div class="field"><label for="weight">Trọng lượng (g hoặc kg)</label><input id="weight" type="text" maxlength="30" value="${esc(E.weight || '')}" placeholder="800 g"></div>
        <div class="field"><label for="care">Hướng dẫn bảo quản</label><input id="care" type="text" maxlength="200" value="${esc(E.care || '')}"></div>
      </div></section>

    <section class="card"><h2>5. Giá và số lượng</h2>
      <div class="field"><span class="field-label">Tình trạng hàng <span class="req">*</span></span>
        <div class="radio-row"><label><input type="radio" name="mode" value="available" ${S.mode === 'available' ? 'checked' : ''}> Có sẵn</label><label><input type="radio" name="mode" value="made_to_order" ${S.mode === 'made_to_order' ? 'checked' : ''}> Làm theo đơn</label></div></div>
      <div class="field"><label class="check"><input type="checkbox" id="multi" ${S.multi ? 'checked' : ''}> <span>Có nhiều mẫu / màu / kích thước</span></label></div>
      <div id="single-box">
        <div class="grid-2">
          <div class="field"><label for="price">Giá bán (VNĐ) <span class="req">*</span></label><input id="price" type="number" min="1" step="1" inputmode="numeric" value="${E.price || ''}"><p class="field-error"></p></div>
          <div class="field"><label for="stock" id="stock-label">Số lượng tồn kho <span class="req">*</span></label><input id="stock" type="number" min="0" step="1" inputmode="numeric" value="${E.stock ?? ''}"><p class="field-hint" id="stock-hint">Cho phép bằng 0: người mua sẽ thấy "Hết hàng".</p><p class="field-error"></p></div>
        </div></div>
      <div id="variant-box" hidden><p class="muted small">Mỗi phiên bản có tên duy nhất, giá hợp lệ và số lượng (hoặc giới hạn nhận làm). Phiên bản ngừng bán được giữ để đối chiếu đơn cũ nhưng người mua không chọn mới được.</p>
        <div id="variants"></div><button type="button" class="btn btn-ghost btn-sm" id="add-variant">+ Thêm phiên bản</button><p class="field-error" id="var-err" role="alert"></p></div>
      <div id="mto-box" hidden class="grid-2">
        <div class="field"><label for="prep-mto">Thời gian chế tác dự kiến (ngày) <span class="req">*</span></label><input id="prep-mto" type="number" min="1" step="1" value="${E.mode === 'made_to_order' ? E.prepDays || '' : ''}"><p class="field-error"></p></div>
        <div class="field"><label for="accepting">Nhận đơn</label><select id="accepting"><option value="1" ${E.accepting !== false ? 'selected' : ''}>Đang nhận đơn</option><option value="0" ${E.accepting === false ? 'selected' : ''}>Tạm ngừng nhận đơn</option></select></div></div></section>

    <section class="card"><h2>6. Giao hàng</h2>
      <div class="field"><label for="ship-from">Địa chỉ gửi hàng <span class="req">*</span></label><input id="ship-from" type="text" maxlength="200" value="${esc(E.shipFrom || shop?.address || '')}"><p class="field-error"></p></div>
      <div class="grid-2">
        <div class="field" id="prep-box"><label for="prep">Thời gian chuẩn bị hàng (ngày)</label><input id="prep" type="number" min="0" step="1" value="${E.mode !== 'made_to_order' ? E.prepDays ?? 2 : 2}"><p class="field-hint">Hàng làm theo đơn dùng thời gian chế tác ở trên, không cộng trùng.</p><p class="field-error"></p></div>
        <div class="field"><label for="pack">Khối lượng đóng gói (kg) <span class="req">*</span></label><input id="pack" type="number" min="0.01" step="0.01" value="${E.packWeight || ''}"><p class="field-error"></p></div></div>
      <label class="check"><input type="checkbox" id="fragile" ${E.fragile ? 'checked' : ''}> <span>Hàng dễ vỡ (cần đóng xốp nổ và hộp carton chuẩn)</span></label></section>
   </fieldset>
    <div class="alert alert-error" id="form-alert" hidden role="alert"></div>
    <div class="row form-buttons">
      <a class="btn btn-ghost" href="${pageUrl('seller-products')}" id="cancel">Hủy</a>
      ${locked ? '' : `<button class="btn btn-ghost" type="button" id="save-draft">${E.status && E.status !== 'draft' ? 'Lưu thay đổi' : 'Lưu bản nháp'}</button>
      <button class="btn btn-ghost" type="button" id="preview">Xem trước</button>
      ${(!E.status || E.status === 'draft') ? '<button class="btn btn-primary" type="submit" id="publish">Đăng sản phẩm</button>' : ''}`}
    </div>
  </form>`;
$('#cat').value = E.categoryId || '';

// ----- Ảnh -----
function paintThumbs() {
  $('#thumbs').innerHTML = S.images.map((src, i) => `<div class="thumb ${i === 0 ? 'cover' : ''}"><img src="${esc(src)}" alt="Ảnh ${i + 1}">
    <button type="button" class="x" data-rm="${i}" aria-label="Xóa ảnh ${i + 1}">×</button>
    <div class="mv">${i > 0 ? `<button type="button" data-left="${i}" aria-label="Đưa lên trước">◀</button>` : ''}${i < S.images.length - 1 ? `<button type="button" data-right="${i}" aria-label="Đưa ra sau">▶</button>` : ''}</div>${i === 0 ? '<span class="tag">Ảnh bìa</span>' : ''}</div>`).join('');
}
async function addFiles(files) {
  const err = $('#img-err'); err.textContent = '';
  for (const f of files) {
    if (S.images.length >= APP.MAX_IMAGES) { err.textContent = `Tối đa ${APP.MAX_IMAGES} ảnh.`; break; }
    const msg = validateImageFile(f, { maxMB: APP.MAX_IMAGE_MB });
    if (msg) { err.textContent = `${f.name}: ${msg}`; continue; }
    try { S.images.push(await compressImage(f, { maxSide: 800, quality: 0.7 })); dirty = true; }
    catch { err.textContent = `${f.name}: không đọc được ảnh, hãy thử ảnh khác.`; }
  }
  paintThumbs();
}
$('#drop').addEventListener('click', () => $('#file').click());
$('#drop').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#file').click(); } });
$('#file').addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
['dragover', 'dragenter'].forEach((ev) => $('#drop').addEventListener(ev, (e) => { e.preventDefault(); $('#drop').classList.add('drag'); }));
['dragleave', 'drop'].forEach((ev) => $('#drop').addEventListener(ev, (e) => { e.preventDefault(); $('#drop').classList.remove('drag'); }));
$('#drop').addEventListener('drop', (e) => addFiles([...e.dataTransfer.files]));
on(root, 'click', '[data-rm]', (e, el) => { S.images.splice(Number(el.dataset.rm), 1); dirty = true; paintThumbs(); });   // xóa ảnh bìa → ảnh kế tiếp lên làm bìa
on(root, 'click', '[data-left]', (e, el) => { const i = Number(el.dataset.left); [S.images[i - 1], S.images[i]] = [S.images[i], S.images[i - 1]]; dirty = true; paintThumbs(); });
on(root, 'click', '[data-right]', (e, el) => { const i = Number(el.dataset.right); [S.images[i + 1], S.images[i]] = [S.images[i], S.images[i + 1]]; dirty = true; paintThumbs(); });
paintThumbs();

// ----- Chế độ giá/số lượng -----
function applyMode() {
  S.mode = $('input[name="mode"]:checked').value; S.multi = $('#multi').checked;
  $('#single-box').hidden = S.multi; $('#variant-box').hidden = !S.multi; $('#mto-box').hidden = S.mode !== 'made_to_order';
  $('#prep-box').hidden = S.mode === 'made_to_order';
  $('#stock-label').innerHTML = (S.mode === 'made_to_order' ? 'Giới hạn số lượng nhận làm' : 'Số lượng tồn kho') + ' <span class="req">*</span>';
  $('#stock-hint').textContent = S.mode === 'made_to_order' ? 'Số lượng tối đa bạn nhận làm cùng lúc (trừ phần đã cam kết cho đơn đang xử lý).' : 'Cho phép bằng 0: người mua sẽ thấy "Hết hàng".';
  if (S.multi && !S.variants.length) S.variants.push(newVariant());
  paintVariants();
}
const newVariant = () => ({ id: randomId('v'), name: '', price: '', stock: '', active: true });
function paintVariants() {
  const label = S.mode === 'made_to_order' ? 'Giới hạn nhận làm' : 'Số lượng';
  $('#variants').innerHTML = S.variants.map((v, i) => `<div class="variant-edit" data-vi="${i}">
    <input type="text" placeholder="Tên (vd: Màu xanh, Size L)" value="${esc(v.name)}" data-f="name" aria-label="Tên phiên bản">
    <input type="number" min="1" placeholder="Giá (VNĐ)" value="${v.price}" data-f="price" aria-label="Giá">
    <input type="number" min="0" placeholder="${label}" value="${v.stock}" data-f="stock" aria-label="${label}">
    <label class="check"><input type="checkbox" data-f="active" ${v.active !== false ? 'checked' : ''}> <span>Đang bán</span></label>
    <button type="button" class="btn btn-ghost btn-sm" data-vdel="${i}" ${S.variants.length <= 1 ? 'disabled' : ''}>Xóa</button></div>`).join('');
}
$$('input[name="mode"]').forEach((r) => r.addEventListener('change', applyMode));
$('#multi').addEventListener('change', applyMode);
$('#add-variant').addEventListener('click', () => { S.variants.push(newVariant()); paintVariants(); });
on(root, 'click', '[data-vdel]', (e, el) => { S.variants.splice(Number(el.dataset.vdel), 1); dirty = true; paintVariants(); });
on(root, 'input', '[data-f]', (e, el) => {
  const v = S.variants[Number(el.closest('[data-vi]').dataset.vi)];
  v[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
});
applyMode();
root.addEventListener('input', () => { dirty = true; });

// ----- Kiểm tra dữ liệu -----
const g = (id) => $('#' + id);
/** mode 'draft' chỉ cần tên; 'publish' cần đầy đủ. Trả về true nếu hợp lệ */
function validate(strict) {
  let ok = true;
  const check = (input, msg) => { if (!showFieldError(input, msg)) ok = false; };
  $('#form-alert').hidden = true; $('#img-err').textContent = ''; $('#var-err').textContent = '';
  check(g('name'), validateText(g('name').value, 'Tên sản phẩm', { min: 5, max: 120 }));
  if (!strict) return ok;                                          // bản nháp: chỉ cần tên
  if (!S.images.length) { $('#img-err').textContent = 'Vui lòng thêm ít nhất 1 ảnh (ảnh đầu tiên là ảnh bìa).'; ok = false; }
  const urlVal = g('video').value.trim();
  check(g('video'), urlVal && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(urlVal) ? 'Chỉ nhận liên kết YouTube hoặc Vimeo.' : '');
  check(g('cat'), g('cat').value ? '' : 'Vui lòng chọn danh mục.');
  check(g('material'), validateText(g('material').value, 'Chất liệu', { max: 60 }));
  check(g('village'), g('village').value ? '' : 'Vui lòng chọn làng nghề / địa phương.');
  check(g('artisan'), validateText(g('artisan').value, 'Tên nghệ nhân/cơ sở chế tác', { max: 80 }));
  const desc = g('desc').value.trim();
  check(g('desc'), desc.length < 50 ? 'Mô tả chi tiết cần ít nhất 50 ký tự.' : desc.length > 5000 ? 'Mô tả chi tiết tối đa 5.000 ký tự.' : '');
  if (S.multi) {
    const names = new Set();
    S.variants.forEach((v) => {
      const bad = !String(v.name).trim() ? 'Mỗi phiên bản cần có tên.' : names.has(v.name.trim().toLowerCase()) ? 'Hai phiên bản không được trùng tên.'
        : validateInt(v.price, 'Giá') || validateInt(v.stock, 'Số lượng', { allowZero: true });
      names.add(String(v.name).trim().toLowerCase());
      if (bad && ok) { $('#var-err').textContent = bad; ok = false; }
    });
    if (ok && !S.variants.some((v) => v.active !== false)) { $('#var-err').textContent = 'Cần ít nhất 1 phiên bản đang bán.'; ok = false; }
  } else {
    check(g('price'), validateInt(g('price').value, 'Giá bán'));
    check(g('stock'), validateInt(g('stock').value, S.mode === 'made_to_order' ? 'Giới hạn nhận làm' : 'Số lượng tồn kho', { allowZero: true }));
  }
  if (S.mode === 'made_to_order') check(g('prep-mto'), validateInt(g('prep-mto').value, 'Thời gian chế tác'));
  else check(g('prep'), validateInt(g('prep').value, 'Thời gian chuẩn bị', { allowZero: true }));
  check(g('ship-from'), validateText(g('ship-from').value, 'Địa chỉ gửi hàng', { min: 8, max: 200 }));
  const pack = Number(g('pack').value);
  check(g('pack'), !g('pack').value ? 'Vui lòng nhập khối lượng đóng gói.' : pack > 0 ? '' : 'Khối lượng phải lớn hơn 0.');
  return ok;
}
['name', 'desc', 'material', 'artisan', 'price', 'stock', 'ship-from', 'pack'].forEach((id) => bindValidation(g(id), () => ''));   // chỉ để xóa lỗi khi sửa

// ----- Thu thập dữ liệu & lưu -----
function collect(status) {
  const mto = S.mode === 'made_to_order';
  const variants = S.multi ? S.variants.map((v) => ({ id: v.id, name: String(v.name).trim(), price: Number(v.price) || 0, stock: Number(v.stock) || 0, active: v.active !== false })) : [];
  const priceList = variants.filter((v) => v.active).map((v) => v.price);
  return {
    sellerId: uid, shopName: shop?.name || auth.profile.name, name: g('name').value.trim().replace(/\s+/g, ' '), categoryId: g('cat').value,
    material: g('material').value.trim(), village: g('village').value, artisan: g('artisan').value.trim(),
    shortDesc: g('short').value.trim(), desc: g('desc').value.trim(), size: g('size').value.trim(), weight: g('weight').value.trim(), care: g('care').value.trim(),
    images: S.images, videoUrl: g('video').value.trim(), mode: S.mode,
    price: S.multi ? (priceList.length ? Math.min(...priceList) : 0) : Number(g('price').value) || 0,
    stock: S.multi ? 0 : Number(g('stock').value) || 0, variants,
    prepDays: Number(mto ? g('prep-mto').value : g('prep').value) || 0, accepting: mto ? g('accepting').value === '1' : true,
    shipFrom: g('ship-from').value.trim(), packWeight: Number(g('pack').value) || 0, fragile: g('fragile').checked,
    village: g('village').value, status, ...(status === 'visible' && !existing?.publishedAt ? { publishedAt: Date.now() } : {})
  };
}

/** Lưu với trạng thái cho trước. Trả về id hoặc null nếu không hợp lệ */
async function persist(status, strict, btn) {
  if (!validate(strict)) { focusFirstError(root); if (!S.images.length && strict) $('#img-err').scrollIntoView({ behavior: 'smooth', block: 'center' }); return null; }
  const data = collect(status);
  if (JSON.stringify(data.images).length > 900000) { const a = $('#form-alert'); a.hidden = false; a.textContent = 'Tổng dung lượng ảnh quá lớn. Hãy bớt ảnh hoặc chọn ảnh nhỏ hơn.'; return null; }
  setBusy(btn, true, 'Đang xử lý…');                             // khóa nút để không tạo sản phẩm trùng
  try { const id = await saveProduct(editId, data); dirty = false; return id; }
  catch (e) { console.error(e); const a = $('#form-alert'); a.hidden = false; a.textContent = 'Có sự cố khi lưu, vui lòng thử lại. Dữ liệu bạn đã nhập vẫn được giữ nguyên.'; setBusy(btn, false); return null; }
}

// Đăng sản phẩm (đủ điều kiện)
$('#pf').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = await persist('visible', true, $('#publish'));
  if (id) { flash('Đã đăng sản phẩm.', 'success'); goto(`pages/seller-products.html`); }
});
// Lưu nháp / lưu thay đổi (giữ nguyên trạng thái hiện tại của sản phẩm đã đăng/ẩn)
$('#save-draft')?.addEventListener('click', async (e) => {
  const keep = existing && existing.status !== 'draft' ? existing.status : 'draft';
  const id = await persist(keep, keep !== 'draft', e.currentTarget);
  if (id) { flash(keep === 'draft' ? 'Đã lưu bản nháp.' : 'Đã lưu thay đổi.', 'success'); goto('pages/seller-products.html'); }
});
// Xem trước: lưu nháp (nếu chưa có) rồi mở trang chi tiết ở chế độ xem trước
$('#preview')?.addEventListener('click', async (e) => {
  const keep = existing ? existing.status : 'draft';
  const id = await persist(keep, false, e.currentTarget);
  if (id) goto(`pages/product.html?id=${id}&preview=1`);
});

// ----- Cảnh báo khi rời trang có thay đổi chưa lưu -----
window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
$('#cancel').addEventListener('click', async (e) => {
  if (!dirty) return;
  e.preventDefault();
  if (await confirmDialog({ title: 'Rời trang?', message: 'Bạn có thay đổi chưa lưu. Rời trang sẽ mất các thay đổi này.', confirmText: 'Rời trang', cancelText: 'Tiếp tục chỉnh sửa', danger: true })) { dirty = false; goto('pages/seller-products.html'); }
});
