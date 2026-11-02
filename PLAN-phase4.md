# Phase 4 plan — reminders, settings and the send log

Status: approved 2 Nov 2026 with decisions A to E as recommended; WhatsApp not started on the Meta side, Resend path prepared.

Outcome (from SPEC.md): email and WhatsApp reminders go out automatically with working toggles and a send log. WhatsApp is built dormant (Meta onboarding not started, 2 Nov 2026): every WhatsApp send logs a skipped row with the reason until the secrets exist, and the wa.me fallback works from day one.

## Context

Phases 0 to 3 are live. Same patterns: `.jsw` web modules with `export async function`s and `permissions.json` entries, backend imports in page code passed into `public/portal-pages/*.js`, one element per page on `PortalElement`, browser-only routing, Editor pages duplicated from an existing portal page. Deploy: push, wait for the Editor pull, publish from the Editor's own button, verify live. The Editor is touched only when you say it is free.

No data-model change. `SendLog` already has pupilId, lessonId, channel, status, providerMessageId, error, createdAt. Settings already holds every toggle the page needs; `defaultHourlyRatePence` stays but nothing calculates from it.

**The risk to settle first.** Wix's docs say a scheduled job runs with no member identity. That is the situation that made Wix triggered emails answer FORBIDDEN from the HTTP function in Phase 1. So step one is a probe: a job that fires hourly and tries one triggered email to the instructor's member account, logging the result to SendLog. If it works, Wix emails carry the reminders. If it fails, the reminder job uses Resend (plain `fetch`, no identity needed) and the Wix provider stays for sends made from a logged-in page. Either way the Resend provider is built now, behind `Settings.emailProvider`.

## 1. Backend

| File | What | Who |
|---|---|---|
| `backend/messaging.js` | `sendEmail` gains the Resend provider (`POST https://api.resend.com/emails`, key from `wix-secrets-backend` `RESEND_API_KEY`, from `KLE Driving School <reminders@kledrivingschool.co.uk>`, HTML built from a small plain template per key), chosen by `Settings.emailProvider`, or forced per call by the job when the Wix path is known not to work. `sendWhatsApp` calls the Meta Cloud API (`POST https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages`, template message, language en_GB) with the token from secrets; a missing secret logs a skipped row with the reason, never throws. Both keep the 10-second timeout and the SendLog row per attempt. | internal |
| `backend/reminders.js` | Pure-ish core: `remindersFor(dateIso, settings)` loads planned lessons for the date with their pupils, decides per channel with `reminderDecision()` from portal-utils (master switch, pupil preference, consent, phone present, not already sent today for this lesson and channel), sends, logs, and returns a summary. `sendLessonReminder(lessonId, channels)` for one lesson, used by Resend and the manual test. | internal |
| `backend/jobs.js` | `sendReminders()` (hourly; exits unless `londonHour()` equals `Settings.reminderSendHour`; idempotent through SendLog), `pruneLogs()` (daily; deletes SendLog and RateLimit items older than `sendLogRetentionDays`, in batches of 100), `probeJobEmail()` (temporary, hourly for one day, removed once the answer is in). | the scheduler |
| `backend/jobs.config` | the three jobs with UTC cron expressions (`0 * * * *` for the hourly ones, `0 3 * * *` for pruning). | — |
| `backend/settings.jsw` | `getSettings()` (with item counts per collection and the 1,500 headroom), `updateSettings(fields)` with a whitelist and validation (hour 0 to 23, E.164 phone, provider in wix/resend, retention days 7 to 400). | instructor |
| `backend/reminders.jsw` | `getTomorrow()` (tomorrow's planned lessons with pupil, per-channel status from SendLog, and the wa.me link text), `resendReminder(lessonId, channel)`, `testReminder(lessonId, email, phone)` (the manual function: sends both channels for one lesson to the addresses given, logging as usual), `probeStatus()`. | instructor |
| `backend/send-log.jsw` | `listSendLog({ channel, status, days, pupilId })`, newest first, 200 rows, with pupil names. | instructor |
| `backend/enquiry-pipeline.js` | the WhatsApp alert now goes through the real `sendWhatsApp` (dormant until secrets exist). | — |
| `backend/portal.jsw` | the dashboard's `reminders` block: yesterday's and today's sent and failed counts per channel. | — |

Reminder recipients, per SPEC: the pupil's email when `emailRemindersOn` and `pupil.reminderEmail`; the pupil's WhatsApp when `whatsAppRemindersOn`, `pupil.reminderWhatsApp`, `whatsAppConsentAt` set and a phone present; the guardian's email too when the pupil is under 18 on the lesson date (`ageOn` in portal-utils) and `guardianEmail` is set. Guardians never get WhatsApp. Variables: firstName, transmission, dateWords, slotTime, pickup, link.

Pure helpers in `public/portal-utils.js`, with tests in `tests/phase4.test.mjs`: `reminderDecision(settings, pupil, lesson, sentToday)` returning `{ email: 'send' | 'skip', whatsapp: ..., reasons }`, `reminderText(lesson, pupil)` filling `TEMPLATES.lessonReminder`, `waMeLink(phone, text)`, `validateSettings(input)`, `pruneCutoff(now, days)`.

Wix side: one new triggered email `lessonReminder` (variables firstName, transmission, dateWords, slotTime, pickup, link) created in the dashboard like the Phase 1 three, ID added to `EMAIL_TEMPLATES`.

## 2. Pages and elements

Three instructor pages, duplicated from Pupils:

| Editor page | Slug | Element tag | Element file | Page module |
|---|---|---|---|---|
| Settings | `settings` | `kle-settings` | custom-elements/settings.js | portal-pages/settings.js |
| Tomorrow's reminders | `reminders` | `kle-reminders` | custom-elements/reminders.js | portal-pages/reminders.js |
| Send log | `send-log` | `kle-send-log` | custom-elements/send-log.js | portal-pages/send-log.js |

Navigation: instructor Today, Lessons, Pupils, Enquiries, Reminders, Settings (the Send log is linked from Settings and from the dashboard's reminder block, to keep the row short). `PAGE_ROLES` gains the three.

- **Settings**: four toggles as checkboxes in the house style (email reminders, WhatsApp reminders, enquiry alert by email, enquiry alert by WhatsApp), email provider radios, instructor email and WhatsApp number, reminder hour (select 6 to 20), default hourly rate, the three retention windows with the live item count and headroom beside them, one Save. Under it, "Test a reminder": pick one of the next planned lessons, enter the email and phone to send to (your own by default), Send test; the result lines come straight from SendLog. A note shows the probe's verdict ("Wix emails work from the job" or "Wix emails fail from the job; reminders use Resend").
- **Tomorrow's reminders**: tomorrow's lessons as the usual lesson rows, each with two status words (Email: sent 08:02 / failed / skipped, reason; WhatsApp: the same), Resend per channel, and a "Send on WhatsApp" link (`https://wa.me/447…?text=…`) carrying the reminder text for the manual fallback. Empty state: "Nothing booked for tomorrow."
- **Send log**: filters as text buttons (All, Email, WhatsApp; Sent, Failed, Skipped; 7, 30, 90 days), rows with date and time, pupil, channel, status, and the error or reason in muted text.
- **Dashboard**: the "Reminders for tomorrow" block becomes yesterday's and today's counts ("Today's run: 3 emails sent, 1 failed. WhatsApp off.") linking to Tomorrow's reminders.

## 3. Decisions needed before I write code

**A. Probe first, build on the answer.** The probe job ships in the first commit; the reminder job is written to use Wix emails when the probe succeeds and Resend when it fails, chosen automatically from the last probe row. Recommended: yes.

**B. Resend sender address.** `reminders@kledrivingschool.co.uk`, which needs Resend's two DNS records on the domain (in Wix domain settings) and `RESEND_API_KEY` in the Secrets Manager; both are yours to add when the probe says they are needed. Until the key exists, a Resend send logs a skipped row. Recommended: that address.

**C. WhatsApp dormant.** Built in full against the Meta Cloud API, switched off in Settings, and every send logs "skipped: WhatsApp not set up" until `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` exist. The wa.me link works regardless. Recommended: yes.

**D. Pruning.** SendLog and RateLimit rows older than `sendLogRetentionDays` (default 30) go daily at 03:00 UTC. Lesson compaction stays in Phase 5 with the export. Recommended: yes.

**E. Reminder hour.** Default 08:00 London; the job fires hourly and acts only in that hour, so the earliest a change takes effect is the next matching hour. Recommended: keep.

## 4. Phase 4 test script (from SPEC.md, expanded)

1. Probe: within an hour of publishing, SendLog has a probe row; its status decides the email path and shows on Settings.
2. Settings: change the reminder hour and the instructor WhatsApp number, Save, reload shows them; the item counts and headroom show.
3. Manual test: on Settings, pick tomorrow's lesson for Test Pupil and send a test to your own email and phone. Email arrives (Wix or Resend, per the probe); WhatsApp logs a skipped row with "not set up"; both rows appear on the Send log page.
4. Switch WhatsApp reminders off (already off) and email reminders off, then on again: the test logs a skipped row for each channel that is off.
5. Schedule: with a planned lesson for tomorrow and the hour set to the next hour, wait for the run; SendLog gets one sent row per eligible channel, the dashboard counts update, Tomorrow's reminders shows the statuses, and a second run in the same hour sends nothing more (idempotent).
6. Resend on Tomorrow's reminders sends again and logs a second row; the wa.me link opens WhatsApp with the reminder text.
7. Break the path deliberately (set the provider to Resend with no key): the next run logs a failed email row, the dashboard shows the failure, and the WhatsApp row is still logged independently.
8. Pruning: set `sendLogRetentionDays` to 7 temporarily, wait for the 03:00 run (or run `pruneLogs` through the test function), confirm old rows go and the count on Settings drops.
9. `npm test` passes with the new tests.

## 5. Order of work

1. Utils and tests; messaging providers; probe job and jobs.config; commit, push, Editor publish (on your word), and leave the probe to run.
2. Reminder core, jobs, settings and reminder web modules, send log module, dashboard counts; the lessonReminder triggered email in the dashboard.
3. Three elements and page modules, harness fixtures, 375px check.
4. On your word: three Editor pages, page code files, publish, test script, results into PLAN-phase4.md and docs; remove the probe job once its answer is recorded.
