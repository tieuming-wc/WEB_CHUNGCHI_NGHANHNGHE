# Bàn Tay Vàng – Sửa lỗi tiến độ video V3

## Nguyên nhân
Firestore không chấp nhận mảng lồng mảng `[[0,5],[5,10]]` khi ghi trong `videoRanges`. Bản V3 lưu `[{"start":0,"end":5}, {"start":5,"end":10}]`. Không phải lỗi mạng, không cần thay đổi `firestore.rules`.

## Cách cập nhật từ V2 (không cài lại Live Server)

1. Đóng tab bài học đang xem trong Chrome (không cần gỡ tiện ích).
2. Từ bản vá V3, chép đè **đúng 3 file code** vào thư mục web V2 hiện tại:
   - `js/services/video-progress.js`
   - `js/services/courses.js`
   - `js/pages/course-detail.js`
3. Có thể chép thêm `tests/video-player.test.mjs` để kiểm thử.
4. VS Code: nhấn `Ctrl + S` nếu có chỉnh file; trình duyệt: mở lại bài học, nhấn `Ctrl + Shift + R` để tải JavaScript mới.
5. Xem ít nhất 80% video, bấm **Hoàn thành bài học**, về trang khóa học, tải lại để xác minh tiến độ vẫn còn. Mục tiêu là không còn lỗi `Nested arrays` trong Console.

**Lưu ý:** Khi thay đổi code nguồn, Live Server sẽ tự phục vụ bản mới. Không cần tải lại toàn bộ ZIP hay cài lại VS Code. Nếu nhiều người cùng làm trong GitHub, kiểm tra diff trước khi chép đè các file mà đồng đội đang sửa.

## Kiểm thử logic (nếu có Node.js)

`node --test tests/video-player.test.mjs`

Các test kiểm tra định dạng lưu Firestore, phần trăm xem, khôi phục tiến độ khi tải lại và giới hạn thông báo lỗi. Kiểm thử kết nối Firebase thực tế cần chạy trên máy có tài khoản và Internet.
