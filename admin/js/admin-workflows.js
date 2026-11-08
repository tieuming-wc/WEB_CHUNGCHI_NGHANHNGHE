/** [BTV-ADMIN] Các thao tác người bán được xét quyền thực tế bằng firestore.rules. */
import { backend } from '../../js/services/db.js';
export async function submitSellerApplication(uid, { proofType, description, proofLink = '' }) {
  const current = await backend.get('sellerApplications', uid);
  if (current?.status === 'pending' || current?.status === 'approved') throw new Error('Hồ sơ đang xử lý hoặc đã được duyệt.');
  const data = { uid, proofType, description, proofLink, status: 'pending',
    submittedAt: Date.now(), reviewReason: '', reviewedAt: 0 };
  await backend.set('sellerApplications', uid, data);
}
