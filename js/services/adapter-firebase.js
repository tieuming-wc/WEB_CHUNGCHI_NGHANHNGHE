/**
 * ============================================================
 *  FILE: js/services/adapter-firebase.js
 *  MỤC ĐÍCH: Nối web với máy chủ Firebase (Authentication + Firestore).
 *  Có cùng "giao diện hàm" với adapter-local.js nên các phần khác của web không đổi.
 *
 *  - Authentication: lo tạo tài khoản, mã hóa mật khẩu, email xác minh, quên mật khẩu,
 *    đăng nhập Google/Facebook, giữ phiên trên mọi thiết bị.
 *  - Firestore: lưu hồ sơ, sản phẩm, đơn hàng, giỏ hàng... trên đám mây.
 *  Thư viện được tải từ CDN của Google khi cần (không phải cài gì).
 * ============================================================
 */
import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION } from '../config/firebase-config.js';

const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;

// Tải 3 module song song
const [appMod, authMod, fsMod] = await Promise.all([
  import(`${CDN}/firebase-app.js`),
  import(`${CDN}/firebase-auth.js`),
  import(`${CDN}/firebase-firestore.js`)
]);

const app = appMod.initializeApp(FIREBASE_CONFIG);
const auth = authMod.getAuth(app);
const fs = fsMod.getFirestore(app);
auth.languageCode = 'vi';                        // email của Firebase gửi bằng tiếng Việt

/** Rút gọn đối tượng user của Firebase thành dạng đơn giản dùng chung cho cả 2 adapter */
function toUser(u) {
  if (!u) return null;
  const social = u.providerData.some((p) => p.providerId !== 'password');
  return { uid: u.uid, email: u.email || '', emailVerified: u.emailVerified || social, displayName: u.displayName || '' };
}

const clean = (obj) => JSON.parse(JSON.stringify(obj));        // bỏ undefined (Firestore không nhận)

// ---------- Chờ Firebase báo xem đang đăng nhập hay chưa ----------
let currentUser = null;
const ready = new Promise((resolve) => {
  authMod.onAuthStateChanged(auth, (u) => { currentUser = toUser(u); resolve(); });
});

// ============================================================
//  PHẦN 1 – TÀI KHOẢN
// ============================================================
async function signUp(email, password) {
  const cred = await authMod.createUserWithEmailAndPassword(auth, email.trim(), password);
  currentUser = toUser(cred.user);
  return currentUser;
}

/** remember = true → giữ phiên lâu dài; false → hết khi đóng trình duyệt */
async function signIn(email, password, remember = false) {
  await authMod.setPersistence(auth, remember ? authMod.browserLocalPersistence : authMod.browserSessionPersistence);
  const cred = await authMod.signInWithEmailAndPassword(auth, email.trim(), password);
  currentUser = toUser(cred.user);
  return currentUser;
}

async function signInSocial(provider, remember = true) {
  await authMod.setPersistence(auth, remember ? authMod.browserLocalPersistence : authMod.browserSessionPersistence);
  const p = provider === 'facebook' ? new authMod.FacebookAuthProvider() : new authMod.GoogleAuthProvider();
  const cred = await authMod.signInWithPopup(auth, p);
  currentUser = toUser(cred.user);
  return currentUser;
}

async function signOut() { await authMod.signOut(auth); currentUser = null; }

/** Gửi email xác minh; sau khi bấm link người dùng được đưa về trang đăng nhập */
async function sendVerification() {
  const continueUrl = new URL('../pages/login.html?verified=1', import.meta.url).href;
  await authMod.sendEmailVerification(auth.currentUser, { url: continueUrl });
}

async function verifyEmailCode(code) { await authMod.applyActionCode(auth, code); }

async function sendReset(email) {
  const continueUrl = new URL('../pages/login.html?reset=1', import.meta.url).href;
  try { await authMod.sendPasswordResetEmail(auth, email.trim(), { url: continueUrl }); }
  catch (e) { if (e.code !== 'auth/user-not-found') throw e; }  // nuốt lỗi "không có email" để không lộ tài khoản
}

const checkResetCode = (code) => authMod.verifyPasswordResetCode(auth, code);
const confirmReset = (code, pw) => authMod.confirmPasswordReset(auth, code, pw);

async function changePassword(oldPassword, newPassword) {
  const u = auth.currentUser;
  const cred = authMod.EmailAuthProvider.credential(u.email, oldPassword);
  await authMod.reauthenticateWithCredential(u, cred);          // bắt buộc nhập lại mật khẩu cũ
  await authMod.updatePassword(u, newPassword);
}

async function reloadUser() {
  if (auth.currentUser) { await auth.currentUser.reload(); currentUser = toUser(auth.currentUser); }
  return currentUser;
}

async function deleteCurrentUser() { if (auth.currentUser) { await authMod.deleteUser(auth.currentUser); currentUser = null; } }

// ============================================================
//  PHẦN 2 – DỮ LIỆU (Firestore)
// ============================================================
const ref = (name, id) => fsMod.doc(fs, name, id);

async function get(name, id) {
  const snap = await fsMod.getDoc(ref(name, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function set(name, id, data, { merge = false } = {}) {
  const { id: _ignore, ...body } = clean(data);
  await fsMod.setDoc(ref(name, id), body, { merge });
}

async function update(name, id, patch) {
  const { id: _ignore, ...body } = clean(patch);
  await fsMod.updateDoc(ref(name, id), body);
}

async function add(name, data) {
  const { id: _ignore, ...body } = clean(data);
  const docRef = await fsMod.addDoc(fsMod.collection(fs, name), body);
  return docRef.id;
}

const remove = (name, id) => fsMod.deleteDoc(ref(name, id));

/** filters = [['truong','==',giaTri]] – chỉ dùng phép "==" nên không cần tạo chỉ mục */
async function list(name, filters = []) {
  const q = fsMod.query(fsMod.collection(fs, name), ...filters.map(([f, op, v]) => fsMod.where(f, op, v)));
  const snap = await fsMod.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Giao dịch đọc-sửa-ghi: tránh 2 người cùng mua món cuối cùng */
function transact(name, id, fn) {
  return fsMod.runTransaction(fs, async (tx) => {
    const r = ref(name, id);
    const snap = await tx.get(r);
    if (!snap.exists()) throw Object.assign(new Error('Không tìm thấy dữ liệu.'), { code: 'not-found' });
    const next = await fn({ id: snap.id, ...snap.data() });
    if (next) { const { id: _ignore, ...body } = clean(next); tx.update(r, body); }
    return next;
  });
}

/** Giữ chỗ khóa duy nhất (số điện thoại). Quy tắc bảo mật chỉ cho TẠO, không cho ghi đè */
async function claimUnique(name, key, data) {
  const existing = await fsMod.getDoc(ref(name, key));
  if (existing.exists()) return false;
  await fsMod.setDoc(ref(name, key), clean(data));
  return true;
}
const releaseUnique = (name, key) => fsMod.deleteDoc(ref(name, key));

export default {
  mode: 'firebase',
  init: Promise.resolve(),
  waitForUser: async () => { await ready; return currentUser; },
  onAuth(cb) { return authMod.onAuthStateChanged(auth, (u) => cb(toUser(u))); },
  getCurrentUser: () => currentUser,
  signUp, signIn, signInSocial, signOut, sendVerification, verifyEmailCode, sendReset, checkResetCode,
  confirmReset, changePassword, reloadUser, deleteCurrentUser, peekMailbox: () => [],
  get, set, update, add, remove, list, transact, claimUnique, releaseUnique
};
