/**
 * [BTV-VIDEO] V4 — khung trích đoạn YouTube tối đa ~5 phút.
 * Không sao chép/tải lại video: dùng Player API của YouTube với start/end.
 * 'duration' là thời lượng trong trích đoạn, để tính 80% chính xác.
 */
export function videoWindow(lesson, sourceDuration = 0) {
  const start = Math.max(0, Math.floor(Number(lesson?.videoClipStartSeconds) || 0));
  const cap = Math.max(1, Math.floor(Number(lesson?.videoClipSeconds) || 300));
  const full = Number(sourceDuration) || 0;
  return { start, cap, duration: full > 0 ? Math.max(0, Math.min(cap, full - start)) : cap };
}
