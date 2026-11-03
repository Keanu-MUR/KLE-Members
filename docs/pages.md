# Portal pages in the Wix Editor

Wix only pushes page code files to GitHub through the Wix CLI local editor, so with the CLI not logged in they never arrive on their own. The workaround that works: create the page in the Editor, read the file name Wix shows in the Page Code panel (for example `Pupil login.b100g.js`, where the suffix is the page ID), create that exact file under `src/pages/`, and push. The Editor then shows the pushed code for the page (confirmed 2 Nov 2026).

## Phase 0 pages

| Editor page name | URL slug | Custom element tag | Velo file | Page code module |
|---|---|---|---|---|
| Pupil login | `pupil-login` | `kle-login` | `public/custom-elements/portal-login.js` | `public/portal-pages/login` |
| Pupil home | `pupil-home` | `kle-pupil-home` | `public/custom-elements/pupil-home.js` | `public/portal-pages/home` |
| Instructor dashboard | `instructor` | `kle-instructor-dashboard` | `public/custom-elements/instructor-dashboard.js` | `public/portal-pages/instructor` |

## Phase 1 pages

| Editor page name | URL slug | Custom element tag | Velo file | Page code file |
|---|---|---|---|---|
| Enquire | `enquire` | `kle-enquire` | `public/custom-elements/enquire.js` | `pages/Enquire.p9xvw.js` |
| Enquiries | `enquiries` | `kle-enquiries` | `public/custom-elements/enquiries.js` | `pages/Enquiries.ym88x.js` |
| Pupils | `pupils` | `kle-pupils` | `public/custom-elements/pupils.js` | `pages/Pupils.fmpye.js` |
| Pupil record | `pupil-record` | `kle-pupil-record` | `public/custom-elements/pupil-record.js` | `pages/Pupil record.w7oqk.js` |
| My details | `my-details` | `kle-my-details` | `public/custom-elements/my-details.js` | `pages/My details.cvhkb.js` |

All five were created on 2 Nov 2026 by duplicating the first (Duplicate copies the element, the caching setting and the menu and index flags), then renaming, changing the slug, and repointing the element to its own file and tag. A backend `.js` and `.jsw` must not share a base name: `backend/enquiries.js` next to `backend/enquiries.jsw` broke the code build, hence `enquiry-pipeline.js`.

## Phase 2 pages (created 2 Nov 2026 by duplicating My details)

| Editor page name | URL slug | Custom element tag | Velo file | Page code file |
|---|---|---|---|---|
| Lessons | `lessons` | `kle-lessons` | `public/custom-elements/lessons.js` | `pages/Lessons.oce21.js` |
| Progress editor | `progress` | `kle-progress-editor` | `public/custom-elements/progress-editor.js` | `pages/Progress editor.zqvgw.js` |
| My lessons | `my-lessons` | `kle-my-lessons` | `public/custom-elements/my-lessons.js` | `pages/My lessons.tuwz2.js` |
| My progress | `my-progress` | `kle-my-progress` | `public/custom-elements/my-progress.js` | `pages/My progress.dtn1j.js` |

Create each by duplicating an existing portal page (same settings: hidden from menu and search, access Everyone, caching Never, element ID `portal`), then rename, set the slug and repoint the element to its file and tag. Page code for each:

```js
// Lessons
import { init } from 'public/portal-pages/lessons';
import { getSession } from 'backend/session';
import { listLessons, getLesson, createLesson, updateLesson } from 'backend/lessons';
$w.onReady(() => init($w, { getSession, listLessons, getLesson, createLesson, updateLesson }));

// Progress editor
import { init } from 'public/portal-pages/progress';
import { getSession } from 'backend/session';
import { getProgress, setSkill } from 'backend/progress';
$w.onReady(() => init($w, { getSession, getProgress, setSkill }));

// My lessons
import { init } from 'public/portal-pages/my-lessons';
import { getSession } from 'backend/session';
import { listMyLessons } from 'backend/lessons';
import { createMessage } from 'backend/messages';
$w.onReady(() => init($w, { getSession, listMyLessons, createMessage }));

// My progress
import { init } from 'public/portal-pages/my-progress';
import { getSession } from 'backend/session';
import { getMyProgress } from 'backend/progress';
$w.onReady(() => init($w, { getSession, getMyProgress }));
```

Two lessons from creating these (2 Nov 2026): read the page ID from the Editor DOM rather than a screenshot (in the browser console, search document.body.innerText for /Name.[A-Za-z0-9]+.js/; dtn1j and oce21 were misread from zoomed images as dtmlj and ooc21, and the page then showed the default template). And type the custom element tag name with real keystrokes (click the field, select all, type, then click elsewhere in the dialog): a value set programmatically shows in the field but is not saved, so the published page kept the duplicated page's tag.

The Pupil record page code (`pages/Pupil record.w7oqk.js`) now also imports `listLessons`, `getProgress`, `listPupilMessages` and `markMessageRead`; it is already pushed.

## Phase 3 page (created 2 Nov 2026 by duplicating My progress)

| Editor page name | URL slug | Custom element tag | Velo file | Page code file |
|---|---|---|---|---|
| My mock tests | `my-mock-tests` | `kle-my-mock-tests` | `public/custom-elements/my-mock-tests.js` | `pages/My mock tests.qwgun.js` |

Page code:

```js
import { init } from 'public/portal-pages/my-mock-tests';
import { getSession } from 'backend/session';
import { listMyMockTests } from 'backend/mock-tests';
$w.onReady(() => init($w, { getSession, listMyMockTests }));
```

The Pupil record and My lessons page code files also gained imports in Phase 3 (mock tests, replies, the pupil's own messages); both are pushed.

## Phase 4 pages (created 2 Nov 2026 by duplicating Pupils)

| Editor page name | URL slug | Custom element tag | Velo file | Page code file |
|---|---|---|---|---|
| Settings | `settings` | `kle-settings` | `public/custom-elements/settings.js` | `pages/Settings.uf14x.js` |
| Tomorrow's reminders | `reminders` | `kle-reminders` | `public/custom-elements/reminders.js` | `pages/Tomorrow's reminders.gc84f.js` |
| Send log | `send-log` | `kle-send-log` | `public/custom-elements/send-log.js` | `pages/Send log.llr3n.js` |

Duplicate Pupils for each (instructor pages). Page code:

```js
// Settings
import { init } from 'public/portal-pages/settings';
import { getSession } from 'backend/session';
import { getSettings, updateSettings } from 'backend/portal-settings';
import { upcomingForTest, testReminder, runPrune } from 'backend/reminders';
$w.onReady(() => init($w, { getSession, getSettings, updateSettings, upcomingForTest, testReminder, runPrune }));

// Tomorrow's reminders
import { init } from 'public/portal-pages/reminders';
import { getSession } from 'backend/session';
import { getTomorrow, resendReminder } from 'backend/reminders';
$w.onReady(() => init($w, { getSession, getTomorrow, resendReminder }));

// Send log
import { init } from 'public/portal-pages/send-log';
import { getSession } from 'backend/session';
import { listSendLog } from 'backend/send-log';
$w.onReady(() => init($w, { getSession, listSendLog }));
```

Scheduled jobs live in `backend/jobs.config` (three: `sendReminders` hourly, `pruneLogs` nightly at 03:00 UTC, `probeJobEmail` hourly at half past, temporary). Jobs only run on the published site, so a publish is needed after any change to them.

## The one-page portal (2 Nov 2026)

Switching between separate Wix pages cost 2 to 3 seconds each (the Wix framework boots, or on an in-site swap fetches and mounts the next page), so the portal is now one Wix page per role:

| Editor page | URL | Element tag | Velo file | Page code file |
|---|---|---|---|---|
| Instructor dashboard (existing page, element repointed) | `/instructor` | `kle-instructor-portal` | `public/custom-elements/instructor-portal.js` | `pages/Instructor dashboard.ve1km.js` |
| Pupil portal (duplicated from Pupil home, slug `pupil`) | `/pupil` | `kle-pupil-portal` | `public/custom-elements/pupil-portal.js` | `pages/Pupil portal.dqjiq.js` |

How it works (`public/custom-elements/portal-shell.js`):

- The shell extends `PortalElement`, draws the brand and nav, and mounts the section element the URL hash names inside its own main (`#home`, `#lessons`, `#pupils`, `#pupil?id=…`, `#enquiries`, `#progress?id=…`, `#reminders`, `#settings`, `#send-log` for the instructor; `#home`, `#lessons`, `#progress`, `#mock-tests`, `#details` for pupils, with `details` pupils only). A hash change swaps the child; nothing else loads.
- A section runs with the `embedded` attribute, so its base renders only its main. Its requests, link clicks (`portal-link`) and address rewrites (`portal-replace`) are relayed by the shell: requests go up to page code on the shell, answers come back down to whichever section is mounted. Links inside sections still use the old paths (`/lessons?id=…`); the shell maps them to hashes, and anything outside the portal goes through page code's `navigate`.
- Page code for each page (`public/portal-pages/instructor-portal.js`, `pupil-portal.js`) exposes every action that role's sections use. Security is unchanged: page code routes by role and every backend call checks the caller.
- The old one-section pages (Pupil home, My lessons, My progress, My mock tests, My details, Lessons, Pupils, Pupil record, Enquiries, Progress editor, Settings, Tomorrow's reminders, Send log) were deleted from the Editor on 2 Nov 2026 and their page code files removed; their old URLs now 404. `PORTAL_PATHS` points at the new locations. `public/portal-redirect.js` stays for any page that needs to send visitors into the portal (`/instructor?s=lessons&id=abc`, because `wixLocation.to()` drops a hash; the shell folds `?s=` into the hash on mount).
- Every element file guards its `customElements.define`, because an old page's bundle defines its element before the redirect and the shell's bundle then loads the same file again on the next page.

## Site header on the portal pages (3 Nov 2026)

The two portal pages hide the Wix site header: the shell element sets `display: none` on `#SITE_HEADER` and removes the Editor's gap above itself (`hideSiteHeader()` in `portal-shell.js`), because page code's `$w('#SITE_HEADER').collapse()` (still called from `mountPortal` with `hideSiteHeader: true`) did not take on the live site. The reason is that the shell draws its own KLE Driving header and the site header's Pupil login button made no sense to someone already logged in. The site footer stays. Login and Enquire keep the site header.

## Phase 5 actions (2 Nov 2026)

Settings section: `latestBackupLinks`, `runExport`, `exportCollection(name)`, `runCompactionNow` in `backend/portal-settings.jsw`. Pupil record: `linkGuardian(id, email)`, `unlinkGuardian(id)`, `sendGuardianLoginLink(id)`, `exportPupil(id)`, `deletePupil(id, confirmName)` in `backend/pupils.jsw`. Jobs: `exportBackup` weekly (Monday 02:00 UTC), compaction inside the nightly `pruneLogs`. Backup files live in the Media Manager under `/portal-backups/<date>/` as private documents; the list is `Settings.backups`. See PLAN-phase5.md and HANDOVER.md.

## What the browser keeps between pages (added 2 Nov 2026)

Every portal page is a full Wix page load, and the session and the page's data each take a round trip to the backend, so a page used to open as a bare wordmark with no nav (looking signed out) until the session arrived, then load its data. `PortalElement` in `public/custom-elements/portal-base.js` now keeps two things in the tab's `sessionStorage`:

- the last session page code handed any element (`kle.session`), applied the moment the next element connects so the nav and the role are right at once; page code's real session replaces it and, when it is identical, nothing re-renders;
- the last answer to each read action (`kle.data.<path>.<action>.<payload>`, actions named `get*` or `list*`, 30-minute limit), returned at once while the real answer is fetched; if the real answer differs the element runs `onSession()` again with it.

Any other action (a save, send, create or delete) empties the data cache first, and `logout` empties everything, so a change is never followed by a stale list. Routing and security are unchanged: page code still verifies the session on every page and the backend checks every call. A visitor whose login has expired may see the cached nav for a moment before page code sends them to the login page.

Links inside an element (the nav, lesson rows, "Send log") no longer reload the whole site. The base intercepts a plain left click on a same-site path and asks page code to call `wixLocation.to(path)` (the `navigate` built-in action), which swaps the Wix page in place and skips the two to three seconds the Wix framework takes to boot on a full load. The href is kept, so middle clicks, new tabs and the harness still work; if page code does not answer within 1.2 seconds the element falls back to a normal load.

The element also re-sends an unanswered first request every half second (up to eight times) until page code has answered once, instead of once after 1.5 seconds, because Wix wires the event bridge a moment after the element appears.

## Creating a page

1. Pages & Menu > Add Page > Blank page. Name it as in the table.
2. Page settings > Page Info: set the URL slug as in the table. Under SEO, hide the page from search engines. Untick "Show in menu" for now (checklist item 12 adds Pupil login and Enquire to the menu later).
3. Page settings > Page info > Advanced settings: turn on **Manually control caching for this page** and choose **Never (disable caching)**. Portal pages render differently per member, and Wix otherwise caches the server-rendered response for the URL (on 2 Nov 2026 the pupil was served the instructor's cached redirect). Page code also routes only in the browser for the same reason.
4. Page settings > Permissions: leave as **Everyone**. Setting "Members only" would trigger Wix's own login popup over our form. The page code redirects visitors who should not be there, and every backend call checks the role again.
5. Add > Embed Code > Custom Element. In its settings choose **Velo file** as the source, pick the file from the table, and type the tag name exactly. In the element's Properties panel (Dev Mode) set its ID to `portal`.
6. Stretch the element to full width and let it set the page height. Delete any other element Wix placed on the page.
7. Publish. Wix pushes a file such as `src/pages/Pupil login.abc12.js` to the repo.
8. Locally: `git pull`, open that file, replace its contents with the matching snippet below, commit and push. Wix publishes from the default branch.

## Page code snippets

Page code must hold the backend imports itself: a public file cannot resolve a web module (its import comes back undefined), so each page passes the functions it needs into `init`.

Pupil login:

```js
import { init } from 'public/portal-pages/login';
import { getSession, requestLoginLink } from 'backend/session';

$w.onReady(() => init($w, { getSession, requestLoginLink }));
```

Pupil home:

```js
import { init } from 'public/portal-pages/home';
import { getSession } from 'backend/session';
import { getPupilHome } from 'backend/portal';

$w.onReady(() => init($w, { getSession, getPupilHome }));
```

Instructor dashboard:

```js
import { init } from 'public/portal-pages/instructor';
import { getSession } from 'backend/session';
import { getInstructorDashboard } from 'backend/portal';
import { createCollections, ensureSettings } from 'backend/setup-actions';
import { findMemberByEmail, createPupil } from 'backend/pupils';

$w.onReady(() => init($w, { getSession, getInstructorDashboard, createCollections, ensureSettings, findMemberByEmail, createPupil }));
```

## First run

1. Give the instructor's member account the **Instructor** role (Dashboard > Site Members > Roles).
2. Log in at `/pupil-login` as the instructor. The dashboard shows a setup panel because the collections do not exist yet. Press **Create collections**. It creates the ten collections with admin-only permissions and the single Settings item, then the panel disappears.
3. If that step fails on this plan, follow `docs/collections.md` to create them by hand, then press **Create settings**.
4. Create a test pupil member: add a contact with the test email, then Site Members > More Actions > Set Contacts as Members (Wix emails a set-password link). Create the Pupils record with the instructor-only `createPupil` function in `backend/pupils.jsw`, which finds the member by login email and links it. Until Phase 1 adds the Pupils screen, call it from the dashboard page by dispatching a `portal-request` event with action `createPupil` and the pupil fields.
5. Log in as the pupil: `/pupil-home` shows their name and the four empty states. Opening `/instructor` sends them back to `/pupil-home`.

## Deploying code

Pushing to `main` updates what the Editor shows, but the live site only picks up new code when the site is published (Editor **Publish**, or `wix publish` from the CLI). After every push that should go live, publish.

Two more findings from the evening of 2 Nov 2026. Never work in the Editor while someone else has it open in another browser: the Editor shows "Changes were made in another browser" and the refresh it asks for drops whatever the other session did not have (a whole new page was lost that way). And when a publish stops with "Errors occurred during code build", the build log (Open build.log) names the file and line; a duplicate import in a `.jsw` was one such error, invisible to the lint script until it covered `.jsw` files.

A finding from later the same day changes this: the API publish publishes the Editor's last **saved** revision, and code the Editor pulls from GitHub is only saved when the Editor next saves something. Two pages went live with stale page code that way. So after a code push, publish from the Editor's Publish button (it saves first), or make any autosaved change in the Editor before an API publish. The API publish remains fine when no new code is involved: `POST https://www.wixapis.com/site-publisher/v1/site/publish` at site scope (site ID b90f2839-ee94-4152-9d9a-8a16bc7a54c2), per the "Rename, Duplicate, Publish or Delete a Site" recipe. Give the Editor about 40 seconds after a push to pull the commit first. The same connector reads and writes the collections through the Data Items API (`/wix-data/v2/items/query`, `/count`), which replaces opening the CMS in the dashboard to check SendLog or RateLimit. It does not touch Velo code: code still travels push to GitHub, Editor pulls, publish.

`src/backend/permissions.json` lists every web-module function: `getSession` and `requestLoginLink` are open to anyone, the rest to members. Web modules are `.jsw` files on this site: a `.web.js` module imports as undefined on this Git Integration build (confirmed on the live site 2 Nov 2026). Function permissions live in `permissions.json`, with the role check inside each function as the real guard.
