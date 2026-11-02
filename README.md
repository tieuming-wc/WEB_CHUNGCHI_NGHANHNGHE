# Bàn Tay Vang – Website chợ thủ công + chứng nhận tay nghề + học nghề

Website tĩnh (HTML + CSS + JavaScript thuần, không cần cài Node) chạy được trên **GitHub Pages**.
Tài khoản và dữ liệu lưu trên **Firebase** (miễn phí) nên **đăng ký / đăng nhập ở máy nào cũng được**, đăng nhập lại sẽ thấy giỏ hàng, yêu thích, đơn hàng, tiến độ học, trang đang xem dở…

Mọi file code đều có chú thích tiếng Việt ở đầu file và ở từng đoạn.

## 1. Cấu trúc thư mục

```
index.html            Trang chủ (file chính để GitHub Pages chạy)
404.html              Trang báo lỗi địa chỉ sai
pages/                Mỗi chức năng một trang HTML (login, register, shop, product, cart, checkout, orders, admin…)
css/                  base.css (màu, chữ) · layout.css (khung) · components.css (nút, form…) · pages/ (CSS riêng từng trang)
js/config/            app-config.js (tên, email hỗ trợ, tài khoản ngân hàng…) · firebase-config.js (dán cấu hình Firebase)
js/services/          Xử lý dữ liệu: auth, db (Firebase/local), orders, products, cart, certs, courses…
js/components/        Thành phần dùng chung: layout, modal, toast, captcha, thẻ sản phẩm
js/pages/             Mã JS riêng của từng trang
js/data/              Dữ liệu cố định: danh mục, làng nghề, khóa học, dữ liệu mẫu
js/utils/             Hàm tiện ích: kiểm tra dữ liệu, định dạng tiền/ngày, ảnh, đường dẫn
firestore.rules       Quy tắc bảo mật Firestore (dán vào Firebase)
```

## 2. Chạy thử trên máy (VS Code)

1. Mở thư mục dự án bằng VS Code → cài tiện ích **Live Server** → chuột phải `index.html` → **Open with Live Server**.
   (Không mở bằng cách bấm đúp file – trình duyệt chặn ES module khi chạy `file://`.)
2. Khi chưa cấu hình Firebase, web chạy **chế độ thử nghiệm**: dữ liệu chỉ lưu trong trình duyệt đó (có thanh vàng cảnh báo). Tài khoản mẫu (mật khẩu `Demo@12345`):
   `buyer@demo.vn` (người mua) · `seller@demo.vn`, `seller2@demo.vn`, `seller3@demo.vn` (người bán) · `admin@demo.vn` (quản trị).
   Mã chứng nhận mẫu để tra cứu: `BTV-2026-0001`.
   Ở chế độ này thư xác minh/đặt lại mật khẩu hiện trong "hộp thư giả lập" trên trang.

## 3. Đưa lên GitHub Pages (lấy link)

1. Tạo repository mới trên GitHub, đẩy toàn bộ thư mục lên (`git init`, `git add .`, `git commit`, `git remote add origin …`, `git push -u origin main`).
2. Repository → **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, thư mục `/ (root)` → Save.
3. Sau ~1 phút có link dạng `https://<tên>.github.io/<repo>/`. Web dùng đường dẫn tương đối nên chạy được cả ở thư mục con lẫn tên miền riêng.

## 4. Bật Firebase để dùng đa thiết bị (BẮT BUỘC để đúng yêu cầu "tài khoản ở máy nào cũng dùng được")

1. Vào https://console.firebase.google.com → **Add project** (tắt Google Analytics cũng được).
2. **Build → Authentication → Get started → Sign-in method**: bật **Email/Password** (tùy chọn: Google, Facebook – Facebook cần App ID/Secret từ Meta).
3. **Authentication → Settings → Authorized domains**: thêm `<tên>.github.io` (và tên miền riêng nếu có). `localhost` đã có sẵn.
4. **Build → Firestore Database → Create database** (chọn khu vực gần Việt Nam, ví dụ `asia-southeast1`, chế độ production).
5. Tab **Rules**: dán toàn bộ nội dung `firestore.rules` → **Publish**.
6. **Project settings (⚙) → General → Your apps → Web (</>)** → đăng ký app → copy đối tượng `firebaseConfig`.
7. Mở `js/config/firebase-config.js`, dán các giá trị `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`. Lưu, push lại GitHub. Thanh vàng "Chế độ thử nghiệm" sẽ biến mất.
   (`apiKey` của Firebase web không phải bí mật; an toàn nằm ở Rules và Authorized domains.)

### Tạo tài khoản quản trị đầu tiên
Đăng ký một tài khoản bình thường → Firebase Console → Firestore → collection `users` → mở document của tài khoản đó → sửa trường `role` thành `admin`. Từ đó có mục "Trang quản trị" trong menu tài khoản. Quản trị viên xác nhận thanh toán chuyển khoản, giao thành công, COD, hoàn tiền, đăng ký chứng nhận và chấm bài thực hành.

### Điền thông tin nhận tiền
Mở `js/config/app-config.js`: đổi `BANK` (`BIN`, `ACCOUNT_NO`, `ACCOUNT_NAME`, `BANK_LABEL`), `SUPPORT_PHONE`, `ADDRESS`. Khi có số tài khoản, đơn chuyển khoản sẽ hiện mã QR VietQR.

## 5. Những điều cần nói thẳng (giới hạn)

- **CAPTCHA và khóa đăng nhập 5 lần/15 phút chạy phía trình duyệt**, không có máy chủ riêng để kiểm tra lại. Muốn chống bot thật: bật **Firebase App Check (reCAPTCHA)**.
- **Hạn dùng liên kết email** (xác minh 24 giờ, đặt lại mật khẩu 30 phút) đúng ở chế độ thử nghiệm; với Firebase, thời hạn mặc định do Firebase quyết định (thường 1 giờ cho đặt lại mật khẩu) và không chỉnh được từ phía web.
- Không có Cloud Functions nên **trừ kho, cộng điểm đánh giá do trình duyệt thực hiện** (Rules chỉ giới hạn những trường được sửa). Muốn chặt hơn cần nâng lên gói Blaze và viết Functions.
- **Ảnh lưu thẳng trong cơ sở dữ liệu** (đã nén nhỏ) để không cần Firebase Storage; số lượng lớn nên chuyển sang Storage.
- **Không có cổng thanh toán / hãng vận chuyển thật**: quản trị viên xác nhận thủ công.
- Chứng nhận là **chứng nhận nội bộ của nền tảng**, không phải chứng chỉ kỹ năng nghề quốc gia. Điều khoản/Chính sách là bản mẫu, cần luật sư rà soát trước khi kinh doanh thật. Đấu giá mới là trang "Sắp ra mắt".
