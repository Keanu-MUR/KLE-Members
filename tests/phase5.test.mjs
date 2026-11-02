import test from 'node:test';
import assert from 'node:assert/strict';
import { csvEscape, csvColumns, toCsv, compactionPlan, mergeHistory } from '../src/public/portal-utils.js';

test('csvEscape quotes commas, quotes and line breaks and serialises objects', () => {
  assert.equal(csvEscape('plain'), 'plain');
  assert.equal(csvEscape('a,b'), '"a,b"');
  assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
  assert.equal(csvEscape('two\nlines'), '"two\nlines"');
  assert.equal(csvEscape(null), '');
  assert.equal(csvEscape(undefined), '');
  assert.equal(csvEscape(12), '12');
  assert.equal(csvEscape(true), 'true');
  assert.equal(csvEscape({ a: 1 }), '"{""a"":1}"');
  assert.equal(csvEscape(new Date('2026-11-02T10:00:00Z')), '2026-11-02T10:00:00.000Z');
});

test('csvColumns puts the system fields first then the rest alphabetically', () => {
  const cols = csvColumns([{ zed: 1, _id: 'a', _createdDate: 'x' }, { alpha: 2, _id: 'b' }]);
  assert.deepEqual(cols, ['_id', '_createdDate', 'alpha', 'zed']);
});

test('toCsv writes a header and CRLF rows with every column', () => {
  const csv = toCsv([{ _id: 'a', name: 'Jamie, J', note: '' }, { _id: 'b', name: 'Sam' }]);
  assert.equal(csv, '_id,name,note\r\na,"Jamie, J",\r\nb,Sam,\r\n');
  assert.equal(toCsv([]), '\r\n');
});

const lessons = [
  { _id: 'l1', pupilId: 'p1', date: '2026-01-10', status: 'completed', durationMins: 120 },
  { _id: 'l2', pupilId: 'p1', date: '2026-02-10', status: 'cancelled', durationMins: 60 },
  { _id: 'l3', pupilId: 'p1', date: '2025-12-30', status: 'no-show', durationMins: 90 },
  { _id: 'l4', pupilId: 'p2', date: '2026-01-05', status: 'completed', durationMins: 60 },
  { _id: 'l5', pupilId: 'p1', date: '2026-06-01', status: 'completed', durationMins: 60 },
  { _id: 'l6', pupilId: 'p1', date: '2026-03-01', status: 'planned', durationMins: 60 }
];

test('compactionPlan totals old, non-planned lessons per pupil and year', () => {
  const plan = compactionPlan(lessons, '2026-05-01');
  assert.deepEqual(plan.lessonIds.sort(), ['l1', 'l2', 'l3', 'l4']);
  assert.deepEqual(plan.totals.p1['2026'], { count: 2, hours: 3, completed: 1, cancelled: 1, noShow: 0 });
  assert.deepEqual(plan.totals.p1['2025'], { count: 1, hours: 1.5, completed: 0, cancelled: 0, noShow: 1 });
  assert.deepEqual(plan.totals.p2['2026'], { count: 1, hours: 1, completed: 1, cancelled: 0, noShow: 0 });
});

test('compactionPlan leaves recent and planned lessons alone', () => {
  const plan = compactionPlan(lessons, '2025-01-01');
  assert.deepEqual(plan.lessonIds, []);
  assert.deepEqual(plan.totals, {});
});

test('mergeHistory adds to existing yearly totals and tolerates bad input', () => {
  const merged = mergeHistory({ 2026: { count: 1, hours: 2, completed: 1, cancelled: 0, noShow: 0 } }, { 2026: { count: 2, hours: 3, completed: 1, cancelled: 1, noShow: 0 }, 2025: { count: 1, hours: 1.5, completed: 0, cancelled: 0, noShow: 1 } });
  assert.deepEqual(merged['2026'], { count: 3, hours: 5, completed: 2, cancelled: 1, noShow: 0 });
  assert.deepEqual(merged['2025'], { count: 1, hours: 1.5, completed: 0, cancelled: 0, noShow: 1 });
  assert.deepEqual(mergeHistory('junk', {}), {});
});
