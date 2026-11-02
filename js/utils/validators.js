/**
 * ============================================================
 *  FILE: js/utils/validators.js
 *  MỤC ĐÍCH: Các hàm kiểm tra dữ liệu nhập (họ tên, email, SĐT, ngày sinh,
 *  mật khẩu, CCCD...). Mỗi hàm trả về:
 *     - chuỗi rỗng ''  → hợp lệ
 *     - chuỗi có chữ   → nội dung lỗi để hiện dưới ô nhập
 * ============================================================
 */
import { APP } from '../config/app-config.js';
import { MSG } from './messages.js';

/** Họ và tên: 2–50 ký tự, chỉ chữ (có dấu tiếng Việt) và khoảng trắng (REQ-REG-01) */
export function validateName(value, label = 'Họ và tên') {
  const v = String(value || '').trim().replace(/\s+/g, ' ');
  if (!v) return MSG.required(label.toLowerCase());
  if (v.length < 2 || v.length > 50) return `${label} cần từ 2 đến 50 ký tự.`;
  if (!/^[\p{L}\p{M}\s]+$/u.test(v)) return `${label} chỉ gồm chữ cái và khoảng trắng, không có số hoặc ký hiệu lạ.`;
  return '';
}

/** Email đúng định dạng (REQ-REG-02) */
export function validateEmail(value) {
  const v = String(value || '').trim();
  if (!v) return MSG.required('email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return MSG.emailFormat;
  return '';
}

/** Chuẩn hóa SĐT: bỏ khoảng trắng/dấu chấm/gạch, đổi +84 → 0 */
export function normalizePhone(value) {
  let v = String(value || '').replace(/[\s.\-()]/g, '');
  if (v.startsWith('+84')) v = '0' + v.slice(3);
  return v;
}

/** SĐT Việt Nam: 10 chữ số bắt đầu bằng 0 hoặc dạng +84 (REQ-REG-03) */
export function validatePhone(value, { required = false } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return required ? MSG.required('số điện thoại') : '';
  return /^0\d{9}$/.test(normalizePhone(raw)) ? '' : MSG.phoneFormat;
}

/**
 * Ngày sinh từ 3 ô chọn. Kiểm tra: đủ 3 ô, ngày có thật (chặn 31/02), đủ tuổi tối thiểu.
 */
export function validateDob(day, month, year) {
  if (!day || !month || !year) return MSG.required('ngày sinh');
  const d = +day, m = +month, y = +year;
  const date = new Date(y, m - 1, d);
  // Nếu ngày bị "tràn" sang tháng khác (31/02 → 03/03) thì ngày không tồn tại
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return MSG.dobInvalid;
  if (ageFrom(y, m, d) < APP.MIN_AGE) return MSG.underAge;
  return '';
}

/** Tính tuổi tròn năm */
export function ageFrom(y, m, d) {
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

// Danh sách mật khẩu quá phổ biến (rút gọn) – theo NIST SP 800-63B nên chặn
const COMMON_PASSWORDS = [
  '12345678', '123456789', '1234567890', 'password', 'password1', 'matkhau123', 'qwertyui', 'qwerty123',
  'abcd1234', 'iloveyou', '11111111', '00000000', 'admin123', 'letmein1', 'welcome1', '87654321',
  'abc12345', '123123123', 'baotrong', 'vietnam123', 'minh1234', '1q2w3e4r', 'passw0rd', 'qazwsxedc'
];

/** Mật khẩu 8–64 ký tự, không quá dễ đoán, KHÔNG ép ký hiệu đặc biệt (NIST) (REQ-REG-06) */
export function validatePassword(value) {
  const v = String(value || '');
  if (!v) return MSG.required('mật khẩu');
  if (v.length < APP.PASSWORD_MIN || v.length > APP.PASSWORD_MAX) return MSG.pwLength;
  if (COMMON_PASSWORDS.includes(v.toLowerCase()) || /^(.)\1+$/.test(v)) return MSG.pwCommon;
  return '';
}

/** Chấm độ mạnh mật khẩu 0–4 để vẽ thanh đo (chỉ để gợi ý, không chặn) */
export function passwordStrength(value) {
  const v = String(value || '');
  if (!v) return { score: 0, label: '' };
  let score = 0;
  if (v.length >= 8) score++;
  if (v.length >= 12) score++;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(v)).length;
  if (classes >= 3) score++;
  if (v.length >= 16) score++;
  if (COMMON_PASSWORDS.includes(v.toLowerCase())) score = 0;
  score = Math.min(4, score);
  return { score, label: ['Rất yếu', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'][score] };
}

/** Số căn cước công dân: đúng 12 chữ số */
export function validateCccd(value) {
  const v = String(value || '').trim();
  if (!v) return MSG.required('số CCCD');
  return /^\d{12}$/.test(v) ? '' : 'Số CCCD gồm đúng 12 chữ số.';
}

/** Trường bắt buộc chung, có giới hạn độ dài tùy chọn */
export function validateText(value, label, { min = 1, max = 500 } = {}) {
  const v = String(value || '').trim();
  if (!v) return MSG.required(label.toLowerCase());
  if (v.length < min) return `${label} cần ít nhất ${min} ký tự.`;
  if (v.length > max) return `${label} tối đa ${max} ký tự.`;
  return '';
}

/** Số nguyên dương (giá, số lượng...). allowZero=true cho phép bằng 0 */
export function validateInt(value, label, { allowZero = false, max = 1e10 } = {}) {
  if (value === '' || value === null || value === undefined) return MSG.required(label.toLowerCase());
  const n = Number(value);
  if (!Number.isInteger(n)) return `${label} phải là số nguyên.`;
  if (n < 0 || (!allowZero && n === 0)) return `${label} phải lớn hơn ${allowZero ? 'hoặc bằng ' : ''}0.`;
  if (n > max) return `${label} quá lớn.`;
  return '';
}
