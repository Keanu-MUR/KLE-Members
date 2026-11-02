// Lesson reminders: who gets what for a given date, the sends themselves,
// and the per-channel status read back from SendLog. Used by the scheduled
// job (no caller identity) and by the instructor's web module (Resend and
// the manual test), so nothing here reads the current member.

import wixData from 'wix-data';
import { loadSettings } from 'backend/settings';
import { queryLessons, shapeLesson, pupilNames, fullName } from 'backend/lesson-store';
import { sendEmail, sendWhatsApp } from 'backend/messaging';
import { reminderDecision, reminderVars, reminderText, waMeLink, londonDate, addDays } from 'public/portal-utils';
import { LESSON_STATUS, CHANNEL, SEND_STATUS, EMAIL_PROVIDER, TEMPLATES } from 'public/portal-constants';

// The probe job writes rows with this lessonId; the latest one says whether
// Wix triggered emails work with no caller identity.
export const PROBE_LESSON_ID = 'probe:job-email';

async function pupilsById(ids) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = {};
  if (!unique.length) return map;
  const result = await wixData.query('Pupils').hasSome('_id', unique).limit(200).find({ suppressAuth: true });
  result.items.forEach((p) => { map[p._id] = p; });
  return map;
}

// SendLog rows for a set of lessons created since `sinceIso`.
async function sendRowsFor(lessonIds, sinceIso) {
  if (!lessonIds.length) return [];
  const result = await wixData.query('SendLog')
    .hasSome('lessonId', lessonIds)
    .ge('createdAt', sinceIso)
    .descending('createdAt')
    .limit(500)
    .find({ suppressAuth: true });
  return result.items;
}

// { email: { status, at, error }, whatsapp: {...} } for one lesson from
// its rows (newest first); 'sent' wins over later skips so a resend after a
// failure reads as sent.
export function channelStatus(rows) {
  const out = { email: null, whatsapp: null };
  rows.forEach((row) => {
    const key = row.channel === CHANNEL.WHATSAPP ? 'whatsapp' : 'email';
    const entry = { status: row.status, at: row.createdAt || '', error: row.error || '' };
    if (!out[key] || (out[key].status !== SEND_STATUS.SENT && row.status === SEND_STATUS.SENT)) out[key] = entry;
  });
  return out;
}

// The latest probe row decides the email provider for the job.
export async function jobEmailProvider(settings) {
  if (settings.emailProvider === EMAIL_PROVIDER.RESEND) return EMAIL_PROVIDER.RESEND;
  const result = await wixData.query('SendLog').eq('lessonId', PROBE_LESSON_ID).descending('createdAt').limit(1).find({ suppressAuth: true });
  const probe = result.items[0];
  if (probe && probe.status === SEND_STATUS.FAILED) return EMAIL_PROVIDER.RESEND;
  return EMAIL_PROVIDER.WIX;
}

// Sends the reminder for one lesson on the given channels, to the pupil's
// own details unless `override` gives an email or phone (the manual test).
// Returns { email, whatsapp, guardian } result objects.
export async function sendLessonReminder(lesson, pupil, settings, channels, override, provider) {
  const vars = reminderVars(lesson, pupil);
  const context = { pupilId: pupil._id, lessonId: lesson._id };
  const out = {};
  const want = channels || { email: true, whatsapp: true, guardian: true };
  const useProvider = provider || (await jobEmailProvider(settings));

  if (want.email) {
    const to = override && override.email
      ? { email: override.email, firstName: pupil.firstName, lastName: pupil.lastName }
      : pupil.memberId && useProvider === EMAIL_PROVIDER.WIX
        ? { memberId: pupil.memberId, email: pupil.email }
        : { email: pupil.email, firstName: pupil.firstName, lastName: pupil.lastName, phone: pupil.phone };
    out.email = await sendEmail('lessonReminder', to, vars, context, { provider: useProvider });
  }
  if (want.guardian && !override) {
    out.guardian = await sendEmail('lessonReminder', { email: pupil.guardianEmail, firstName: pupil.guardianName || 'Guardian', lastName: '' }, vars, context, { provider: useProvider });
  }
  if (want.whatsapp) {
    const phone = override && override.phone ? override.phone : pupil.phone;
    out.whatsapp = await sendWhatsApp(TEMPLATES.whatsAppTemplateNames.lessonReminder, phone, vars, context);
  }
  return out;
}

// The run for one date (normally tomorrow): decides per lesson and channel,
// sends, and returns a summary. Idempotent through the SendLog rows written
// since the start of today.
export async function remindersFor(dateIso) {
  const { settings } = await loadSettings();
  const lessons = await queryLessons({ from: dateIso, to: dateIso, status: LESSON_STATUS.PLANNED, limit: 100 });
  const pupils = await pupilsById(lessons.map((l) => l.pupilId));
  const todayStart = londonDate() + 'T00:00:00.000Z';
  const rows = await sendRowsFor(lessons.map((l) => l._id), todayStart);
  const provider = await jobEmailProvider(settings);
  const summary = { date: dateIso, lessons: lessons.length, provider, sent: 0, failed: 0, skipped: 0, details: [] };

  for (const lesson of lessons) {
    const pupil = pupils[lesson.pupilId];
    if (!pupil) continue;
    const mine = rows.filter((r) => r.lessonId === lesson._id);
    const already = {
      email: mine.some((r) => r.channel === CHANNEL.EMAIL && r.status === SEND_STATUS.SENT),
      whatsapp: mine.some((r) => r.channel === CHANNEL.WHATSAPP && r.status === SEND_STATUS.SENT)
    };
    const decision = reminderDecision(settings, pupil, lesson, already);
    const context = { pupilId: pupil._id, lessonId: lesson._id };
    // Skips are logged too, so the Tomorrow's reminders page can say why.
    for (const channel of ['email', 'whatsapp']) {
      if (decision[channel] === 'skip' && decision.reasons[channel] !== 'Already sent today') {
        await writeSkip(context, channel, decision.reasons[channel]);
        summary.skipped += 1;
      }
    }
    const results = await sendLessonReminder(lesson, pupil, settings, {
      email: decision.email === 'send',
      whatsapp: decision.whatsapp === 'send',
      guardian: decision.guardianEmail === 'send'
    }, null, provider);
    Object.keys(results).forEach((key) => {
      const r = results[key];
      if (!r) return;
      if (r.ok) summary.sent += 1;
      else if (r.skipped) summary.skipped += 1;
      else summary.failed += 1;
    });
    summary.details.push({ lessonId: lesson._id, pupil: fullName(pupil), decision });
  }
  return summary;
}

async function writeSkip(context, channel, reason) {
  await wixData.insert('SendLog', {
    pupilId: context.pupilId,
    lessonId: context.lessonId,
    channel: channel === 'whatsapp' ? CHANNEL.WHATSAPP : CHANNEL.EMAIL,
    status: SEND_STATUS.SKIPPED,
    providerMessageId: '',
    error: reason,
    createdAt: new Date().toISOString()
  }, { suppressAuth: true });
}

// Tomorrow's lessons with pupil, per-channel status and the wa.me link.
export async function tomorrowOverview() {
  const today = londonDate();
  const tomorrow = addDays(today, 1);
  const lessons = await queryLessons({ from: tomorrow, to: tomorrow, status: LESSON_STATUS.PLANNED, limit: 100 });
  const pupils = await pupilsById(lessons.map((l) => l.pupilId));
  const rows = await sendRowsFor(lessons.map((l) => l._id), today + 'T00:00:00.000Z');
  const { settings } = await loadSettings();
  return {
    today,
    tomorrow,
    settings: { emailRemindersOn: Boolean(settings.emailRemindersOn), whatsAppRemindersOn: Boolean(settings.whatsAppRemindersOn), reminderSendHour: settings.reminderSendHour },
    items: lessons.map((lesson) => {
      const pupil = pupils[lesson.pupilId] || {};
      const text = reminderText(lesson, pupil);
      const decision = reminderDecision(settings, pupil, lesson, {});
      return Object.assign(shapeLesson(lesson), {
        pupilName: fullName(pupil) || 'Unknown pupil',
        pupilPhone: pupil.phone || '',
        status: channelStatus(rows.filter((r) => r.lessonId === lesson._id)),
        wouldSend: { email: decision.email, whatsapp: decision.whatsapp, reasons: decision.reasons },
        waMe: waMeLink(pupil.phone, text),
        text
      });
    })
  };
}

// Yesterday's and today's counts for the dashboard.
export async function recentCounts() {
  const today = londonDate();
  const yesterday = addDays(today, -1);
  const result = await wixData.query('SendLog')
    .ge('createdAt', yesterday + 'T00:00:00.000Z')
    .ne('lessonId', PROBE_LESSON_ID)
    .limit(1000)
    .find({ suppressAuth: true });
  const byDay = { today: [], yesterday: [] };
  result.items.forEach((row) => {
    const day = String(row.createdAt || '').slice(0, 10);
    if (day === today) byDay.today.push(row);
    else if (day === yesterday) byDay.yesterday.push(row);
  });
  return byDay;
}

export { pupilNames };
