/**
 * ============================================================
 * FILE: js/pages/course-detail.js
 * [BTV-VIDEO] ĐÃ SỬA: nút "Bắt đầu học" mở màn hình YouTube nhúng ngay trong Bàn Tay Vàng.
 * Xem thêm: GHI_CHU_THAY_DOI_VIDEO.md.
 * LMS Bàn Tay Vàng: mục lục → Bắt đầu học → xem YouTube ngay trên website
 * → theo dõi 80% video thực → hoàn thành / chuyển bài → nộp thực hành.
 * Không mở tab khác. Video không nhúng được sẽ hiển thị lỗi rõ ràng.
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { getCourse, allLessons, LEVEL_LABEL } from '../data/courses.js';
import { loadLessonOverrides } from '../services/course-content.js';
import { lessonProgress, isDone, isLocked, courseProgress, saveVideoProgress, mySubmissions, canSubmit, submitPractice } from '../services/courses.js';
import { youtubeId, loadYouTubeApi } from '../components/youtube-player.js';
import { mergeWatchedRanges, videoWatchPercent } from '../services/video-progress.js';
import { videoWindow } from '../services/video-window.js';
import { APP } from '../config/app-config.js';
import { compressImage, validateImageFile } from '../utils/image.js';
import { validateText } from '../utils/validators.js';
import { toast } from '../components/toast.js';
import { $, esc, qs, on, setBusy } from '../utils/dom.js';
import { pageUrl, gotoLogin } from '../utils/paths.js';
import { formatDateTime } from '../utils/format.js';

const session = await initLayout({ active: 'courses', title: 'Khóa học' });
await loadLessonOverrides();
const course = getCourse(qs('id'));
const root = $('#course');
if (!course) {
  root.innerHTML = `<div class="empty-state"><p>Không tìm thấy khóa học.</p><a class="btn btn-primary" href="${pageUrl('courses')}">Về danh sách</a></div>`;
  throw new Error('stop');
}

const lessons = allLessons(course);
let current = lessons.find((l) => l.id === qs('lesson')) || lessons.find((l) => !isDone(course.id, l.id) && !isLocked(course, l)) || lessons[0];
const courseLayout = $('.course-layout');
const theater = $('#course-theater');
let activeVideo = null;

// [BTV-VIDEO] SỬA V2: chỉ lấy video do nhóm biên tập trong js/data/courses.js.
// Không đọc link thử từ localStorage nữa: học viên (kể cả chạy localhost) không thấy ô dán link.
function lessonVideoUrl(lesson) { return lesson.youtubeUrl || ''; }

/** Biểu tượng trạng thái của từng bài */
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
        ${c.lessons.map((l) => `<button type="button" class="lesson-btn ${l.id === current.id ? 'on' : ''} ${isLocked(course, l) ? 'locked' : ''}" data-lesson="${esc(l.id)}">
          <span>${esc(l.title)}${l.key ? ' 🔥' : ''}</span><span class="small muted">⏱ ${l.minutes} phút | ${LEVEL_LABEL[l.level]} | ${statusIcon(l)}</span></button>`).join('')}</div>`).join('')}</details>`).join('')}`;
}

async function renderLesson() {
  const l = current, locked = isLocked(course, l);
  const prog = lessonProgress(course.id, l.id);
  const total = l.minutes * 60;
  const pct = Math.min(100, Math.round((Number(prog.watched || 0) / total) * 100));
  const hasPractical = (l.parts || []).some((p) => p.practical);
  const theoryDone = prog.watched / total >= APP.WATCH_THRESHOLD;
  const url = lessonVideoUrl(l);
  const hasVideo = !!youtubeId(url);

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
      <p class="small muted">Nội dung khung mẫu của khóa học. Video minh họa giúp quan sát thao tác, chưa thay thế hướng dẫn của nghệ nhân.</p></div>
    <div class="card"><h3>Tiến độ xem video</h3>
      <div class="progress"><span id="watch-bar" style="width:${pct}%"></span></div>
      <p id="watch-text" class="small">${pct}% · cần xem ít nhất ${Math.round(APP.WATCH_THRESHOLD * 100)}% video để hoàn thành phần lý thuyết ${theoryDone ? '✔' : ''}</p>
      ${session ? `<button class="btn btn-primary" type="button" id="play" ${hasVideo ? '' : 'disabled'}>${prog.watched ? '▶ Tiếp tục học' : '▶ Bắt đầu học'}</button>
        ${!hasVideo ? '<p class="small muted">🎬 Bài này chưa được gắn video YouTube. Hãy thêm thuộc tính <code>youtubeUrl</code> trong js/data/courses.js.</p>' : ''}
        ${l.videoReference ? `<p class="small muted">🎬 ${esc(l.videoReferenceNote || 'Video tư liệu tham khảo, cần giảng viên bổ sung.')}</p>` : ''}
        <p class="small muted">Tiến độ chỉ tăng khi video YouTube thực sự phát trên trang và người học đang xem; tua bỏ qua không được tính.</p>`
        : `<button class="btn btn-primary" type="button" id="need-login">Đăng nhập để học và lưu tiến độ</button>`}
      ${isDone(course.id, l.id) ? '<p class="alert alert-success">🟢 Bạn đã hoàn thành bài này.</p>' : ''}</div>
    ${hasPractical ? '<div id="practice"></div>' : ''}`;
  if (hasPractical && session) renderPractice(theoryDone);
  else if (hasPractical) $('#practice').innerHTML = '<div class="card"><p class="muted">Đăng nhập để nộp bài thực hành.</p></div>';
}

on($('#lesson'), 'click', '#need-login', () => gotoLogin());
on($('#lesson'), 'click', '#play', () => startVideo());
// ---------- Trình phát YouTube nhúng trực tiếp trên website ----------
const videoTime = (seconds) => {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};

/** Tính % từ các đoạn được phát THỰC, không cộng lại đoạn đã xem. */
function livePercent(v) {
  const observed = videoWatchPercent(v.ranges, v.duration);
  const old = Number(lessonProgress(course.id, v.lesson.id).watched) / (v.lesson.minutes * 60) * 100 || 0;
  return Math.min(100, Math.max(observed, v.videoId === lessonProgress(course.id, v.lesson.id).videoId || !lessonProgress(course.id, v.lesson.id).videoId ? old : 0));
}

function updateVideoUi(v) {
  if (activeVideo !== v) return;
  const pct = livePercent(v);
  const value = Math.min(100, Math.round(pct));
  const bar = $('#video-watch-bar', theater);
  if (bar) bar.style.width = `${value}%`;
  const progress = $('#video-watch-text', theater);
  if (progress) progress.textContent = `${value}% video đã xem thực tế · tối thiểu ${Math.round(APP.WATCH_THRESHOLD * 100)}% để hoàn thành`;
  const btn = $('#video-complete', theater);
  if (btn) {
    btn.disabled = pct + .0001 < APP.WATCH_THRESHOLD * 100;
    btn.textContent = (v.lesson.parts || []).some((p) => p.practical) ? 'Đến phần thực hành →' : 'Hoàn thành bài học →';
  }
  const now = $('#video-current-time', theater);
  if (now) now.textContent = `${videoTime(Math.max(0, Math.min(v.duration, (v.player?.getCurrentTime?.() || v.clipStart) - v.clipStart)))} / ${videoTime(v.duration)}`;
}

/** Chỉ ghi đoạn liền mạch khi API báo PLAYING, tab đang mở, không bị tua. */
function sampleVideo(v, forced = false) {
  if (activeVideo !== v || !v.player?.getCurrentTime) return;
  const playing = v.playing && (forced || document.visibilityState === 'visible');
  const t = Math.max(0, Math.min(v.duration, Number(v.player.getCurrentTime()) - v.clipStart));
  const now = performance.now();
  if (!Number.isFinite(t)) return;
  const d = Number(v.player.getDuration?.()) || 0;
  if (d > 0 && d !== v.sourceDuration) {
    v.sourceDuration = d;
    v.duration = videoWindow(v.lesson, d).duration;
    v.ranges = mergeWatchedRanges(v.ranges, v.duration);
  }
  if (playing && v.duration > 0 && v.lastTime !== null && v.lastStamp !== null) {
    const delta = t - v.lastTime;
    const elapsed = Math.max(0, (now - v.lastStamp) / 1000);
    const rate = Number(v.player.getPlaybackRate?.()) || 1;
    // Tua từ 00:02 lên 04:00 không được coi là "xem" 3 phút 58 giây.
    if (delta > 0 && delta <= elapsed * Math.max(0.25, rate) + 1.15 && elapsed < 5) {
      v.ranges = mergeWatchedRanges([...v.ranges, [v.lastTime, t]], v.duration);
      v.dirty = true;
    }
  }
  v.lastTime = playing ? t : null;
  v.lastStamp = playing ? now : null;
  updateVideoUi(v);
}

/** Ghi lên userState/Firebase tối đa khoảng 1 lần / 5 giây, đồng bộ trước khi thoát. */
function saveWatched(v, force = false) {
  const now = Date.now();
  // [BTV-VIDEO] V3: lỗi mạng/Firestore thì đợi trước khi thử lại; không spam toast.
  if (!v.dirty || !v.duration || (!force && (now - v.lastSaveAt < 5000 || now < v.nextRetryAt))) return v.saveQueue;
  v.dirty = false;
  v.lastSaveAt = Date.now();
  const ranges = v.ranges.map((r) => [...r]);
  const duration = v.duration;
  v.saveQueue = v.saveQueue.catch(() => {}).then(async () => {
    try {
      await saveVideoProgress(course, v.lesson, v.videoId, ranges, duration);
      v.nextRetryAt = 0;
      if (activeVideo === v) { renderNav(); updateVideoUi(v); }
    } catch (error) {
      v.dirty = true;
      v.nextRetryAt = Date.now() + 15000;
      console.error('Lỗi lưu tiến độ video', error);
      // [BTV-VIDEO] V3: tối đa 1 thông báo mỗi 30 giây, không quy mọi lỗi thành lỗi mạng.
      if (activeVideo === v && Date.now() - v.lastErrorToastAt > 30000) {
        v.lastErrorToastAt = Date.now();
        toast('Không lưu được tiến độ. Hệ thống sẽ thử lại; nếu vẫn lỗi, hãy báo quản trị viên.', 'error');
      }
      throw error;
    }
  });
  return v.saveQueue;
}

function onPlayerState(v, event) {
  if (activeVideo !== v) return;
  if (event.data === 1) { // PLAYING
    v.playing = true;
    v.lastTime = null;
    v.lastStamp = null;
    sampleVideo(v);
  } else {
    if (v.playing) sampleVideo(v, true);
    v.playing = false;
    v.lastTime = null;
    v.lastStamp = null;
    saveWatched(v, true).catch(() => {});
    if (event.data === 0) { // ENDED
      updateVideoUi(v);
      if (livePercent(v) >= APP.WATCH_THRESHOLD * 100) toast('🎉 Đã đủ thời lượng! Bấm Hoàn thành bài học nhé.', 'success');
    }
  }
}

async function startVideo() {
  if (!session) return gotoLogin();
  if (isLocked(course, current)) return toast('Bài học chưa mở khóa.', 'error');
  const url = lessonVideoUrl(current);
  const id = youtubeId(url);
  if (!id) return toast('Bài này chưa có video YouTube hợp lệ.', 'error');
  if (activeVideo) await leaveVideo();
  const l = current;
  const saved = lessonProgress(course.id, l.id);
  const windowSpec = videoWindow(l, 0);
  const v = {
    lesson: l, videoId: id, player: null, playing: false, lastTime: null, lastStamp: null,
    clipStart: windowSpec.start, clipEnd: windowSpec.start + windowSpec.cap, sourceDuration: 0,
    duration: saved.videoId === id ? Math.min(windowSpec.cap, Number(saved.videoDuration) || windowSpec.cap) : windowSpec.cap,
    // [BTV-VIDEO] V3: giải mã dữ liệu Firestore dạng object trước khi tính tiến độ.
    ranges: saved.videoId === id ? mergeWatchedRanges(saved.videoRanges || [], Math.min(windowSpec.cap, Number(saved.videoDuration) || windowSpec.cap)) : [],
    timer: null, dirty: false, lastSaveAt: Date.now(), saveQueue: Promise.resolve(),
    nextRetryAt: 0, lastErrorToastAt: 0
  };
  activeVideo = v;
  courseLayout.hidden = true;
  theater.hidden = false;
  theater.innerHTML = `
    <header class="video-lesson-topbar">
      <button class="video-exit" id="video-exit" type="button">✕ Thoát video</button>
      <div class="video-lesson-heading"><span>${esc(course.title)}</span><strong>${esc(l.title)}</strong></div>
      <span class="video-lesson-pill">🎬 Đoạn học tối đa 5 phút</span>
    </header>
    <div class="video-welcome"><span class="video-welcome-icon" aria-hidden="true">🧺</span> Cùng học nghề với Bàn Tay Vàng! 🎬</div>
    <section class="video-screen card" aria-label="Xem video bài học">
      <div class="video-screen-head"><h2>▷ Video: ${esc(l.videoTitle && url === l.youtubeUrl ? l.videoTitle : l.title)}</h2>
        <button id="video-expand" class="video-expand" type="button" aria-label="Phóng to video" title="Phóng to video">⛶</button></div>
      ${l.videoReference ? `<p class="video-demo-note">🎬 ${esc(l.videoReferenceNote || 'Video tư liệu tham khảo, chưa thay thế giáo án chính thức của bài học.')}</p>` : ''}
      <p class="small muted">Đoạn phát giới hạn khoảng 5 phút để dễ học; nếu video gốc ngắn hơn, hệ thống tính đúng thời lượng của video đó. Phần thực hành vẫn theo nội dung bài.</p>
      <div class="youtube-frame" id="youtube-frame"><div id="youtube-player" class="youtube-player-host"></div>
        <div id="youtube-loading" class="video-loading">Đang kết nối YouTube…</div></div>
      <p id="video-player-error" class="alert alert-error" hidden></p>
    </section>
    <section class="video-learning-footer" aria-label="Tiến độ học tập">
      <div class="video-learning-progress"><div class="video-learning-percent"><strong>Tiến độ bài học</strong><span id="video-current-time">00:00 / --:--</span></div>
        <div class="progress"><span id="video-watch-bar" style="width:0%"></span></div>
        <p id="video-watch-text" class="small muted">0% · cần xem ít nhất 80% video</p></div>
      <button type="button" id="video-complete" class="video-finish-btn" disabled>Hoàn thành bài học →</button>
    </section>
    <div id="video-success" class="video-success-overlay" hidden></div>`;
  updateVideoUi(v);
  theater.scrollIntoView({ behavior: 'instant', block: 'start' });
  try {
    const YT = await loadYouTubeApi();
    if (activeVideo !== v) return; // người học đã thoát lúc SDK chưa tải xong
    v.player = new YT.Player('youtube-player', {
      videoId: id, width: '100%', height: '100%',
      playerVars: {
        playsinline: 1, controls: 1, rel: 0,
        // [BTV-VIDEO] V4: phát tối đa 5 phút mà vẫn nằm trên website.
        start: v.clipStart, end: v.clipEnd,
        ...(location.origin && location.origin !== 'null' ? { origin: location.origin } : {})
      },
      events: {
        onReady: ({ target }) => {
          if (activeVideo !== v) return;
          $('#youtube-loading', theater)?.remove();
          const sourceDuration = Number(target.getDuration()) || 0;
          if (sourceDuration > 0) {
            v.sourceDuration = sourceDuration;
            v.duration = videoWindow(v.lesson, sourceDuration).duration;
            v.ranges = mergeWatchedRanges(v.ranges, v.duration);
          }
          updateVideoUi(v);
          // Không ép autoplay có âm thanh — người học bấm ▶ ngay trên YouTube player.
        },
        onStateChange: (event) => onPlayerState(v, event),
        onError: (event) => {
          if (activeVideo !== v) return;
          v.playing = false;
          clearInterval(v.timer);
          const msg = [101, 150].includes(event.data)
            ? 'Chủ video không cho phép phát nhúng. Hãy thay bằng một video YouTube cho phép nhúng.'
            : event.data === 100 ? 'Video không còn tồn tại hoặc đang đặt riêng tư.'
              : event.data === 153 ? 'YouTube yêu cầu định danh website (Referrer). Hãy chạy qua localhost/HTTPS.'
                : 'YouTube không phát được video này. Hãy kiểm tra đường dẫn hoặc thử video khác.';
          $('#video-player-error', theater).textContent = msg;
          $('#video-player-error', theater).hidden = false;
          $('#youtube-loading', theater)?.remove();
        }
      }
    });
    v.timer = setInterval(() => {
      if (activeVideo !== v) return;
      if (v.player?.getPlayerState?.() === 1 && document.visibilityState === 'visible') sampleVideo(v);
      else { v.lastTime = null; v.lastStamp = null; }
      saveWatched(v).catch(() => {});
    }, 1000);
  } catch (error) {
    if (activeVideo !== v) return;
    $('#youtube-loading', theater)?.remove();
    $('#video-player-error', theater).textContent = error.message || 'Không thể kết nối YouTube.';
    $('#video-player-error', theater).hidden = false;
  }
}

async function leaveVideo() {
  const v = activeVideo;
  if (!v) return;
  if (v.playing) sampleVideo(v, true);
  clearInterval(v.timer);
  v.playing = false;
  v.lastTime = null; v.lastStamp = null;
  try { await saveWatched(v, true); await v.saveQueue; }
  catch { /* Đã thông báo tại saveWatched(), không tạo toast trùng khi thoát. */ }
  try { v.player?.destroy?.(); } catch { /* player đang load */ }
  if (activeVideo !== v) return;
  activeVideo = null;
  theater.hidden = true;
  theater.innerHTML = '';
  courseLayout.hidden = false;
  renderNav();
  await renderLesson();
}

function showFinished(v) {
  const next = lessons[lessons.indexOf(v.lesson) + 1];
  const availableNext = next && !isLocked(course, next);
  const overlay = $('#video-success', theater);
  overlay.hidden = false;
  overlay.innerHTML = `<div class="video-success-modal" role="dialog" aria-modal="true" aria-labelledby="video-success-title">
    <div class="video-success-confetti" aria-hidden="true">🎊 ✨ 🧺 ✨ 🎉</div>
    <div class="video-success-medal" aria-hidden="true">🏆</div>
    <h2 id="video-success-title">Quá mạnh! 🎉</h2>
    <p>Bạn đã hoàn thành phần lý thuyết của <strong>${esc(v.lesson.title)}</strong>.</p>
    <p class="video-success-score">✓ Đã xem ít nhất ${Math.round(APP.WATCH_THRESHOLD * 100)}% video</p>
    <div class="video-success-actions">
      <button class="btn btn-secondary" id="video-success-back" type="button">← Về khóa học</button>
      ${availableNext ? `<button class="btn btn-primary" id="video-success-next" type="button">Bài tiếp theo →</button>` : ''}
    </div></div>`;
  $('#video-success-back', theater).focus();
}

on(theater, 'click', '#video-exit', async () => { await leaveVideo(); });
on(theater, 'click', '#video-expand', async () => {
  const target = $('#youtube-frame', theater);
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await target.requestFullscreen();
  } catch { toast('Trình duyệt không hỗ trợ phóng to khung này.', 'error'); }
});
on(theater, 'click', '#video-complete', async (e, btn) => {
  const v = activeVideo;
  if (!v || livePercent(v) < APP.WATCH_THRESHOLD * 100) return;
  btn.disabled = true;
  if (v.playing) sampleVideo(v, true);
  try { await saveWatched(v, true); await v.saveQueue; }
  catch { btn.disabled = false; return; } // Lỗi đã được báo một lần ở saveWatched().
  const hasPractice = (v.lesson.parts || []).some((p) => p.practical);
  if (hasPractice) {
    await leaveVideo();
    $('#practice')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('Đã xong lý thuyết! Nộp bài thực hành để hoàn thành bài học.', 'success');
  } else showFinished(v);
});
on(theater, 'click', '#video-success-back', async () => { await leaveVideo(); });
on(theater, 'click', '#video-success-next', async () => {
  const v = activeVideo;
  if (!v) return;
  const next = lessons[lessons.indexOf(v.lesson) + 1];
  await leaveVideo();
  if (next && !isLocked(course, next)) await selectLesson(next);
});

document.addEventListener('visibilitychange', () => {
  const v = activeVideo;
  if (!v || document.visibilityState === 'visible') return;
  if (v.playing) sampleVideo(v, true);
  v.player?.pauseVideo?.();
  v.playing = false; v.lastTime = null; v.lastStamp = null;
  saveWatched(v, true).catch(() => {});
});
window.addEventListener('pagehide', () => {
  const v = activeVideo;
  if (!v) return;
  if (v.playing) sampleVideo(v, true);
  clearInterval(v.timer);
  saveWatched(v, true).catch(() => {});
});

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

/** Chọn bài trong mục lục hoặc sau màn hình chúc mừng. */
async function selectLesson(lesson) {
  if (!lesson) return;
  current = lesson;
  history.replaceState(null, '', pageUrl('course-detail', { id: course.id, lesson: current.id }));
  renderNav();
  await renderLesson();
  $('#lesson')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

on(document, 'click', '[data-lesson]', async (e, el) => {
  if (activeVideo) await leaveVideo();
  await selectLesson(lessons.find((l) => l.id === el.dataset.lesson));
});
renderNav();
await renderLesson();
