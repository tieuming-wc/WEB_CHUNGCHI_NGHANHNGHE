/**
 * ============================================================
 *  FILE: js/utils/image.js
 *  MỤC ĐÍCH: Kiểm tra và NÉN ảnh trước khi lưu.
 *  Vì sao nén? Website chạy trên GitHub Pages + Firebase gói miễn phí, không dùng
 *  kho tệp (Storage). Ảnh được thu nhỏ rồi lưu thẳng thành chuỗi trong cơ sở dữ liệu,
 *  mỗi ảnh chỉ khoảng 40–90 KB nên vẫn tải nhanh.
 * ============================================================
 */

/** Kiểm tra tệp ảnh: đúng loại và không vượt dung lượng. Trả về '' nếu ổn, hoặc nội dung lỗi */
export function validateImageFile(file, { maxMB = 5, types = ['image/jpeg', 'image/png', 'image/webp'] } = {}) {
  if (!file) return 'Chưa chọn tệp.';
  if (!types.includes(file.type)) return 'Chỉ nhận ảnh JPG, PNG hoặc WebP.';
  if (file.size > maxMB * 1024 * 1024) return `Ảnh không được vượt quá ${maxMB} MB.`;
  return '';
}

/** Đọc tệp thành ảnh (HTMLImageElement) */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh.')); };
    img.src = url;
  });
}

/**
 * Thu nhỏ ảnh về cạnh dài tối đa maxSide px, xuất JPEG chất lượng quality.
 * Trả về chuỗi "data:image/jpeg;base64,..." có thể lưu thẳng vào CSDL / gắn vào <img src>.
 */
export async function compressImage(file, { maxSide = 800, quality = 0.72 } = {}) {
  const img = await loadImage(file);
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';                 // nền trắng cho ảnh PNG trong suốt
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/** Ảnh giữ chỗ (SVG) khi sản phẩm chưa có ảnh hoặc ảnh lỗi */
export function placeholderImage(label = '', hue = 28) {
  const safe = String(label).replace(/[<>&"']/g, '').slice(0, 24);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,86%)"/><stop offset="1" stop-color="hsl(${hue},50%,70%)"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><circle cx="200" cy="170" r="62" fill="hsla(${hue},45%,35%,.25)"/><text x="200" y="320" font-family="sans-serif" font-size="22" text-anchor="middle" fill="hsl(${hue},40%,28%)">${safe}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
