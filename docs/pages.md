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

Since 2 Nov 2026 the publish is made by API through the Wix MCP connector (the user chose this over clicking Publish in the Editor; confirmed working the same day): `POST https://www.wixapis.com/site-publisher/v1/site/publish` at site scope (site ID b90f2839-ee94-4152-9d9a-8a16bc7a54c2), per the "Rename, Duplicate, Publish or Delete a Site" recipe. Give the Editor about 40 seconds after a push to pull the commit first. The same connector reads and writes the collections through the Data Items API (`/wix-data/v2/items/query`, `/count`), which replaces opening the CMS in the dashboard to check SendLog or RateLimit. It does not touch Velo code: code still travels push to GitHub, Editor pulls, publish.

`src/backend/permissions.json` lists every web-module function: `getSession` and `requestLoginLink` are open to anyone, the rest to members. Web modules are `.jsw` files on this site: a `.web.js` module imports as undefined on this Git Integration build (confirmed on the live site 2 Nov 2026). Function permissions live in `permissions.json`, with the role check inside each function as the real guard.
