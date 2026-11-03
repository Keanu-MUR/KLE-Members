// Lesson cards shared by the instructor's lists and the pupil's My lessons:
// a white card with a 2px black border, the time big in the left column
// with the date above it, the pupil, a pick-up chip and a status pill on
// the right.

import { esc } from './portal-base.js';

export const LESSON_STYLE = `
.day { margin: 20px 0 0; }
.day-name { display: block; font-family: var(--font-head); font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; font-size: 15px; color: var(--ink); border-bottom: 2px dashed var(--ink); padding: 0 0 4px; margin: 0 0 12px; }
.lesson { display: grid; grid-template-columns: auto 1fr; column-gap: 16px; row-gap: 6px; align-items: start; background: var(--paper); border: 2px solid var(--ink); padding: 12px 14px; margin: 0 0 12px; text-decoration: none; color: inherit; }
a.lesson:hover { border-color: var(--accent); }
.lesson-when { flex: 0 0 auto; min-width: 104px; }
.lesson-date { display: block; color: var(--muted); margin: 0 0 2px; }
.lesson-time { font-family: var(--font-head); font-weight: 700; font-size: 26px; line-height: 1; letter-spacing: 0.01em; }
.lesson-body { min-width: 0; }
.lesson-more { grid-column: 2; min-width: 0; }
.lesson-more:empty { display: none; }
.lesson-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.lesson-who { font-weight: 600; }
.lesson-meta { color: var(--muted); }
.lesson-summary { margin: 6px 0 0; white-space: pre-line; }
.week { margin: 32px 0 12px; }
@media (max-width: 599px) {
  .lesson { column-gap: 12px; padding: 10px 12px; }
  .lesson-when { min-width: 0; }
  .lesson-time { font-size: 22px; }
  .lesson-more { grid-column: 1 / -1; }
}
`;

const STATUS_WORDS = { planned: 'Upcoming', completed: 'Completed', cancelled: 'Cancelled', 'no-show': 'No show' };

export function statusWord(status) {
  return STATUS_WORDS[status] == null ? status : STATUS_WORDS[status];
}

export function statusPill(status) {
  const key = status || 'planned';
  return '<span class="pill pill-' + esc(key) + '">' + esc(statusWord(key)) + '</span>';
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

// "Tue 4 Nov" for the card's date line.
export function shortDay(isoDate, withYear) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return '';
  const o = { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short' };
  if (withYear) o.year = 'numeric';
  return new Intl.DateTimeFormat('en-GB', o).format(d);
}

// The postcode at the end of a pick-up address, or the address itself.
export function pickupChip(pickup) {
  const text = String(pickup || '').trim();
  if (!text) return '';
  const m = text.match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\s*$/i);
  const label = m ? m[1].toUpperCase().replace(/\s+/, ' ') : text.length > 36 ? text.slice(0, 35) + '…' : text;
  return '<span class="chip" title="Pick-up: ' + esc(text) + '">' + esc(label) + '</span>';
}

// options: { href, who, showDate, withYear, summary, status }
export function renderLessonRow(lesson, options) {
  const o = options || {};
  const tag = o.href ? 'a' : 'div';
  const open = '<' + tag + ' class="lesson"' + (o.href ? ' href="' + esc(o.href) + '"' : '') + '>';
  const pill = o.status === false ? '' : statusPill(lesson.status);
  return (
    open +
    '<div class="lesson-when">' +
    (o.showDate ? '<span class="lesson-date">' + esc(shortDay(lesson.date, o.withYear)) + '</span>' : '') +
    '<div class="lesson-time">' + esc(lesson.timeLabel || '') + '</div>' +
    '</div>' +
    '<div class="lesson-body">' +
    '<div class="lesson-top">' + (o.who ? '<span class="lesson-who">' + esc(o.who) + '</span>' : '<span></span>') + pill + '</div>' +
    '</div>' +
    '<div class="lesson-more">' +
    pickupChip(lesson.pickupLocation) +
    (o.summary && lesson.pupilSummary ? '<p class="lesson-summary">' + esc(lesson.pupilSummary) + '</p>' : '') +
    '</div>' +
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
    '<div class="day"><h3 class="day-name">' + esc(dayWords(day.date)) + '</h3>' +
    day.lessons.map((lesson) => renderLessonRow(lesson, typeof rowOptions === 'function' ? rowOptions(lesson) : rowOptions)).join('') +
    '</div>'
  ).join('');
}
