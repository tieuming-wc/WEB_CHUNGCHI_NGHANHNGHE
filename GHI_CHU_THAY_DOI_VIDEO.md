# [BTV-VIDEO] Nhật ký thay đổi – học YouTube ngay trên Bàn Tay Vàng

**Mục đích:** Đánh dấu chính xác phần sửa để thành viên nhóm dễ đọc, review, merge vào repo và không bị ghi đè khi cùng làm.

**Từ khóa tìm kiếm trong VS Code:** `BTV-VIDEO` (Ctrl+Shift+F). Những comment mang mã này chỉ vị trí thay đổi trong source.

## [BTV-VIDEO] Cập nhật V3 – sửa lỗi Firebase và thông báo đỏ lặp lại (05/11/2026)

**Hiện tượng đã tái hiện qua ảnh Console:** `FirebaseError: Function setDoc() called with invalid data. Nested arrays are not supported (found in document userState/...)`.

**Nguyên nhân:** Firebase Firestore không nhận `videoRanges: [[0, 10], [10, 20]]` (mảng lồng mảng). Điều này không liên quan tới tốc độ mạng hoặc quyền truy cập.

- `js/services/video-progress.js`: thêm `videoRangesForStorage()` để chuyển từng đoạn xem thành đối tượng `{ start, end }`; khi đọc chấp nhận cả mảng cũ và object mới; tiếp tục cộng chỉ những đoạn đã xem.
- `js/services/courses.js`: khi lưu tiến độ, gộp đoạn xem trước đó và gửi `videoRanges` dạng object lên Firebase, giữ nguyên phép tính ngưỡng **80%** và trạng thái hoàn thành.
- `js/pages/course-detail.js`: giải mã dữ liệu đã lưu khi mở trình phát; khi lỗi lưu, cách 15 giây mới thử lại và tối đa một thông báo đỏ mỗi 30 giây; bỏ toast trùng khi bấm thoát/hoàn thành.
- `tests/video-player.test.mjs`: thêm kiểm thử dạng dữ liệu Firestore, khôi phục tiến độ, ngăn xem trùng, và giới hạn thông báo lỗi.

**Cách áp dụng:** Nếu đang dùng dự án V2, chỉ cần chép đè 4 file kể trên từ ZIP bản vá V3 vào đúng đường dẫn rồi Ctrl+Shift+R trong Chrome. Không phải cài lại VS Code/Live Server. Đừng thay toàn bộ source nếu đồng đội đã sửa các file khác.

**Test thủ công:** đăng nhập, xem >80% video bài 1.1, bấm Hoàn thành bài học, về khóa học và F5. Tiến độ phải còn, không hiện `Nested arrays` và không có loạt toast đỏ. Bản này đã kiểm thử logic Node.js; kết nối Firebase thực tế cần thử trong browser của nhóm.

## [BTV-VIDEO] Cập nhật V2 – ẩn bộ nhập link trong trang học

- `js/pages/course-detail.js`: **xóa hoàn toàn** form `video-setup`, sự kiện lưu link thử, và cơ chế đọc `btv-video-preview:*` trong `localStorage`. Trình phát lấy video cố định qua `lesson.youtubeUrl`, nên người học trên `localhost` cũng **không thấy khung nhập link**.
- `js/data/courses.js`: thay video phóng sự cũ ở `l1-1` bằng tư liệu **Kỹ thuật đan mây tre của người Mnông** (YouTube `-GgpGK7gyX8`), có phần chọn tre, nứa, mây; dùng `videoReference: true` để thông báo là tư liệu tham khảo.
- `css/pages/courses.css`: bỏ CSS chỉ phục vụ form nhập link cũ.
- `README.md` và `HUONG_DAN_VIDEO_YOUTUBE.md`: cập nhật quy trình gắn video bằng cách sửa trong code; mô tả nguồn tư liệu.
- Vẫn giữ nguyên chức năng xem YouTube trong web, thanh tiến độ, nút hoàn thành và các comment `[BTV-VIDEO]`.

## Các file đã thêm mới

- `js/components/youtube-player.js` – kiểm tra/đọc ID từ URL YouTube, tải YouTube IFrame Player API.
- `js/services/video-progress.js` – tính % theo các đoạn đã xem thực tế, không tính đoạn tua bỏ qua.
- `tests/video-player.test.mjs` – test hàm lấy YouTube ID và tính tiến độ video.
- `HUONG_DAN_VIDEO_YOUTUBE.md` – hướng dẫn bật tính năng và gắn link YouTube cho từng bài.
- `GHI_CHU_THAY_DOI_VIDEO.md` – chính file ghi chú này.

## Các file đã chỉnh sửa

- `pages/course-detail.html` – thêm `<section id="course-theater">` chứa màn hình video, giữ người dùng ở trang hiện tại.
- `js/pages/course-detail.js` – đổi nút **Bắt đầu học** sang trình phát YouTube; theo dõi lượt phát thật; hiển thị tiến độ, hoàn thành, chuyển bài, trở lại mục lục.
- `css/pages/courses.css` – CSS cho màn hình học video, khung phát, tiến độ, phóng to, thông báo hoàn thành và responsive.
- `js/services/courses.js` – `saveVideoProgress(...)` lưu videoId/videoRanges/videoDuration, suy ra mức hoàn thành lý thuyết.
- `js/services/userstate.js` – merge tiến độ theo từng course/lesson để không ghi đè tiến độ khác trong cache.
- `js/data/courses.js` – `youtubeUrl` (ví dụ bài `l1-1`), `videoTitle`, `videoReference`.
- `js/config/app-config.js` – chú thích ngưỡng `WATCH_THRESHOLD` 80% được áp dụng với video.
- `README.md` – chỉ dẫn sang tài liệu thay đổi.

## Chỗ cần thay nội dung khi web triển khai thật

Vào `js/data/courses.js`, tìm `youtubeUrl:`, thay bằng link YouTube của giảng viên, đổi `videoTitle`, bỏ `videoReference: true`. Bài chưa cấu hình link sẽ không bật được **Bắt đầu học**. Chủ video cần cho phép nhúng.

## Lưu ý làm việc nhóm với GitHub

Bản ZIP này là **bản source có sửa trên máy**, **chưa đẩy lên** repository GitHub của nhóm. Nếu một người khác đã clone repo, hãy copy các file đã sửa vào đúng vị trí trong repo đã clone hoặc dùng `git diff` để kiểm tra và merge. **Không chép đè toàn bộ dự án lên các thay đổi mới của đồng đội.**

Sau khi đưa code vào repo: chạy `git status`, `git diff`, kiểm thử; rồi commit với lời nhắn ví dụ `feat(lms): embed YouTube lessons [BTV-VIDEO]` và push theo quy trình của nhóm.

## Kiểm thử nhanh

- `node --test tests/video-player.test.mjs` (nếu máy đã cài Node.js).
- Dùng VS Code Live Server để vào phần Học nghề và thử video bài 1.1.
- Chạy website trên localhost/HTTPS; YouTube yêu cầu video được cho phép embed.
