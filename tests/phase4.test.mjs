import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lessonStartHour,
  reminderDecision,
  reminderVars,
  reminderText,
  waMeLink,
  pruneCutoff,
  validateSettings,
  sendCounts
} from '../src/public/portal-utils.js';

const settingsOn = { emailRemindersOn: true, whatsAppRemindersOn: true };
const pupil = {
  firstName: 'Jamie', email: 'jamie@example.com', phone: '+447700900123', transmission: 'manual',
  reminderEmail: true, reminderWhatsApp: true, whatsAppConsentAt: '2026-11-01T10:00:00Z',
  dateOfBirth: '2009-11-20', guardianEmail: 'pat@example.com'
};
const lesson = { date: '2026-11-03', slot: 'late-morning', startTime: '10:00', durationMins: 120, pickupLocation: '12 Rye Lane' };

test('reminderDecision sends both channels and the guardian for an under-18', () => {
  const d = reminderDecision(settingsOn, pupil, lesson, {});
  assert.equal(d.email, 'send');
  assert.equal(d.whatsapp, 'send');
  assert.equal(d.guardianEmail, 'send', 'turns 18 on 20 November, so still 17 on the lesson date');
});

test('reminderDecision skips with a reason for each rule', () => {
  assert.equal(reminderDecision({ emailRemindersOn: false, whatsAppRemindersOn: true }, pupil, lesson, {}).reasons.email, 'Email reminders are switched off');
  assert.equal(reminderDecision(settingsOn, Object.assign({}, pupil, { reminderWhatsApp: false }), lesson, {}).reasons.whatsapp, 'Pupil has turned WhatsApp reminders off');
  assert.equal(reminderDecision(settingsOn, Object.assign({}, pupil, { whatsAppConsentAt: '' }), lesson, {}).reasons.whatsapp, 'No WhatsApp consent recorded');
  assert.equal(reminderDecision(settingsOn, Object.assign({}, pupil, { phone: '' }), lesson, {}).reasons.whatsapp, 'No phone number on the record');
  assert.equal(reminderDecision(settingsOn, pupil, lesson, { email: true }).reasons.email, 'Already sent today');
  assert.equal(reminderDecision(settingsOn, Object.assign({}, pupil, { dateOfBirth: '2000-01-01' }), lesson, {}).guardianEmail, 'skip', 'adults do not copy the guardian');
  assert.equal(reminderDecision({ emailRemindersOn: false }, pupil, lesson, {}).guardianEmail, 'skip', 'no email, no guardian copy');
});

test('reminderVars and reminderText fill the agreed wording', () => {
  const vars = reminderVars(lesson, pupil);
  assert.equal(vars.dateWords, 'Tuesday 3 November');
  assert.equal(vars.slotTime, '10:00–12:00');
  assert.equal(reminderText(lesson, pupil), 'Hi Jamie, your manual lesson is tomorrow, Tuesday 3 November, 10:00–12:00. Pick-up: 12 Rye Lane. Reply if anything has changed.');
});

test('waMeLink strips the plus and encodes the text', () => {
  assert.equal(waMeLink('+44 7700 900123', 'Hi Jamie, see you at 10:00'), 'https://wa.me/447700900123?text=Hi%20Jamie%2C%20see%20you%20at%2010%3A00');
  assert.equal(waMeLink('', 'x'), '');
});

test('pruneCutoff is the given number of days back, with a floor of a week', () => {
  const now = new Date('2026-11-02T12:00:00Z');
  assert.equal(pruneCutoff(now, 30), '2026-10-03T12:00:00.000Z');
  assert.equal(pruneCutoff(now, 2), '2026-10-03T12:00:00.000Z', 'under seven days falls back to the default');
});

test('validateSettings cleans a full form and names bad values', () => {
  const good = validateSettings({ emailRemindersOn: true, whatsAppRemindersOn: false, enquiryAlertEmailOn: true, enquiryAlertWhatsAppOn: false, emailProvider: 'wix', instructorEmail: 'Kle@Example.com', instructorWhatsApp: '07954 327660', reminderSendHour: '8', defaultHourlyRatePence: 4100, lessonRetentionDays: 120, sendLogRetentionDays: 30, paymentRetentionDays: 400 });
  assert.equal(good.ok, true);
  assert.equal(good.data.instructorEmail, 'kle@example.com');
  assert.equal(good.data.instructorWhatsApp, '+447954327660');
  assert.equal(good.data.reminderSendHour, 8);
  const bad = validateSettings({ emailProvider: 'gmail', instructorEmail: 'nope', instructorWhatsApp: '12', reminderSendHour: 25, sendLogRetentionDays: 3 });
  assert.deepEqual(Object.keys(bad.errors).sort(), ['emailProvider', 'instructorEmail', 'instructorWhatsApp', 'reminderSendHour', 'sendLogRetentionDays']);
  assert.equal(validateSettings({ instructorWhatsApp: '' }).data.instructorWhatsApp, '', 'an empty number clears it');
});

test('sendCounts tallies per channel and status', () => {
  const counts = sendCounts([
    { channel: 'email', status: 'sent' }, { channel: 'email', status: 'sent' }, { channel: 'email', status: 'failed' },
    { channel: 'whatsapp', status: 'skipped' }
  ]);
  assert.deepEqual(counts.email, { sent: 2, failed: 1, skipped: 0 });
  assert.deepEqual(counts.whatsapp, { sent: 0, failed: 0, skipped: 1 });
});

test('lessonStartHour reads the slot or the custom time', () => {
  assert.equal(lessonStartHour({ slot: 'late-morning' }), 10);
  assert.equal(lessonStartHour({ slot: 'early-afternoon' }), 12);
  assert.equal(lessonStartHour({ slot: 'custom', startTime: '18:45', durationMins: 60 }), 18);
  assert.equal(lessonStartHour({ slot: 'custom', startTime: '', durationMins: 60 }), null);
  assert.equal(lessonStartHour({}), null);
});
