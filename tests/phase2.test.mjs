import test from 'node:test';
import assert from 'node:assert/strict';
import {
  weekRanges,
  lessonsOverlap,
  lessonTimeLabel,
  validateLesson,
  groupLessonsByDay,
  visibleSkills,
  progressSummary,
  validateSkill
} from '../src/public/portal-utils.js';
import { SKILLS } from '../src/public/portal-constants.js';

test('weekRanges runs Monday to Sunday for this week and next', () => {
  // Monday 2 November 2026
  const monday = weekRanges('2026-11-02');
  assert.deepEqual(monday.thisWeek, { from: '2026-11-02', to: '2026-11-08' });
  assert.deepEqual(monday.nextWeek, { from: '2026-11-09', to: '2026-11-15' });
  // Sunday 8 November still belongs to the week that started on the 2nd
  assert.deepEqual(weekRanges('2026-11-08').thisWeek, { from: '2026-11-02', to: '2026-11-08' });
});

test('weekRanges crosses a year boundary and the clocks going back', () => {
  assert.deepEqual(weekRanges('2026-12-31').nextWeek, { from: '2027-01-04', to: '2027-01-10' });
  // Clocks went back on 25 October 2026; the week stays seven days
  assert.deepEqual(weekRanges('2026-10-24').thisWeek, { from: '2026-10-19', to: '2026-10-25' });
});

test('lessonsOverlap only clashes on the same day with shared minutes', () => {
  const early = { date: '2026-11-04', startTime: '07:30', durationMins: 120 };
  const late = { date: '2026-11-04', startTime: '10:00', durationMins: 120 };
  const custom = { date: '2026-11-04', startTime: '09:00', durationMins: 90 };
  assert.equal(lessonsOverlap(early, late), false, 'back to back is fine');
  assert.equal(lessonsOverlap(early, custom), true);
  assert.equal(lessonsOverlap(late, custom), true);
  assert.equal(lessonsOverlap(early, Object.assign({}, early, { date: '2026-11-05' })), false);
});

test('lessonTimeLabel names the slot or shows the custom range', () => {
  assert.equal(lessonTimeLabel({ slot: 'early-morning', startTime: '07:30', durationMins: 120 }), 'Early morning, 07:30–09:30');
  assert.equal(lessonTimeLabel({ slot: 'custom', startTime: '11:15', durationMins: 90 }), '11:15–12:45');
});

test('validateLesson accepts a slot lesson and fills the times', () => {
  const result = validateLesson({ pupilId: 'p1', date: '2026-11-04', slot: 'late-morning', pickupLocation: ' Home ', status: 'planned', pupilSummary: '', instructorNotes: '' });
  assert.equal(result.ok, true);
  assert.equal(result.data.startTime, '10:00');
  assert.equal(result.data.durationMins, 120);
  assert.equal(result.data.pickupLocation, 'Home');
  assert.equal(result.data.status, 'planned');
});

test('validateLesson accepts a custom time and refuses a bad one', () => {
  const good = validateLesson({ pupilId: 'p1', date: '2026-11-04', slot: 'custom', startTime: '11:15', durationMins: '90', pickupLocation: 'Peckham Rye station' });
  assert.equal(good.ok, true);
  assert.equal(good.data.slot, 'custom');
  assert.equal(good.data.durationMins, 90);
  const bad = validateLesson({ pupilId: 'p1', date: '2026-11-04', slot: 'custom', startTime: '25:00', durationMins: '90', pickupLocation: 'Home' });
  assert.equal(bad.ok, false);
  assert.match(bad.errors.slot, /start time/);
});

test('validateLesson names every missing field', () => {
  const result = validateLesson({});
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['date', 'pickupLocation', 'pupilId', 'slot']);
  assert.equal(validateLesson({ pupilId: 'p1', date: '2026-11-04', slot: 'late-morning', pickupLocation: 'Home', status: 'nonsense' }).data.status, 'planned');
});

test('groupLessonsByDay orders days and times', () => {
  const grouped = groupLessonsByDay([
    { _id: 'b', date: '2026-11-05', startTime: '10:00' },
    { _id: 'a', date: '2026-11-04', startTime: '15:15' },
    { _id: 'c', date: '2026-11-04', startTime: '07:30' }
  ]);
  assert.deepEqual(grouped.map((g) => g.date), ['2026-11-04', '2026-11-05']);
  assert.deepEqual(grouped[0].lessons.map((l) => l._id), ['c', 'a']);
});

test('visibleSkills hides clutch control for automatic pupils', () => {
  assert.equal(visibleSkills('manual').length, SKILLS.length);
  assert.equal(visibleSkills('automatic').length, SKILLS.length - 1);
  assert.equal(visibleSkills('automatic').some((s) => s.key === 'clutch-control'), false);
});

test('progressSummary counts level 4 and above among visible skills', () => {
  const skills = { 'cockpit-drill': { level: 5 }, 'junctions': { level: 3 }, 'clutch-control': { level: 4 } };
  assert.equal(progressSummary(skills, 'manual').words, '2 of 21 skills at level 4 or above');
  assert.equal(progressSummary(skills, 'automatic').words, '1 of 20 skills at level 4 or above');
  assert.equal(progressSummary({}, 'manual').words, '');
  assert.equal(progressSummary(null, 'manual').set, 0);
});

test('validateSkill refuses hidden skills and bad levels', () => {
  assert.equal(validateSkill('roundabouts', 3, ' Look earlier ', 'manual').ok, true);
  assert.equal(validateSkill('roundabouts', 3, ' Look earlier ', 'manual').data.note, 'Look earlier');
  assert.equal(validateSkill('clutch-control', 3, '', 'automatic').ok, false);
  assert.equal(validateSkill('roundabouts', 6, '', 'manual').ok, false);
  assert.equal(validateSkill('roundabouts', 0, '', 'manual').ok, false);
});
