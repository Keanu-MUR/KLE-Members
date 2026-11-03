import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEnquiry,
  hashKey,
  rateLimitDecision,
  pickMyDetails,
  isValidIsoDate
} from '../src/public/portal-utils.js';

const good = {
  name: 'Jamie Okafor',
  email: 'Jamie@Example.com',
  phone: '07700 900123',
  addressLine1: '12 Rye Lane',
  postcode: 'se15 4ab',
  transmission: 'manual',
  preferredContact: 'whatsapp',
  message: 'Looking to start in January.',
  website: ''
};

test('a complete enquiry is cleaned and split into names', () => {
  const result = validateEnquiry(good, '2026-11-02');
  assert.equal(result.ok, true);
  assert.equal(result.bot, false);
  assert.equal(result.data.firstName, 'Jamie');
  assert.equal(result.data.lastName, 'Okafor');
  assert.equal(result.data.email, 'jamie@example.com');
  assert.equal(result.data.phone, '+447700900123');
  assert.equal(result.data.postcode, 'SE15 4AB');
  assert.equal(result.data.outsideArea, false);
});

test('each bad field gets its own plain-English error', () => {
  const result = validateEnquiry(
    Object.assign({}, good, {
      name: 'J',
      email: 'nope',
      phone: '12',
      addressLine1: '',
      postcode: 'ZZZ',
      transmission: 'tractor',
      preferredContact: 'pigeon'
    }),
    '2026-11-02'
  );
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), [
    'addressLine1',
    'email',
    'name',
    'phone',
    'postcode',
    'preferredContact',
    'transmission'
  ]);
});

test('a postcode outside the area is allowed but flagged', () => {
  const result = validateEnquiry(Object.assign({}, good, { postcode: 'SE17 1AA' }), '2026-11-02');
  assert.equal(result.ok, true);
  assert.equal(result.data.outsideArea, true);
});

test('date of birth is no longer collected', () => {
  const result = validateEnquiry(Object.assign({}, good, { dateOfBirth: '2008-05-14' }), '2026-11-02');
  assert.equal(result.ok, true);
  assert.equal('dateOfBirth' in result.data, false);
});

test('a filled honeypot is reported as a bot and stores nothing', () => {
  const result = validateEnquiry(Object.assign({}, good, { website: 'http://spam' }), '2026-11-02');
  assert.equal(result.ok, true);
  assert.equal(result.bot, true);
  assert.equal(result.data, null);
});

test('iso dates must be real', () => {
  assert.equal(isValidIsoDate('2026-02-29'), false);
  assert.equal(isValidIsoDate('2024-02-29'), true);
  assert.equal(isValidIsoDate('14/05/2008'), false);
});

test('hashKey is stable and never exposes the input', () => {
  assert.equal(hashKey('203.0.113.9|salt'), hashKey('203.0.113.9|salt'));
  assert.notEqual(hashKey('203.0.113.9|salt'), hashKey('203.0.113.10|salt'));
  assert.match(hashKey('anything'), /^[0-9a-f]{8}$/);
});

test('rate limit allows five an hour and ignores old windows', () => {
  const now = new Date('2026-11-02T13:00:00Z');
  const rows = [
    { windowStart: '2026-11-02T12:30:00Z', count: 3 },
    { windowStart: '2026-11-02T11:30:00Z', count: 9 }
  ];
  assert.deepEqual(rateLimitDecision(rows, now), { allowed: true, count: 3, limit: 5 });
  rows.push({ windowStart: '2026-11-02T12:50:00Z', count: 2 });
  assert.deepEqual(rateLimitDecision(rows, now), { allowed: false, count: 5, limit: 5 });
  assert.equal(rateLimitDecision([], now).allowed, true);
});

test('my details keeps only the whitelist and validates it', () => {
  const result = pickMyDetails({
    email: 'New@Example.com',
    phone: '07700 900999',
    postcode: 'se4 1aa',
    reminderWhatsApp: 'yes',
    reminderEmail: 0,
    hourlyRatePence: 1,
    instructorNotes: 'sneaky',
    status: 'passed'
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, {
    email: 'new@example.com',
    phone: '+447700900999',
    postcode: 'SE4 1AA',
    reminderWhatsApp: true,
    reminderEmail: false
  });
});

test('my details rejects bad values field by field', () => {
  const result = pickMyDetails({ email: 'bad', emergencyContactPhone: 'abc', postcode: 'nope' });
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['email', 'emergencyContactPhone', 'postcode']);
});
