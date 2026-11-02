/**
 * ============================================================
 *  FILE: js/services/adapter-local.js
 *  MỤC ĐÍCH: "Máy chủ giả lập" chạy ngay trong trình duyệt (localStorage).
 *  Dùng khi CHƯA dán cấu hình Firebase → web vẫn chạy đầy đủ để học/thử nghiệm.
 *
 *  ⚠ Dữ liệu chỉ nằm trên máy + trình duyệt đang dùng, KHÔNG đồng bộ giữa các thiết bị.
 *  Muốn đồng bộ: cấu hình Firebase (xem README) – khi đó file adapter-firebase.js được dùng
 *  thay thế, còn toàn bộ phần còn lại của web KHÔNG phải sửa gì (cùng "giao diện" hàm).
 *
 *  Giao diện chung của adapter (cả local và firebase đều có):
 *    Tài khoản: waitForUser, onAuth, signUp, signIn, signInSocial, signOut, sendVerification,
 *               verifyEmailCode, sendReset, confirmReset, changePassword, reloadUser
 *    Dữ liệu:   get, set, update, add, remove, list, transact, claimUnique
 * ============================================================
 */
import { seedLocalData } from '../data/seed.js';

const PREFIX = 'btv_local_';

// ---------- Đọc / ghi localStorage an toàn ----------
function read(key, fallback) {
  try { const raw = localStorage.getItem(PREFIX + key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
  catch (e) { throw Object.assign(new Error('Bộ nhớ trình duyệt đã đầy.'), { code: 'local/quota' }); }
}

/** Loại bỏ giá trị undefined (Firestore thật cũng không nhận undefined) */
const clean = (obj) => JSON.parse(JSON.stringify(obj));

/** Trộn sâu 2 đối tượng (mảng bị thay thế nguyên khối) – giống setDoc(..., {merge:true}) */
function deepMerge(target, patch) {
  const out = { ...target };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = (v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object' && out[k] && !Array.isArray(out[k]))
      ? deepMerge(out[k], v) : v;
  }
  return out;
}

const makeError = (code, message) => Object.assign(new Error(message || code), { code });

// ---------- Mã hóa mật khẩu (SHA-256 + salt). Chỉ cho chế độ thử nghiệm ----------
async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(salt + ':' + password);
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return btoa(unescape(encodeURIComponent(salt + password)));   // dự phòng nếu trình duyệt thiếu crypto.subtle
}
const newToken = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');

// ============================================================
//  PHẦN 1 – TÀI KHOẢN
// ============================================================
const listeners = new Set();
let currentUser = null;
let ready = false;

/** Đọc phiên đăng nhập đang lưu (localStorage nếu "ghi nhớ", sessionStorage nếu không) */
function loadSession() {
  const raw = localStorage.getItem(PREFIX + 'session') || sessionStorage.getItem(PREFIX + 'session');
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    const acc = Object.values(read('auth', {})).find((a) => a.uid === s.uid);
    // Phiên hết hiệu lực nếu mật khẩu đã đổi (pwVersion khác) → "đăng xuất mọi thiết bị"
    if (!acc || acc.pwVersion !== s.pwVersion) return null;
    return { uid: acc.uid, email: acc.email, emailVerified: !!acc.verified, displayName: acc.name || '' };
  } catch { return null; }
}
function emit() { listeners.forEach((cb) => cb(currentUser)); }

currentUser = loadSession();
ready = true;

/** Đăng ký (tạo tài khoản) – tài khoản mới CHƯA xác minh email */
async function signUp(email, password) {
  email = email.trim().toLowerCase();
  const accounts = read('auth', {});
  if (accounts[email]) throw makeError('auth/email-already-in-use');
  const salt = newToken();
  const uid = 'u_' + newToken().slice(0, 16);
  accounts[email] = { uid, email, salt, hash: await hashPassword(password, salt), verified: false, pwVersion: 1, createdAt: Date.now() };
  write('auth', accounts);
  // Đăng nhập luôn (giống Firebase) để còn ghi hồ sơ; auth.js sẽ đăng xuất sau khi gửi email xác minh
  setSession(accounts[email], true);
  return currentUser;
}

function setSession(acc, remember) {
  const payload = JSON.stringify({ uid: acc.uid, pwVersion: acc.pwVersion });
  localStorage.removeItem(PREFIX + 'session'); sessionStorage.removeItem(PREFIX + 'session');
  (remember ? localStorage : sessionStorage).setItem(PREFIX + 'session', payload);
  currentUser = { uid: acc.uid, email: acc.email, emailVerified: !!acc.verified, displayName: '' };
  emit();
}

async function signIn(email, password, remember = false) {
  email = email.trim().toLowerCase();
  const acc = read('auth', {})[email];
  if (!acc || acc.hash !== await hashPassword(password, acc.salt)) throw makeError('auth/invalid-credential');
  setSession(acc, remember);
  return currentUser;
}

async function signOut() {
  localStorage.removeItem(PREFIX + 'session'); sessionStorage.removeItem(PREFIX + 'session');
  currentUser = null; emit();
}

/** Đăng nhập Google/Facebook không có ở chế độ thử nghiệm */
async function signInSocial() {
  throw makeError('local/unsupported', 'Đăng nhập Google/Facebook chỉ hoạt động khi đã cấu hình Firebase (xem README).');
}

// ---------- Hộp thư giả lập: vì không gửi được email thật, "thư" được ghi vào đây ----------
function pushMail(entry) {
  const box = read('mailbox', []);
  box.unshift({ ...entry, at: Date.now() });
  write('mailbox', box.slice(0, 30));
}
/** Dùng cho trang "Kiểm tra hộp thư" ở chế độ thử nghiệm để hiện liên kết thay cho email thật */
function peekMailbox(email) {
  return read('mailbox', []).filter((m) => m.to === (email || '').toLowerCase());
}

function actionLink(mode, token) {
  return new URL('../pages/auth-action.html', new URL('../', import.meta.url)).href + `?mode=${mode}&oobCode=${token}`;
}

async function sendVerification() {
  if (!currentUser) throw makeError('auth/no-user');
  const accounts = read('auth', {});
  const acc = accounts[currentUser.email];
  acc.verifyToken = newToken(); acc.verifyExpires = Date.now() + 24 * 3600 * 1000;   // COND-EXP-01: 24 giờ
  write('auth', accounts);
  pushMail({ to: acc.email, type: 'verify', link: actionLink('verifyEmail', acc.verifyToken) });
}

async function verifyEmailCode(code) {
  const accounts = read('auth', {});
  const acc = Object.values(accounts).find((a) => a.verifyToken === code);
  if (!acc || acc.verifyExpires < Date.now()) throw makeError('auth/invalid-action-code');
  acc.verified = true; delete acc.verifyToken; delete acc.verifyExpires;   // dùng 1 lần
  write('auth', accounts);
  return acc.email;
}

async function sendReset(email) {
  email = email.trim().toLowerCase();
  const accounts = read('auth', {});
  const acc = accounts[email];
  if (!acc) return;                          // không báo lỗi → không lộ email nào đã đăng ký
  acc.resetToken = newToken(); acc.resetExpires = Date.now() + 30 * 60 * 1000;   // COND-EXP-02: 30 phút
  write('auth', accounts);
  pushMail({ to: email, type: 'reset', link: actionLink('resetPassword', acc.resetToken) });
}

async function checkResetCode(code) {
  const acc = Object.values(read('auth', {})).find((a) => a.resetToken === code);
  if (!acc || acc.resetExpires < Date.now()) throw makeError('auth/invalid-action-code');
  return acc.email;
}

async function confirmReset(code, newPassword) {
  const accounts = read('auth', {});
  const acc = Object.values(accounts).find((a) => a.resetToken === code);
  if (!acc || acc.resetExpires < Date.now()) throw makeError('auth/invalid-action-code');
  acc.salt = newToken(); acc.hash = await hashPassword(newPassword, acc.salt);
  acc.pwVersion = (acc.pwVersion || 1) + 1;  // vô hiệu mọi phiên cũ trên mọi thiết bị
  delete acc.resetToken; delete acc.resetExpires;
  write('auth', accounts);
}

async function changePassword(oldPassword, newPassword) {
  if (!currentUser) throw makeError('auth/no-user');
  const accounts = read('auth', {});
  const acc = accounts[currentUser.email];
  if (acc.hash !== await hashPassword(oldPassword, acc.salt)) throw makeError('auth/invalid-credential');
  acc.salt = newToken(); acc.hash = await hashPassword(newPassword, acc.salt);
  write('auth', accounts);
}

async function reloadUser() {
  if (!currentUser) return null;
  const acc = read('auth', {})[currentUser.email];
  currentUser = { ...currentUser, emailVerified: !!acc?.verified };
  return currentUser;
}

// ============================================================
//  PHẦN 2 – DỮ LIỆU (giống Firestore: bộ sưu tập → tài liệu)
// ============================================================
const col = (name) => read('col_' + name, {});

async function get(name, id) {
  const doc = col(name)[id];
  return doc ? { id, ...clean(doc) } : null;
}

/** Ghi tài liệu. merge:true → trộn vào dữ liệu cũ thay vì ghi đè */
async function set(name, id, data, { merge = false } = {}) {
  const all = col(name);
  const { id: _ignore, ...body } = clean(data);
  all[id] = merge && all[id] ? deepMerge(all[id], body) : body;
  write('col_' + name, all);
}

async function update(name, id, patch) {
  const all = col(name);
  if (!all[id]) throw makeError('not-found', 'Không tìm thấy dữ liệu.');
  const { id: _ignore, ...body } = clean(patch);
  all[id] = { ...all[id], ...body };
  write('col_' + name, all);
}

async function add(name, data) {
  const id = 'd_' + newToken().slice(0, 18);
  await set(name, id, data);
  return id;
}

async function remove(name, id) {
  const all = col(name); delete all[id]; write('col_' + name, all);
}

/** Truy vấn: filters = [['truong','==',giaTri], ...] – chỉ hỗ trợ so sánh bằng (đủ dùng, không cần chỉ mục) */
async function list(name, filters = []) {
  return Object.entries(col(name))
    .map(([id, d]) => ({ id, ...clean(d) }))
    .filter((d) => filters.every(([f, op, v]) => {
      if (op === '==') return d[f] === v;
      if (op === 'array-contains') return Array.isArray(d[f]) && d[f].includes(v);
      return false;
    }));
}

/** Đọc-sửa-ghi an toàn: fn nhận dữ liệu hiện tại và trả về phần cần cập nhật */
async function transact(name, id, fn) {
  const cur = await get(name, id);
  if (!cur) throw makeError('not-found', 'Không tìm thấy dữ liệu.');
  const next = await fn(cur);
  if (next) await update(name, id, next);
  return next;
}

/** Giữ chỗ một khóa duy nhất (vd số điện thoại). Trả về false nếu đã có người giữ */
async function claimUnique(name, key, data) {
  if (await get(name, key)) return false;
  await set(name, key, data);
  return true;
}

async function releaseUnique(name, key) { await remove(name, key); }

/** Xóa tài khoản đang đăng nhập (dùng khi đăng ký lỗi giữa chừng) */
async function deleteCurrentUser() {
  if (!currentUser) return;
  const accounts = read('auth', {}); delete accounts[currentUser.email]; write('auth', accounts);
  await signOut();
}

// ---------- Khởi tạo dữ liệu mẫu cho chế độ thử nghiệm ----------
const init = (async () => {
  if (!read('seeded_v1', false)) { await seedLocalData({ set, write, read, hashPassword, newToken }); write('seeded_v1', true); }
})();

export default {
  mode: 'local',
  init,   // db.js chờ seed xong rồi mới cho trang chạy
  // tài khoản
  waitForUser: async () => currentUser,
  onAuth(cb) { listeners.add(cb); if (ready) cb(currentUser); return () => listeners.delete(cb); },
  getCurrentUser: () => currentUser,
  signUp, signIn, signInSocial, signOut, sendVerification, verifyEmailCode, sendReset, checkResetCode,
  confirmReset, changePassword, reloadUser, deleteCurrentUser, peekMailbox,
  // dữ liệu
  get, set, update, add, remove, list, transact, claimUnique, releaseUnique
};
