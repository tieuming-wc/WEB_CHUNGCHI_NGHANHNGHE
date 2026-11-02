/**
 * ============================================================
 *  FILE: js/utils/format.js
 *  MỤC ĐÍCH: Định dạng tiền, ngày giờ, tên hiển thị...
 * ============================================================
 */

/** 1500000 → "1.500.000đ" */
export const formatVND = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0)) + 'đ';

/** Timestamp → "31/12/2026 14:05" */
export function formatDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Timestamp → "31/12/2026" */
export const formatDate = (ts) => formatDateTime(ts).split(' ')[0];

/** Cắt chuỗi dài và thêm "..." (REQ-SES-01: tên > 20 ký tự thì rút gọn) */
export function truncate(text, max = 20) {
  const s = String(text ?? '');
  return s.length > max ? s.slice(0, max).trimEnd() + '...' : s;
}

/** Lấy chữ cái đầu của TÊN (từ cuối cùng) để làm ảnh đại diện: "Nguyễn Văn An" → "A" */
export function initialOf(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return (parts[parts.length - 1][0] || '?').toUpperCase();
}

/** Số mili-giây → "mm:ss" (đồng hồ đếm ngược khi bị khóa đăng nhập) */
export function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const p = (x) => String(x).padStart(2, '0');
  return `${p(Math.floor(total / 60))}:${p(total % 60)}`;
}

/** Ẩn bớt dữ liệu nhạy cảm: "034567890123" → "034•••••0123" (dùng khi tra cứu chứng nhận) */
export const maskMiddle = (s, keep = 3) => {
  s = String(s || '');
  return s.length <= keep * 2 ? s : s.slice(0, keep) + '•'.repeat(s.length - keep * 2) + s.slice(-keep);
};

/** Tên họ tên che bớt: "Nguyễn Văn An" → "Nguyễn V•• An" (bảo vệ quyền riêng tư khi tra cứu công khai) */
export function maskName(name) {
  const parts = String(name || '').trim().split(/\s+/);
  if (parts.length <= 2) return parts.join(' ');
  return parts.map((w, i) => (i === 0 || i === parts.length - 1) ? w : w[0] + '••').join(' ');
}
