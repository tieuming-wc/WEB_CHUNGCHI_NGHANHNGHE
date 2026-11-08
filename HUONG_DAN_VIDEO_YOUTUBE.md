# Bàn Tay Vàng – Hướng dẫn tích hợp YouTube bài học

> **[BTV-VIDEO]** Ghi chú tích hợp dành cho nhóm code. Xem danh sách file và lưu ý merge ở `GHI_CHU_THAY_DOI_VIDEO.md`.

## Dùng ngay

1. Mở dự án bằng **VS Code → Live Server** (không mở trực tiếp file HTML dạng `file://`).
2. Đăng nhập tài khoản demo: `buyer@demo.vn` / `Demo@12345` nếu chưa có Firebase.
3. Vào **Học nghề → Mây tre đan – Cấp 3 → Bài 1.1**, bấm **Bắt đầu học**.
4. Video xuất hiện trong web. Bấm ▶ ngay trên khung YouTube. Tiến độ tăng khi video đang phát.
5. Xem đủ **80%** thời lượng video, bấm **Hoàn thành bài học** → chọn **Bài tiếp theo** hoặc **Về khóa học**.
6. Bài có thực hành: thay vì báo đã hoàn thành ngay, web đưa bạn về form **Nộp bài thực hành**.

## Gắn video do nhóm lựa chọn

Mở `js/data/courses.js`. Mỗi bài (`l1-1`, `l1-2`, `l2-1`, `l2-2`, `g1-1`...) có thể thêm:

```js
youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID_CUA_BAN',
videoTitle: 'Tên video muốn hiển thị',
```

Dán vào object của bài đó, cùng cấp với `id`, `title`, `minutes`, `level`, `content`. Xóa `videoReference: true` khi thay tư liệu tham khảo bằng bài giảng chính thức của nhóm.

**[BTV-VIDEO] SỬA V2:** Ô dán link YouTube đã được bỏ hoàn toàn khỏi màn hình học (kể cả localhost). Người biên tập chỉnh link trong `js/data/courses.js`, lưu file rồi tải lại trang bằng Ctrl+F5.

**Bài 1.1 đang sử dụng tư liệu** “Kỹ thuật đan mây tre của người Mnông tại xã Yang Tao”, video: `https://youtu.be/-GgpGK7gyX8`, nguồn mô tả: https://disanketnoi.vn/bo-suu-tap/ky-thuat-dan-may-tre-cua-nguoi-mnong-tai-xa-yang-tao-huyen-lak-tinh-dak-lak/ . Tư liệu có đề cập việc chọn tre, nứa và mây, nhưng chưa chắc video thể hiện đầy đủ 3 mục tiêu bài; nhóm cần rà soát nội dung và quyền nhúng trước khi phát hành chính thức.

## File code mới/sửa

- `js/components/youtube-player.js`: kiểm tra URL & tải YouTube IFrame Player API.
- `js/services/video-progress.js`: gom các đoạn thời gian đã xem, tránh cộng trùng khi xem lại.
- `js/services/courses.js`: lưu kết quả xem video vào tiến độ khóa học.
- `js/services/userstate.js`: giữ các tiến độ bài khác trong bộ nhớ khi lưu bài hiện tại.
- `js/pages/course-detail.js`: chuyển màn hình, phát video, khóa nút hoàn thành khi chưa đủ 80%, popup chúc mừng, chuyển bài.
- `css/pages/courses.css`: giao diện màn hình video, responsive, fullscreen.
- `pages/course-detail.html`: khung màn hình video bên cạnh giao diện bài học.
- `js/data/courses.js`: ví dụ gắn video ở bài 1.1.

## Những điều cần nhớ

- Video nguồn trên YouTube không lưu ở máy chủ của Bàn Tay Vàng, website chỉ nhúng trình phát chính thức.
- Không thể phát video đã bị xóa, đặt riêng tư hoặc tắt tính năng nhúng. Video *Không công khai* (Unlisted) thường nhúng được nếu chủ video cho phép.
- Người dùng vẫn ở trang Bàn Tay Vàng khi bấm nút học, hoàn thành và chuyển bài. Logo/liên kết trong player do YouTube quản lý có thể dẫn ra YouTube.
- Tiến độ chỉ tính đoạn phát thực sự (không tính thời gian tạm dừng, chuyển tab, tua bỏ qua). Để lưu trên nhiều thiết bị, hãy cấu hình Firebase theo README gốc.
- Hệ thống điểm/xác nhận này là demo LMS phía trình duyệt, không thể thay thế cơ chế chống gian lận phía máy chủ nếu dùng cấp chứng nhận chính thức.
- Để kiểm tra local: kiểm tra mạng có cho truy cập `https://www.youtube.com/iframe_api` và video có cho phép nhúng.


## [BTV-VIDEO] Lỗi lưu tiến độ Firebase (bản V3)

Nếu Console báo `Nested arrays are not supported` thì code V2 đang lưu `videoRanges` ở dạng mảng lồng mảng. Bản V3 chuyển sang danh sách object `{start, end}` nên Firebase nhận được. Không cần chỉnh `firestore.rules` và không nên mở public quyền ghi dữ liệu.

Dấu hiệu kiểm tra: sau khi xem trên 80%, bấm Hoàn thành bài học, về trang khóa học, F5 và kiểm tra mục lục vẫn hiển thị Đã hoàn thành.
