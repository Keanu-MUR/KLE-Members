# Portal pages in the Wix Editor

Page code files cannot be created from the repo. Create each page in the Editor, let Wix push its code file to GitHub, pull, then paste the two-line page code below into that file.

## Phase 0 pages

| Editor page name | URL slug | Custom element tag | Velo file | Page code module |
|---|---|---|---|---|
| Pupil login | `pupils/login` | `kle-login` | `public/custom-elements/portal-login.js` | `public/portal-pages/login` |
| Pupil home | `pupils/home` | `kle-pupil-home` | `public/custom-elements/pupil-home.js` | `public/portal-pages/home` |
| Instructor dashboard | `pupils/instructor` | `kle-instructor-dashboard` | `public/custom-elements/instructor-dashboard.js` | `public/portal-pages/instructor` |

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
2. Log in at `/pupils/login` as the instructor. The dashboard shows a setup panel because the collections do not exist yet. Press **Create collections**. It creates the ten collections with admin-only permissions and the single Settings item, then the panel disappears.
3. If that step fails on this plan, follow `docs/collections.md` to create them by hand, then press **Create settings**.
4. Create a test pupil member in the dashboard, and in the Pupils collection add an item whose `memberId` is that member's ID and whose `firstName`, `lastName`, `transmission` and `status` are filled. (Phase 1 adds the instructor's own Pupils screen for this.)
5. Log in as the pupil: `/pupils/home` shows their name and the four empty states. Opening `/pupils/instructor` sends them back to `/pupils/home`.
