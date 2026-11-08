/**
 * ============================================================
 *  FILE: js/data/seed.js
 *  MỤC ĐÍCH: Dữ liệu MẪU cho CHẾ ĐỘ THỬ NGHIỆM (localStorage) để web không trống trơn khi
 *  mới mở. Khi dùng Firebase thật, file này KHÔNG được chạy.
 *
 *  Tất cả sản phẩm/gian hàng ở đây là DỮ LIỆU GIẢ LẬP phục vụ minh họa giao diện.
 *  Tài khoản demo (chỉ tồn tại trong trình duyệt, mật khẩu: Demo@12345):
 *     buyer@demo.vn   – người mua
 *     seller@demo.vn  – người bán
 *     admin@demo.vn   – quản trị
 * ============================================================
 */
import { placeholderImage } from '../utils/image.js';
import { categoryHue } from './categories.js';

const DEMO_PASSWORD = 'Demo@12345';

/** Danh sách sản phẩm mẫu: [tên, danh mục, chất liệu, làng nghề, giá, tồn kho, mô tả] */
const PRODUCTS = [
  ['Bình gốm men rạn cao 30cm', 'gom-binh', 'Gốm men rạn', 'Bát Tràng (Hà Nội)', 450000, 12, 'Bình gốm tạo hình trên bàn xoay, men rạn tự nhiên, phù hợp cắm hoa khô.'],
  ['Bộ ấm chén men lam vẽ tay', 'gom-am-chen', 'Gốm men lam', 'Bát Tràng (Hà Nội)', 780000, 6, 'Bộ ấm một bình sáu chén, hoa văn vẽ tay từng chiếc nên không có hai bộ giống hệt nhau.'],
  ['Tượng gốm trang trí hình cá chép', 'gom-trang-tri', 'Gốm nung', 'Chu Đậu (Hải Phòng)', 320000, 0, 'Hiện đã hết hàng, bạn có thể xem thông tin và chờ đợt làm tiếp theo.'],
  ['Giỏ mây đựng đồ có nắp', 'may-tre-gio', 'Mây tự nhiên', 'Phú Vinh (Hà Nội)', 260000, 20, 'Giỏ đan mắt cáo chắc tay, dùng đựng quần áo hoặc đồ gia đình.'],
  ['Khay tre tròn đan hoa văn', 'may-tre-khay', 'Tre', 'Phú Vinh (Hà Nội)', 150000, 30, 'Khay đan tay, đã xử lý chống mối mọt, viền khâu chắc.'],
  ['Đèn mây trang trí phòng khách', 'may-tre-den', 'Mây', 'Phú Vinh (Hà Nội)', 590000, 5, 'Đèn đan khung uốn nhiệt, bóng đèn mua riêng. Làm theo đơn.'],
  ['Khăn lụa tơ tằm nhuộm màu thiên nhiên', 'det-lua', 'Lụa tơ tằm', 'Vạn Phúc (Hà Nội)', 690000, 15, 'Lụa dệt thủ công, nhuộm bằng thực vật nên màu có thể chênh nhẹ giữa các lô.'],
  ['Túi thổ cẩm họa tiết Tây Bắc', 'det-tho-cam', 'Thổ cẩm', 'Thổ cẩm Tây Bắc', 380000, 18, 'Túi đeo vai may từ vải thổ cẩm dệt tay.'],
  ['Tranh thêu tay hoa sen', 'det-theu', 'Chỉ lụa', 'Đồng Kỵ (Bắc Ninh)', 1250000, 3, 'Tranh thêu tay nhiều lớp chỉ, khung gỗ kèm theo.'],
  ['Tranh sơn mài phong cảnh làng quê', 'go-son-mai', 'Sơn mài', 'Chuyên Mỹ (Hà Nội)', 2400000, 2, 'Tranh sơn mài mài nhiều lớp, khảm vỏ trứng. Làm theo đơn.'],
  ['Tượng gỗ mỹ nghệ Phật Di Lặc', 'go-chap-khac', 'Gỗ', 'Chuyên Mỹ (Hà Nội)', 1800000, 4, 'Tượng chạm khắc thủ công, đánh bóng tự nhiên.'],
  ['Hộp khảm trai đựng trang sức', 'go-kham-trai', 'Gỗ khảm trai', 'Chuyên Mỹ (Hà Nội)', 540000, 9, 'Hộp khảm trai hoa văn truyền thống, lót nhung bên trong.']
];

/** Gian hàng mẫu: mỗi gian hàng nhận một số sản phẩm */
const SHOPS = [
  { key: 'seller', name: 'Xưởng gốm Bát Tràng Mẫu', village: 'Bát Tràng (Hà Nội)', artisan: 'Nghệ nhân mẫu A', story: 'Gian hàng mẫu minh họa: gia đình làm gốm nhiều đời. Đây là dữ liệu giả lập của bản thử nghiệm.', range: [0, 3] },
  { key: 'seller2', name: 'Mây tre đan Phú Vinh Mẫu', village: 'Phú Vinh (Hà Nội)', artisan: 'Nghệ nhân mẫu B', story: 'Gian hàng mẫu minh họa cho nghề mây tre đan. Dữ liệu giả lập.', range: [3, 6] },
  { key: 'seller3', name: 'Tơ lụa & sơn mài Mẫu', village: 'Vạn Phúc (Hà Nội)', artisan: 'Nghệ nhân mẫu C', story: 'Gian hàng mẫu minh họa nghề dệt, thêu, sơn mài. Dữ liệu giả lập.', range: [6, 12] }
];

export async function seedLocalData({ set, write, read, hashPassword, newToken }) {
  // ----- 1. Tài khoản đăng nhập (auth) -----
  const auth = read('auth', {});
  const accounts = [
    ['buyer@demo.vn', 'Người Mua Demo', 'buyer'],
    ['seller@demo.vn', 'Nghệ Nhân Demo', 'seller'],
    ['seller2@demo.vn', 'Nghệ Nhân Demo Hai', 'seller'],
    ['seller3@demo.vn', 'Nghệ Nhân Demo Ba', 'seller'],
    ['admin@demo.vn', 'Quản Trị Demo', 'admin']
  ];
  const uids = {};
  for (const [email, name, role] of accounts) {
    const salt = newToken();
    const uid = 'demo_' + role + '_' + email.split('@')[0];
    uids[email.split('@')[0]] = uid;
    auth[email] = { uid, email, salt, hash: await hashPassword(DEMO_PASSWORD, salt), verified: true, pwVersion: 1, createdAt: Date.now() };
    await set('users', uid, { uid, name, email, role, accountStatus: 'active', ...(role === 'seller' ? { sellerStatus: 'approved' } : {}), phone: '', phoneNorm: '', gender: '', dob: '2000-01-01', createdAt: Date.now() });
  }
  write('auth', auth);

  // ----- 2. Gian hàng + sản phẩm -----
  for (const shop of SHOPS) {
    const sellerId = uids[shop.key];
    await set('shops', sellerId, { sellerId, name: shop.name, village: shop.village, artisan: shop.artisan, story: shop.story, address: 'Hà Nội', phone: '', createdAt: Date.now() });
    for (let i = shop.range[0]; i < shop.range[1]; i++) {
      const [name, categoryId, material, village, price, stock, desc] = PRODUCTS[i];
      const made = /theo đơn/i.test(desc);
      await set('products', 'demo_p' + (i + 1), {
        sellerId, shopName: shop.name, artisan: shop.artisan, village, name, categoryId, material,
        shortDesc: desc.slice(0, 120), desc, images: [placeholderImage(name, categoryHue(categoryId))],
        videoUrl: '', size: '—', care: 'Lau bằng khăn mềm khô, tránh va đập và nước nóng đột ngột.',
        mode: made ? 'made_to_order' : 'available', price, stock, prepDays: made ? 14 : 2, accepting: true,
        variants: [], fragile: /gốm|sứ|bình/i.test(name + material), packWeight: 1,
        status: 'visible', ratingSum: i % 3 === 0 ? 9 : 0, ratingCount: i % 3 === 0 ? 2 : 0,
        createdAt: Date.now() - i * 3600 * 1000 * 5, updatedAt: Date.now(), isDemo: true
      });
    }
  }

  // ----- 3. Chứng nhận mẫu để thử chức năng tra cứu -----
  await set('certificates', 'BTV-2026-0001', {
    code: 'BTV-2026-0001', holderName: 'Nguyễn Văn Mẫu', craft: 'Mây tre đan', level: 'Bậc 3 – Thợ cơ bản',
    issuedAt: Date.now() - 86400000 * 30, status: 'valid', assessor: 'Đánh giá viên mẫu', issuer: 'Nền tảng Bàn Tay Vàng (chứng nhận nội bộ)'
  });
}
