# Bàn Tay Vàng V5 — Trung tâm quản trị ba nhóm quyền

## 1. V5 có gì?

V5 xây trên **V4 có 7 video học nghề**, không tạo website mới. Quản trị ở đường dẫn `admin/index.html` trong **chính website**. Một tài khoản admin lúc đầu được truy cập cả ba nhóm:

| Nhóm quyền | Nhãn trên giao diện | Nghiệp vụ |
|---|---|---|
| `accounts` | Tài khoản | Xem danh sách buyer/seller, xét duyệt tài khoản buyer, tạm khóa/mở, xem phản ánh |
| `verification` | Xác minh & kiểm duyệt | Xem hồ sơ chứng minh gian hàng, duyệt/từ chối người bán, duyệt/khóa sản phẩm |
| `learning` | Quản lý học nghề | Đổi tiêu đề, nội dung, link YouTube và đoạn học cho 7 bài hiện có |

**Vẫn giữ** phần nghiệp vụ quản trị cũ (thanh toán, COD, hoàn tiền, chứng nhận và chấm bài thực hành) tại `admin/operations.html`. Đây là trang nội bộ cùng tên miền và chỉ dành cho admin có đủ ba nhóm quyền.

### Luồng người dùng

- Người mua mới: đăng ký + xác minh email → `accountStatus: pending` → admin mục **Tài khoản** bấm **Duyệt tài khoản** → được phép mua hàng.
- Người bán mới: đăng ký + xác minh email → được lập hồ sơ, lưu bản nháp nhưng **chưa được đăng công khai**. Vào **Thông tin gian hàng → Xác minh gian hàng**, gửi loại minh chứng, nội dung giải trình và link chứng minh tùy chọn. Admin mục **Xác minh & kiểm duyệt** duyệt người bán → người bán gửi sản phẩm chờ duyệt → admin duyệt sản phẩm → hàng mới lên sàn.
- Sản phẩm đã được duyệt nếu người bán sửa nội dung sẽ quay về `pending` để xét lại. Người bán có thể ẩn sản phẩm nhưng không được tự khôi phục `visible`.
- Admin tạm khóa tài khoản người bán sẽ khóa luôn các sản phẩm đang hiển thị (cần tự xét duyệt lại khi mở tài khoản).

**Lưu ý về minh chứng**: Không tự động xác thực danh tính. Chức năng này là _thu hồ sơ và xét duyệt thủ công_. Không dán số CCCD, ảnh định danh hay hồ sơ nhạy cảm vào trường công khai. Đường dẫn chứng minh nếu có cần phân quyền truy cập và kiểm tra nguồn trước khi tin tưởng.

## 2. Cách chạy như trước

1. Giải nén V5, mở thư mục `WEB_CHUNGCHI_NGHANHNGHE` bằng VS Code.
2. Bấm **Go Live** khi mở `index.html`.
3. Trên web, đăng nhập tài khoản admin thật rồi chọn menu tên tài khoản → **Trang quản trị**; hoặc mở trực tiếp `admin/index.html` (trong cùng web).
4. Các tài khoản buyer/seller truy cập `admin/index.html` sẽ bị `requireAuth` chặn. Bảo vệ thực sự dựa trên Firestore Rules được **Publish** ở bước sau.

## 3. BẮT BUỘC: Cập nhật Firebase Rules

V5 **không thể tự thay đổi Rules trên project Firebase của bạn**.

1. Sao lưu Rules cũ.
2. Vào **Firebase Console → Firestore Database → Rules**.
3. Sao chép **toàn bộ nội dung file `firestore.rules` của V5**, dán thay phiên bản cũ.
4. Nhấn **Publish**, thử lại bằng tài khoản admin và buyer/seller.

Nếu chưa Publish Rules, form duyệt sẽ thường báo `Missing or insufficient permissions` hoặc có thể vẫn chạy theo quyền yếu ở bản cũ. **Không đưa web lên production với Rules cũ.**

> Nếu dùng chế độ `localStorage` (Firebase chưa cấu hình), các tài khoản demo chỉ dành cho thử giao diện; localStorage không có bảo mật phía máy chủ. Phiên bản Firebase thật là điều kiện cần cho phân quyền.

## 4. Tạo tài khoản ADMIN ĐẦU TIÊN — làm thủ công trong Firebase Console

Không có nút "Tạo admin" cho người dùng thường. Không đưa mật khẩu admin vào JavaScript hoặc GitHub.

1. Đăng ký một tài khoản bình thường bằng email do nhóm quản lý, xác minh email.
2. Trong **Firebase Console → Authentication → Users**, tìm đúng email, copy UID.
3. Vào **Firestore Database → Data → users → [UID]** (đúng document UID của người đó).
4. Đặt/chỉnh các trường:
   - `role` (string) = `admin`
   - `accountStatus` (string) = `active`
   - `adminPermissions` (array of strings) = `accounts`, `verification`, `learning`
5. Đăng xuất rồi đăng nhập lại bằng email đó, mở `admin/index.html`.

Nếu chưa có trường `adminPermissions`, V5 xem đó là **admin tổng hợp** (để tương thích với admin cũ). Nên khai báo tường minh ba quyền trên cho admin mới.

**Không tự ghi UID hoặc mật khẩu bất kỳ vào source.** Admin đăng nhập bằng Firebase Authentication như người dùng bình thường, nhưng chỉ UID mà người quản lý đã nâng quyền ở Firebase Console mới có quyền quản trị.

## 5. Tách thành ba admin sau này

Trong Firebase Console, tạo/đăng ký và xác minh ba tài khoản riêng. Mỗi tài khoản có `role=admin`, `accountStatus=active`, `adminPermissions` chỉ gồm MỘT giá trị:

- Admin A: `["accounts"]`
- Admin B: `["verification"]`
- Admin C: `["learning"]`

Trang quản trị chỉ hiển thị phân hệ được phép; Rules cũng áp dụng cùng phạm vi. Các nghiệp vụ cũ gộp nhiều quyền hiện nằm trong `admin/operations.html`, chỉ admin có **đủ cả ba** quyền mới mở được. Trước khi loại bỏ admin tổng hợp, cần phân bổ lại thao tác chấm bài, chứng nhận và đơn hàng vào từng phân hệ.

## 6. Cập nhật bài học từ giao diện

Admin → **Quản lý học nghề** → **Sửa bài / video** → thay tiêu đề/nội dung/link YouTube/đoạn học → Lưu.

Dữ liệu ghi vào Firestore collection `courseLessonOverrides`, khóa là `<courseId>__<lessonId>`. Web sẽ đọc bản ghi này đè lên nội dung mặc định trong `js/data/courses.js`. Không xóa hay thay đổi ID bài để tránh mất liên kết tiến độ. Phiên bản này **chỉnh sửa 7 bài hiện có**; chưa có giao diện tạo thêm chương/khóa học mới.

## 7. Chú ý trước khi vận hành thực tế

- **Quản trị bằng giao diện ≠ xác minh tự động:** người duyệt phải kiểm tra minh chứng, hàng cấm, nguồn gốc và các quy định áp dụng.
- **Tạm khóa bằng Firestore**: người bị khóa có thể vẫn đăng nhập Firebase Auth, nhưng quy tắc chặn các tác vụ dữ liệu, mua/bán. Muốn vô hiệu hóa hẳn tài khoản Auth phải dùng Firebase Admin SDK/Cloud Functions đáng tin cậy (không bao giờ nhúng Admin SDK credentials vào website tĩnh).
- **Thanh toán/kiểm hàng**: backend hiện là website tĩnh với các giao dịch client-side từ dự án gốc, chưa phải hệ thống thương mại điện tử được kiểm thử bảo mật đầu cuối. Cần backend đáng tin cậy trước khi vận hành thật với tiền, CCCD, đơn hàng.
- **Minh chứng**: V5 lưu mô tả và tùy chọn đường dẫn, chưa có upload file riêng được bảo vệ bằng Firebase Storage. Không đưa giấy tờ định danh vào Firestore dạng công khai hoặc link có thể bị chia sẻ rộng rãi.
- **Tài khoản seller cũ**: những hồ sơ chưa có `sellerStatus` được coi là chưa duyệt cho các lần đăng mới. Các sản phẩm cũ đang `visible` không tự xóa; admin phải rà soát rồi khóa nếu cần. Những seller demo của localStorage được cấp `approved` để dễ thử tính năng cũ.
- **Publish Rules** và kiểm thử tài khoản 3 vai trò là bắt buộc. Các test Node trong thư mục `tests/` chỉ kiểm thử code tĩnh / nghiệp vụ, không thay thế kiểm thử Firebase thực tế.

## 8. Bài test thủ công cần thử

1. Buyer mới đăng ký → không đặt hàng được trước phê duyệt.
2. Admin A duyệt buyer → buyer mua được.
3. Seller mới → lưu được bản nháp, không đăng công khai được khi chưa được xác minh.
4. Seller gửi minh chứng → admin B duyệt hoặc từ chối → seller gửi sản phẩm → admin duyệt → sản phẩm hiện cho buyer.
5. Seller sửa sản phẩm đã duyệt → trạng thái quay `pending`, không hiện cho buyer cho đến khi admin duyệt lại.
6. Admin khóa seller → sản phẩm đang bán bị khóa; kiểm tra không tạo đơn mới từ sản phẩm đó.
7. Buyer hoặc seller mở URL `admin/index.html` → bị từ chối; thử đọc/ghi data admin qua Firebase client cũng bị Rules chặn.
8. Admin C sửa video khóa Mây tre/Gốm → học viên tải lại thấy video mới; học 80%, tiến độ lưu lại.
9. Chức năng cũ: giỏ hàng, đơn hàng, chứng chỉ, nộp thực hành, duyệt và chấm bài kiểm thử lại.

`[BTV-ADMIN]` là từ khóa comment trong source để tìm các chỗ thay đổi bằng Ctrl+Shift+F.
