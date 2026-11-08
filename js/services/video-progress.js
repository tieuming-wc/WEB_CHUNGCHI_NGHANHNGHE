/**
 * [BTV-VIDEO] V3 - Tính phần video đã xem, loại trừ tua/đoạn bị xem lặp.
 * Trong trình duyệt, mỗi khoảng có dạng [start, end].
 * Trên Firestore, phải ghi { start, end } vì Firestore KHÔNG hỗ trợ nested arrays.
 */
function rangePair(item) {
  if (Array.isArray(item) && item.length === 2) return item;
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    if ('start' in item && 'end' in item) return [item.start, item.end];
  }
  return null;
}

/** Đọc được cả bản cũ dạng [start,end] và bản V3 dạng {start,end}. */
export function mergeWatchedRanges(ranges, duration) {
  const limit = Math.max(0, Number(duration) || 0);
  const clean = (Array.isArray(ranges) ? ranges : []).map(rangePair).filter(Boolean)
    .map(([a, b]) => [Number(a), Number(b)])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
    .map(([a, b]) => [Math.max(0, Math.min(limit, a)), Math.max(0, Math.min(limit, b))])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const pair of clean) {
    const last = merged[merged.length - 1];
    if (last && pair[0] <= last[1] + 0.25) last[1] = Math.max(last[1], pair[1]);
    else merged.push([...pair]);
  }
  return merged.map(([a, b]) => [Math.round(a * 10) / 10, Math.round(b * 10) / 10]);
}

/** [BTV-VIDEO] V3 - Mảng object an toàn khi setDoc() lên Firebase Firestore. */
export function videoRangesForStorage(ranges, duration) {
  return mergeWatchedRanges(ranges, duration).map(([start, end]) => ({ start, end }));
}

export function videoWatchPercent(ranges, duration) {
  const total = Number(duration);
  if (!Number.isFinite(total) || total <= 0) return 0;
  const watched = mergeWatchedRanges(ranges, total).reduce((sum, [a, b]) => sum + b - a, 0);
  return Math.min(100, Math.max(0, (watched / total) * 100));
}
