import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SKILLS,
  LEVELS,
  SLOTS,
  TAUGHT_POSTCODES,
  COLLECTIONS,
  TEMPLATES,
  SETTINGS_DEFAULTS
} from '../src/public/portal-constants.js';
import { minutesBetween } from '../src/public/portal-utils.js';

test('the skills list matches SPEC.md: 21 skills, unique keys, one manual-only', () => {
  assert.equal(SKILLS.length, 21);
  assert.equal(new Set(SKILLS.map((s) => s.key)).size, 21);
  assert.deepEqual(SKILLS.filter((s) => s.manualOnly).map((s) => s.key), ['clutch-control']);
  assert.equal(SKILLS[0].name, 'Cockpit drill and safety checks');
  assert.equal(SKILLS[20].name, 'Eco-safe driving');
});

test('five levels in DVSA order', () => {
  assert.deepEqual(LEVELS.map((l) => l.level), [1, 2, 3, 4, 5]);
  assert.equal(LEVELS[2].name, 'Prompted');
});

test('four fixed two-hour slots', () => {
  assert.equal(SLOTS.length, 4);
  for (const slot of SLOTS) assert.equal(minutesBetween(slot.start, slot.end), 120);
});

test('seven taught postcodes and ten collections', () => {
  assert.equal(TAUGHT_POSTCODES.length, 7);
  assert.equal(COLLECTIONS.length, 10);
  assert.ok(COLLECTIONS.includes('RateLimit'));
});

test('templates carry no emoji or exclamation marks', () => {
  for (const key of ['lessonReminder', 'newEnquiry', 'enquiryConfirmation']) {
    const text = TEMPLATES[key];
    assert.equal(/!/.test(text), false, key + ' has an exclamation mark');
    assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text), false, key + ' has an emoji');
  }
});

test('settings defaults include the adjustable retention windows', () => {
  assert.equal(SETTINGS_DEFAULTS.lessonRetentionDays, 120);
  assert.equal(SETTINGS_DEFAULTS.sendLogRetentionDays, 30);
  assert.equal(SETTINGS_DEFAULTS.paymentRetentionDays, 400);
  assert.equal(SETTINGS_DEFAULTS.defaultHourlyRatePence, 4100);
});
