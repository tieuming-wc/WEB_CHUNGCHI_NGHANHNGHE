import test from 'node:test';
import assert from 'node:assert/strict';
import { youtubeId } from '../js/components/youtube-player.js';
import { mergeWatchedRanges, videoWatchPercent, videoRangesForStorage } from '../js/services/video-progress.js';

test('Nhận các dạng link YouTube phổ biến', () => {
  for (const input of [
    'Vr02z41A0zk',
    'https://www.youtube.com/watch?v=Vr02z41A0zk&t=23s',
    'https://youtu.be/Vr02z41A0zk',
    'https://m.youtube.com/watch?v=Vr02z41A0zk',
    'https://www.youtube.com/shorts/Vr02z41A0zk',
    'https://www.youtube-nocookie.com/embed/Vr02z41A0zk'
  ]) assert.equal(youtubeId(input), 'Vr02z41A0zk');
});

test('Từ chối website giả YouTube và dữ liệu video không hợp lệ', () => {
  for (const input of ['https://youtube.com.evil.com/watch?v=Vr02z41A0zk',
    'javascript:alert(1)', 'https://example.com/watch?v=Vr02z41A0zk',
    'https://www.youtube.com/watch?v=bad', '', 'video.mp4']) assert.equal(youtubeId(input), null);
});

test('Các khoảng thời gian phát chồng nhau không bị cộng hai lần', () => {
  const ranges = mergeWatchedRanges([[0, 10], [0, 10], [5, 11], [25, 40]], 50);
  assert.deepEqual(ranges, [[0, 11], [25, 40]]);
  assert.equal(videoWatchPercent(ranges, 50), 52);
});

test('Không tính đoạn video ngoài thời lượng và phần đã tua bỏ qua', () => {
  const ranges = mergeWatchedRanges([[-8, 20], [80, 150], [40, 60]], 100);
  assert.deepEqual(ranges, [[0, 20], [40, 60], [80, 100]]);
  assert.equal(videoWatchPercent(ranges, 100), 60);
});

// [BTV-VIDEO] SỬA V2 – kiểm tra tĩnh rằng không còn form dán link YouTube cho học viên.
import fs from 'node:fs';
test('V2: trang học không còn giao diện chỉnh YouTube cho học viên', () => {
  const code = fs.readFileSync(new URL('../js/pages/course-detail.js', import.meta.url), 'utf8');
  assert.equal(code.includes('video-setup'), false);
  assert.equal(code.includes('video-local-setup'), false);
  assert.equal(code.includes('btv-video-preview:'), false);
  assert.equal(code.includes('lesson.youtubeUrl ||'), true);
});
test('V2: video tham khảo Bài 1.1 được cấu hình trong code', () => {
  const data = fs.readFileSync(new URL('../js/data/courses.js', import.meta.url), 'utf8');
  assert.match(data, /youtubeUrl: 'https:\/\/www\.youtube\.com\/watch\?v=-GgpGK7gyX8'/);
});

// [BTV-VIDEO] V3: kiểm thử đúng nguyên nhân xuất hiện trong Console của học viên.
test('V3: dữ liệu lưu lên Firestore là array-of-maps, không có nested arrays', () => {
  const ranges = videoRangesForStorage([[0, 10], [12, 27], [24, 37]], 100);
  assert.deepEqual(ranges, [{ start: 0, end: 10 }, { start: 12, end: 37 }]);
  assert.ok(ranges.every((r) => !Array.isArray(r) && typeof r.start === 'number' && typeof r.end === 'number'));
  assert.equal(videoWatchPercent(ranges, 100), 35);
});

test('V3: tải tiến độ đã lưu từ Firestore và tiếp tục xem không tính trùng', () => {
  const fromFirestore = [{ start: 0, end: 40 }, { start: 60, end: 80 }];
  const continued = mergeWatchedRanges([...fromFirestore, [35, 65], [81, 90]], 100);
  assert.deepEqual(continued, [[0, 80], [81, 90]]);
  assert.equal(videoWatchPercent(continued, 100), 89);
});

test('V3: lưu rồi đọc lại qua JSON có cùng phần trăm', () => {
  const values = [[1, 12.4], [15, 44.8], [42, 88]];
  const serialized = JSON.parse(JSON.stringify(videoRangesForStorage(values, 100)));
  assert.equal(videoWatchPercent(serialized, 100), videoWatchPercent(values, 100));
});

test('V3: khóa gửi Firebase chỉ dùng videoRangesForStorage', () => {
  const code = fs.readFileSync(new URL('../js/services/courses.js', import.meta.url), 'utf8');
  assert.ok(code.includes('videoRanges: videoRangesForStorage(merged, videoDuration)'));
});

test('V3: thông báo lỗi tiến độ được giới hạn tần suất', () => {
  const code = fs.readFileSync(new URL('../js/pages/course-detail.js', import.meta.url), 'utf8');
  assert.ok(code.includes('nextRetryAt: 0, lastErrorToastAt: 0'));
  assert.ok(code.includes('Date.now() - v.lastErrorToastAt > 30000'));
});

// [BTV-VIDEO] V3.1 – Bài 1.2 đã có link tư liệu YouTube; ghi chú phải đúng từng bài.
test('V3.1: Bài 1.2 có video YouTube hợp lệ trong khóa Mây tre cấp 3', async () => {
  const { getCourse, allLessons } = await import('../js/data/courses.js');
  const lesson = allLessons(getCourse('may-tre-cap3')).find((l) => l.id === 'l1-2');
  assert.equal(youtubeId(lesson.youtubeUrl), '6l-bviqjf24');
  assert.ok(lesson.videoReference);
  assert.match(lesson.videoReferenceNote, /chống mối mọt/i);
});

test('V3.1: lời nhắc video tham khảo lấy theo dữ liệu từng bài', () => {
  const code = fs.readFileSync(new URL('../js/pages/course-detail.js', import.meta.url), 'utf8');
  assert.ok(code.includes('esc(l.videoReferenceNote'));
});
