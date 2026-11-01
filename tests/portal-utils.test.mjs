import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTaughtPostcode,
  isValidPostcode,
  outwardCode,
  toE164,
  parseSlot,
  dateWords,
  londonDate,
  addDays,
  ageOn,
  fillTemplate,
  poundsWords,
  isValidEmail
} from '../src/public/portal-utils.js';

test('postcode check uses the outward code, so SE1 does not match SE15', () => {
  assert.equal(isTaughtPostcode('SE1 4AB'), true);
  assert.equal(isTaughtPostcode('se15 4ab'), true);
  assert.equal(isTaughtPostcode('SE15'), true);
  assert.equal(isTaughtPostcode('SE17 1AA'), false);
  assert.equal(isTaughtPostcode('SE2 9XX'), false);
  assert.equal(isTaughtPostcode(''), false);
  assert.equal(outwardCode('SE104AB'), 'SE10');
});

test('postcode validation accepts full and outward-only forms', () => {
  assert.equal(isValidPostcode('SE16 7AA'), true);
  assert.equal(isValidPostcode('SE16'), true);
  assert.equal(isValidPostcode('SW1A 1AA'), true);
  assert.equal(isValidPostcode('nonsense'), false);
});

test('phones normalise to E.164', () => {
  assert.equal(toE164('07700 900123'), '+447700900123');
  assert.equal(toE164('+44 7700 900123'), '+447700900123');
  assert.equal(toE164('0044 7700900123'), '+447700900123');
  assert.equal(toE164('020 7946 0000'), null);
});

test('fixed slots resolve to their times and custom slots are validated', () => {
  assert.deepEqual(parseSlot('early-morning'), {
    slot: 'early-morning',
    startTime: '07:30',
    durationMins: 120,
    label: 'Early morning, 07:30–09:30'
  });
  assert.equal(parseSlot('late-afternoon').durationMins, 120);
  assert.deepEqual(parseSlot('custom', '09:00', 90), {
    slot: 'custom',
    startTime: '09:00',
    durationMins: 90,
    label: '09:00–10:30'
  });
  assert.equal(parseSlot('custom', '9am', 90), null);
  assert.equal(parseSlot('custom', '09:00', 10), null);
  assert.equal(parseSlot('lunchtime'), null);
});

test('dates read in words in London time', () => {
  assert.equal(dateWords('2026-11-04'), 'Wednesday 4 November');
  assert.equal(dateWords('2026-07-01'), 'Wednesday 1 July');
  assert.equal(dateWords(''), '');
});

test('London calendar date and day arithmetic', () => {
  // 23:30 UTC on 30 June is 00:30 BST on 1 July.
  assert.equal(londonDate(new Date('2026-06-30T23:30:00Z')), '2026-07-01');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('age on a date counts whole years', () => {
  assert.equal(ageOn('2008-11-05', '2026-11-04'), 17);
  assert.equal(ageOn('2008-11-05', '2026-11-05'), 18);
  assert.equal(ageOn('', '2026-11-05'), null);
});

test('templates fill named variables and leave unknown ones visible', () => {
  const out = fillTemplate('Hi {firstName}, {slotTime}. {missing}', { firstName: 'Jamie', slotTime: '07:30' });
  assert.equal(out, 'Hi Jamie, 07:30. {missing}');
});

test('money formats from pence', () => {
  assert.equal(poundsWords(3200), '£32.00');
  assert.equal(poundsWords(-50), '-£0.50');
});

test('email validation', () => {
  assert.equal(isValidEmail('jamie@example.co.uk'), true);
  assert.equal(isValidEmail('not an email'), false);
});
