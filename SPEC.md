# KLE Driving School Pupil Portal — Claude Code Build Spec

Nov 1, 2026

## How to use this document

The build is a Wix site extension: Velo backend code plus custom-element UI, living in a GitHub repo that Claude Code edits locally. Paste the CLAUDE.md section into the repo root as CLAUDE.md, then run the Phase 0 prompt and work through the phases in order. Everything else in this document is reference that CLAUDE.md points Claude Code back to.

1. Complete the one-time setup checklist (Wix dev mode, GitHub connection, Wix CLI) — about an hour.
2. Copy the CLAUDE.md section into the repo root. Copy this whole document into the repo as SPEC.md so Claude Code can read the details.
3. Open Claude Code in the repo and paste the Phase 0 prompt. Review its plan before approving.
4. Test each phase on the live site with a test pupil account before starting the next.
5. Fill the placeholders listed at the end (brand colours, logo file, Meta credentials) as they become available; nothing blocks on them until Phase 4.

The instructor is referred to as "the instructor" throughout; pupils as "pupils"; a pupil's parent or guardian as "guardian".

## CLAUDE.md (paste verbatim into the repo root)

This file is what Claude Code re-reads every session. It is deliberately short; the detail lives in SPEC.md. The verbatim text is in `CLAUDE.md` at the repo root.

## Product overview and roles

The portal replaces the school's current GoRoadie booking link with its own pupil area on kledrivingschool.co.uk: pupils log in to see their lessons and progress, the instructor records everything, and reminders go out automatically by email and WhatsApp. Public visitors can send an enquiry that reaches the instructor within seconds.

Facts from the live site that the build should respect: lessons are manual or automatic, taught in SE1, SE4, SE8, SE10, SE14, SE15 and SE16, in four fixed two-hour slots (07:30–09:30, 10:00–12:00, 12:45–14:45, 15:15–17:15), pay-as-you-go at £41/h with a 2-hour minimum, and block packages of 6, 10 and 20 hours plus a £70 taster. Existing pages: Home, Road Help resources, T&Cs.

| Role | Who | Can see | Can do |
|---|---|---|---|
| Instructor | The one ADI; Wix member with role "Instructor" | Everything | Create/edit pupils, lessons, progress, mock tests, payments; reply to enquiries; set reminder toggles; view send log; export data |
| Pupil | A learner; Wix member linked to one Pupils item | Own profile, own lessons, own progress, own mock tests, own balance | Edit own contact details and reminder preferences; request a change via a message to the instructor (no booking) |
| Guardian | Parent/guardian; Wix member linked to one pupil via Pupils.guardianMemberId | The same pages as their pupil, read-only | Nothing else. Built in Phase 5 but designed in from Phase 0 |
| Public | Anyone | Enquiry form, login page | Submit an enquiry |

## Platform decisions and constraints

The portal is built inside the existing Wix site so the client pays for one service they already have, and any Wix freelancer can maintain it later. Every page, record, scheduled job and login is Wix's; the only calls that leave Wix are to send an email or a WhatsApp message.

Portal architecture: Wix hosts everything; messaging is the only external call. Pupils use custom-element pages that call Velo backend functions; the backend reads and writes Wix Data and, when sending, calls the email or WhatsApp provider. The daily job runs the same backend code.

| Decision | Choice | Why |
|---|---|---|
| Editor | Classic Wix Editor with Velo dev mode | The site already uses it |
| Plan tier | Must run on Wix Light | Client intends to downgrade from Core next year; Velo, Members, Data, jobs and triggered emails are available on all plans |
| UI | Custom elements, hosted in Velo under public/custom-elements/ | Full control of the look; not Wix's widgets; code lives in the repo. Requires a premium plan with a connected domain and no Wix ads, which Light satisfies |
| Code location | GitHub repo via Wix Git Integration + Wix CLI | Claude Code edits locally; Wix publishes from the repo |
| Email | Wix Triggered Emails, with Resend as a switchable fallback | Triggered emails count against the plan's email-marketing quota, which is small on Light |
| WhatsApp | Meta Cloud API directly, using the school's existing WhatsApp Business number via coexistence | About £0.016 per message; no middleman fee |
| SMS | None | Cost |
| Payments | None in the portal for now (decision 2 Nov 2026: payments, the balance and any card link are deferred; the Payments collection stays defined but unused) | Keeps the portal simple; pupils pay the instructor directly |
| Portability | Collections export to CSV; Wix Data has a REST API | A future developer can lift the data out |

Limits that shape the design: scheduled jobs run at most hourly (20 jobs); backend requests time out at 14 seconds; the data item quota is set by plan tier and shrinks on downgrade, so the item count must stay low (see hard rules); custom elements cannot call Velo APIs directly and communicate with page code through events and attributes.

## Data model

Ten collections (RateLimit added 1 Nov 2026), designed to stay under 1,200 items at steady state for a 30-pupil school, inside the Light plan limit of 1,500 items per site. The retention windows that keep it there are adjustable in Settings (see "Keeping the item count low" below). All money is stored in pence as integers; all dates as ISO-8601 strings.

| Collection | One item per | Key fields | Who can read | Who can write |
|---|---|---|---|---|
| Pupils | pupil | memberId, firstName, lastName, dateOfBirth, email, phone (E.164), addressLine1, addressLine2, town, postcode, transmission (manual/automatic), licenceNumber, emergencyContactName, emergencyContactPhone, status (active/passed/inactive), theoryPassed, theoryPassDate, practicalTestDate, hourlyRatePence, reminderEmail, reminderWhatsApp, whatsAppConsentAt, guardianMemberId, guardianName, guardianEmail, instructorNotes (private), lessonHistory (JSON yearly totals) | Own item: pupil and linked guardian; all: instructor | Instructor. Pupil may update only contact fields and reminder preferences, via a backend function with a field whitelist |
| Lessons | lesson | pupilId, date, slot (early-morning / late-morning / early-afternoon / late-afternoon / custom), startTime, durationMins, pickupLocation, status (planned/completed/cancelled/no-show), pupilSummary (visible), instructorNotes (private) | Own lessons: pupil and guardian; all: instructor | Instructor only |
| Progress | pupil | pupilId, skills (JSON: { skillKey: { level, updatedAt, note } }), updatedAt | Own: pupil and guardian; all: instructor | Instructor only |
| MockTests | mock test | pupilId, date, result (pass/fail), minors, serious, dangerous, faults (JSON list of { category, note }), feedback (visible) | Own: pupil and guardian; all: instructor | Instructor only |
| Payments | payment received | pupilId, date, amountPence, method (bank transfer / cash / card link / package), reference, note | Own: pupil and guardian; all: instructor | Instructor only |
| Enquiries | enquiry | name, email, phone, dateOfBirth, addressLine1, postcode, transmission, message, preferredContact, status (new/replied/converted/closed), repliedAt, convertedPupilId, notifyToken (single use, cleared once the emails are sent), notifiedAt | Instructor | Insert: anyone via backend; update: instructor |
| Messages | pupil-to-instructor note | pupilId, body, createdAt, readAt, reply | Own: pupil; all: instructor | Insert: pupil; reply: instructor |
| Settings | the school (exactly one item) | emailRemindersOn, whatsAppRemindersOn, emailProvider (wix/resend), instructorEmail, instructorWhatsApp, enquiryAlertEmailOn, enquiryAlertWhatsAppOn, reminderSendHour, defaultHourlyRatePence (stripePaymentLinkUrl and bankDetailsText removed 2 Nov 2026 with payments), lastExportAt, lastExportStatus, lessonRetentionDays (default 120), sendLogRetentionDays (default 30), paymentRetentionDays (default 400) | Instructor | Instructor only |
| SendLog | send attempt | pupilId, lessonId, channel (email/whatsapp), status (sent/failed/skipped), providerMessageId, error, createdAt | Instructor | Backend only |
| RateLimit | enquiry rate-limit window | ipHash, windowStart, count | Backend only | Backend only; pruned by the daily job |

Ownership checks run in the backend on every call: a pupil's memberId must equal the caller's member ID, or the caller's member ID must equal the pupil's guardianMemberId (read only), or the caller must hold the Instructor role. Collection permissions in the Wix dashboard are set to the tightest option that still allows these backend paths; the custom elements never query collections directly.

The skills grid uses the DVSA driver's record categories and its five levels (1 Introduced, 2 Under full instruction, 3 Prompted, 4 Seldom prompted, 5 Independent). Skill keys, in display order: cockpit drill and safety checks; show-me/tell-me questions; controls and instruments; moving off and stopping; clutch control (manual only); safe positioning; mirrors, signals and anticipation; use of speed; meeting and crossing traffic; junctions; roundabouts; pedestrian crossings; dual carriageways; independent driving (sat nav and signs); emergency stop; reverse park on the road; bay park; pull up on the right and reverse; rural roads; night driving; eco-safe driving. The list lives in one constants file so it can be edited without touching the UI.

Keeping the item count low: the daily job prunes and compacts on three windows held in Settings and editable on the instructor Settings page. SendLog and RateLimit items older than sendLogRetentionDays (default 30) are deleted. Lessons older than lessonRetentionDays (default 120) are compacted: their totals (count, hours, status counts) are added to the pupil's lessonHistory JSON and the items deleted. Payments older than paymentRetentionDays (default 400) are compacted the same way into a yearly paid total in lessonHistory. Compaction runs only after the weekly CSV export has succeeded within 8 days. The Settings page shows the current item count next to the windows so the instructor can see the headroom under the 1,500 limit. Pupils still see yearly totals for compacted periods and full detail inside the windows. Pupils who pass or leave are set to passed/inactive, not deleted, until the instructor uses the GDPR delete action, which removes the pupil and all linked items.

Secrets, held in the Wix Secrets Manager and read only in backend code: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, RESEND_API_KEY.

## Pages and features by role

**One page per role (decided 2 Nov 2026, after section switches between separate Wix pages took 2 to 3 seconds each).** The pupil and guardian sections live on one Wix page, `/pupil`, and the instructor sections on `/instructor`. A shell custom element draws the nav and swaps the section element inside itself; the section is the URL hash (`/pupil#lessons`, `/instructor#pupil?id=…`), so there is no Wix page load between sections. The pages in the tables below are now sections of those two pages; the old one-section pages still exist and redirect into the portal with their query kept.

Portal pages are top-level pages on the existing site (Wix Editor page slugs cannot contain a slash, so the planned /pupils/... prefix became /pupil-login, /pupil-home, /instructor and /enquire; changed 2 Nov 2026), use the same header and footer, and are built as custom elements. Public pages are /enquire and /pupil-login; everything else requires login and is routed by role.

### Public

| Page | What it does |
|---|---|
| Enquire (/enquire) | Form: full name, email, phone, date of birth, address line 1, postcode, manual or automatic, preferred contact (phone / email / WhatsApp; since 3 Nov 2026 the question is replaced by a notice that the reply and lesson reminders come by email, and preferredContact is stored as email), message. Postcode is checked against the taught areas (SE1, SE4, SE8, SE10, SE14, SE15, SE16) and a soft note shown if outside. Submits to the backend, which writes Enquiries and alerts the instructor by email and WhatsApp at once. Confirmation on screen; confirmation email to the enquirer. Honeypot field and a simple rate limit against spam |
| Login (/pupil-login) | Own-styled form calling Wix Members login; email + password, plus "email me a login link" (for now this sends Wix's set-password email, since Wix Members has no passwordless login; a true one-time link is a possible later upgrade). Redirects by role. "Not a pupil yet? Enquire" link |

### Pupil

| Page | What it does |
|---|---|
| Home (/pupil-home) | Next lesson (date, slot, pick-up), a one-line progress summary ("14 of 21 skills at level 4+") and the latest instructor summary (balance deferred, 2 Nov 2026) |
| My lessons | Upcoming and past lessons; each past lesson shows the instructor's summary. No booking controls anywhere. A "Request a change" button opens a short message form to the instructor (Messages) |
| My progress | The skills grid: every skill with its level 1–5 as a filled track, the instructor's note per skill, and date last updated. Manual-only skills hidden for automatic pupils. Theory status and practical test date at the top |
| Mock tests | Each mock test: date, result, minors/serious/dangerous counts, fault list, feedback |
| Payments | Deferred (2 Nov 2026): not built. The earlier design was a running balance (hours taught × rate, minus payments received) with bank details and an optional card link |
| My details | Edit contact details, address, emergency contact, reminder preferences (email on/off, WhatsApp on/off; the consent sentence under the box was dropped on 2 Nov 2026 at the owner's request, the timestamp is still recorded). Licence number and date of birth shown read-only |

### Guardian

The same Home, Lessons, Progress and Mock tests pages as their pupil, read-only, with the pupil's name in the header. No details editing, no messages. Linked from the pupil record (Link guardian login: an existing member by email or a new one sent the set-password email; one login per pupil and one pupil per login; Remove guardian login clears it). Built 2 Nov 2026.

### Instructor

| Page | What it does |
|---|---|
| Dashboard | Today's and tomorrow's lessons; unread enquiries and messages; reminder status for tomorrow (sent / failed counts); quick "Add lesson" |
| Upcoming lessons | This week and next, grouped by day; each row opens the lesson to edit status, summary and private notes. Add lesson: pick pupil, date, slot or custom time, pick-up location |
| Pupils | Searchable list with status filter. Pupil record: all fields, lessons, progress grid (editable in place), mock tests, payments, messages, guardian link, "Send login link", "Export this pupil", "Delete pupil (GDPR)" with confirmation |
| Progress editor | The skills grid for one pupil, tap a level to set it, optional note per skill. Saves immediately; the pupil sees it on next load |
| Enquiries | New / replied / converted / closed. Reply by email from the page (template with the instructor's standard first-lesson info). "Convert to pupil" creates the Pupils item from the enquiry and sends the signup link |
| Tomorrow's reminders | List of tomorrow's lessons with per-pupil status for each channel; "Resend" per row; one-tap wa.me button per row as a manual fallback |
| Send log | Last 90 days of send attempts with filters |
| Settings | The reminder toggles, enquiry alert toggles, email provider switch, instructor contact details, hourly rate default, retention windows with the item count. Backups: last run, Download latest backup (60-minute links), Back up now, Compact old lessons now. Export all data: one CSV per collection (Stripe link and bank details removed with payments, 2 Nov 2026) |

Mobile first: the instructor uses this from a phone between lessons, so every instructor page must work one-handed at 375px wide.

## Messaging

Two channels, email and WhatsApp, each with a master switch the instructor controls and a per-pupil opt-in. WhatsApp is built end to end but hidden from every screen and email since 3 Nov 2026 at the owner's request (FEATURES.whatsApp in public/portal-constants.js and custom-elements/portal-base.js; set both to true to show it again). Nothing sends unless both are on; every attempt is logged; a channel failing never stops the other or the job.

### Lesson reminders

- The scheduled job sendReminders runs every day at Settings.reminderSendHour (default 07:00 Europe/London since 3 Nov 2026; the hour is compared in Europe/London time, so it follows GMT and BST by itself; jobs run hourly at most, so the job fires hourly and exits unless the hour matches).
- It loads every Lessons item with status = planned and date = tomorrow.
- For each lesson it loads the pupil and, for each channel, checks: master switch on, pupil preference on, no SendLog row already sent for this lesson and channel today (idempotent: safe to re-run).
- Email: sends the "lesson reminder" template with first name, date in words, slot time, pick-up location, transmission, and a link to the portal. Provider = Wix Triggered Emails, or Resend when Settings.emailProvider = "resend".
- WhatsApp: sends the approved utility template lesson_reminder with the same variables via the Meta Cloud API, from the school's number.
- Writes one SendLog row per channel per lesson: sent, failed (with the provider error), or skipped (with the reason).
- Pupils under 18 on the lesson date (from Pupils.dateOfBirth) with guardianEmail set: the guardian's email also receives the reminder. Guardians never receive WhatsApp.

Reminder wording (one template per channel, variables in braces): "Hi {firstName}, reminder: your {transmission} driving lesson is tomorrow, {dateWords}, {slotTime}. Pick-up: {pickup}. Reply here if anything has changed." The WhatsApp version must be submitted to Meta for template approval before Phase 4 and cannot change afterwards without re-approval.

### Enquiry alerts

Event-driven, not scheduled: when Enquiries receives an item, the backend immediately emails the instructor (if enquiryAlertEmailOn) and sends a WhatsApp template new_enquiry to Settings.instructorWhatsApp (if enquiryAlertWhatsAppOn) with the enquirer's name, postcode, transmission and preferred contact. The enquirer gets a confirmation email. All three logged. Implementation note (2 Nov 2026): Wix refuses triggered emails from an HTTP function (no visitor identity), so the HTTP function stores the enquiry with a single-use notifyToken and the page calls the public web method notifyEnquiry(enquiryId, token), which sends all three once. See docs/emails.md.

### Fail-soft rules

- Each channel's send is wrapped in its own try/catch with a 10-second timeout; the job continues on failure.
- A provider returning an error, a missing secret, or the master switch being off all produce a logged row, never an exception out of the job.
- The instructor dashboard shows yesterday's and today's sent/failed counts; a failed WhatsApp is also shown on the "Tomorrow's reminders" page with a one-tap wa.me link carrying the same text, so the instructor can send it by hand.
- If every channel is off or broken, the portal itself is unaffected.

### Consent and compliance

- The signup and "My details" pages carry explicit tick boxes for email and WhatsApp reminders; the WhatsApp box records whatsAppConsentAt.
- Reminders and enquiry replies are service messages to existing or prospective customers; no marketing is ever sent.
- Every email carries the school's postal address and a line on how to change preferences (log in, My details).

### Costs at 30 pupils

Email: nil within quota. WhatsApp: about £0.016 per message, roughly £2 a month for ~130 reminders plus alerts. Resend fallback: free up to 100 emails a day.

## Design brief

**Restyled 2 Nov 2026 to match the new homepage.** Tokens in `public/custom-elements/portal-base.js`: ink #0B0B0B, paper #FFFFFF, soft #F4F2EE (page background), line #E2DED6, accent #FF5F2E, plate #F5C443, ok #1F8A4C, bad #D2303C. Headings Oswald 700 uppercase (tight tracking), body Barlow 400/600; both come from the site theme (Wix loads them as `oswald` and `barlow-v2`), so the elements name them with no font import. Square corners, 2px ink borders on interactive cards and 1px line borders on passive ones, dashed 2px rules under section headings. Black header bar with tab nav (orange underline for the active tab; scrollable pills under 600px). Lessons are cards with the time big in a left column, the date above it, pupil, a pick-up postcode chip and a status pill (Upcoming yellow, Completed green, Cancelled or No show red). Counts are stat cards in a two-column grid. Slots show their times only. The progress grid uses one coloured square per skill (grey none, yellow 1 to 2, orange 3 to 4, black 5) with a legend; the editor keeps five numbered squares. Login is one centred card under a yellow "Pupil login" plate. The older brief below is kept for the voice and the content rules.

The portal should feel like it belongs to KLE Driving School specifically: one instructor, one car, south-east London, a decade of passes. The reference is the DVSA paper driver's record and UK road furniture, not a SaaS dashboard. Specific decisions below; where a brand asset is missing it is marked as a placeholder to fill.

### Brand inputs

- Wordmark: the existing "KLE" / "DRIVING" lock-up from the site header. Checked 1 Nov 2026: the live site has no logo image; the lock-up is live text set in Lulo Clean One Bold, white on black. Reproduce it as text in that font; no file to supply.
- Primary colour: BRAND_PRIMARY = #FF5A25, the orange band on the live site (also the Wix theme accent 237,88,41). Secondary: black text (the site uses pure black) and a warm off-white for backgrounds; gold #F3C852 is the site's headline colour on black and may be used sparingly for one heading on a dark panel; one accent for the L-plate red used only for the current level marker and errors. Orange on white is about 3:1 contrast, which fails AA for small text, so solid primary buttons carry black text on orange, as the live site does, and orange is never used for body text.
- Tagline already in use: "Drive confidently."
- Photography: real photos of the car and the instructor (placeholder: 3–5 images to be supplied). No stock photos. The pass-certificate photos on the public site stay on the public site; they do not appear inside the portal.

### Typography

- Headings: a condensed grotesque with a nod to UK road signage, set tight, mostly in sentence case. Candidate: Barlow Condensed 600.
- Body and UI: a plain, highly legible sans. Candidate: Source Sans 3 or Inter, 16px minimum on mobile.
- Fonts are set once in the Wix site theme (Site Design > Text) so the marketing site and portal share them; custom elements reference them by name. No font files or CDN links inside the elements.
- Checked 1 Nov 2026: the live site currently uses Lulo Clean One Bold for headings and Poppins for body text. Whether the portal adopts those or the candidates above is an open question for the instructor; until decided, the base styles use the site theme's heading and body font names so they follow whatever is set.

### Layout and components

- One column on mobile, max 720px on desktop. Generous whitespace, left-aligned text, no centred paragraphs.
- Dividers are road-marking lines: a single dashed rule in the text colour at 1px. Used sparingly, never as decoration between every item.
- The progress grid is the signature screen: a "driver's record" card, one row per skill, the five levels as five short blocks that fill left to right in the primary colour, the current level's block carrying a small white L on red. Skill name left, level word right ("Prompted"), note underneath in secondary text. No percentages, no donut charts.
- Lessons are shown as a simple list with the slot name as the strongest element ("Early morning, 07:30–09:30"), date above it in small caps, pick-up below.
- Buttons: solid primary for the one main action per page, text buttons for the rest. Square-ish corners (4px), no pill shapes, no shadows.
- Forms: labels above fields, full-width inputs, inline validation in plain English ("That postcode doesn't look right"), one submit button.
- Login page: the car photo full-bleed on the left (desktop) or as a short banner (mobile), the form on a plain panel. The headline is "Your lessons, your progress" in the condensed face; nothing else.
- Empty states say what will appear and who puts it there ("Your first lesson will show here once it's booked."), without illustrations.

### Voice

First person singular, from the instructor, matching the public site ("With me as your mentor"). Plain, warm, direct. UK spelling. Short sentences. No exclamation marks, no emoji, no "Welcome back", no "Great job!". Confirmation copy states what happened: "Saved. Jamie will see this next time he logs in."

### Do not

- Gradients, glassmorphism, floating cards with shadows, rounded pill buttons, icon-in-a-coloured-circle lists.
- Emoji anywhere, including in email and WhatsApp text.
- Generic illustrations, stock photos, hero sections with three feature tiles.
- Purple, teal, or any colour not derived from the brand inputs.
- Progress rings, donut charts, confetti, gamification badges.
- Dark mode; one light theme only.

### Accessibility

WCAG AA contrast, visible focus rings in the primary colour, every control reachable by keyboard, form fields with real labels, and the skills grid readable by a screen reader as "Roundabouts, level 3 of 5, prompted".

## Hard rules for Claude Code

These expand the ten rules in CLAUDE.md with the checks Claude Code must make before marking any task done.

### Security

- A shared backend helper requireInstructor() throws unless the current member holds the Instructor role; every instructor-only web module function calls it first. A second helper requirePupilAccess(pupilId) allows the pupil, their guardian (read only) or the instructor.
- Web module functions never accept a memberId from the client; they read it from the session.
- Collection permissions in the dashboard: every collection, Enquiries included, is admin only for read, insert, update and delete, with backend code performing reads and writes on the caller's behalf using elevated permissions after the access check. (Changed 1 Nov 2026 from "Enquiries insert = anyone": the enquiry web method inserts server-side after validation and rate limiting, so an open insert permission would only give spammers a way round the limit.)
- Custom elements receive only the data the current role may see; the backend shapes the response, the UI never filters.
- Secrets are read with wix-secrets-backend inside backend code only and never returned to the client or logged.
- The enquiry endpoint has a honeypot field, a 5-per-hour-per-IP limit stored in a small RateLimit collection pruned daily, and validates every field server-side.

### Light-plan safety

- Forbidden: Wix Bookings, Stores, Payments, Forms, Events, Pricing Plans, Automations that require a paid tier, any API documented as requiring Core or above.
- Allowed: Members, Data, scheduled jobs, triggered emails, Secrets Manager, custom elements, fetch from backend.
- Before using any Wix API, check the Wix docs for plan requirements; when unsure, ask.

### Data hygiene

- Item-count budget: fewer than 1,200 items across all collections at steady state, under the Light plan limit of 1,500. The daily job prunes SendLog and RateLimit, and compacts Lessons and Payments, on the retention windows in Settings (defaults 30, 120 and 400 days).
- A weekly scheduled job exportBackup writes every collection to CSV and emails the files to the instructor; compaction runs only if the last export succeeded within 8 days.
- The GDPR delete action removes the pupil, their lessons, progress, mock tests, payments, messages and send-log rows, and the Wix member, in one backend function with confirmation.

### Code quality

- Plain JavaScript, ES2015+, no TypeScript, no bundler, no npm UI packages. Backend may use wix-data, wix-members-backend, wix-secrets-backend, wix-crm-backend (triggered emails), wix-fetch and wix-auth only.
- Web modules are `.jsw` files, with per-function permissions in `backend/permissions.json` and the role check inside the function as the real guard. Decision D of 1 Nov 2026 chose `.web.js`, but on this site's Git Integration build a `.web.js` import resolves to undefined on the live site (checked 2 Nov 2026), so the build reverted to `.jsw`.
- One constants file for the skills list, slot times, taught postcodes and message templates.
- Every backend function validates its inputs and returns { ok, data } or { ok: false, error }; the UI shows error in plain English.
- Custom elements: one file per page, a small shared portal-base.js for styles and the event bridge to page code, no global state.
- Comments explain why, not what. No dead code, no TODOs left in committed files.

### Testing

- Each phase in the build plan has a manual test script; Claude Code runs it in the Wix preview or on the live site with the test pupil account and reports pass/fail per step.
- Backend pure functions (balance calculation, reminder eligibility, slot parsing, postcode check) get unit tests that run with node locally.

### Change control

- Ask before changing the data model, adding a collection, adding a dependency, or touching the marketing pages.
- When a decision in SPEC.md must change, change it in the same commit and say so in the commit message.

## Build phases and prompts

Six phases, each small enough to review in one sitting and each ending with a working, testable site. Paste each prompt into Claude Code in the repo; approve its plan before it writes code; run the test script before moving on.

### Phase 0 — Scaffold, login, roles

Outcome: the repo is connected, all ten collections exist with permissions set, the instructor can log in and see an empty dashboard, a test pupil can log in and see an empty home page.

```
Read CLAUDE.md and SPEC.md fully before doing anything.

Phase 0. Set up the foundations and nothing else:
1. Confirm the repo is a Wix Git Integration project (check for the Wix CLI config). Tell me if anything about the project structure is unexpected.
2. Create a constants module (skills list with keys and display names, slot times, taught postcodes, status enums, message templates) exactly as SPEC.md lists them.
3. Create the backend helpers requireInstructor() and requirePupilAccess(pupilId), plus a backend module that returns the current member's role and linked pupil.
4. Write a migration script or step-by-step instructions for me to create the ten collections in the Wix dashboard with the fields and permissions in SPEC.md. If collections can be created from code, do that instead and tell me.
5. Build the shared custom element base (styles from the design brief, the event bridge to page code) and the Login page custom element with the own-styled form, calling Wix Members login and magic link.
6. Build empty shells for the Instructor Dashboard and Pupil Home pages that prove role routing works.
7. Create the single Settings item with defaults.

Start in plan mode. Show me the plan, including which pages I must create in the Wix Editor and which custom elements go on each, before writing code. Do not touch any existing page on the site.
```

Test: create the Wix pages the plan names; give the instructor's member account the Instructor role; create a test pupil member; log in as each and confirm routing; check that a pupil opening an instructor URL is refused.

### Phase 1 — Pupils and enquiries

Outcome: the public enquiry form works and the instructor receives it by email; the instructor can manage pupil records and convert an enquiry into a pupil; pupils can edit their own details.

```
Read CLAUDE.md and SPEC.md. Phase 0 is complete and tested.

Phase 1. Build:
1. The public Enquire page (custom element + backend insert with validation, honeypot and rate limit), the postcode soft check, the on-screen confirmation and the confirmation email to the enquirer via Wix Triggered Emails. Instructor alert by email only for now; WhatsApp comes in Phase 4 but leave a clearly marked hook.
2. The instructor Enquiries page: list with status filter, reply-by-email with the standard template, Convert to pupil (creates the Pupils item and sends a signup link), Close.
3. The instructor Pupils list and pupil record page with all fields from the data model, status changes, and Send login link.
4. The pupil My details page with the field whitelist and the two reminder tick boxes (WhatsApp with the consent timestamp; the wording under the box was removed 2 Nov 2026).

Plan first. Include the test script from SPEC.md for this phase in your final report with pass/fail per step.
```

Test: submit an enquiry from an incognito window; confirm the instructor email and the enquirer confirmation arrive; convert it; log in as that pupil and edit details; confirm the pupil cannot see any other pupil's record by changing IDs in the URL.

### Phase 2 — Lessons and progress

Outcome: the instructor adds and edits lessons and sets progress; pupils see both.

```
Read CLAUDE.md and SPEC.md. Phases 0–1 are complete and tested.

Phase 2. Build:
1. Backend for Lessons (create, update, list by pupil, list by date range) with instructor-only writes and status handling (planned / completed / cancelled / no-show).
2. The instructor Upcoming lessons page (this week and next, grouped by day) and the Add/Edit lesson form (pupil, date, slot or custom time, pick-up, summary, private notes).
3. The instructor Progress editor for one pupil: the skills grid from the constants file, tap to set level 1–5, optional note per skill, immediate save to the single Progress item. Hide manual-only skills for automatic pupils.
4. The pupil My lessons page (upcoming, past with summaries, Request a change message form) and My progress page (the driver's-record card from the design brief).
5. Fill the Pupil Home and Instructor Dashboard shells with real data (next lesson, progress summary, today/tomorrow lists).

Plan first. This is the signature screen of the product: show me the progress grid HTML/CSS before wiring it up.
```

Test: add six lessons across two weeks for the test pupil; set ten skills; log in as the pupil and confirm everything appears correctly on a 375px-wide screen; send a change request and see it on the instructor side.

### Phase 3 — Mock tests, payments, messages

Outcome: the remaining records are in place and the pupil can see their balance.

```
Read CLAUDE.md and SPEC.md. Phases 0–2 are complete and tested.

Phase 3. Build:
1. MockTests: instructor add/edit with minors/serious/dangerous counts and a fault list; pupil Mock tests page.
2. (Payments: deferred on 2 Nov 2026; nothing built.)
3. Messages: instructor view and reply; unread count on the dashboard.

Plan first.
```

Test: add a mock test and check the pupil view; reply to a change request and check the pupil sees it.

### Phase 4 — Reminders and WhatsApp

Outcome: email and WhatsApp reminders go out automatically with working toggles and a send log. Requires the Meta setup from the checklist to be complete.

```
Read CLAUDE.md and SPEC.md, especially the Messaging section. Phases 0–3 are complete and tested. Meta WhatsApp credentials are in the Secrets Manager under the names in SPEC.md and the lesson_reminder and new_enquiry templates are approved.

Phase 4. Build:
1. A messaging module with sendEmail(templateKey, to, vars) switching between Wix Triggered Emails and Resend on Settings.emailProvider, and sendWhatsApp(templateName, to, vars) calling the Meta Cloud API directly. Each wrapped fail-soft with a 10-second timeout and a SendLog row for every attempt.
2. The scheduled job sendReminders in jobs.config with the idempotency and eligibility rules from SPEC.md, and the daily pruning of SendLog and RateLimit.
3. The instructor Settings page with the four toggles, provider switch, contact details and reminder hour.
4. The instructor Tomorrow's reminders page with per-channel status, Resend, and the one-tap wa.me fallback.
5. The Send log page.
6. Wire the Phase 1 enquiry hook to send the new_enquiry WhatsApp alert.

Plan first. Before enabling the job, give me a backend function I can run manually for one lesson to test both channels against my own email and phone.
```

Test: run the manual function against the instructor's own details on both channels; switch WhatsApp off and confirm a skipped row is logged; schedule a test lesson for tomorrow and confirm the 08:00 run sends and logs; break the WhatsApp token deliberately and confirm email still sends and the failure appears on the dashboard.

### Phase 5 — Guardian, backups, GDPR, polish

Built and tested 2 Nov 2026; see PLAN-phase5.md for what was built and the results. Decisions: backups are private CSV files in the Media Manager (newest four kept) with a Wix email notice and 60-minute download links on Settings, not attachments; the GDPR delete also removes the Wix member and contact; payments were never built, so only lessons compact.

Outcome: feature-complete and ready to hand over.

```
Read CLAUDE.md and SPEC.md. Phases 0–4 are complete and tested.

Phase 5. Build:
1. Guardian role: linking a guardian member to a pupil from the pupil record, read-only routing to the pupil's pages with the pupil's name in the header, guardian email included in reminders when set.
2. The weekly exportBackup job (every collection to CSV, emailed to the instructor) and the Lessons compaction step gated on a successful export within 8 days. Add the Export all data button on Settings and Export this pupil on the pupil record.
3. The GDPR delete action with confirmation.
4. A design pass over every page against the design brief: typography, spacing, empty states, copy voice, accessibility (focus rings, labels, screen-reader text for the grid). List every deviation you fixed.
5. A Light-plan audit: list every Wix API and feature used and confirm none require Core or above.
6. Update SPEC.md with anything that changed during the build and write a one-page HANDOVER.md for the instructor: how to add a pupil, add a lesson, set progress, reply to an enquiry, change the toggles, and where the weekly backup arrives.

Plan first.
```

Test: link a guardian and confirm read-only access; trigger the export and open the CSVs; delete the test pupil and confirm no trace remains; read HANDOVER.md as if you were the instructor.

## After handover

The only recurring work is reading the weekly backup email and, once or twice a year, checking Wix's developer changelog for deprecations affecting wix-data, wix-members-backend, wix-crm-backend or scheduled jobs. Each is announced months ahead with a migration note.

## One-time setup checklist

Everything here happens outside the code, mostly in dashboards. Items 1–6 are needed before Phase 0; 7–10 before Phase 4; 11–13 before handover.

- [ ] 1. In the Wix Editor, turn on Dev Mode (Dev Mode > Turn on Dev Mode). Confirm the site plan: Settings > Manage plan > View Plan Features. Note the Data platform item limit shown there and write it into SPEC.md.
- [ ] 2. Add the Members Area to the site (Add > Members) and create the member role "Instructor" (Dashboard > Site Members > Roles). Assign it to the instructor's own member account.
- [ ] 3. Connect the site to GitHub (Velo sidebar > GitHub Integration) and install the Wix CLI locally (npm install -g @wix/cli); clone the repo. Install the Wix skills for Claude Code in the repo (npx skills add wix/skills).
- [ ] 4. Create a test pupil member and a test guardian member with real email addresses you control.
- [ ] 5. Collect brand inputs: logo file, primary colour, 3–5 photos of the car and instructor. Set the two fonts in Site Design > Text.
- [ ] 6. Confirm kledrivingschool@gmail.com is the address enquiries should reach, or decide on a different one, and put it in Settings.instructorEmail.
- [ ] 7. Meta: in Meta Business Manager, start WhatsApp Business Platform onboarding using the coexistence path so the existing WhatsApp Business app number keeps working. Update the WhatsApp Business app first (version 2.24.17 or later). Choose a provider with no platform fee, or Meta's own embedded signup, and complete business verification as a sole trader (ID plus business document). Allow up to two weeks.
- [ ] 8. Meta: create and submit two utility templates, lesson_reminder and new_enquiry, with the exact wording in the Messaging section. Wait for approval before Phase 4.
- [ ] 9. Put WHATSAPP_ACCESS_TOKEN (a permanent system-user token) and WHATSAPP_PHONE_NUMBER_ID into the Wix Secrets Manager.
- [ ] 10. Resend fallback (optional but recommended): create a free Resend account, add the sending domain, and add the two DNS records it gives you in the Wix domain settings. Put RESEND_API_KEY in the Secrets Manager. Create the triggered-email templates in the Wix dashboard for the Wix path.
- [ ] 11. Legal: confirm the school pays the ICO data protection fee; add a short privacy notice page covering what the portal stores and how to request deletion; update the T&Cs page to mention reminders by email and WhatsApp.
- [ ] 12. Add "Pupil login" and "Enquire" to the site menu; replace the GoRoadie "Get On Board" and "BOOK NOW" links with the Enquire page once the instructor is ready to switch.
- [ ] 13. Record the instructor's login, the GitHub repo location and the Secrets Manager contents in a sealed note the client keeps, so a future developer can pick it up.

## Placeholders and open questions

Nothing below blocks Phases 0–3. Fill each in SPEC.md as it is settled.

| Placeholder | Where used | Needed by |
|---|---|---|
| LOGO_FILE: resolved, no file exists; wordmark is text in Lulo Clean One Bold | Design brief, login page | Phase 0 |
| BRAND_PRIMARY: #FF5A25 (site orange); gold #F3C852; black; white | Design brief, base styles | Phase 0 |
| Car and instructor photos | Login page, home page banner | Phase 2 |
| Data item limit on Light: 1,500 items per site, shared across all collections (Wix CMS limits article, checked 1 Nov 2026; Core is 4,000) | Hard rules (item budget) | Phase 0 |
| WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID | Secrets Manager | Phase 4 |
| RESEND_API_KEY and DNS records | Secrets Manager, Wix domain settings | Phase 4 |
| Stripe Payment Link URL | Settings | Optional, any time |

Open questions for the instructor:

- Does the enquiry alert need to go to a different email than kledrivingschool@gmail.com? Gmail addresses as the reply-to can land replies in spam; a @kledrivingschool.co.uk mailbox would be better if one exists.
- Should the four fixed slots remain the only options, or are custom times common enough to need a free time picker? (The build supports both; the question is what the Add lesson form shows first.)
- Default hourly rate for new pupils: £41 pay-as-you-go, or the package rate when a package is bought?
- Should guardians receive the reminder email by default for pupils under 18, or only when the instructor switches it on per pupil?
- Are there any skills to add or remove from the DVSA-based list, for example motorway driving for pupils who have passed?
- When the GoRoadie links are removed from the public site, should the taster lesson and package prices move onto the Enquire page?
