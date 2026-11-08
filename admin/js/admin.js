/**
 * [BTV-ADMIN] V5.1 / Trang quản trị (admin/index.html) tích hợp 3 nhóm quyền độc lập.
 *  accounts      -> kiểm soát tài khoản & phản ánh
 *  verification  -> duyệt gian hàng, duyệt/khóa sản phẩm
 *  learning      -> chỉnh nội dung 7 bài học và liên kết YouTube
 * Một tài khoản admin mặc định có cả 3 quyền; sau này chia bằng adminPermissions trong Firestore.
 * QUAN TRỌNG: Không tin frontend: mọi lệnh đọc/ghi còn chịu firestore.rules.
 */
import { initLayout } from '../../js/components/layout.js';
import { requireAuth } from '../../js/services/session.js';
import { backend } from '../../js/services/db.js';
import { COURSES, allLessons } from '../../js/data/courses.js';
import { loadLessonOverrides, saveLessonOverride } from '../../js/services/course-content.js';
import { youtubeId } from '../../js/components/youtube-player.js';
import { toast } from '../../js/components/toast.js';
import { $, esc, on } from '../../js/utils/dom.js';
import { pageUrl } from '../../js/utils/paths.js';

const auth = await requireAuth({ roles: ['admin'] });
if (!auth) throw new Error('stop');
await initLayout({ kind: 'admin', title: 'Trung tâm quản trị' });
const PERMISSIONS = ['accounts', 'verification', 'learning'];
const LABELS = { accounts: '👥 Tài khoản', verification: '🛡️ Xác minh & kiểm duyệt', learning: '🎓 Quản lý học nghề' };
const scopes = Array.isArray(auth.profile.adminPermissions) ? auth.profile.adminPermissions : PERMISSIONS;
let current = PERMISSIONS.find(k => scopes.includes(k)) || '';
let viewMode = 'main';
const panel = $('#admin-content');

function adminTabs() {
  $('#admin-tabs').innerHTML = PERMISSIONS.filter(k => scopes.includes(k)).map(k =>
    `<button class="tab ${k === current ? 'active' : ''}" type="button" data-admin-tab="${k}">${LABELS[k]}</button>`).join('');
}
const fmt = n => n ? new Date(n).toLocaleString('vi-VN') : '—';
const statusBadge = (s) => `<span class="badge ${s === 'approved' || s === 'active' || s === 'visible' ? 'badge-green' : s === 'suspended' || s === 'rejected' || s === 'locked' ? 'badge-red' : 'badge-gold'}">${esc(s || 'Chờ xử lý')}</span>`;
const table = (headers, items) => items.length ? `<div class="table-wrap"><table class="table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${items.join('')}</tbody></table></div>` : '<p class="muted">Chưa có dữ liệu phù hợp.</p>';
function safeLink(url) { try { const x = new URL(url); return x.protocol === 'https:' ? x.href : ''; } catch { return ''; } }
function btn(action, id, label, cls = 'btn-ghost') { return `<button type="button" class="btn ${cls} btn-sm" data-admin-act="${action}" data-id="${esc(id)}">${label}</button>`; }
function errorMessage(e) { console.error('[BTV-ADMIN]',e); toast(e.code === 'permission-denied' ? 'Firebase chưa cấp quyền. Kiểm tra Firestore Rules và quyền admin.' : 'Lỗi: ' + (e.message || 'Không thể xử lý.'), 'error'); }
async function record(action, target, detail = '') {
  // Dấu vết thao tác, chủ yếu phục vụ truy vết; không ghi giấy tờ định danh/số CCCD vào audit.
  try { await backend.add('adminAudit', { actorId: auth.user.uid, action, target, detail: String(detail).slice(0,150), at: Date.now() }); }
  catch(e) { console.warn('[BTV-ADMIN] Không ghi audit:',e); }
}

async function renderAccounts() {
  const [users, tickets] = await Promise.all([backend.list('users'), backend.list('supportTickets')]);
  users.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const rows = users.map(u => `<tr><td><strong>${esc(u.name || '')}</strong><p class="small muted">${esc(u.email || '')}</p><p class="small muted">${esc(u.id)}</p></td>
    <td>${statusBadge(u.role)}<br><span class="small muted">${fmt(u.createdAt)}</span></td>
    <td>${statusBadge(u.accountStatus || 'active')}<br>${u.role === 'seller' ? `Xác minh: ${statusBadge(u.sellerStatus || 'pending')}` : ''}</td>
    <td>${u.role === 'admin' ? '<span class="small muted">Không khóa admin tại đây</span>' : u.accountStatus === 'suspended' ? btn('restore-user', u.id, 'Mở lại', 'btn-primary') : u.accountStatus === 'pending' ? btn('approve-user',u.id,'Duyệt tài khoản','btn-primary') : btn('suspend-user',u.id,'Tạm khóa','btn-danger')}</td></tr>`);
  const ticketRows = tickets.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,60).map(t=>`<tr><td>${fmt(t.createdAt)}</td><td>${esc(t.type||'Hỗ trợ')}<br><span class="small muted">${esc(t.email||'')}</span></td><td>${esc(t.message||'')}</td></tr>`);
  panel.innerHTML = `<div class="admin-intro"><h2>Quản lý tài khoản</h2><p class="muted">${users.length} tài khoản · Admin được cấp quyền xem, khóa, mở lại. Người mua có thể dùng web sau khi xác minh email; người bán phải được xét duyệt trước khi bán.</p></div>
  ${table(['Tài khoản','Vai trò','Trạng thái','Thao tác'],rows)}<h2>Phản ánh & hỗ trợ</h2>${table(['Thời gian','Người gửi','Nội dung'],ticketRows)}`;
}

async function renderVerification() {
  const [apps, products] = await Promise.all([backend.list('sellerApplications'), backend.list('products')]);
  apps.sort((a,b)=>(b.submittedAt||0)-(a.submittedAt||0));
  products.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  const toReview = products.filter(x=>x.status === 'pending');
  const published = products.filter(x=>x.status === 'visible');
  const sellerRows = await Promise.all(apps.map(async a=>{
    const u = await backend.get('users', a.uid).catch(()=>null);
    const url = safeLink(a.proofLink || '');
    const actions = a.status === 'pending' ? `${btn('approve-seller',a.uid,'Xác minh & duyệt','btn-primary')} ${btn('reject-seller',a.uid,'Yêu cầu bổ sung','btn-danger')}` : '';
    return `<tr><td><strong>${esc(u?.name || a.uid)}</strong><p class="small muted">${esc(u?.email||'')}</p></td><td>${esc(a.proofType)}<p>${esc(a.description)}</p>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Xem tài liệu được chia sẻ</a>`:''}</td><td>${statusBadge(a.status)}<br><span class="small muted">${fmt(a.submittedAt)}</span>${a.reviewReason?`<p class="small">${esc(a.reviewReason)}</p>`:''}</td><td>${actions}</td></tr>`;
  }));
  const legacyLink = scopes.every(x => PERMISSIONS.includes(x)) && PERMISSIONS.every(x=>scopes.includes(x)) ? '<a href="operations.html">Trang nghiệp vụ cũ</a>' : 'liên hệ admin tổng hợp';
  const productRow = p => `<tr><td><strong>${esc(p.name||'Chưa có tên')}</strong><p class="small muted">${esc(p.shopName||'')} · ${esc(p.id)}</p></td>
  <td>${esc(p.categoryId||'')}<br><span class="small">${esc(p.material||'')}</span></td><td>${statusBadge(p.status)}</td><td>
  ${p.status === 'pending' ? `${btn('approve-product',p.id,'Cho hiển thị','btn-primary')} ${btn('lock-product',p.id,'Từ chối / khóa','btn-danger')}` : ''}
  ${p.status === 'visible' ? btn('lock-product',p.id,'Gỡ / khóa','btn-danger') : ''}</td></tr>`;
  panel.innerHTML = `<div class="admin-intro"><h2>Xác minh gian hàng & kiểm duyệt sản phẩm</h2><p class="muted">Chủ gian hàng phải nộp minh chứng; quản trị đánh giá hồ sơ và chỉ công khai sản phẩm sau khi kiểm duyệt. Phê duyệt không đồng nghĩa xác nhận tính hợp pháp tuyệt đối: cần kiểm tra thực tế khi cần.</p></div>
  <h2>Hồ sơ gian hàng (${apps.filter(a=>a.status==='pending').length} đang chờ)</h2>
  ${table(['Người bán','Minh chứng','Trạng thái','Thao tác'],sellerRows)}
  <h2>Sản phẩm chờ duyệt (${toReview.length})</h2>
  ${table(['Sản phẩm','Danh mục','Trạng thái','Thao tác'],toReview.map(productRow))}
  <h2>Sản phẩm đang bán (${published.length})</h2>
  ${table(['Sản phẩm','Danh mục','Trạng thái','Thao tác'],published.map(productRow))}
  <p class="small muted">Các chức năng quản trị đơn hàng/chứng nhận cũ vẫn được giữ ở ${legacyLink} (chỉ dành cho admin đầy đủ quyền).</p>`;
}

async function renderLearning() {
  await loadLessonOverrides();
  const lessonCards = COURSES.map(c=>`<div class="card admin-course"><h3>${esc(c.title)}</h3>${allLessons(c).map(l=>
    `<div class="admin-lesson"><div><strong>${esc(l.title)}</strong><div class="small muted">${esc(l.videoTitle || 'Chưa có tiêu đề video')} · ${Number(l.videoClipSeconds)||300}s</div></div>
     ${btn('edit-lesson',`${c.id}__${l.id}`,'Sửa bài / video','btn-primary')}</div>`).join('')}</div>`).join('');
  panel.innerHTML = `<div class="admin-intro"><h2>Quản lý nội dung học nghề</h2><p class="muted">Cập nhật tiêu đề, nội dung và video YouTube ngay tại website. Nội dung mới lưu trên Firebase và học viên sẽ thấy khi mở lại trang; không phải sửa file courses.js.</p></div>
  ${lessonCards}<p>Đánh giá sản phẩm thực hành: ${PERMISSIONS.every(x=>scopes.includes(x)) ? '<a href="operations.html">Vào trang chấm bài hiện có</a>' : 'Chức năng chấm bài sẽ được tách riêng ở phiên bản phân quyền tiếp theo'}.</p>`;
}

async function render() {
  adminTabs();
  if (!current) { panel.innerHTML = '<div class="alert alert-warn">Tài khoản admin chưa được cấp nhóm quyền nào. Liên hệ chủ dự án.</div>'; return; }
  panel.innerHTML = '<p class="muted">Đang tải dữ liệu…</p>';
  try {
    if (current === 'accounts') await renderAccounts();
    else if (current === 'verification') await renderVerification();
    else await renderLearning();
  } catch(e) { console.error(e); panel.innerHTML = '<div class="alert alert-error">Không tải được dữ liệu quản trị. Kiểm tra kết nối và Firestore Rules, rồi thử tải lại trang.</div>'; }
}
on(document,'click','[data-admin-tab]',(e,el)=>{ current=el.dataset.adminTab; render(); });

async function editLesson(fullId) {
  const [courseId, lessonId] = fullId.split('__');
  const course = COURSES.find(c=>c.id===courseId), lesson = course && allLessons(course).find(l=>l.id===lessonId);
  if (!lesson) return;
  panel.innerHTML = `<h2>Chỉnh sửa: ${esc(lesson.title)}</h2><form id="lesson-edit" class="card admin-edit-form">
    <div class="field"><label for="lesson-title">Tên bài học</label><input id="lesson-title" required maxlength="180" value="${esc(lesson.title)}"></div>
    <div class="field"><label for="lesson-content">Nội dung (mỗi dòng một ý)</label><textarea id="lesson-content" rows="6" required>${esc((lesson.content||[]).join('\n'))}</textarea></div>
    <div class="field"><label for="lesson-url">Link YouTube</label><input id="lesson-url" type="url" maxlength="300" required value="${esc(lesson.youtubeUrl||'')}"></div>
    <div class="field"><label for="lesson-video-title">Tên video</label><input id="lesson-video-title" maxlength="180" value="${esc(lesson.videoTitle||'')}"></div>
    <div class="field"><label for="lesson-note">Ghi chú video tư liệu</label><textarea id="lesson-note" rows="3">${esc(lesson.videoReferenceNote||'')}</textarea></div>
    <div class="field"><label for="lesson-duration">Đoạn học (giây, tối đa 5 phút)</label><input id="lesson-duration" type="number" min="30" max="300" value="${Number(lesson.videoClipSeconds)||300}"></div>
    <div class="admin-actions"><button class="btn btn-primary" type="submit">Lưu cập nhật bài học</button> <button type="button" class="btn btn-ghost" id="back-lessons">Quay lại danh sách</button></div></form>`;
  $('#back-lessons').onclick=render;
  $('#lesson-edit').addEventListener('submit', async e=>{
    e.preventDefault(); const url=$('#lesson-url').value.trim(), content=$('#lesson-content').value.split('\n').map(x=>x.trim()).filter(Boolean);
    const seconds=Number($('#lesson-duration').value);
    if (!youtubeId(url) || !/^https:\/\/(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\//i.test(url) || !content.length || seconds<30 || seconds>300) {
      toast('Cần link YouTube hợp lệ, ít nhất một ý nội dung và đoạn xem từ 30–300 giây.', 'error'); return; }
    try { const values={ title:$('#lesson-title').value.trim(), content, youtubeUrl:url, videoTitle:$('#lesson-video-title').value.trim(),
      videoReferenceNote:$('#lesson-note').value.trim(), videoClipSeconds:seconds };
      if (!values.title) throw new Error('Tên bài không được trống.');
      await saveLessonOverride(courseId,lessonId,values);
      Object.assign(lesson,values); await record('edit-lesson',fullId);
      toast('Đã cập nhật bài học. Người học sẽ thấy nội dung mới khi tải lại.', 'success'); await render();
    } catch(err) { errorMessage(err); }
  });
}

async function action(type,id) {
  if (type==='edit-lesson') return editLesson(id);
  let note = '';
  if (['suspend-user','reject-seller','lock-product'].includes(type)) {
    note = prompt('Nhập lý do (hiển thị cho người liên quan):');
    if (note === null) return;
    note = note.trim();
    if (note.length < 8 || note.length > 350) { toast('Vui lòng nêu lý do từ 8–350 ký tự.', 'error'); return; }
  }
  if (['approve-seller','approve-product','restore-user','approve-user'].includes(type) && !confirm('Xác nhận thực hiện thao tác này?')) return;
  try {
    const now = Date.now();
    if (type==='suspend-user' || type==='restore-user' || type==='approve-user') {
      const u = await backend.get('users',id);
      if (!u || u.role==='admin') throw new Error('Không được khóa tài khoản quản trị.');
      await backend.update('users',id,{ accountStatus: type==='suspend-user'?'suspended':'active', accountNote:note, accountReviewedAt:now });
      // [BTV-ADMIN] Suspended sellers must not keep public listings active.
      if (type === 'suspend-user' && u.role === 'seller') {
        const listings = await backend.list('products', [['sellerId','==',id]]);
        for (const p of listings.filter(p => p.status === 'visible')) {
          await backend.update('products',p.id,{status:'locked',lockReason:'Gian hàng tạm khóa: ' + note,moderatedAt:now,moderatedBy:auth.user.uid});
        }
      }
    } else if (type==='approve-seller' || type==='reject-seller') {
      const app=await backend.get('sellerApplications',id);
      if (!app || app.status!=='pending') throw new Error('Hồ sơ không còn ở trạng thái chờ duyệt.');
      const approved=type==='approve-seller';
      await backend.update('sellerApplications',id,{ status:approved?'approved':'rejected',reviewReason:note,reviewedAt:now,reviewedBy:auth.user.uid });
      await backend.update('users',id,{ sellerStatus:approved?'approved':'rejected', sellerReviewedAt:now });
      await backend.set('shops',id,{ verificationStatus:approved?'verified':'rejected',verificationUpdatedAt:now },{merge:true});
    } else if (type==='approve-product' || type==='lock-product') {
      const p=await backend.get('products',id);
      if (!p) throw new Error('Sản phẩm không còn tồn tại.');
      if (type==='approve-product') {
        const seller=await backend.get('users',p.sellerId);
        if (seller?.sellerStatus!=='approved' || seller?.accountStatus==='suspended') throw new Error('Phải duyệt người bán trước khi duyệt sản phẩm.');
        if (p.status!=='pending') throw new Error('Sản phẩm chưa gửi duyệt.');
        await backend.update('products',id,{status:'visible',publishedAt:now,moderatedAt:now,moderatedBy:auth.user.uid,lockReason:''});
      } else await backend.update('products',id,{status:'locked',lockReason:note,moderatedAt:now,moderatedBy:auth.user.uid});
    } else return;
    await record(type,id,note);
    toast('Đã xử lý thành công.', 'success'); await render();
  } catch(e) { errorMessage(e); }
}
on(document,'click','[data-admin-act]',(e,el)=>action(el.dataset.adminAct,el.dataset.id));
await render();
