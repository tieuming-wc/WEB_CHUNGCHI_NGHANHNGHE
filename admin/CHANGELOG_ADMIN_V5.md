# Nhật ký sửa đổi — V5 Admin

Cấu hình mới: `admin/index.html`, `admin/js/admin.js`, `admin/css/admin.css`.

File thêm: `admin/operations.html`, `admin/js/admin-operations.js` (giữ tính năng admin cũ); `admin/js/admin-workflows.js` (gửi hồ sơ người bán); `js/services/course-content.js` (bài học ghi đè từ Firestore); `admin/HUONG_DAN_ADMIN_V5.md`, `admin/CHANGELOG_ADMIN_V5.md`, `admin/tests/admin-v5.test.mjs`.

File được chỉnh: `firestore.rules`; `js/services/auth.js`; `js/services/session.js`; `js/pages/login.js`; `js/pages/seller-product-form.js`; `js/pages/seller-products.js`; `js/pages/seller-shop.js`; `pages/seller-shop.html`; `js/pages/courses.js`; `js/pages/course-detail.js`; `js/data/seed.js`.

Những file quản lý mua hàng, giỏ hàng, checkout, chứng nhận, điểm số, nguồn video 7 bài V4 vẫn giữ nguyên nội dung. Mọi file chỉnh sửa được đánh dấu `[BTV-ADMIN]` ở nội dung cần thiết hoặc liệt kê ở đây.

## V5.1 — Gom toàn bộ code riêng Admin vào thư mục `admin/`

Chuyển HTML, CSS, JavaScript, hướng dẫn và test quản trị vào `admin/`; điều chỉnh `js/utils/paths.js`, `js/pages/login.js`, `js/pages/seller-shop.js` cùng import module. `firestore.rules` và những module dùng chung tiếp tục ở gốc. Mọi nghiệp vụ và phân quyền của V5 được giữ nguyên; đổi vị trí file **không đồng nghĩa đã kiểm thử Firebase thực tế**.
