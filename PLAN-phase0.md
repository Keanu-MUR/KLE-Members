# Phase 0 plan — scaffold, login, roles

Status: approved and built 1 Nov 2026. Elements checked in a local harness at 375px; the live test script (section 8) still needs running once the Editor pages exist.

## 0. Environment and repo check (done 1 Nov 2026)

Installed on this PC: Node.js 26 LTS, npm 11, Git 2.56, Wix CLI 1.2.8. The site is connected to GitHub as `Keanu-MUR/KLE-Members`, cloned to `Documents\KLE-Members`.

Repo findings (Phase 0 step 1):

- Layout is the standard Wix Git Integration shape: `wix.config.json`, `src/backend`, `src/pages`, `src/public`, `src/backend/permissions.json`. Nothing unexpected in structure.
- Existing page code files: Home, Road help resources, T&C's, masterPage. These are the marketing pages and are not touched. No Members Area pages are present yet, so the Members Area has not been added or not yet synced.
- `package.json` lists `react 16.14.0` as a devDependency. This is Wix's template default used by `wix sync-types` for editor typings; it is not shipped to the site and is not a UI library in our code. Left as is.
- `permissions.json` currently lets anonymous visitors invoke every web method. Phase 0 tightens the `*` default to site members only and opens individual functions (enquiry insert, session lookup) to anonymous explicitly. Backend role checks remain the real guard.
- Still to collect from the Wix dashboard: the data item limit for SPEC.md, and confirmation that the Instructor role and test members exist.

## 1. Expected repo layout (Wix Git Integration)

Wix generates this; the spec's paths sit under `src/`:

```
wix.config.json          Wix CLI config: site id, UI version
.wix/                    Wix-managed, not edited
src/backend/             Velo backend: *.jsw web modules, *.js helpers, jobs.config
src/public/              shared browser code, incl. custom-elements/
src/pages/               page code, one file per Editor page (created by Wix when the page exists)
```

Anything else present (a `package.json` with UI dependencies, a bundler config) is unexpected and gets reported before I continue.

## 2. Files Phase 0 adds

| File | Purpose |
|---|---|
| `src/public/portal-constants.js` | Skills (key, name, manualOnly), five level names, four slots with times, taught postcodes, status enums, message templates. One file; importable by backend and by custom elements. |
| `src/public/portal-utils.js` | Pure helpers: postcode outward-code check, E.164 phones, slot parsing, London dates in words, age on a date, template filling. Backend, page code and tests share it. |
| `src/backend/access.js` | `getCaller()`, `requireInstructor()`, `requirePupilAccess(pupilId, { write })`, `requireOwnPupil()`, `publicPupil()`, plus `guarded()` which turns any web method body into `{ ok, data }` / `{ ok: false, error }`. Reads the member from the session, never from the client. |
| `src/backend/session.jsw` | `getSession()` for routing (Anyone) and `requestLoginLink(email)` which sends Wix's set-password email with the same reply whether or not the address is a member. |
| `src/backend/portal.jsw` | `getPupilHome()` (own pupil or guardian) and `getInstructorDashboard()` with the setup status. Shapes fixed now, filled in Phase 2. |
| `src/backend/settings.js`, `src/backend/setup.js` | Helpers: Settings load with defaults merged, collection schemas, `checkSetup()` and `createMissingCollections()` via the Wix Data Collections API with `wix-auth` elevation. |
| `src/backend/setup-actions.jsw` | Instructor-only `getSetupStatus()`, `createCollections()` and `ensureSettings()`, driven from the dashboard's setup panel. |
| `src/backend/jobs.config`, `src/backend/permissions.json` | Empty job list; legacy `.jsw` default permission tightened to owner-only. |
| `src/public/custom-elements/portal-base.js` | Base class for every page element: design-brief styles as CSS custom properties, fonts referenced by name, focus rings, dashed dividers, button and form styles, empty-state helper, and the event bridge (below). |
| `src/public/custom-elements/portal-login.js` | `<kle-login>`: own-styled email + password form, "Email me a login link", "Not a pupil yet? Enquire" link, inline validation, and the "not linked to a pupil yet" state. Headline "Your lessons, your progress". |
| `src/public/custom-elements/pupil-home.js` | `<kle-pupil-home>`: the pupil's name, the guardian read-only line, and the four empty states. |
| `src/public/custom-elements/instructor-dashboard.js` | `<kle-instructor-dashboard>`: empty states for today, tomorrow, enquiries, messages, reminders, plus the one-off setup panel while collections or Settings are missing. |
| `src/public/portal-page.js`, `src/public/portal-pages/*.js` | Page-code side of the bridge and role routing, and one `init($w)` per page so each Editor page's code file is two lines (see docs/pages.md). |
| `tests/*.test.mjs` | Node unit tests (`npm test`) for the helpers and constants integrity. |
| `docs/collections.md` | The field and permission list per collection, as manual dashboard steps, in case `createCollections()` cannot run on this plan. |
| `docs/pages.md` | Which Editor pages to create, URL, custom-element tag and file, and page settings. |

## 3. Event bridge (custom element to page code to backend)

Custom elements cannot call Velo. The pattern, fixed for every page:

1. The element dispatches `CustomEvent('portal-request', { detail: { id, action, payload } })`.
2. Page code listens with `$w('#el').on('portal-request', …)`, calls the matching `.jsw` function, and writes the result back with `$w('#el').setAttribute('response', JSON.stringify({ id, ok, data, error }))`.
3. The base class matches `id` to the pending request and resolves a promise, so page elements are written as `const r = await this.call('getSession')`.

The backend shapes every response for the caller's role. The element never filters.

## 4. Login and routing

- Login runs in page code using the Wix Members frontend `authentication.login(email, password)`. On success it calls `getSession()` and redirects: instructor to `/instructor`, pupil to `/pupil-home`, guardian to `/pupil-home` (read-only, Phase 5), `none` to a plain "This account isn't linked to a pupil yet" message.
- Every portal page (except login and enquire) calls `getSession()` on load. Not logged in: redirect to `/pupil-login`. Wrong role for the page: redirect to the right home. Backend functions re-check on every call, so a pupil opening an instructor URL gets both a redirect and `{ ok: false, error }` from any call they try.
- Pages stay public at the Wix level. Setting them "Members only" would trigger Wix's own login popup and defeat the own-styled form. Security is the backend check, as CLAUDE.md rule 2 says.
- "Email me a login link": see decision B below.

## 5. Pages to create in the Wix Editor (Phase 0)

| Editor page name | URL | Custom element tag | Velo file |
|---|---|---|---|
| Pupil login | /pupil-login | `kle-login` | public/custom-elements/portal-login.js |
| Pupil home | /pupil-home | `kle-pupil-home` | public/custom-elements/pupil-home.js |
| Instructor dashboard | /instructor | `kle-instructor-dashboard` | public/custom-elements/instructor-dashboard.js |

For each: add one Custom Element (Add > Embed Code > Custom Element), source "Velo file", the tag above, stretch to full width, element id `#portal`. Hide from search engines and from the site menu until item 12 of the checklist. Later phases add the remaining pages the same way.

## 6. Settings defaults

`emailRemindersOn: true`, `whatsAppRemindersOn: false`, `emailProvider: "wix"`, `instructorEmail: "kledrivingschool@gmail.com"` (pending checklist item 6), `instructorWhatsApp: ""`, `enquiryAlertEmailOn: true`, `enquiryAlertWhatsAppOn: false`, `stripePaymentLinkUrl: ""`, `reminderSendHour: 8`, `bankDetailsText: ""`, `defaultHourlyRatePence: 4100`, `lastExportAt: null`, `lastExportStatus: ""`, `lessonRetentionDays: 120`, `sendLogRetentionDays: 30`, `paymentRetentionDays: 400`.

## 7. Decisions (all resolved 1 Nov 2026, written into SPEC.md and CLAUDE.md)

Outcome: A, yes to all three additions, with RateLimit fields `ipHash, windowStart, count`, Settings fields `bankDetailsText, defaultHourlyRatePence, lastExportAt, lastExportStatus`, and `dateOfBirth` collected on the enquiry form and shown read-only on My details. B, quick option. C, brand colour is the site orange #FF5A25; no logo file exists, the wordmark is text. D, `.web.js`, later reverted to `.jsw` because `.web.js` imports resolve to undefined on this site (2 Nov 2026). E, retention windows made adjustable in Settings with defaults 120 (lessons), 30 (send log) and 400 (payments) days. The original reasoning is kept below for the record.

**A. Data-model gaps in the spec.** Creating the collections is a Phase 0 step, and CLAUDE.md says ask before changing the model, so these need a yes or no now:

| Gap | Proposed addition |
|---|---|
| The hard rules require a `RateLimit` collection; the data model lists nine without it | Create `RateLimit` (ip, windowStart, count) as the tenth collection, backend-only |
| Settings page shows bank details text, a default hourly rate and weekly export status, but Settings has no fields for them | Add `bankDetailsText`, `defaultHourlyRatePence` (4100), `lastExportAt`, `lastExportOk` |
| Reminders go to guardians "for pupils under 18" but Pupils has no date of birth | Add `dateOfBirth` to Pupils |

**B. "Email me a login link".** Wix Members has no built-in passwordless login. Options:

1. Phase 0 uses Wix's set-password email for that button. No data-model change; the pupil sets or resets a password and logs in. Recommended for now.
2. A true one-time link: backend stores a hashed token with expiry (on the Pupils item or a small `LoginLinks` collection), the link page exchanges it for a session token. More code and a model change; can be added in Phase 1 or 5 if wanted.

**C. Brand placeholders.** `BRAND_PRIMARY` and `LOGO_FILE` are due in Phase 0. If they are not ready, the base styles ship with a clearly named placeholder colour and a text wordmark, swapped in one place later.

**D. Web module file type.** CLAUDE.md names `backend/*.jsw`, but Wix's docs now mark `.jsw` as deprecated (still supported) in favour of `.web.js` modules using `webMethod` from `wix-web-module`, which also carry per-function permissions in code. CLAUDE.md rule 7 says prefer the non-deprecated form, so I propose `.web.js` for every web module and will update CLAUDE.md and SPEC.md in the same commit if you agree.

**E. Item budget versus the Light limit.** Wix's CMS limits article gives 1,500 items per site on Light (4,000 on Core), shared across every collection. The spec's budget of "under 3,000" cannot fit. Rough steady state for 30 pupils with the spec's windows: Lessons kept 400 days is about 1,700 items on its own, before SendLog (two rows per lesson for 90 days, about 800), Payments, MockTests and Messages. Proposal, to be confirmed: compact Lessons older than 120 days instead of 400, prune SendLog after 30 days instead of 90, and compact Payments older than 400 days into a yearly total alongside Lessons. That lands near 900 to 1,100 items at steady state, leaving headroom under 1,500. Pupils still see their full lesson history as yearly totals plus the last four months in detail. If you would rather keep the 400-day window, the alternative is to stay on Core.

Two facts from the Wix docs that shape setup: once the site is connected to GitHub, the Editor's code panel becomes read-only and all code changes come through the repo; and a site that has Velo Packages installed cannot be connected at all (npm packages are fine).

## 8. Phase 0 test script

Results on the live site, 2 Nov 2026: steps 1 to 3 done (pages created, collections and Settings created from the dashboard panel; all ten show in the CMS with custom permissions). Step 5 passes (instructor lands on /instructor; opening /pupil-login while logged in redirects there). Step 8 passes (logged out, /pupil-home and /instructor redirect to /pupil-login). Step 9 passes (16 node tests). Steps 4, 6 and 7 wait for a test pupil member.

Two platform facts learnt on the way: a Wix custom element loses a request dispatched synchronously from attributeChangedCallback (fixed in portal-base.js), and creating collections from code logs ten harmless "Sandbox environment is disabled" errors in Wix Logs.

1. Create the three Editor pages per section 5 and publish.
2. Run `createCollections()` once from the instructor account (or follow docs/collections.md); confirm all collections and permissions in the dashboard.
3. Run `ensureSettings()`; confirm one Settings item.
4. Give the instructor's member account the Instructor role; create a test pupil member and a Pupils item with its memberId.
5. Log in as the instructor at /pupil-login: lands on /instructor with the empty dashboard.
6. Log in as the pupil: lands on /pupil-home with the empty home.
7. As the pupil, open /instructor: redirected to /pupil-home; any instructor backend call returns `{ ok: false }`.
8. Logged out, open /pupil-home: redirected to /pupil-login.
9. `node --test tests/` passes locally.
