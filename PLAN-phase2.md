# Phase 2 plan — lessons and progress
Status: approved 2 Nov 2026 with decisions A to E as recommended. Built, published and tested the same day (results in section 9); the pupil-side steps await a pupil login.

Outcome (from SPEC.md): the instructor adds and edits lessons and sets progress; pupils see both. Pupil Home and the Instructor Dashboard show real data.

## Context

Phases 0 and 1 are live and tested. Everything here follows the patterns that work on the site: `.jsw` web modules with declared `export async function`s and entries in `permissions.json`; backend imports made in page code and passed into a `public/portal-pages/*.js` init; one custom element per page on `PortalElement` (`public/custom-elements/portal-base.js`); browser-only routing; pages created in the Editor with caching Never and the element ID `portal`.

No data-model change: Lessons, Progress and Messages are used exactly as SPEC.md defines them (one Progress item per pupil holding the whole grid as JSON).

## 0. Working alongside the design work

You are designing the site in the Editor right now, so two things wait for your word:

- **Creating the four new Editor pages.** Opening the Editor in a second session while you are in it risks a "being edited elsewhere" takeover. I build and commit all the code first; the pages are created only when you say the Editor is free (or you create them yourself from the six steps in docs/pages.md, which takes about two minutes each by duplicating an existing portal page).
- **Publishing.** A publish, by API or in the Editor, puts your in-progress design live too. I will not publish until you say the design is ready, or you publish yourself (which also deploys the pushed code).

Pushes to `main` do not touch your design: they only update the read-only code view in the Editor.

## 1. The progress grid first

SPEC.md asks to see the grid before it is wired. Step one after approval: build `public/custom-elements/progress-grid.js` (shared render function + CSS used by both the editor and the pupil view) and screenshot it in the local harness at 375px, with sample data, for your sign-off before any backend work.

The card follows the design brief: one row per skill; five short blocks that fill left to right in brand orange; the current level's block carries a small white L on red; skill name left, level word right ("Prompted"); note and "updated 4 November" underneath in secondary text; a dashed road-marking rule between groups, not every row; readable by a screen reader as "Roundabouts, level 3 of 5, prompted". Manual-only skills (clutch control) hidden for automatic pupils. No percentages, no charts.

## 2. Pages (Editor) and elements

| Editor page | Slug | Who | Element tag | Element file | Page module |
|---|---|---|---|---|---|
| Lessons | `lessons` | instructor | `kle-lessons` | custom-elements/lessons.js | portal-pages/lessons.js |
| Progress editor | `progress` | instructor | `kle-progress-editor` | custom-elements/progress-editor.js | portal-pages/progress.js |
| My lessons | `my-lessons` | pupil, guardian | `kle-my-lessons` | custom-elements/my-lessons.js | portal-pages/my-lessons.js |
| My progress | `my-progress` | pupil, guardian | `kle-my-progress` | custom-elements/my-progress.js | portal-pages/my-progress.js |

Four pages, not six: the Add/Edit lesson form lives inside the Lessons page (opened by `?id=<lessonId>`, `?new=1`, or `?pupil=<pupilId>&new=1` from a pupil record), and the progress editor opens one pupil by `?id=<pupilId>`. Same page settings as Phase 1: hidden from menu and search, access Everyone, caching Never, element ID `portal`, stretched.

Navigation row (`NAV_BY_ROLE` in portal-constants.js): instructor Today, Lessons, Pupils, Enquiries; pupil Home, Lessons, Progress, My details; guardian Home, Lessons, Progress. `PAGE_ROLES` in portal-page.js gains the four pages.

Existing elements filled in:

- `pupil-home.js`: next lesson (date in small caps, slot name strongest, pick-up), the one-line progress summary ("14 of 21 skills at level 4 or above"), latest instructor summary. Balance stays as its empty state until Phase 3.
- `instructor-dashboard.js`: today's and tomorrow's lessons as rows linking to the lesson form, counts of new enquiries and unread messages linking to their pages, "Add lesson" as the page's primary action.
- `pupil-record.js`: Lessons section shows the last five with a link to the full list filtered by pupil and an "Add lesson" link; Progress section shows the summary with "Edit progress" linking to `/progress?id=`; Messages section lists this pupil's change requests with a "Mark read" text button.

## 3. Backend

| File | Functions | Who may call |
|---|---|---|
| `backend/lessons.jsw` | `listLessons({ from, to, pupilId, status })`, `getLesson(id)` (with the active pupil list for the form), `createLesson(fields)`, `updateLesson(id, fields)` (status, summary, notes, time and pick-up), `listMyLessons()` | instructor; `listMyLessons` pupil and guardian |
| `backend/lesson-store.js` | shape, validation (date, pupil exists, `parseSlot` from portal-utils for slot or custom time, pick-up required, status enum), overlap check, queries by date range | internal |
| `backend/progress.jsw` | `getProgress(pupilId)`, `setSkill(pupilId, skillKey, level, note)` (reads or creates the single Progress item, sets `skills[skillKey] = { level, note, updatedAt }`, saves at once), `getMyProgress()` | instructor; `getMyProgress` pupil and guardian |
| `backend/messages.jsw` | `createMessage(body)` (Request a change, pupils only, not guardians), `listPupilMessages(pupilId)`, `markMessageRead(id)` | pupil; instructor |
| `backend/portal.jsw` | `getPupilHome` and `getInstructorDashboard` filled with the data above | as now |

Access checks reuse `requireInstructor`, `requirePupilAccess(pupilId)` and `requireOwnPupil()` from `backend/access.js`. All reads use `suppressAuth` after the check, as today. The Phase 1 generator script regenerates `permissions.json` (all new functions members-only).

Pure helpers added to `public/portal-utils.js`, with tests: `weekRanges(today)` (Monday to Sunday for this week and next), `groupLessonsByDay(lessons)`, `lessonTimeLabel(lesson)` (reuses `slotTimeWords`), `visibleSkills(transmission)`, `progressSummary(skills, transmission)`, `lessonsOverlap(a, b)`, `validateLesson(input)`.

Lesson rules: a lesson needs a pupil, a date, a slot or a valid custom start time and duration (30 to 480 minutes), and a pick-up location. Two planned lessons may not overlap in time on the same day (plain message: "That clashes with Jamie's lesson at 10:00."). Status moves freely between planned, completed, cancelled and no-show; the pupil summary and private notes can be edited at any status. `pupilSummary` is shown to the pupil, `instructorNotes` never leaves the instructor's calls (`listMyLessons` strips it).

## 4. Pupil pages

- **My lessons**: Upcoming (date, slot, pick-up), then Past with the instructor's summary under each; cancelled and no-show shown with their status word. Compacted years from `Pupils.lessonHistory` shown as one line each ("2025: 24 lessons, 48 hours") once the retention job exists; for now the field is empty and the line is skipped. "Request a change" opens a short message form (textarea, one Send button) that writes a Messages item; confirmation copy: "Sent. I'll reply by email or WhatsApp." Guardians see the lists without the form.
- **My progress**: theory status and practical test date at the top from the Pupils item, then the grid read-only, then the date last updated. Empty state before any skill is set: "Your driver's record will appear here after your first lesson."

Both work one column at 375px; the grid blocks stay tappable size (44px high) in the editor and compact in the read view.

## 5. Tests and harness

`tests/phase2.test.mjs` covers the helpers above (week ranges across a year boundary and BST, grouping order, overlap, validation, summary counts with manual-only skills hidden). The scratchpad harness gets fixtures for the four new elements so each is checked at 375px before publish.

## 6. Decisions needed before I write code

**A. Progress editor as its own page.** SPEC lists it as a page and the pupil record is already long; a separate `/progress?id=` page is easier one-handed. Recommended: own page, with the pupil record showing the summary and an "Edit progress" link.

**B. Lesson form inside the Lessons page.** Saves an Editor page and keeps the list and form together. Recommended: yes.

**C. Overlapping lessons.** Refuse a planned lesson that overlaps another planned lesson on the same day, with the clash named. Recommended: refuse (the instructor can cancel the other first).

**D. Marking a lesson completed.** Summary optional at that moment; the form nudges with "Add a line Jamie will see" but does not block. Recommended: optional.

**E. Editor pages and publishing.** As in section 0: I build and commit everything; you tell me when the Editor is free for the four pages (or create them yourself), and nothing is published until you say the design is ready. Recommended: that.

## 7. Phase 2 test script (from SPEC.md, expanded)

1. As the instructor, add six lessons for Test Pupil across this week and next: four slot lessons, one custom time, one that clashes (refused with the clash named). `/lessons` shows them grouped by day under This week and Next week; today's and tomorrow's also appear on `/instructor`.
2. Open one lesson, mark it completed with a summary and a private note; Save; the row shows Completed. Mark another cancelled.
3. Open `/progress?id=<Test Pupil>`, set ten skills to levels 1 to 5 with two notes. Each tap saves at once (the Progress item in the CMS shows the JSON); reload shows the same grid.
4. Log in as Test Pupil in a private window at 375px wide: `/pupil-home` shows the next lesson, "n of 21 skills at level 4 or above", and the latest summary; `/my-lessons` shows upcoming and past with the summary, no private notes anywhere in the page source; `/my-progress` shows the grid with the two notes and the L on the current block. Switch the pupil to automatic in the record and confirm clutch control disappears.
5. As the pupil, send a change request. On the instructor side it appears on the pupil record and the dashboard count; Mark read clears the count.
6. As the pupil, open `/lessons` and `/progress?id=`: both redirect to `/pupil-home`; direct calls to the instructor functions return `{ ok: false }`.
7. `npm test` passes with the new tests.

## 9. Results, 2 Nov 2026

Pages created in the Editor by duplicating My details: My progress (dtn1j), My lessons (tuwz2), Lessons (oce21), Progress editor (zqvgw). Two things went wrong on the way and are now in docs/pages.md: the custom element tag name set programmatically was not saved (retyped with real keystrokes and verified), and two page IDs were misread from screenshots (now read from the Editor DOM). A third finding changed the deploy routine: the API publish only publishes the Editor's last saved revision, so after a code push the publish must come from the Editor's own button (or follow an autosaved Editor change); see docs/pages.md.

| Step | Result |
|---|---|
| 1 | Pass. Five lessons added for Test Pupil across this week and next (one custom 11:15 for 90 minutes); the sixth, a custom 11:00 on 3 November, was refused with "That clashes with Test’s lesson at 10:00." /lessons groups them under This week and Next week; /instructor shows today's and tomorrow's. |
| 2 | Pass. 3 November marked completed with a summary and a private note; 4 November cancelled; both show their status word in the list and on the pupil record. |
| 3 | Pass. Ten skills set on /progress with two notes; the single Progress item holds all ten as JSON; a reload shows the same grid and "4 of 21 skills at level 4 or above". |
| 4 | Not run: needs the pupil's login. The summary and the progress link also appear on the pupil record. |
| 5 | Not run: needs the pupil's login (Request a change). |
| 6 | Partly: /my-lessons as the instructor redirects to /instructor, as designed. The pupil-side bounce needs the pupil's login. |
| 7 | Pass, 37 tests. |

Test data left in place: the five lessons and the Progress item for Test Pupil.

## 8. Order of work

1. Grid HTML/CSS in the harness, screenshot to you, adjust.
2. Constants, utils and tests.
3. Backend modules and permissions.
4. Elements and page modules; fill Home, Dashboard and Pupil record; harness check at 375px.
5. Commit per feature, push. Then, on your word: four Editor pages, page code files, publish, test script, results into PLAN-phase2.md and docs.
