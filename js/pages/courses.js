/**
 * ============================================================
 *  FILE: js/pages/courses.js
 *  TRANG: Học nghề – danh sách khóa học (pages/courses.html)
 *  Hiện các khóa, số bài, tổng thời lượng và tiến độ của tài khoản đang đăng nhập (nếu có).
 * ============================================================
 */
import { initLayout } from '../components/layout.js';
import { COURSES, allLessons } from '../data/courses.js';
import { courseProgress } from '../services/courses.js';
import { $, esc } from '../utils/dom.js';
import { pageUrl } from '../utils/paths.js';

const session = await initLayout({ active: 'courses', title: 'Học nghề' });

$('#courses').innerHTML = COURSES.map((c) => {
  const lessons = allLessons(c);
  const mins = lessons.reduce((s, l) => s + l.minutes, 0);
  const p = session ? courseProgress(c) : null;
  return `<article class="card course-card">
    <p class="badge badge-gold">${esc(c.craft)} · ${esc(c.village)}</p>
    <h2>${esc(c.title)}</h2><p>${esc(c.summary)}</p>
    <p class="muted">${lessons.length} bài học · khoảng ${Math.round(mins / 60 * 10) / 10} giờ${lessons.some((l) => l.level === 'hard') ? ' · có bài thực hành nộp sản phẩm' : ''}</p>
    ${p ? `<div class="progress" aria-label="Tiến độ ${p.percent}%"><span style="width:${p.percent}%"></span></div><p class="small muted">Đã hoàn thành ${p.done}/${p.total} bài (${p.percent}%)</p>` : ''}
    <a class="btn btn-primary" href="${pageUrl('course-detail', { id: c.id })}">${p && p.done ? 'Tiếp tục học' : 'Xem khóa học'}</a></article>`;
}).join('');
