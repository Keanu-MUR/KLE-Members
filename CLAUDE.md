# KLE Driving School — Pupil Portal

Read SPEC.md before any work. It holds the data model, pages, messaging rules, design brief and phase plan. This file holds the rules that never change.

## What this is
A pupil portal for a single-instructor UK driving school, built INSIDE the school's existing Wix site (kledrivingschool.co.uk, classic Wix Editor, Velo dev mode, Git Integration + Wix CLI). Three roles: instructor, pupil, guardian (read-only, linked to one pupil). No self-booking: only the instructor creates or edits lessons. No multi-instructor features. No diary/calendar view.

## Stack — fixed, do not substitute
- Platform: Wix (classic Editor) + Velo. Backend = Velo web modules (`backend/*.web.js` using `webMethod` from `wix-web-module`; no new `.jsw` files, that format is deprecated) and `backend/jobs.config` scheduled jobs. Data = Wix Data collections. Auth = Wix Members. Secrets = Wix Secrets Manager.
- UI: Wix custom elements (web components) hosted in Velo under `public/custom-elements/`. Plain ES2015+ JavaScript, HTML and CSS. No frameworks, no build step, no npm UI libraries.
- Email: Wix Triggered Emails by default; Resend via backend `fetch` when `Settings.emailProvider = "resend"`.
- WhatsApp: Meta WhatsApp Cloud API directly via backend `fetch` (no BSP).
- SMS: none. Do not add Twilio or any SMS provider.
- Payments: none in-app. An optional Stripe Payment Link URL shown as a button; no Wix Payments, no Stripe SDK.

## Hard rules
1. Light-plan safe: use nothing that requires Wix Core or above. No Wix Bookings, Stores, Payments, Forms, Events, Pricing Plans. Build forms as our own custom elements writing to our own collections.
2. Every backend function that reads or writes instructor-only data MUST verify the caller is the instructor (member role "Instructor") on the server. Hiding a page is not security.
3. Pupils and guardians may only ever read their own records. Enforce with collection permissions AND backend checks.
4. Lean data: the site must stay under the Light plan's 1,500-item limit. One `Progress` item per pupil holding the whole skills grid as JSON; `SendLog` and `RateLimit` pruned, and `Lessons` and `Payments` compacted into `Pupils.lessonHistory` and deleted (after the weekly export), on retention windows held in `Settings` (defaults 30, 120 and 400 days). Never create per-skill or per-reminder-attempt items that grow without bound.
5. Fail soft: each notification channel is wrapped in its own try/catch; one channel failing never stops another or the job. Every attempt, success or failure, is written to `SendLog`.
6. All times are Europe/London. Store ISO-8601 strings; display in local time.
7. No host-specific or Core-only Wix APIs. Prefer the smallest stable API surface. Check the Velo-to-SDK mapping before using a Velo API flagged as deprecated; prefer the SDK equivalent where both exist.
8. Pin nothing externally: no CDN scripts, no external hosting of custom elements. Everything lives in this repo.
9. Don't invent UI. Follow the design brief in SPEC.md. No gradients, no emoji, no stock imagery, no "Welcome back, Name!" patterns.
10. Ask before: adding any dependency, changing the data model, or touching anything outside the portal pages.

## Working rules
- Start each phase by writing a short plan and waiting for approval (plan mode).
- One commit per completed feature, message in imperative mood.
- After each phase, run the manual test script for that phase in SPEC.md and report results.
- When a Wix API is unclear, use the Wix skills/MCP docs in this repo before guessing.
- Keep SPEC.md updated: if a decision changes, change SPEC.md in the same commit.
