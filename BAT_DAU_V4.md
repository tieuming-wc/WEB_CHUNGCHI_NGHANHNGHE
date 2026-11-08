# BÀN TAY VÀNG – BẢN V4: CẢ 7 BÀI ĐÃ GẮN VIDEO

## Cách chạy (không cần Node.js)

1. Giải nén ZIP, mở đúng thư mục `WEB_CHUNGCHI_NGHANHNGHE` bằng VS Code (`File > Open Folder`).
2. Cài extension **Live Server** một lần (nếu đã cài thì không cài lại).
3. Mở `index.html`, bấm **Go Live**.
4. Đăng nhập vào tài khoản dùng để học; chọn **Học nghề**.
5. Cả khóa **Mây tre đan – Cấp 3** (4 bài) và **Gốm Bát Tràng – Nhập môn tạo hình** (3 bài) đều có video.
6. Nhấn **Bắt đầu học**, video YouTube phát trong website. Xem 80% đoạn minh họa (tối đa 5 phút) để hoàn thành lý thuyết. Bài có thực hành vẫn phải nộp sản phẩm được chấm đạt.

**Lưu ý về video ngắn**: Các video gốc do tác giả YouTube đăng có thể dài hơn 5 phút. V4 sử dụng **YouTube IFrame Player API** với `start` / `end`, phát đoạn tối đa 300 giây. Video gốc ngắn hơn được phát đủ. Không tải hay chỉnh sửa tệp video của người khác. Thanh tiến độ dưới web tính theo thời lượng đoạn học, không theo tổng thời lượng của video gốc.

## Danh sách video gắn sẵn

| Khóa học | Bài | ID | Video | Trọng tâm / giới hạn |
|---|---|---|---|---|
| Mây tre | 1.1 | l1-1 | https://www.youtube.com/watch?v=-GgpGK7gyX8 | Tư liệu Mnông chọn và đan mây tre; clip gốc 14:35, bản V4 chỉ phát tối đa 5 phút |
| Mây tre | 1.2 | l1-2 | https://www.youtube.com/watch?v=6l-bviqjf24 | Xử lý tre chống mối mọt tại xưởng Ngọc Dương; không đủ phần sấy |
| Mây tre | 2.1 | l2-1 | https://www.youtube.com/watch?v=cdstTVFjhJA | Tạo đáy giỏ mây tròn; minh họa thay cho đĩa tròn hoàn chỉnh; tiếng Anh |
| Mây tre | 2.2 | l2-2 | https://www.youtube.com/watch?v=r7eye5vtbtQ | Tre đan chao đèn (danh mục video đào tạo của Switch-Asia); cần bổ sung uốn nhiệt và hoa văn phức tạp |
| Gốm | 1.1 | g1-1 | https://www.youtube.com/watch?v=ZPwNAYvnK9w | Nhào đất và loại bọt khí; thiếu phân loại/bảo quản; tiếng Anh |
| Gốm | 1.2 | g1-2 | https://www.youtube.com/watch?v=0z3DBFahG8s | Thao tác xoay hũ gốm thủ công của Vườn Nhà Gốm; thiếu lý thuyết an toàn/tư thế |
| Gốm | 1.3 | g1-3 | https://www.youtube.com/watch?v=YpnILt9trjk | Tạo bình cổ hẹp trên bàn xoay; phần khó vẫn có bài nộp sản phẩm; tiếng Anh |

## Thông tin nguồn và kiểm chứng

- Bài 1.1 mây tre: `https://disanketnoi.vn/bo-suu-tap/ky-thuat-dan-may-tre-cua-nguoi-mnong-tai-xa-yang-tao-huyen-lak-tinh-dak-lak/`
- Bài 1.2 mây tre: `https://tretrucngocduong.com/cach-xu-ly-tre-tuoi-khong-bi-moi-mot/`
- Bài 2.1 mây tre: video từ kênh Kumru Home Design (YouTube).
- Bài 2.2 mây tre: `https://www.switch-asia.eu/site/assets/files/3805/14_e-pathshala-book_compressed.pdf` (liệt kê video Bamboo Handcraft lampshade).
- Bài 1.1 gốm: video How to Wedge Clay của KaransPotsAndGlass (YouTube).
- Bài 1.2 gốm: `https://vuonnhagom.vn/blogs/vuonnhagom-studio/san-xuat-gom-thu-cong-xoay-hu-gom-dung-mut-ngay-tet-co-truyen-phan-2` (dẫn tới video phần trước).
- Bài 1.3 gốm: video How to throw and trim a bud vase? của Pottery101 (YouTube).

**Chưa thể xác minh thực tế ngay trong môi trường đóng gói rằng mọi chủ kênh đều cho phép nhúng video** và thời lượng gốc của mọi video. Vui lòng thử từng bài trong Chrome. Nếu YouTube báo lỗi 101 hoặc 150 thì tác giả chặn nhúng, phải chọn video khác. Các video trên là **tư liệu minh họa, không phải bài giảng chính thức của Bàn Tay Vàng**; phải để nghệ nhân/giảng viên thẩm định trước khi công bố là giáo trình chuẩn.

## File đã sửa

- `js/data/courses.js`: **7/7 link** và ghi chú, `videoClipSeconds: 300`. Tìm `[BTV-VIDEO] V4` để xem comment.
- `js/pages/course-detail.js`: YouTube Player phát trích đoạn 5 phút; tiến độ đúng đoạn; không hiện ô dán link người học.
- `js/services/video-window.js`: hàm tính trích đoạn và thời lượng học.
- `tests/all-seven-lessons.test.mjs`: kiểm thử 7 video, cửa sổ 300 giây, 80% và dữ liệu Firestore.

## Cách thay link video sau này

Trong `js/data/courses.js`, tìm `id: 'g1-2'` (hoặc ID bài khác), sửa `youtubeUrl`. Các thay đổi comment để bạn cùng nhóm theo dõi. Nhấn `Ctrl + S`, vào Chrome nhấn `Ctrl + Shift + R`. Không cần giải nén ZIP mới hay cài lại Live Server.

## Nếu muốn chạy kiểm thử

Trong Terminal tại thư mục dự án, gõ `node --test tests/*.mjs` (cần Node.js để chạy test, **không cần Node.js để chạy trang web**). Các test chỉ kiểm tra code và định dạng link, **không xác minh phát video YouTube thực tế**.

## Lưu ý tiến độ cũ

Website giữ nguyên cơ chế lưu Firebase của bản V3.1. Những bài đã hoàn thành không bị xóa bởi bản ZIP này nếu vẫn đăng nhập đúng tài khoản và cùng dự án Firebase. Không tự thay `firestore.rules` hoặc cấu hình Firebase. Trong Chrome khi cập nhật bản mới, nhấn `Ctrl + Shift + R` để tránh cache JS cũ.
