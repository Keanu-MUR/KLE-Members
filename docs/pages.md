# Portal pages in the Wix Editor

Wix only pushes page code files to GitHub through the Wix CLI local editor, so with the CLI not logged in they never arrive on their own. The workaround that works: create the page in the Editor, read the file name Wix shows in the Page Code panel (for example `Pupil login.b100g.js`, where the suffix is the page ID), create that exact file under `src/pages/`, and push. The Editor then shows the pushed code for the page (confirmed 2 Nov 2026).

## Phase 0 pages

| Editor page name | URL slug | Custom element tag | Velo file | Page code module |
|---|---|---|---|---|
| Pupil login | `pupil-login` | `kle-login` | `public/custom-elements/portal-login.js` | `public/portal-pages/login` |
| Pupil home | `pupil-home` | `kle-pupil-home` | `public/custom-elements/pupil-home.js` | `public/portal-pages/home` |
| Instructor dashboard | `instructor` | `kle-instructor-dashboard` | `public/custom-elements/instructor-dashboard.js` | `public/portal-pages/instructor` |

## Creating a page

1. Pages & Menu > Add Page > Blank page. Name it as in the table.
2. Page settings > Page Info: set the URL slug as in the table. Under SEO, hide the page from search engines. Untick "Show in menu" for now (checklist item 12 adds Pupil login and Enquire to the menu later).
3. Page settings > Permissions: leave as **Everyone**. Setting "Members only" would trigger Wix's own login popup over our form. The page code redirects visitors who should not be there, and every backend call checks the role again.
4. Add > Embed Code > Custom Element. In its settings choose **Velo file** as the source, pick the file from the table, and type the tag name exactly. In the element's Properties panel (Dev Mode) set its ID to `portal`.
5. Stretch the element to full width and let it set the page height. Delete any other element Wix placed on the page.
6. Publish. Wix pushes a file such as `src/pages/Pupil login.abc12.js` to the repo.
7. Locally: `git pull`, open that file, replace its contents with the matching snippet below, commit and push. Wix publishes from the default branch.

## Page code snippets

Pupil login:

```js
import { init } from 'public/portal-pages/login';
$w.onReady(() => init($w));
```

Pupil home:

```js
import { init } from 'public/portal-pages/home';
$w.onReady(() => init($w));
```

Instructor dashboard:

```js
import { init } from 'public/portal-pages/instructor';
$w.onReady(() => init($w));
```

## First run

1. Give the instructor's member account the **Instructor** role (Dashboard > Site Members > Roles).
2. Log in at `/pupil-login` as the instructor. The dashboard shows a setup panel because the collections do not exist yet. Press **Create collections**. It creates the ten collections with admin-only permissions and the single Settings item, then the panel disappears.
3. If that step fails on this plan, follow `docs/collections.md` to create them by hand, then press **Create settings**.
4. Create a test pupil member in the dashboard, and in the Pupils collection add an item whose `memberId` is that member's ID and whose `firstName`, `lastName`, `transmission` and `status` are filled. (Phase 1 adds the instructor's own Pupils screen for this.)
5. Log in as the pupil: `/pupil-home` shows their name and the four empty states. Opening `/instructor` sends them back to `/pupil-home`.

## Deploying code

Pushing to `main` updates what the Editor shows, but the live site only picks up new code when the site is published (Editor **Publish**, or `wix publish` from the CLI). After every push that should go live, publish.

`src/backend/permissions.json` must keep its wildcard open (`siteOwner`, `siteMember` and `anonymous` all `true`). Wix applies that file to `.web.js` modules as well as legacy `.jsw`, and a tightened wildcard silently refuses every call from the browser. The real permission of each function is the one declared in code with `webMethod(Permissions.X, ...)`, backed by `requireInstructor()` and friends.
