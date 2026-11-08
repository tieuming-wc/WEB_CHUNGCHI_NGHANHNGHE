# BÀN TAY VÀNG — BẢN V3 HOÀN CHỈNH

Đây là **toàn bộ website**, không cần file V1 hoặc V2.

## Mở website để test

1. Giải nén `Ban_Tay_Vang_V3_HOAN_CHINH.zip`.
2. Mở VS Code > **File > Open Folder** > chọn thư mục `WEB_CHUNGCHI_NGHANHNGHE` vừa giải nén.
3. Mở file `index.html`, bấm nút **Go Live** (Live Server đã cài trước đó thì không phải cài lại).
4. Trên Chrome, đi tới **Học nghề > Mây tre đan – Cấp 3 > Bài 1.1 > Bắt đầu học**.
5. Phát video trên trang web, xem tối thiểu 80%, nhấn **Hoàn thành bài học**. F12 > Console để kiểm tra lỗi nếu có.

## Chức năng bản V3

- Video YouTube chạy ngay trong trang học, không mở trang YouTube khác.
- Không hiện ô nhập/dán URL video cho học viên.
- Có thanh tiến độ xem thật, không cộng thời gian tua bỏ qua.
- Sửa cách lưu videoRanges vào Firestore (mảng object thay vì mảng lồng mảng).
- Giảm tần suất thông báo lỗi lưu tiến độ.

## Lưu ý

- Chỉ các video cho phép nhúng mới phát được. Video bài 1.1 hiện là tư liệu tham khảo, chưa phải bài giảng đầy đủ.
- Phải có Internet và tài khoản/quyền Firebase hợp lệ để đồng bộ tiến độ.
- Thay đổi link video của từng bài trong `js/data/courses.js` (`youtubeUrl`).
- Tìm comment `[BTV-VIDEO]` trong VS Code để thấy code đã thêm/sửa.
- V3 là dự án độc lập; **không cần giải nén V2 trước**.
- Chỉ mở Live Server từ đúng `WEB_CHUNGCHI_NGHANHNGHE/index.html` để các đường dẫn tương đối hoạt động.

## Test mã nguồn (không bắt buộc)

Từ thư mục dự án chạy: `node --test tests/video-player.test.mjs`.
