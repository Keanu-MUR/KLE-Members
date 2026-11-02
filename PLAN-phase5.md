# Phase 5 — guardian, backups, GDPR delete, polish, handover

Built and tested on the live site on 2 Nov 2026, after the portal became one page per role. Decisions taken with the owner before the build: backups are private CSV files in the Media Manager with a Wix email notice and time-limited links (Wix emails cannot carry attachments; Resend is not set up); the GDPR delete removes the Wix member login and contact as well as the portal data.

## What was built

| Area | Files |
|---|---|
| CSV helpers (`csvEscape`, `csvColumns`, `toCsv`) and compaction helpers (`compactionPlan`, `mergeHistory`) with tests | `public/portal-utils.js`, `tests/phase5.test.mjs` |
| Collection and per-pupil CSV builders | `backend/export.js` |
| Weekly backup: upload each collection's CSV privately to `/portal-backups/<date>/`, keep the newest four, record `lastExportAt`, `lastExportStatus` and the new `Settings.backups` list, email the instructor through the existing `enquiryAlert` template (name "Weekly backup") | `backend/backup.js`, `backend/jobs.js` (`exportBackup`, Monday 02:00 UTC in `jobs.config`), `backend/setup.js` |
| Lesson compaction: lessons older than `lessonRetentionDays` that are not planned become `Pupils.lessonHistory[year] = { count, hours, completed, cancelled, noShow }` and are deleted, only when the last backup succeeded within 8 days; runs after the nightly prune | `backend/compaction.js`, `backend/jobs.js` |
| Settings section: Backups (last run, Download latest backup with 60-minute links, Back up now, Compact old lessons now) and Export all data (one CSV per collection, downloaded in the browser) | `backend/portal-settings.jsw` (`latestBackupLinks`, `runExport`, `exportCollection`, `runCompactionNow`), `public/custom-elements/settings.js` |
| Guardian login: link (existing member by email or a new member sent the set-password email; one login per pupil, one pupil per login), unlink, resend | `backend/pupils.jsw` (`linkGuardian`, `unlinkGuardian`, `sendGuardianLoginLink`), `public/custom-elements/pupil-record.js` |
| Export this pupil (one CSV with sections) and Delete pupil (GDPR) with the typed full name: lessons, progress, mock tests, messages, send log rows, the converted enquiry, the record, then the pupil's and sole guardian's member and contact | `backend/pupils.jsw` (`exportPupil`, `deletePupil`), `pupil-record.js` |
| Handover and audit | `HANDOVER.md`, `docs/light-plan-audit.md` |

Page wiring: `public/portal-pages/instructor-portal.js`, `pages/Instructor dashboard.ve1km.js`, `backend/permissions.json`.

## Results (live, 2 Nov 2026)

1. Backups: "Back up now" wrote 10 private files (45 items) in under 30 seconds; Settings showed "Last backup Monday, 2 November 2026: 10 files, 45 items"; the notice email logged as sent (SendLog row with lessonId `backup`); "Download latest backup" listed 10 time-limited links on download-files.wixmp.com. "Export all data" returned the Lessons CSV with the header `_id,_createdDate,_updatedDate,_owner,date,durationMins,…` and 5 rows; "Export this pupil" returned one CSV with Pupils, Lessons, Progress, MockTests, Messages and SendLog sections. The browser download itself was not exercised by the automated check.
2. Compaction: a completed test lesson dated 1 June 2026 was added; "Compact old lessons now" removed it and Test Pupil's `lessonHistory` became `{ "2026": { count: 1, hours: 2, completed: 1, cancelled: 0, noShow: 0 } }`, which the pupil's Lessons section renders as "2026: 1 lesson, 2 hours". The gate messages ("No backup has run yet…", "…did not succeed…", "…more than 8 days old…") are shown on Settings.
3. Guardian: linking keanu7pokemon+guardian@gmail.com on Test Pupil's record created the member, stored `guardianMemberId` and sent the set-password email; the record now shows "Guardian login: …, read only" with resend and remove. Logging in as the guardian is for the owner to try (private window): `/pupil` with the pupil's name and "Viewing as guardian, read only", no request form, `/pupil#details` goes home.
4. GDPR delete: a throwaway pupil with one lesson and one mock test; a wrong name was refused with "Type the pupil's full name exactly, Throwaway Tester, to confirm."; the right name removed 1 lesson, 1 mock test and the record and showed the summary. The pupil had no member, so the member and contact deletion path ran only as the no-op branch.
5. `npm test`: 54 tests pass; `npm run lint` clean.

## Design pass

Checked every section against the design brief in SPEC.md: one column, 720px max, labels above full-width inputs, one primary button per form, text buttons elsewhere, 4px corners, no shadows or gradients, dashed road-marking rules, small-caps dates and status words, empty states that say what will appear and who puts it there, instructor's voice without exclamation marks. Accessibility: `:focus-visible` outline on every control, a real label on every field, `aria-live` status lines on every form, `aria-pressed` on filter buttons and grid blocks, the progress grid's cells labelled for screen readers with the skill and level and the L marker hidden from them, `role="alert"` on errors. Fixed in this phase: the Settings compaction hint no longer promises "with the weekly export"; the backup and compaction results stay on screen after the section reloads; My details and the pupil record mark licence number, date of birth and the emergency contact optional and no longer ask for a town; the email hint is one sentence. No other deviations found.

## Left for the owner

- Try the guardian login (set the password from the email to keanu7pokemon+guardian@gmail.com), then remove it from Test Pupil's record if not wanted.
- The weekly backup email lands at the instructor email on Settings every Monday.
- WhatsApp stays dormant until the Meta secrets exist; Resend until its key and DNS records exist.
