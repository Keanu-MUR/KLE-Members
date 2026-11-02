// Lesson rows shared by the instructor's lists and the pupil's My lessons:
// date in small caps above, the slot as the strongest line, pick-up below.

import { esc } from './portal-base.js';

export const LESSON_STYLE = `
.day { margin: 20px 0 0; }
.day-name { display: block; font-variant-caps: all-small-caps; letter-spacing: 0.08em; color: var(--kle-muted); margin: 0 0 2px; }
.lesson { display: block; padding: 10px 0; text-decoration: none; }
.lesson + .lesson { border-top: 1px solid #e3ded6; }
.lesson-time { font-family: var(--kle-font-heading); font-size: 18px; line-height: 1.2; }
.lesson-who { font-weight: 600; }
.lesson-meta { color: var(--kle-muted); }
.lesson-status { font-variant-caps: all-small-caps; letter-spacing: 0.08em; color: var(--kle-red); margin-left: 8px; }
.lesson-summary { margin: 6px 0 0; white-space: pre-line; }
.week { margin: 28px 0 0; }
`;

const STATUS_WORDS = { planned: '', completed: 'Completed', cancelled: 'Cancelled', 'no-show': 'No show' };

export function statusWord(status) {
  return STATUS_WORDS[status] == null ? status : STATUS_WORDS[status];
}

// "Tuesday 4 November" in Europe/London from YYYY-MM-DD.
export function dayWords(isoDate, withYear) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return '';
  const o = { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long' };
  if (withYear) o.year = 'numeric';
  return new Intl.DateTimeFormat('en-GB', o).format(d);
}

// options: { href, who, showDate, summary }
export function renderLessonRow(lesson, options) {
  const o = options || {};
  const tag = o.href ? 'a' : 'div';
  const open = '<' + tag + ' class="lesson"' + (o.href ? ' href="' + esc(o.href) + '"' : '') + '>';
  const status = lesson.status && lesson.status !== 'planned' ? '<span class="lesson-status">' + esc(statusWord(lesson.status)) + '</span>' : '';
  return (
    open +
    (o.showDate ? '<span class="day-name">' + esc(dayWords(lesson.date, o.withYear)) + '</span>' : '') +
    '<div class="lesson-time">' + esc(lesson.timeLabel || '') + status + '</div>' +
    (o.who ? '<div class="lesson-who">' + esc(o.who) + '</div>' : '') +
    (lesson.pickupLocation ? '<div class="lesson-meta">Pick-up: ' + esc(lesson.pickupLocation) + '</div>' : '') +
    (o.summary && lesson.pupilSummary ? '<p class="lesson-summary">' + esc(lesson.pupilSummary) + '</p>' : '') +
    '</' + tag + '>'
  );
}

// Lessons grouped by date (already sorted by the backend).
export function groupByDay(lessons) {
  const days = [];
  (lessons || []).forEach((lesson) => {
    const last = days[days.length - 1];
    if (last && last.date === lesson.date) last.lessons.push(lesson);
    else days.push({ date: lesson.date, lessons: [lesson] });
  });
  return days;
}

export function renderDays(lessons, rowOptions) {
  return groupByDay(lessons).map((day) =>
    '<div class="day"><span class="day-name">' + esc(dayWords(day.date)) + '</span>' +
    day.lessons.map((lesson) => renderLessonRow(lesson, typeof rowOptions === 'function' ? rowOptions(lesson) : rowOptions)).join('') +
    '</div>'
  ).join('');
}
