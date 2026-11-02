/**
 * ============================================================
 *  FILE: js/pages/static.js
 *  TRANG: các trang nội dung tĩnh (Về chúng tôi, Đấu giá, Điều khoản, Quyền riêng tư, Đổi trả, 404)
 *  Chỉ cần vẽ đầu/chân trang; nội dung nằm sẵn trong HTML.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';

// Xác định mục menu đang sáng theo tên file
const file = location.pathname.split('/').pop().replace('.html', '');
const active = ['about', 'auction'].includes(file) ? file : '';
await initLayout({ active, title: document.title.split(' – ')[0] });
