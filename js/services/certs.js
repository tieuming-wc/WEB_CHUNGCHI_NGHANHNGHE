/**
 * ============================================================
 *  FILE: js/services/certs.js
 *  MỤC ĐÍCH: Đăng ký chứng nhận tay nghề + tra cứu chứng nhận.
 *  Luồng (theo file ghi chú "trang đăng ký chứng chỉ"):
 *    Người dùng điền thông tin cá nhân, quê quán, CCCD, chọn nơi thi (Hà Nội / TP.HCM),
 *    tải ảnh bill chuyển khoản → bấm gửi → "báo về hệ thống" → hệ thống báo lại ĐÃ ĐĂNG KÝ THÀNH CÔNG.
 *
 *  ⚠ Đây là chứng nhận NỘI BỘ của nền tảng, KHÔNG phải chứng chỉ kỹ năng nghề quốc gia
 *    (đúng cảnh báo pháp lý trong báo cáo dự án).
 * ============================================================
 */
import { backend } from './db.js';

export const REG_STATUS = { received: 'Đã tiếp nhận – chờ xác nhận thanh toán', approved: 'Đã xác nhận – chờ lịch thi', rejected: 'Chưa hợp lệ' };

/** Tạo mã đăng ký dạng DK-2026-ABC123 */
const newRegCode = () => `DK-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

/** Gửi đăng ký. data: {fullName, dob, gender, hometown, cccd, phone, email, craft, location, billImage, note} */
export async function submitRegistration(uid, data) {
  const code = newRegCode();
  await backend.set('certRegs', code, { ...data, code, userId: uid, status: 'received', createdAt: Date.now() });
  return code;
}

export const myRegistrations = (uid) => backend.list('certRegs', [['userId', '==', uid]]);

/** Tra cứu chứng nhận theo mã – công khai, chỉ lấy đúng 1 tài liệu theo mã */
export async function lookupCertificate(code) {
  return backend.get('certificates', String(code || '').trim().toUpperCase());
}

// ---------- Quản trị ----------
export const regsByStatus = (status) => backend.list('certRegs', [['status', '==', status]]);

/** Duyệt đăng ký (đã nhận đủ lệ phí) */
export const approveRegistration = (code) => backend.update('certRegs', code, { status: 'approved', approvedAt: Date.now() });
export const rejectRegistration = (code, reason) => backend.update('certRegs', code, { status: 'rejected', rejectReason: reason });

/** Cấp chứng nhận nội bộ sau khi thi đạt: tạo bản ghi công khai tra cứu được */
export async function issueCertificate({ code, holderName, craft, level, assessor }) {
  await backend.set('certificates', code, {
    code, holderName, craft, level, assessor, status: 'valid', issuedAt: Date.now(),
    issuer: 'Nền tảng (chứng nhận nội bộ – không phải chứng chỉ quốc gia)'
  });
}
