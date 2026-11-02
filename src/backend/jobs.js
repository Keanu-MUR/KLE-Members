// Scheduled jobs (see jobs.config). The platform calls these with no member
// identity, so nothing here reads the current member; every send still
// writes its SendLog row through backend/messaging.js.

import wixData from 'wix-data';
import { loadSettings } from 'backend/settings';
import { remindersFor, PROBE_LESSON_ID } from 'backend/reminder-core';
import { sendEmail } from 'backend/messaging';
import { lookupMemberByEmail } from 'backend/pupil-store';
import { londonDate, londonHour, addDays, pruneCutoff } from 'public/portal-utils';
import { EMAIL_PROVIDER } from 'public/portal-constants';

// Hourly. Acts only in the hour Settings.reminderSendHour names (London
// time) and sends tomorrow's reminders. Safe to re-run: sent rows for the
// day stop a second send.
export async function sendReminders() {
  const { settings } = await loadSettings();
  const hour = Number(settings.reminderSendHour);
  if (londonHour() !== hour) return { ran: false, reason: 'Not the send hour' };
  const tomorrow = addDays(londonDate(), 1);
  try {
    const summary = await remindersFor(tomorrow);
    console.log('[portal] reminders', JSON.stringify(summary));
    return summary;
  } catch (error) {
    console.error('[portal] sendReminders failed', error && error.message ? error.message : error);
    return { ran: true, error: error && error.message ? error.message : String(error) };
  }
}

// Daily. Deletes SendLog and RateLimit rows older than the retention window
// in Settings, in batches, so the site stays under the item limit.
export async function pruneLogs() {
  const { settings } = await loadSettings();
  const cutoff = pruneCutoff(new Date(), settings.sendLogRetentionDays);
  const removed = { SendLog: 0, RateLimit: 0 };
  for (const collection of ['SendLog', 'RateLimit']) {
    const field = collection === 'SendLog' ? 'createdAt' : 'windowStart';
    for (let round = 0; round < 10; round += 1) {
      const result = await wixData.query(collection).lt(field, cutoff).limit(100).find({ suppressAuth: true });
      if (!result.items.length) break;
      await wixData.bulkRemove(collection, result.items.map((item) => item._id), { suppressAuth: true });
      removed[collection] += result.items.length;
      if (result.items.length < 100) break;
    }
  }
  console.log('[portal] pruned', JSON.stringify(removed));
  return removed;
}

// Temporary, hourly: one Wix triggered email to the instructor's member
// account from the job context. Its SendLog row (lessonId probe:job-email)
// tells reminder-core which email provider the job can use. Remove from
// jobs.config once the answer is recorded in PLAN-phase4.md.
export async function probeJobEmail() {
  const { settings } = await loadSettings();
  const member = await lookupMemberByEmail(settings.instructorEmail);
  const to = member ? { memberId: member.memberId, email: settings.instructorEmail } : { email: settings.instructorEmail, firstName: 'Instructor', lastName: '' };
  return sendEmail('enquiryAlert', to, {
    name: 'Probe',
    summary: 'This is the reminder job checking it can send Wix emails. Sent at ' + new Date().toISOString() + '.',
    link: 'https://www.kledrivingschool.co.uk/settings'
  }, { pupilId: '', lessonId: PROBE_LESSON_ID }, { provider: EMAIL_PROVIDER.WIX });
}
