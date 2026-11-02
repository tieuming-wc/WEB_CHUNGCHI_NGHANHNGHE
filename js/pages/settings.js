/**
 * ============================================================
 *  FILE: js/pages/settings.js
 *  TRANG: Cài đặt tài khoản (pages/settings.html)
 *  - Chữ lớn: tăng cỡ chữ cho người lớn tuổi (đặc tả: "chữ to rõ ràng")
 *  - Tự mở lại trang đã xem lần trước khi đăng nhập (đồng bộ mọi thiết bị)
 *  - Xóa lịch sử "đã xem gần đây"
 *  Các cài đặt được lưu trên tài khoản nên đăng nhập ở máy khác vẫn giữ nguyên.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { requireAuth } from '../services/session.js';
import { getState, patchState, applyPrefs } from '../services/userstate.js';
import { toast } from '../components/toast.js';
import { $ } from '../utils/dom.js';

const auth = await requireAuth();
if (!auth) throw new Error('stop');
await initLayout({ active: '', title: 'Cài đặt tài khoản' });

const big = $('#pref-big'), restore = $('#pref-restore');
const prefs = getState().prefs;
big.checked = !!prefs.bigText;
restore.checked = prefs.restoreLast !== false;

async function save() {
  const next = { bigText: big.checked, restoreLast: restore.checked };
  applyPrefs(next);                                              // áp dụng ngay
  await patchState({ prefs: next });
  toast('Đã lưu cài đặt.', 'success', 2000);
}
big.addEventListener('change', save);
restore.addEventListener('change', save);

$('#clear-recent').addEventListener('click', async () => {
  await patchState({ recent: [], lastPage: '', lastPageTitle: '' });
  toast('Đã xóa lịch sử xem gần đây.', 'success');
});
