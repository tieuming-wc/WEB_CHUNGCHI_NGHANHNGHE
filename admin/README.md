# Bàn Tay Vàng — thư mục quản trị (V5.1)

**Toàn bộ phần CODE RIÊNG của Admin được gom ở đây**, tách khỏi những màn hình người mua/người bán.

```text
WEB_CHUNGCHI_NGHANHNGHE/
├── index.html                # Trang chủ website
├── pages/                    # Các trang người mua, người bán, học nghề
├── js/                       # Logic và dịch vụ dùng CHUNG
├── css/                      # CSS dùng CHUNG
├── firestore.rules           # QUYỀN BẢO MẬT CHUNG, ở gốc (không di chuyển)
└── admin/                    # [BTV-ADMIN] TẤT CẢ CODE RIÊNG CỦA ADMIN
    ├── index.html            # Trung tâm quản trị (3 nhóm quyền)
    ├── operations.html       # Nghiệp vụ admin cũ: đơn, chứng chỉ, chấm bài
    ├── css/
    │   └── admin.css        # Giao diện admin
    ├── js/
    │   ├── admin.js         # Các chức năng quản trị chính
    │   ├── admin-operations.js
    │   └── admin-workflows.js  # Người bán gửi yêu cầu xét duyệt
    ├── tests/                # Kiểm tra code Admin
    ├── HUONG_DAN_ADMIN_V5.md
    └── CHANGELOG_ADMIN_V5.md
```

## Mở trang quản trị

**Admin thuộc cùng website Bàn Tay Vàng**, không phải một website độc lập. Khi đăng nhập tài khoản có quyền admin, ở **trang chủ** sẽ có nút **🛡 Trang quản trị** trên thanh menu (và cũng có mục **Trang quản trị** trong menu tài khoản). Bấm nút để vào `admin/index.html` mà không đổi tên miền. Tài khoản người mua và người bán không thấy nút này; khi gõ URL trực tiếp, JS chặn truy cập và quyền dữ liệu do `firestore.rules` quyết định.

Mở toàn bộ website bằng VS Code → Live Server như trước, đăng nhập tài khoản được cấp `role=admin` trong Firebase → menu **Trang quản trị**. Hoặc dùng URL `.../admin/index.html` trong cùng website.

**Không cần mở `admin/index.html` riêng như một website khác.** Đường dẫn đã được sửa trong `js/utils/paths.js` và `js/pages/login.js`. Nghiệp vụ cũ là `.../admin/operations.html`.

## Những file không nên chuyển

- `firestore.rules`: quy định truy cập dữ liệu của cả hệ thống, bắt buộc ở vị trí gốc trong cấu trúc dự án hiện tại.
- `js/services/auth.js`, `js/services/session.js`, `js/services/db.js`: đăng nhập và dữ liệu dùng chung cho cả ba vai trò.
- `js/services/course-content.js`: Admin sửa bài học, người học phải đọc nội dung nên module này là code dùng chung.
- `js/components/layout.js`, `js/utils/paths.js`: header và điều hướng chung cho toàn bộ web.

Các file dùng chung được giữ nguyên vị trí để tránh gãy các trang cũ. **Chuyển file vào `admin/` không tự làm phần này bảo mật hơn**: cần admin UID + Firestore Rules đúng, được người quản lý Firebase duyệt và Publish.

## Kiểm tra thay đổi

Từ thư mục gốc của dự án (nếu có Node.js):

`node --test tests/*.mjs admin/tests/*.mjs`

Trong VS Code có thể tìm `[BTV-ADMIN] V5.1`. Nếu anh kỹ thuật muốn duyệt toàn bộ chức năng/quyền, đọc `HUONG_DAN_ADMIN_V5.md` trong cùng thư mục và `../firestore.rules` ở gốc.

**Không cần Publish lại Rules chỉ vì di chuyển thư mục code**, nhưng trước khi chạy thật phải bảo đảm bản Rules V5 đã được xét duyệt và Publish chính xác.
