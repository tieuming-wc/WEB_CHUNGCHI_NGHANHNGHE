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
            content: ['Nhận biết các loại mây, tre dùng trong đan lát và công dụng của từng loại.', 'Tiêu chuẩn chọn nguyên liệu: thân thẳng, đều, không nứt, không sâu mọt.', 'Phân loại theo kích thước để dùng đúng chỗ: khung, nan, dây buộc.'] },
          { id: 'l1-2', title: 'Bài 1.2: Kỹ thuật xử lý chống mối mọt & sấy nguyên liệu', minutes: 30, level: 'medium',
            content: ['Vì sao nguyên liệu cần xử lý trước khi đan.', 'Các bước xử lý chống mối mọt và làm khô nguyên liệu.', 'Cách bảo quản nguyên liệu sau xử lý để không ẩm mốc.'] }
        ] },
        { id: 'c2', title: 'CHƯƠNG 2: KỸ THUẬT ĐAN KHUNG & PHỐI HOA VĂN', tag: 'MÔN KHÓ', lessons: [
          { id: 'l2-1', title: 'Bài 2.1: Đan đĩa tròn cơ bản', minutes: 40, level: 'medium',
            content: ['Dựng khung đĩa tròn và chia nan đều.', 'Đan vòng và giữ độ căng đồng đều.', 'Hoàn thiện viền, vuốt phẳng bề mặt.'] },
          { id: 'l2-2', title: 'Bài 2.2: Kỹ thuật uốn khung & đan hoa văn đèn trang trí phức tạp', minutes: 120, level: 'hard', key: true,
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
            content: ['Các loại đất dùng làm gốm và đặc điểm.', 'Nhào đất đuổi bọt khí.', 'Bảo quản đất không bị khô.'] },
          { id: 'g1-2', title: 'Bài 1.2: Làm quen bàn xoay', minutes: 30, level: 'medium',
            content: ['Tư thế ngồi và đặt tay.', 'Vào tâm đất.', 'Kéo thành cốc đơn giản.'] },
          { id: 'g1-3', title: 'Bài 1.3: Tạo hình bình cổ cao', minutes: 90, level: 'hard',
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
