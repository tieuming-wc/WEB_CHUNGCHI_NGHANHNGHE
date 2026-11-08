/**
 * ============================================================
 *  FILE: js/data/courses.js
 *  MỤC ĐÍCH: Nội dung khóa học (LMS) theo cấu trúc cây 4 tầng của đặc tả:
 *     Cấp 1: Khóa/Module cấp độ tay nghề
 *       Cấp 2: Chương kỹ thuật
 *         Cấp 3: Bài học (thời lượng + độ khó)
 *           Cấp 4: Phần / bài tập thực hành (nộp sản phẩm)
 *
 *  Độ khó: basic 🟢 Cơ bản | medium 🟡 Trung bình | hard 🔴 Rất khó
 *  Bài "hard" bị KHÓA cho tới khi hoàn thành 100% bài cấp dưới (COND-CRS-01).
 *  ⚠ Nội dung bài học bên dưới là KHUNG MẪU – nhóm cần để nghệ nhân/giảng viên hoàn thiện.
 * ============================================================
 */

export const LEVEL_LABEL = { basic: '🟢 Cơ bản', medium: '🟡 Trung bình', hard: '🔴 Rất khó' };

export const COURSES = [
  {
    id: 'may-tre-cap3',
    title: 'Mây tre đan – Cấp 3: Thợ có tay nghề cơ bản',
    craft: 'Mây tre đan', village: 'Phú Vinh (Hà Nội)',
    summary: 'Từ chọn nguyên liệu, xử lý chống mối mọt tới đan khung và phối hoa văn đèn trang trí.',
    modules: [{
      id: 'm1', title: 'MODULE 1: KỸ THUẬT TẠO HÌNH CƠ BẢN (Dành cho Cấp 3 – Thợ cơ bản)',
      chapters: [
        { id: 'c1', title: 'CHƯƠNG 1: XỬ LÝ NGUYÊN LIỆU & BẢO QUẢN', lessons: [
          { id: 'l1-1', title: 'Bài 1.1: Phân loại mây tre & tiêu chuẩn chọn lọc', minutes: 15, level: 'basic',
            // [BTV-VIDEO] SỬA V2: tư liệu chuyên đề về chọn tre, nứa, mây, sơ chế và đan; nguồn Di Sản Kết Nối.
            // https://disanketnoi.vn/bo-suu-tap/ky-thuat-dan-may-tre-cua-nguoi-mnong-tai-xa-yang-tao-huyen-lak-tinh-dak-lak/
            // Đây là VIDEO TƯ LIỆU, chưa phải giáo án đầy đủ (cần giảng viên biên soạn và kiểm tra bản quyền nhúng).
            // Để thay video: chỉ cần đổi youtubeUrl/videoTitle ở ĐÂY, không có ô nhập link phía người học.
            youtubeUrl: 'https://www.youtube.com/watch?v=-GgpGK7gyX8',
            videoClipSeconds: 300, // [BTV-VIDEO] V4: xem đoạn tối đa 5 phút bằng YouTube IFrame API
            videoTitle: 'Kỹ thuật đan mây tre của người Mnông – tư liệu tham khảo',
            videoReference: true,
            videoReferenceNote: 'Tư liệu Di Sản Kết Nối: minh họa chọn nguyên liệu và cách đan mây tre của người Mnông, chưa phải giáo án đầy đủ của Bài 1.1.',
            content: ['Nhận biết các loại mây, tre dùng trong đan lát và công dụng của từng loại.', 'Tiêu chuẩn chọn nguyên liệu: thân thẳng, đều, không nứt, không sâu mọt.', 'Phân loại theo kích thước để dùng đúng chỗ: khung, nan, dây buộc.'] },
          { id: 'l1-2', title: 'Bài 1.2: Kỹ thuật xử lý chống mối mọt & sấy nguyên liệu', minutes: 30, level: 'medium',
            // [BTV-VIDEO] V3.1: Video minh họa xử lý chống mối mọt tre trúc tại xưởng Ngọc Dương.
            // Nguồn: https://tretrucngocduong.com/cach-xu-ly-tre-tuoi-khong-bi-moi-mot/
            // Bài còn thiếu minh họa chuyên sâu về sấy và bảo quản nguyên liệu, cần nghệ nhân bổ sung.
            youtubeUrl: 'https://www.youtube.com/watch?v=6l-bviqjf24',
            videoClipSeconds: 300, // [BTV-VIDEO] V4
            videoTitle: 'Chống Mối Mọt Tre Trúc Tầm Vông – Quy trình tại xưởng Ngọc Dương',
            videoReference: true,
            videoReferenceNote: 'Tư liệu xưởng Tre Trúc Ngọc Dương minh họa xử lý tre chống mối mọt. Chưa bao quát đầy đủ kỹ thuật sấy và bảo quản mây tre; nhóm cần bổ sung giáo án.',
            content: ['Vì sao nguyên liệu cần xử lý trước khi đan.', 'Các bước xử lý chống mối mọt và làm khô nguyên liệu.', 'Cách bảo quản nguyên liệu sau xử lý để không ẩm mốc.'] }
        ] },
        { id: 'c2', title: 'CHƯƠNG 2: KỸ THUẬT ĐAN KHUNG & PHỐI HOA VĂN', tag: 'MÔN KHÓ', lessons: [
          { id: 'l2-1', title: 'Bài 2.1: Đan đĩa tròn cơ bản', minutes: 40, level: 'medium',
            // [BTV-VIDEO] V4: Kumru Home Design – đan đáy giỏ mây tròn; minh họa kỹ thuật nền trước khi đan đĩa.
            // Nguồn: https://www.youtube.com/watch?v=cdstTVFjhJA
            youtubeUrl: 'https://www.youtube.com/watch?v=cdstTVFjhJA',
            videoClipSeconds: 300,
            videoTitle: 'Lesson 4 – Round Basket Base Start (Kumru Home Design)',
            videoReference: true,
            videoReferenceNote: 'Video dạy tạo đáy giỏ mây tròn, minh họa kỹ thuật đan nan/khởi tạo vòng; chưa phải hướng dẫn làm đĩa tròn hoàn chỉnh. Nội dung tiếng Anh.',
            content: ['Dựng khung đĩa tròn và chia nan đều.', 'Đan vòng và giữ độ căng đồng đều.', 'Hoàn thiện viền, vuốt phẳng bề mặt.'] },
          { id: 'l2-2', title: 'Bài 2.2: Kỹ thuật uốn khung & đan hoa văn đèn trang trí phức tạp', minutes: 120, level: 'hard', key: true,
            // [BTV-VIDEO] V4: tài liệu Switch-Asia liệt kê video 'Bamboo Handcraft lampshade'.
            // https://www.switch-asia.eu/site/assets/files/3805/14_e-pathshala-book_compressed.pdf
            youtubeUrl: 'https://www.youtube.com/watch?v=r7eye5vtbtQ',
            videoClipSeconds: 300,
            videoTitle: 'Bamboo Handcraft Lampshade – minh họa đan chao đèn bằng tre',
            videoReference: true,
            videoReferenceNote: 'Tư liệu kỹ thuật làm chao đèn tre. Chưa đủ để dạy riêng về uốn nhiệt, mối nối và hoa văn phức tạp; cần nghệ nhân bổ sung phần thực hành.',
            parts: [
              { icon: '📖', title: 'Phần 1: Phân tích bản vẽ & tính toán tỷ lệ khung', minutes: 30 },
              { icon: '🎥', title: 'Phần 2: Mẫu thao tác uốn khung nhiệt & xử lý mối nối', minutes: 45 },
              { icon: '🛠️', title: 'Phần 3: Các lỗi thường gặp khiến khung bị lệch/gãy', minutes: 15 },
              { icon: '📤', title: 'Phần 4: BÀI TẬP THỰC HÀNH NỘP SẢN PHẨM MẪU', minutes: 30, practical: true }
            ],
            content: ['Đọc bản vẽ, tính tỷ lệ các vòng khung.', 'Uốn khung bằng nhiệt và xử lý mối nối chắc, đẹp.', 'Nhận biết lỗi gây lệch, gãy khung và cách khắc phục.', 'Nộp sản phẩm mẫu: video 4 góc + ảnh mối nối.'] }
        ] }
      ]
    }]
  },
  {
    id: 'gom-nhap-mon',
    title: 'Gốm Bát Tràng – Nhập môn tạo hình',
    craft: 'Gốm sứ', village: 'Bát Tràng (Hà Nội)',
    summary: 'Làm quen đất sét, bàn xoay và các bước tạo hình cơ bản trước khi vẽ men và nung.',
    modules: [{
      id: 'm1', title: 'MODULE 1: NHẬP MÔN TẠO HÌNH GỐM',
      chapters: [
        { id: 'c1', title: 'CHƯƠNG 1: ĐẤT SÉT & DỤNG CỤ', lessons: [
          { id: 'g1-1', title: 'Bài 1.1: Nhận biết và xử lý đất sét', minutes: 20, level: 'basic',
            // [BTV-VIDEO] V4: Hướng dẫn nhào đất loại bọt khí (Karan's Pots and Glass).
            // Nguồn: https://www.youtube.com/watch?v=ZPwNAYvnK9w
            youtubeUrl: 'https://www.youtube.com/watch?v=ZPwNAYvnK9w',
            videoClipSeconds: 300,
            videoTitle: 'How to Wedge Clay – nhào đất loại bọt khí',
            videoReference: true,
            videoReferenceNote: 'Hướng dẫn nhào đất loại bọt khí trước khi tạo hình. Chưa dạy hết phân loại đất và bảo quản; video tiếng Anh.',
            content: ['Các loại đất dùng làm gốm và đặc điểm.', 'Nhào đất đuổi bọt khí.', 'Bảo quản đất không bị khô.'] },
          { id: 'g1-2', title: 'Bài 1.2: Làm quen bàn xoay', minutes: 30, level: 'medium',
            // [BTV-VIDEO] V4: Vườn Nhà Gốm – trình diễn xoay hũ gốm thủ công.
            // Nguồn: https://vuonnhagom.vn/blogs/vuonnhagom-studio/san-xuat-gom-thu-cong-xoay-hu-gom-dung-mut-ngay-tet-co-truyen-phan-2
            youtubeUrl: 'https://www.youtube.com/watch?v=0z3DBFahG8s',
            videoClipSeconds: 300,
            videoTitle: 'Xoay hủ gốm thủ công trên bàn xoay – Vườn Nhà Gốm',
            videoReference: true,
            videoReferenceNote: 'Trình diễn thao tác xoay gốm của xưởng Vườn Nhà Gốm; chưa thay thế hướng dẫn an toàn/tư thế ngồi và vào tâm đất.',
            content: ['Tư thế ngồi và đặt tay.', 'Vào tâm đất.', 'Kéo thành cốc đơn giản.'] },
          { id: 'g1-3', title: 'Bài 1.3: Tạo hình bình cổ cao', minutes: 90, level: 'hard',
            // [BTV-VIDEO] V4: Pottery101 – kỹ thuật bóp cổ hẹp (collaring/choking) và sửa dáng.
            // Nguồn: https://www.youtube.com/watch?v=YpnILt9trjk
            youtubeUrl: 'https://www.youtube.com/watch?v=YpnILt9trjk',
            videoClipSeconds: 300,
            videoTitle: 'How to Throw and Trim a Bud Vase? – Pottery101',
            videoReference: true,
            videoReferenceNote: 'Minh họa kỹ thuật tạo bình cổ hẹp trên bàn xoay. Chỉ là đoạn thao tác mẫu, bài nâng cao vẫn cần phần hướng dẫn và nộp sản phẩm.',
            parts: [
              { icon: '🎥', title: 'Phần 1: Thao tác kéo cổ bình', minutes: 40 },
              { icon: '🛠️', title: 'Phần 2: Lỗi thường gặp', minutes: 20 },
              { icon: '📤', title: 'Phần 3: BÀI TẬP THỰC HÀNH NỘP SẢN PHẨM MẪU', minutes: 30, practical: true }
            ],
            content: ['Kéo cổ bình đều tay và giữ cân đối.', 'Nhận biết lỗi méo miệng, dày đáy.', 'Nộp sản phẩm mẫu theo yêu cầu.'] }
        ] }
      ]
    }]
  }
];

export const getCourse = (id) => COURSES.find((c) => c.id === id) || null;

/** Danh sách phẳng mọi bài học của khóa */
export const allLessons = (course) => course.modules.flatMap((m) => m.chapters.flatMap((c) => c.lessons));
