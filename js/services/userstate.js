/**
 * ============================================================
 *  FILE: js/services/userstate.js
 *  MỤC ĐÍCH: "Trí nhớ" của từng tài khoản, lưu trên máy chủ → đăng nhập ở thiết bị khác
 *  vẫn mở lại đúng những gì đã dùng trước đó:
 *     - cart        : giỏ hàng
 *     - favorites   : sản phẩm yêu thích
 *     - recent      : sản phẩm đã xem gần đây
 *     - lastPage    : trang đang xem lần trước (để "Tiếp tục nơi bạn đã dừng")
 *     - prefs       : cài đặt (chữ lớn, tự mở lại trang cũ...)
 *     - address     : địa chỉ nhận hàng gần nhất
 *     - progress    : tiến độ học các khóa học
 *  Tất cả nằm trong MỘT tài liệu userState/{uid} nên chỉ tốn 1 lần đọc mỗi trang.
 * ============================================================
 */
import { backend } from './db.js';
import { currentRelative } from '../utils/paths.js';

const DEFAULT_STATE = () => ({
  cart: [], favorites: [], recent: [], lastPage: '', lastPageTitle: '', lastSeenAt: 0,
  prefs: { bigText: false, restoreLast: true }, address: null, progress: {}
});

let cache = null;      // bản sao trong bộ nhớ
let cacheUid = null;

/** Tải trạng thái của tài khoản (có nhớ tạm để không đọc lại nhiều lần) */
export async function loadState(uid) {
  if (cache && cacheUid === uid) return cache;
  const saved = await backend.get('userState', uid).catch(() => null);
  const base = DEFAULT_STATE();
  cache = { ...base, ...(saved || {}), prefs: { ...base.prefs, ...(saved?.prefs || {}) } };
  cacheUid = uid;
  return cache;
}

export const getState = () => cache || DEFAULT_STATE();

/** Cập nhật một phần trạng thái (vừa cập nhật bộ nhớ, vừa ghi lên máy chủ) */
export async function patchState(patch) {
  if (!cacheUid) return;                                        // chưa đăng nhập thì bỏ qua
  // [BTV-VIDEO] ĐÃ SỬA: merge progress theo từng khóa/bài, tránh ghi đè cache của bài khác.
  // Trộn riêng progress theo course/lesson (không làm mất tiến độ các bài khác trong cache).
  const progress = { ...(cache.progress || {}) };
  for (const [courseId, incoming] of Object.entries(patch.progress || {})) {
    const oldCourse = progress[courseId] || {};
    progress[courseId] = { ...oldCourse };
    for (const [lessonId, data] of Object.entries(incoming || {})) {
      progress[courseId][lessonId] = { ...(oldCourse[lessonId] || {}), ...data };
    }
  }
  cache = { ...cache, ...patch, progress, prefs: { ...cache.prefs, ...(patch.prefs || {}) } };
  await backend.set('userState', cacheUid, patch, { merge: true });
}

export function clearStateCache() { cache = null; cacheUid = null; }

/** Áp dụng cài đặt giao diện: chế độ chữ lớn cho người lớn tuổi (đặc tả: "chữ to rõ ràng") */
export function applyPrefs(prefs) {
  document.documentElement.dataset.bigText = prefs?.bigText ? '1' : '0';
  try { localStorage.setItem('btv_bigText', prefs?.bigText ? '1' : '0'); } catch { /* bỏ qua */ }
}

/** Ghi nhớ trang đang xem (tối đa 1 lần / 20 giây để đỡ tốn lượt ghi) */
export async function rememberPage(title) {
  if (!cacheUid) return;
  const rel = currentRelative();
  if (!rel || /login|register|verify-email|auth-action|forgot/.test(rel)) return;   // không nhớ các trang đăng nhập
  if (cache.lastPage === rel && Date.now() - cache.lastSeenAt < 20000) return;
  await patchState({ lastPage: rel, lastPageTitle: title || document.title, lastSeenAt: Date.now() }).catch(() => {});
}

/** Thêm sản phẩm vào danh sách "đã xem gần đây" (tối đa 12) */
export async function pushRecent(productId) {
  if (!cacheUid) return;
  const recent = [productId, ...cache.recent.filter((id) => id !== productId)].slice(0, 12);
  await patchState({ recent }).catch(() => {});
}
