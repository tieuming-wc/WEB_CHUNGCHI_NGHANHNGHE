/**
 * ============================================================
 *  FILE: js/config/app-config.js
 *  MỤC ĐÍCH: Toàn bộ "con số cấu hình" của website nằm ở đây.
 *  Muốn đổi tên web, phí, thời hạn, số tài khoản... chỉ sửa file này,
 *  KHÔNG cần đụng vào code ở nơi khác.
 * ============================================================
 */

export const APP = {
  // ---------- Thông tin thương hiệu ----------
  NAME: 'Bàn Tay Vàng',                       // Tên website (thay bằng tên thật của nhóm)
  TAGLINE: 'Công nhận tay nghề – Kết nối làng nghề Việt', // Khẩu hiệu
  SUPPORT_EMAIL: 'ndminh5412@gmail.com',      // Email hỗ trợ hiển thị ở chân trang
  SUPPORT_PHONE: '0900 000 000',              // Số điện thoại hỗ trợ (đổi thành số thật)
  ADDRESS: 'Trường Đại học Thủy Lợi, 175 Tây Sơn, Đống Đa, Hà Nội', // Địa chỉ liên hệ

  // ---------- Quy tắc tài khoản (theo đặc tả đăng ký/đăng nhập) ----------
  MIN_AGE: 13,                 // COND-AGE-01: tuổi tối thiểu để tạo tài khoản
  PASSWORD_MIN: 8,             // COND-PWD-01: độ dài mật khẩu tối thiểu
  PASSWORD_MAX: 64,            // COND-PWD-01: độ dài mật khẩu tối đa
  LOCK_MAX_FAILS: 5,           // COND-FAIL-01: sai tối đa bao nhiêu lần liên tiếp
  LOCK_MINUTES: 15,            // Khóa đăng nhập bao nhiêu phút sau khi sai quá số lần
  IDLE_MINUTES: 30,            // COND-SES-01: tự đăng xuất sau N phút không hoạt động (khi KHÔNG tích "Ghi nhớ")
  IDLE_WARN_SECONDS: 60,       // Báo trước bao nhiêu giây khi sắp hết phiên
  REMEMBER_DAYS: 30,           // COND-SES-01: số ngày giữ phiên khi tích "Ghi nhớ đăng nhập"
  RESEND_SECONDS: 60,          // Giới hạn gửi lại email xác minh: 1 lần / 60 giây

  // ---------- Quy tắc mua bán (theo đặc tả người mua / người bán) ----------
  PAGE_SIZE: 12,               // Số sản phẩm mỗi trang
  SHIP_FEE: 30000,             // Phí vận chuyển cố định cho mỗi gian hàng (VNĐ)
  PAY_DEADLINE_HOURS: 24,      // Hạn thanh toán với đơn trả trước
  RETURN_WINDOW_HOURS: 48,     // Hạn yêu cầu trả hàng/hoàn tiền sau khi giao thành công
  MAX_IMAGES: 5,               // Số ảnh tối đa mỗi sản phẩm (ảnh được nén để lưu gọn trong CSDL)
  MAX_IMAGE_MB: 5,             // Dung lượng tối đa mỗi ảnh trước khi nén
  MAX_REVIEW_CHARS: 1000,      // Độ dài tối đa của một đánh giá

  // ---------- Thanh toán chuyển khoản (ĐỔI THÀNH TÀI KHOẢN THẬT CỦA NHÓM) ----------
  BANK: {
    BIN: 'MB',                 // Mã/tên ngân hàng theo VietQR (vd: MB, VCB, TCB, ACB, BIDV)
    ACCOUNT_NO: '',            // Số tài khoản. ĐỂ TRỐNG = ẩn mã QR, chỉ hiện hướng dẫn chung
    ACCOUNT_NAME: 'TEN CHU TAI KHOAN',
    BANK_LABEL: 'Ngân hàng MB'
  },

  // ---------- Đăng ký chứng chỉ ----------
  CERT_FEE: 500000,            // Lệ phí đăng ký chứng nhận (VNĐ) – chỉnh theo thực tế
  EXAM_LOCATIONS: ['Hà Nội', 'TP. Hồ Chí Minh'],

  // ---------- Khóa học ----------
  // [BTV-VIDEO] NGƯỠNG HOÀN THÀNH: 0.8 = xem thật tối thiểu 80% video.
  WATCH_THRESHOLD: 0.8,        // Xem thực tế tối thiểu 80% video YouTube (không tính đoạn tua/bỏ qua)
  PASS_SCORE: 7.5,             // COND-SUB-02: điểm đạt tối thiểu cho bài thực hành
  MAX_RESUBMIT: 3              // COND-SUB-02: số lần nộp lại tối đa
};
