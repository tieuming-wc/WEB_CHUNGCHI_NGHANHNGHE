/**
 * ============================================================
 *  FILE: js/services/auth.js
 *  MỤC ĐÍCH: Nghiệp vụ tài khoản: đăng ký, đăng nhập, khóa khi nhập sai, hồ sơ, đổi mật khẩu.
 *  Bám sát đặc tả "Đăng ký – Đăng nhập" (REQ-REG, REQ-LOG, REQ-SES, REQ-VER, REQ-PWD).
 * ============================================================
 */
import { backend } from './db.js';
import { APP } from '../config/app-config.js';
import { normalizePhone } from '../utils/validators.js';

// ============================================================
//  KHÓA ĐĂNG NHẬP KHI SAI NHIỀU LẦN (COND-FAIL-01 / REQ-LOG-08)
//  Lưu số lần sai theo email trong trình duyệt. (Firebase còn tự chống dò mật khẩu ở phía máy chủ.)
// ============================================================
const failKey = (email) => 'btv_fail_' + email;

/** Trả về số mili-giây còn bị khóa (0 = không bị khóa) */
export function lockRemaining(email) {
  try {
    const s = JSON.parse(localStorage.getItem(failKey(email)) || 'null');
    return s?.lockedUntil && s.lockedUntil > Date.now() ? s.lockedUntil - Date.now() : 0;
  } catch { return 0; }
}

function registerFailure(email) {
  let s = { count: 0, first: Date.now() };
  try { s = JSON.parse(localStorage.getItem(failKey(email))) || s; } catch { /* bỏ qua */ }
  // Quá 15 phút kể từ lần sai đầu → đếm lại từ đầu
  if (Date.now() - s.first > APP.LOCK_MINUTES * 60000) s = { count: 0, first: Date.now() };
  s.count++;
  if (s.count >= APP.LOCK_MAX_FAILS) s.lockedUntil = Date.now() + APP.LOCK_MINUTES * 60000;
  localStorage.setItem(failKey(email), JSON.stringify(s));
}
const clearFailures = (email) => localStorage.removeItem(failKey(email));

// ============================================================
//  HỒ SƠ NGƯỜI DÙNG
// ============================================================
export const getProfile = (uid) => backend.get('users', uid);

/** Cập nhật hồ sơ (chỉ các trường được phép sửa; email & vai trò không sửa ở đây) */
export async function updateProfile(uid, { name, phone, dob, gender }) {
  const phoneNorm = phone ? normalizePhone(phone) : '';
  const current = await getProfile(uid);
  // Đổi số điện thoại: giữ chỗ số mới, nhả số cũ
  if (phoneNorm && phoneNorm !== current.phoneNorm) {
    const ok = await backend.claimUnique('phones', phoneNorm, { uid });
    if (!ok) throw Object.assign(new Error('phone-taken'), { code: 'phone-taken' });
    if (current.phoneNorm) await backend.releaseUnique('phones', current.phoneNorm).catch(() => {});
  }
  await backend.update('users', uid, { name: name.trim().replace(/\s+/g, ' '), phone: phone || '', phoneNorm, dob, gender: gender || '' });
}

// ============================================================
//  ĐĂNG KÝ (REQ-REG-10)
// ============================================================
/**
 * Luồng: tạo tài khoản → lưu hồ sơ → giữ chỗ SĐT → gửi email xác minh → đăng xuất.
 * Nếu SĐT bị trùng thì xóa tài khoản vừa tạo để không để lại tài khoản "mồ côi".
 */
export async function register({ name, email, phone, dob, gender, password, role, shopName }) {
  const phoneNorm = phone ? normalizePhone(phone) : '';
  const user = await backend.signUp(email, password);          // lỗi 'auth/email-already-in-use' nếu trùng email

  try {
    if (phoneNorm && !(await backend.claimUnique('phones', phoneNorm, { uid: user.uid }))) {
      throw Object.assign(new Error('phone-taken'), { code: 'phone-taken' });
    }
    await backend.set('users', user.uid, {
      uid: user.uid, name: name.trim().replace(/\s+/g, ' '), email: email.trim().toLowerCase(),
      phone: phone || '', phoneNorm, dob, gender: gender || '', role,
      accountStatus: role === 'buyer' ? 'pending' : 'active', ...(role === 'seller' ? { sellerStatus: 'pending' } : {}), createdAt: Date.now()
    });
    // Người bán: tạo luôn gian hàng công khai (chỉ chứa thông tin được phép hiển thị)
    if (role === 'seller') {
      await backend.set('shops', user.uid, { sellerId: user.uid, name: shopName.trim(), village: '', artisan: name.trim(), story: '', address: '', phone: '', createdAt: Date.now() });
    }
    await backend.sendVerification();
  } catch (error) {
    await backend.deleteCurrentUser().catch(() => {});          // dọn tài khoản dở dang
    throw error;
  }
  await backend.signOut();                                      // chỉ khi bấm link trong email mới đăng nhập được
}

/** Gửi lại email xác minh: đăng nhập tạm bằng mật khẩu vừa nhập rồi đăng xuất */
export async function resendVerification(email, password) {
  const user = await backend.signIn(email, password, false);
  if (!user.emailVerified) await backend.sendVerification();
  await backend.signOut();
}

// ============================================================
//  ĐĂNG NHẬP (REQ-LOG-01 … 09)
// ============================================================
/**
 * Ném ra lỗi có thuộc tính code:
 *   'locked' (kèm remainingMs) | 'bad-credentials' | 'unverified' | 'no-profile' | lỗi khác
 */
export async function login({ email, password, remember }) {
  email = email.trim().toLowerCase();
  const remaining = lockRemaining(email);
  if (remaining > 0) throw Object.assign(new Error('locked'), { code: 'locked', remainingMs: remaining });

  let user;
  try {
    user = await backend.signIn(email, password, remember);
  } catch (error) {
    const badCodes = ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email'];
    if (badCodes.includes(error.code)) {
      registerFailure(email);
      const left = lockRemaining(email);
      if (left > 0) throw Object.assign(new Error('locked'), { code: 'locked', remainingMs: left });
      // REQ-LOG-07: luôn trả MỘT câu lỗi chung, không tiết lộ email có tồn tại hay không
      throw Object.assign(new Error('bad-credentials'), { code: 'bad-credentials' });
    }
    if (error.code === 'auth/too-many-requests') throw Object.assign(new Error('locked'), { code: 'locked', remainingMs: APP.LOCK_MINUTES * 60000 });
    throw error;
  }

  // REQ-LOG-09: đúng mật khẩu nhưng chưa xác minh email → chặn
  if (!user.emailVerified) {
    await backend.signOut();
    throw Object.assign(new Error('unverified'), { code: 'unverified' });
  }
  clearFailures(email);
  localStorage.setItem('btv_remember', remember ? '1' : '0');
  localStorage.setItem('btv_login_at', String(Date.now()));
  const profile = await getProfile(user.uid);
  if (profile) await backend.update('users', user.uid, { lastLoginAt: Date.now() }).catch(() => {});
  return { user, profile };
}

/** Đăng nhập bằng Google / Facebook. Nếu lần đầu (chưa có hồ sơ), trả profile = null để trang hỏi thêm vai trò */
export async function loginSocial(provider) {
  const user = await backend.signInSocial(provider, true);
  localStorage.setItem('btv_remember', '1');
  localStorage.setItem('btv_login_at', String(Date.now()));
  return { user, profile: await getProfile(user.uid) };
}

/** Tạo hồ sơ cho người đăng nhập mạng xã hội lần đầu */
export async function completeSocialProfile(user, { role, shopName }) {
  await backend.set('users', user.uid, {
    uid: user.uid, name: user.displayName || user.email.split('@')[0], email: user.email,
    phone: '', phoneNorm: '', dob: '', gender: '', role,
    accountStatus: role === 'buyer' ? 'pending' : 'active', ...(role === 'seller' ? { sellerStatus: 'pending' } : {}), createdAt: Date.now()
  });
  if (role === 'seller') {
    await backend.set('shops', user.uid, { sellerId: user.uid, name: shopName, village: '', artisan: user.displayName || '', story: '', address: '', phone: '', createdAt: Date.now() });
  }
  return getProfile(user.uid);
}

export async function logout() {
  localStorage.removeItem('btv_login_at');
  await backend.signOut();
}

/** Đổi mật khẩu khi đang đăng nhập: phải nhập đúng mật khẩu cũ */
export const changePassword = (oldPw, newPw) => backend.changePassword(oldPw, newPw);
