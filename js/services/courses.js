/**
 * ============================================================
 *  FILE: js/services/courses.js
 *  MỤC ĐÍCH: Tiến độ học + nộp bài thực hành.
 *  Điều kiện nghiệp vụ (đặc tả file "Chi tiết khóa học LMS"):
 *    COND-ATT-01  Xem tối thiểu 80% thời lượng mới tính hoàn thành lý thuyết
 *    COND-CRS-01  Bài "Rất khó" khóa tới khi hoàn thành 100% bài cấp dưới
 *    COND-SUB-01  Ảnh ≤ 10MB/ảnh (png/jpg), video là LINK YouTube/Vimeo (web không lưu tệp video)
 *    COND-SUB-02  Điểm < 7.5 được nộp lại, tối đa 3 lần
 *  Tiến độ lưu trong userState.progress → đồng bộ mọi thiết bị.
 * ============================================================
 */
import { backend } from './db.js';
import { APP } from '../config/app-config.js';
import { getState, patchState } from './userstate.js';
import { allLessons } from '../data/courses.js';

/** Tiến độ của một bài: {watched (giây bài học đã xem), done (bool)} */
export const lessonProgress = (courseId, lessonId) => getState().progress?.[courseId]?.[lessonId] || { watched: 0, done: false };

/** Bài đã hoàn thành chưa? (bài thực hành chỉ hoàn thành khi bài nộp được chấm đạt) */
export const isDone = (courseId, lessonId) => !!lessonProgress(courseId, lessonId).done;

/**
 * Bài có đang bị khóa không? (COND-CRS-01)
 * Bài "hard" chỉ mở khi MỌI bài basic/medium của khóa đã hoàn thành.
 */
export function isLocked(course, lesson) {
  if (lesson.level !== 'hard') return false;
  return !allLessons(course).filter((l) => l.level !== 'hard').every((l) => isDone(course.id, l.id));
}

/** Tiến độ cả khóa: {done, total, percent} */
export function courseProgress(course) {
  const lessons = allLessons(course);
  const done = lessons.filter((l) => isDone(course.id, l.id)).length;
  return { done, total: lessons.length, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
}

/**
 * Ghi thêm thời gian đã xem (giây bài học). Khi đạt ≥ 80% thời lượng → hoàn thành phần lý thuyết.
 * Bài có phần thực hành (key/hard) cần thêm bài nộp được chấm đạt mới "done" thật sự.
 */
export async function addWatchTime(course, lesson, seconds) {
  const total = lesson.minutes * 60;
  const cur = lessonProgress(course.id, lesson.id);
  const watched = Math.min(total, cur.watched + seconds);
  const theoryDone = watched / total >= APP.WATCH_THRESHOLD;
  const needsPractical = (lesson.parts || []).some((p) => p.practical);
  const done = theoryDone && !needsPractical ? true : cur.done;
  await patchState({ progress: { [course.id]: { [lesson.id]: { watched, theoryDone, done } } } });
  return { watched, theoryDone, done };
}

// ---------- Bài nộp thực hành ----------
export const mySubmissions = (uid, courseId, lessonId) =>
  backend.list('submissions', [['userId', '==', uid]]).then((l) => l.filter((s) => s.courseId === courseId && s.lessonId === lessonId).sort((a, b) => a.attempt - b.attempt));

/** Có được nộp (lại) không? Chưa nộp: được. Đã nộp: chỉ khi bị trả về (điểm < 7.5) và chưa quá 3 lần nộp lại */
export function canSubmit(subs) {
  if (!subs.length) return { ok: true };
  const last = subs[subs.length - 1];
  if (last.status === 'pending') return { ok: false, reason: 'Bài của bạn đang chờ đánh giá viên chấm.' };
  if (last.status === 'passed') return { ok: false, reason: 'Bạn đã hoàn thành bài thực hành này.' };
  if (subs.length - 1 >= APP.MAX_RESUBMIT) return { ok: false, reason: `Bạn đã dùng hết ${APP.MAX_RESUBMIT} lần nộp lại.` };
  return { ok: true };
}

export async function submitPractice(uid, userName, course, lesson, data, attempt) {
  return backend.add('submissions', {
    ...data, userId: uid, userName, courseId: course.id, courseTitle: course.title, lessonId: lesson.id, lessonTitle: lesson.title,
    attempt, status: 'pending', createdAt: Date.now()
  });
}

// ---------- Quản trị: chấm bài ----------
export const pendingSubmissions = () => backend.list('submissions', [['status', '==', 'pending']]);

/** Chấm điểm. ≥ 7.5 → đạt, tự hoàn thành bài học cho học viên; < 7.5 → trả về kèm nhận xét */
export async function gradeSubmission(sub, score, comment) {
  const passed = score >= APP.PASS_SCORE;
  await backend.update('submissions', sub.id, { status: passed ? 'passed' : 'returned', score, comment, gradedAt: Date.now() });
  if (passed) {
    // Đánh dấu hoàn thành bài học cho học viên (admin ghi vào userState của học viên)
    await backend.set('userState', sub.userId, { progress: { [sub.courseId]: { [sub.lessonId]: { done: true } } } }, { merge: true });
  }
  return passed;
}
