/**
 * ============================================================
 *  FILE: js/services/db.js
 *  MỤC ĐÍCH: Cổng duy nhất để mọi nơi trong web gọi tới "máy chủ".
 *  Tự chọn:
 *     - Đã cấu hình Firebase  → dùng adapter-firebase.js (dữ liệu trên đám mây, đồng bộ mọi thiết bị)
 *     - Chưa cấu hình         → dùng adapter-local.js (thử nghiệm ngay trong trình duyệt)
 *  Nếu Firebase lỗi khi tải (mất mạng, cấu hình sai) → báo lỗi rõ ràng thay vì chạy sai âm thầm.
 * ============================================================
 */
import { USE_FIREBASE } from '../config/firebase-config.js';

let adapter;
export let backendError = null;

try {
  adapter = USE_FIREBASE
    ? (await import('./adapter-firebase.js')).default
    : (await import('./adapter-local.js')).default;
  await adapter.init;                       // chờ khởi tạo (vd tạo dữ liệu mẫu ở chế độ thử nghiệm)
} catch (error) {
  console.error('Không khởi tạo được máy chủ dữ liệu:', error);
  backendError = error;
  adapter = (await import('./adapter-local.js')).default;   // phương án cuối để trang vẫn hiển thị được
}

/** Đối tượng dùng khắp web: backend.get / set / list / signIn ... */
export const backend = adapter;

/** true nếu đang chạy bằng Firebase thật */
export const isCloud = adapter.mode === 'firebase';
