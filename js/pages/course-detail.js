/**
 * ============================================================
 *  FILE: js/pages/course-detail.js
 *  TRANG: Chi tiết khóa học (pages/course-detail.html?id=...&lesson=...)
 *  Bám đặc tả LMS:
 *   - Cột trái (accordion): Module → Chương → Bài (⏱ thời lượng | độ khó | trạng thái 🟢 xong 🔵 đang học 🔒 khóa)
 *   - COND-ATT-01: xem tối thiểu 80% thời lượng mới tính hoàn thành lý thuyết
 *   - COND-CRS-01: bài "Rất khó" khóa tới khi xong 100% bài cấp dưới
 *   - Bài có thực hành: form nộp sản phẩm (REQ-SUB-01…05) – ≥2 ảnh, link video, ghi chú, cam đoan tự làm
 *   - COND-SUB-02: điểm < 7.5 được nộp lại tối đa 3 lần
 *  Chế độ demo: thời gian xem được tăng tốc (APP.LESSON_TIME_SCALE) để thử nghiệm nhanh.
 *  Tiến độ lưu theo tài khoản → đồng bộ mọi thiết bị.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { getSession } from '../services/session.js';
import { getCourse, allLessons, LEVEL_LABEL } from '../data/courses.js';
import { lessonProgress, isDone, isLocked, courseProgress, addWatchTime, mySubmissions, canSubmit, submitPractice } from '../services/courses.js';
import { APP } from '../config/app-config.js';
import { compressImage, validateImageFile } from '../utils/image.js';
import { validateText } from '../utils/validators.js';
import { toast } from '../components/toast.js';
import { $, $$, esc, qs, on, setBusy } from '../utils/dom.js';
import { pageUrl, gotoLogin } from '../utils/paths.js';
import { formatDateTime } from '../utils/format.js';

const session = await initLayout({ active: 'courses', title: 'Khóa học' });
const course = getCourse(qs('id'));
const root = $('#course');
if (!course) { root.innerHTML = `<div class="empty-state"><p>Không tìm thấy khóa học.</p><a class="btn btn-primary" href="${pageUrl('courses')}">Về danh sách</a></div>`; throw new Error('stop'); }

const lessons = allLessons(course);
let current = lessons.find((l) => l.id === qs('lesson')) || lessons.find((l) => !isDone(course.id, l.id) && !isLocked(course, l)) || lessons[0];
let timer = null;                                               // bộ đếm thời gian xem

/** Biểu tượng trạng thái một bài */
function statusIcon(l) {
  if (isLocked(course, l)) return '🔒 Chưa mở khóa';
  if (isDone(course.id, l.id)) return '🟢 Đã hoàn thành';
  if (lessonProgress(course.id, l.id).watched > 0) return '🔵 Đang học';
  return '⚪ Chưa học';
}

function renderNav() {
  const p = courseProgress(course);
  $('#nav').innerHTML = `<h2 class="nav-title">${esc(course.title)}</h2>
    <div class="progress"><span style="width:${p.percent}%"></span></div><p class="small muted">${session ? `${p.done}/${p.total} bài hoàn thành (${p.percent}%)` : 'Đăng nhập để lưu tiến độ học'}</p>
    ${course.modules.map((m) => `<details open class="acc"><summary>${esc(m.title)}</summary>
      ${m.chapters.map((c) => `<div class="chapter"><p class="chapter-title">${esc(c.title)} ${c.tag ? `<span class="badge badge-red">${esc(c.tag)}</span>` : ''}</p>
        ${c.lessons.map((l) => `<button class="lesson-btn ${l.id === current.id ? 'on' : ''} ${isLocked(course, l) ? 'locked' : ''}" data-lesson="${l.id}">
          <span>${esc(l.title)}${l.key ? ' 🔥' : ''}</span><span class="small muted">⏱ ${l.minutes} phút | ${LEVEL_LABEL[l.level]} | ${statusIcon(l)}</span></button>`).join('')}</div>`).join('')}</details>`).join('')}`;
}

async function renderLesson() {
  clearInterval(timer);
  const l = current, locked = isLocked(course, l);
  const prog = lessonProgress(course.id, l.id);
  const total = l.minutes * 60, pct = Math.min(100, Math.round((prog.watched / total) * 100));
  const hasPractical = (l.parts || []).some((p) => p.practical);
  const theoryDone = prog.watched / total >= APP.WATCH_THRESHOLD;

  if (locked) {
    const need = lessons.filter((x) => x.level !== 'hard' && !isDone(course.id, x.id));
    $('#lesson').innerHTML = `<h1>${esc(l.title)}</h1><div class="alert alert-warn"><strong>🔒 Bài này chưa mở khóa.</strong> Bạn cần hoàn thành 100% các bài cấp Cơ bản/Trung bình trước:
      <ul>${need.map((x) => `<li>${esc(x.title)}</li>`).join('')}</ul></div>`;
    return;
  }
  $('#lesson').innerHTML = `
    <p class="muted small">⏱ ${l.minutes} phút · ${LEVEL_LABEL[l.level]} · ${statusIcon(l)}</p>
    <h1>${esc(l.title)}</h1>
    ${l.parts ? `<ul class="parts">${l.parts.map((p) => `<li>${p.icon} ${esc(p.title)} <span class="muted">(${p.minutes} phút)</span></li>`).join('')}</ul>` : ''}
    <div class="card"><h3>Nội dung bài học</h3><ul>${l.content.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      <p class="small muted">Nội dung mẫu — nhóm dự án cần để nghệ nhân/giảng viên bổ sung video và tài liệu chi tiết.</p></div>
    <div class="card"><h3>Tiến độ xem</h3>
      <div class="progress"><span id="watch-bar" style="width:${pct}%"></span></div>
      <p id="watch-text" class="small">${pct}% thời lượng · cần tối thiểu ${Math.round(APP.WATCH_THRESHOLD * 100)}% để hoàn thành phần lý thuyết ${theoryDone ? '✔' : ''}</p>
      ${session ? `<button class="btn btn-primary" id="play">${prog.watched ? '▶ Tiếp tục học' : '▶ Bắt đầu học'}</button>
        <p class="small muted">Chế độ demo: thời gian được tăng tốc ${APP.LESSON_TIME_SCALE} lần và chỉ tính khi bạn đang mở trang này.</p>` : `<button class="btn btn-primary" id="need-login">Đăng nhập để học và lưu tiến độ</button>`}
      ${isDone(course.id, l.id) ? '<p class="alert alert-success">🟢 Bạn đã hoàn thành bài này.</p>' : ''}</div>
    ${hasPractical ? '<div id="practice"></div>' : ''}`;
  if (hasPractical && session) renderPractice(theoryDone);
  else if (hasPractical) $('#practice').innerHTML = '<div class="card"><p class="muted">Đăng nhập để nộp bài thực hành.</p></div>';
}

// ----- Bộ đếm xem bài -----
on($('#lesson'), 'click', '#need-login', () => gotoLogin());
on($('#lesson'), 'click', '#play', (e, btn) => {
  if (timer) { clearInterval(timer); timer = null; btn.textContent = '▶ Tiếp tục học'; return; }
  btn.textContent = '⏸ Tạm dừng';
  let pending = 0;
  timer = setInterval(async () => {
    if (document.visibilityState !== 'visible') return;           // chỉ tính khi đang xem trang
    pending += APP.LESSON_TIME_SCALE;
    const cur = lessonProgress(course.id, current.id);
    const total = current.minutes * 60, shown = Math.min(total, cur.watched + pending);
    $('#watch-bar').style.width = Math.round((shown / total) * 100) + '%';
    $('#watch-text').textContent = `${Math.round((shown / total) * 100)}% thời lượng`;
    if (pending >= APP.LESSON_TIME_SCALE * 5 || shown >= total) {   // ghi lên máy chủ mỗi ~5 giây
      const r = await addWatchTime(course, current, pending); pending = 0;
      if (shown >= total) { clearInterval(timer); timer = null; }
      if (r.theoryDone) { renderNav(); await renderLesson(); if (r.done) toast('🎉 Bạn đã hoàn thành bài học!', 'success'); }
    }
  }, 1000);
});
addEventListener('pagehide', () => clearInterval(timer));

// ----- Bài tập thực hành -----
async function renderPractice(theoryDone) {
  const subs = await mySubmissions(session.user.uid, course.id, current.id);
  const can = canSubmit(subs);
  const box = $('#practice');
  box.innerHTML = `<div class="card"><h3>📤 Bài tập thực hành: nộp sản phẩm mẫu</h3>
    <p class="muted small">Yêu cầu: ảnh nhiều góc + video thao tác (liên kết YouTube/Vimeo). Điểm đạt từ ${APP.PASS_SCORE}/10. Nếu chưa đạt bạn được nộp lại tối đa ${APP.MAX_RESUBMIT} lần.</p>
    ${subs.length ? `<h4>Lịch sử nộp bài</h4>${subs.map((s) => `<div class="alert ${s.status === 'passed' ? 'alert-success' : s.status === 'returned' ? 'alert-error' : 'alert-info'}">Lần ${s.attempt + 1} · ${formatDateTime(s.createdAt)} — <strong>${{ pending: 'Chờ đánh giá', passed: `Đạt (${s.score}/10)`, returned: `Trả về (${s.score}/10)` }[s.status]}</strong>${s.comment ? `<br>Nhận xét: ${esc(s.comment)}` : ''}</div>`).join('')}` : ''}
    ${!theoryDone ? '<div class="alert alert-warn">Hãy xem tối thiểu 80% thời lượng bài học trước khi nộp bài thực hành.</div>'
      : !can.ok ? `<div class="alert alert-info">${esc(can.reason)}</div>` : `
    <form id="sub-form" novalidate>
      <div class="field"><label for="s-title">Tên sản phẩm / bài tập <span class="req">*</span></label><input id="s-title" type="text" maxlength="100"><p class="field-error"></p></div>
      <div class="field"><label for="s-img">Hình ảnh các góc sản phẩm (2–5 ảnh, JPG/PNG, mỗi ảnh &lt; 10MB) <span class="req">*</span></label><input id="s-img" type="file" accept="image/jpeg,image/png" multiple><div class="thumbs" id="s-thumbs"></div><p class="field-error" id="s-img-err"></p></div>
      <div class="field"><label for="s-video">Liên kết video thao tác (YouTube/Vimeo) <span class="req">*</span></label><input id="s-video" type="url" placeholder="https://www.youtube.com/watch?v=..."><p class="field-hint">Web chưa nhận tải tệp video trực tiếp; hãy đăng video lên YouTube/Vimeo (chế độ không công khai) rồi dán liên kết.</p><p class="field-error"></p></div>
      <div class="field"><label for="s-note">Ghi chú kỹ thuật (tối đa 500 ký tự)</label><textarea id="s-note" rows="3" maxlength="500" placeholder="Loại nguyên liệu, nhiệt độ/thời gian sấy đã dùng…"></textarea></div>
      <div class="field"><label class="check"><input type="checkbox" id="s-own"> <span>Tôi cam đoan đây là sản phẩm do chính tôi thao tác</span></label><p class="field-error"></p></div>
      <div class="alert alert-error" hidden id="s-alert"></div>
      <button class="btn btn-primary" type="submit" id="s-btn">Nộp bài thực hành</button></form>`}</div>`;
  const form = $('#sub-form', box);
  if (!form) return;
  let images = [];
  $('#s-img', box).addEventListener('change', async (e) => {
    const err = $('#s-img-err', box); err.textContent = ''; images = [];
    for (const f of [...e.target.files].slice(0, 5)) {
      const msg = validateImageFile(f, { maxMB: 10, types: ['image/jpeg', 'image/png'] });
      if (msg) { err.textContent = `${f.name}: ${msg}`; continue; }
      images.push(await compressImage(f, { maxSide: 800, quality: 0.65 }));
    }
    if (e.target.files.length > 5) err.textContent = 'Chỉ nhận tối đa 5 ảnh.';
    $('#s-thumbs', box).innerHTML = images.map((s) => `<div class="thumb"><img src="${s}" alt=""></div>`).join('');
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const setErr = (el, msg) => { const f = el.closest('.field'); f.querySelector('.field-error').textContent = msg; f.classList.toggle('has-error', !!msg); return !msg; };
    const title = $('#s-title', box), video = $('#s-video', box), own = $('#s-own', box);
    let ok = true;
    ok = setErr(title, validateText(title.value, 'Tên sản phẩm', { min: 5, max: 100 }) || (/[<>{}$]/.test(title.value) ? 'Tên chứa ký tự không được phép.' : '')) && ok;
    if (images.length < 2 || images.length > 5) { $('#s-img-err', box).textContent = 'Cần từ 2 đến 5 ảnh hợp lệ.'; ok = false; }
    ok = setErr(video, /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(video.value.trim()) ? '' : 'Vui lòng dán liên kết YouTube hoặc Vimeo hợp lệ.') && ok;
    ok = setErr(own, own.checked ? '' : 'Bạn cần cam đoan sản phẩm do chính bạn thao tác.') && ok;
    if (!ok) return;
    const btn = $('#s-btn', box); setBusy(btn, true);
    try {
      await submitPractice(session.user.uid, session.profile.name, course, current, { title: title.value.trim(), images, videoUrl: video.value.trim(), note: $('#s-note', box).value.trim(), ownWork: true }, subs.length);
      toast('Đã nộp bài. Đánh giá viên sẽ chấm và thông báo kết quả.', 'success'); await renderPractice(theoryDone);
    } catch (er) { console.error(er); setBusy(btn, false); $('#s-alert', box).hidden = false; $('#s-alert', box).textContent = 'Có sự cố khi nộp bài, vui lòng thử lại.'; }
  });
}

on(document, 'click', '[data-lesson]', async (e, el) => {
  current = lessons.find((l) => l.id === el.dataset.lesson);
  history.replaceState(null, '', pageUrl('course-detail', { id: course.id, lesson: current.id }));
  renderNav(); await renderLesson();
});
renderNav(); await renderLesson();
