/**
 * ============================================================
 *  FILE: js/config/firebase-config.js
 *  MỤC ĐÍCH: Nối website với "máy chủ" (Firebase) để:
 *    - Tạo tài khoản / đăng nhập trên MỌI thiết bị
 *    - Lưu hồ sơ, giỏ hàng, đơn hàng, sản phẩm... lên đám mây
 *    - Đăng nhập lại ở máy khác vẫn thấy đầy đủ dữ liệu cũ
 *
 *  CÁCH LÀM (chỉ cần làm 1 lần, xem chi tiết trong README.md, mục "Bước 2"):
 *    1. Vào https://console.firebase.google.com → tạo project (miễn phí)
 *    2. Thêm "Web app" → Firebase hiển thị đoạn cấu hình (apiKey, authDomain...)
 *    3. Dán các giá trị đó vào đối tượng FIREBASE_CONFIG bên dưới
 *    4. Lưu file, đẩy lên GitHub là xong.
 *
 *  Nếu để TRỐNG apiKey: web tự chạy ở "chế độ thử nghiệm" – dữ liệu chỉ lưu
 *  trong trình duyệt của máy đang dùng (KHÔNG đồng bộ giữa các thiết bị).
 *
 *  LƯU Ý: apiKey của Firebase Web KHÔNG phải mật khẩu bí mật, được phép
 *  công khai trên GitHub. Bảo mật nằm ở file firestore.rules (xem README).
 * ============================================================
 */

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDz_ca3K81gwZjsMRQXwrMZhdWDiwxRcx8", // ← dán apiKey vào đây
  authDomain: "business-creator-c6a11.firebaseapp.com", // ← vd: ten-project.firebaseapp.com
  projectId: "business-creator-c6a11", // ← vd: ten-project
  storageBucket: "business-creator-c6a11.firebasestorage.app", // ← (không bắt buộc, web này không dùng Storage)
  messagingSenderId: "75548493983", // ← (không bắt buộc)
  appId: "1:75548493983:web:323c1681eb3cef3d037aaa", // ← vd: 1:1234567890:web:abcdef
};

// Phiên bản thư viện Firebase tải từ CDN của Google (không cần cài đặt gì)
export const FIREBASE_SDK_VERSION = "10.12.2";

// true khi đã dán cấu hình thật → web dùng máy chủ Firebase; false → chế độ thử nghiệm
export const USE_FIREBASE = Boolean(
  FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId,
);
