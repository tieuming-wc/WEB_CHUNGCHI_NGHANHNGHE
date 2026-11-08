/** [BTV-ADMIN] Nội dung chỉnh từ admin lưu trong Firestore, ghi đè trên bài mẫu mà không sửa ID. */
import { backend } from './db.js';
import { COURSES, allLessons } from '../data/courses.js';
const ALLOWED = ['title', 'content', 'youtubeUrl', 'videoTitle', 'videoReferenceNote', 'videoClipSeconds'];
export const overrideId = (courseId, lessonId) => `${courseId}__${lessonId}`;
export async function loadLessonOverrides() {
  await Promise.all(COURSES.flatMap(course => allLessons(course).map(async lesson => {
    try {
      const patch = await backend.get('courseLessonOverrides', overrideId(course.id, lesson.id));
      if (patch) for (const key of ALLOWED) if (patch[key] !== undefined) lesson[key] = patch[key];
    } catch (e) { console.warn('Không thể tải ghi đè bài học', lesson.id, e); }
  })));
  return COURSES;
}
export async function saveLessonOverride(courseId, lessonId, values) {
  const data = Object.fromEntries(ALLOWED.filter(k => values[k] !== undefined).map(k => [k, values[k]]));
  await backend.set('courseLessonOverrides', overrideId(courseId, lessonId), {
    ...data, courseId, lessonId, updatedAt: Date.now() });
}
