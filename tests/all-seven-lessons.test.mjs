import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COURSES, allLessons } from '../js/data/courses.js';
import { youtubeId } from '../js/components/youtube-player.js';
import { videoWindow } from '../js/services/video-window.js';
import { mergeWatchedRanges, videoWatchPercent, videoRangesForStorage } from '../js/services/video-progress.js';

// [BTV-VIDEO] V4: Không còn bài nào thiếu YouTube, bao gồm cả khóa Gốm.
test('V4: hai khóa học đủ 4+3 video từ YouTube và có ghi chú', () => {
  assert.deepEqual(COURSES.map(c => allLessons(c).length), [4, 3]);
  const lessons = COURSES.flatMap(allLessons);
  assert.equal(lessons.length, 7);
  const ids = new Set();
  for (const lesson of lessons) {
    const id = youtubeId(lesson.youtubeUrl);
    assert.ok(id, `${lesson.title} thiếu URL YouTube đúng định dạng`);
    assert.ok(!ids.has(id), `Hai bài dùng trùng ID ${id}`);
    ids.add(id);
    assert.equal(lesson.videoClipSeconds, 300);
    assert.equal(lesson.videoReference, true);
    assert.ok(lesson.videoReferenceNote.length > 25);
  }
});

test('V4: video dài 14:35 chỉ tính đoạn 5 phút', () => {
  assert.deepEqual(videoWindow({videoClipSeconds: 300}, 14*60+35), {start:0, cap:300, duration:300});
  assert.equal(videoWatchPercent([[0, 239]], 300) < 80, true);
  assert.equal(videoWatchPercent([[0, 240]], 300), 80);
});

test('V4: video dưới 5 phút tính 80% theo thời lượng thật', () => {
  const {duration} = videoWindow({videoClipSeconds:300}, 210);
  assert.equal(duration, 210);
  assert.equal(videoWatchPercent([[0,168]], duration), 80);
});

test('V4: video có vị trí bắt đầu khác 0 vẫn tính cửa sổ chính xác', () => {
  assert.deepEqual(videoWindow({videoClipStartSeconds:180, videoClipSeconds:300}, 360), {start:180,cap:300,duration:180});
});

test('V4: lưu Firestore không có array lồng nhau', () => {
  const ranges = videoRangesForStorage([[0,90],[90,240]], 300);
  assert.deepEqual(ranges, [{start:0,end:240}]);
  assert.deepEqual(mergeWatchedRanges(ranges,300), [[0,240]]);
});

test('V4: player có cấu hình start-end từ dữ liệu và không mở trang YouTube', () => {
  const code = fs.readFileSync(new URL('../js/pages/course-detail.js', import.meta.url), 'utf8');
  assert.match(code, /start: v\.clipStart, end: v\.clipEnd/);
  assert.match(code, /videoWindow\(v\.lesson, sourceDuration\)/);
  assert.ok(!code.includes('window.open('));
  assert.ok(!code.includes('video-setup'));
});
