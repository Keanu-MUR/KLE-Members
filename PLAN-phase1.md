# Phase 1 plan — pupils and enquiries

Status: approved 2 Nov 2026 with decisions A to D as recommended and E changed: pupils may change their email.

Outcome (from SPEC.md): the public enquiry form works and the instructor receives it by email; the instructor can manage pupil records and convert an enquiry into a pupil; pupils can edit their own details.

## 1. What Phase 0 fixed in place

Everything here follows the patterns that proved to work on the live site: `.jsw` web modules with declared `export async function`s and per-function entries in `permissions.json`; backend imports made in page code and passed to a `public/portal-pages/*.js` init; one custom element per page on `PortalElement`; routing only in the browser; every portal page created in the Editor with caching set to Never; pushes go live only on an Editor publish.

## 2. Pages (Editor) and elements

| Editor page | Slug | Who | Element tag | Element file | Page module |
|---|---|---|---|---|---|
| Enquire | `enquire` | public | `kle-enquire` | custom-elements/enquire.js | portal-pages/enquire.js |
| Enquiries | `enquiries` | instructor | `kle-enquiries` | custom-elements/enquiries.js | portal-pages/enquiries.js |
| Pupils | `pupils` | instructor | `kle-pupils` | custom-elements/pupils.js | portal-pages/pupils.js |
| Pupil record | `pupil-record` | instructor | `kle-pupil-record` | custom-elements/pupil-record.js | portal-pages/pupil-record.js |
| My details | `my-details` | pupil | `kle-my-details` | custom-elements/my-details.js | portal-pages/my-details.js |

Pupil record opens one pupil by `?id=` in the URL (read by page code with `wix-location`, passed to the element). Every page: hidden from menu and search for now, access Everyone, caching Never, element ID `portal`, stretched. Enquire is the one page that will later join the site menu (checklist item 12).

A small text navigation row is added to the shared element header, under the wordmark, so the pages are reachable without the site menu: instructor sees Today, Pupils, Enquiries; pupil sees Home, My details; guardian sees Home. Text links only, in the body font, no icons. The "Not a pupil yet? Enquire" link on the login page already points at `/enquire`.

## 3. Backend

| File | Functions | Who may call |
|---|---|---|
| `backend/http-functions.js` | `post_enquire` | anyone (public HTTP function at `/_functions/enquire`) |
| `backend/enquiry-pipeline.js` | `validateEnquiry`, `recordEnquiry`, rate-limit check against `RateLimit` | internal |
| `backend/enquiries.jsw` | `listEnquiries(status)`, `getEnquiry(id)`, `replyToEnquiry(id, body)`, `convertEnquiry(id, overrides)`, `closeEnquiry(id)` | instructor |
| `backend/pupils.jsw` | existing `findMemberByEmail`, `createPupil`, plus `listPupils(filter)`, `getPupil(id)`, `updatePupil(id, fields)`, `setPupilStatus(id, status)`, `sendLoginLink(id)` | instructor |
| `backend/me.jsw` | `getMyDetails()`, `updateMyDetails(fields)` | the pupil (guardian read only) |
| `backend/messaging.js` | `sendEmail(templateKey, to, vars)` for the Wix provider, writing a `SendLog` row per attempt; a clearly marked `sendWhatsApp` stub for Phase 4 | internal |

Why an HTTP function for the enquiry: web modules cannot see the caller's IP address, and the spec's rate limit is 5 per hour per IP. `wix-http-functions` exposes the IP on the request, so the Enquire element posts JSON straight to `/_functions/enquire` (same origin, no page-code bridge needed) and the function validates every field, checks the honeypot, counts recent rows in `RateLimit` by a salted SHA-256 of the IP, inserts the Enquiries item with elevated permissions, and triggers the three emails. It returns the same `{ ok, data | error }` shape as everything else.

Convert to pupil: creates the Wix member with `authentication.register` under a random throwaway password (never shown or stored), then sends Wix's set-password email as the "signup link", then creates the Pupils item through the existing `createPupil` with the member ID attached, and marks the enquiry converted with the pupil ID. If a member with that email already exists it is linked instead of created.

Send login link on the pupil record: `authentication.sendSetPasswordEmail` for the pupil's email, same as the login page's button.

My details whitelist: email, phone, addressLine1, addressLine2, town, postcode, emergencyContactName, emergencyContactPhone, reminderEmail, reminderWhatsApp. A changed email is applied with `authentication.changeLoginEmail` from `wix-members-backend` for the caller's own member (checked unused first), then written to the Pupils item, so the pupil logs in with the new address from then on; the page says so next to the field. Licence number and date of birth are shown read-only as the spec says. Ticking WhatsApp sets `whatsAppConsentAt` to now; unticking clears it.

## 4. Email

Provider for this phase is Wix Triggered Emails via `wix-crm-backend`, as the spec defaults. Three templates are created in the dashboard (Developer Tools > Triggered Emails), each with the school's postal address line and the "change your preferences: log in, My details" line the spec requires:

| Template ID | To | Variables |
|---|---|---|
| `enquiryConfirmation` | the enquirer (a contact, created or matched by email) | firstName, preferredContact |
| `enquiryAlert` | the instructor (member) | name, summary (one line built in code), link to the Enquiries page |
| `enquiryReply` | the enquirer | firstName, p1, p2, p3, p4 (one paragraph each; variables cannot carry line breaks) |

As built: IDs VZpOgVC, VZpQOuG, VZpRqqd; see docs/emails.md. Sending moved out of the HTTP function (Wix answers FORBIDDEN there): the page calls `notifyEnquiry` in `backend/enquire.jsw` with a single-use token after the enquiry is stored.

The reply form on the Enquiries page starts with the standard first-lesson text and the instructor can edit it before sending. That standard text is a placeholder until the instructor supplies it (decision C below). Every send writes a `SendLog` row with channel `email`, as the spec requires for alerts; `lessonId` is empty for enquiry mail.

The WhatsApp alert is a clearly marked hook in `messaging.js` that logs a `skipped` row with reason "WhatsApp arrives in Phase 4".

## 5. UI, per the design brief

- Enquire: labels above full-width fields; full name, email, phone, date of birth, address line 1, postcode, manual or automatic (two radio buttons), preferred contact (three radio buttons), message; one primary button. Inline validation in plain English. Postcode outside the taught areas shows a soft note under the field ("I mostly teach in SE1, SE4, SE8, SE10, SE14, SE15 and SE16. Send it anyway and I'll let you know.") and does not block. The honeypot is a visually hidden field. On success the form is replaced by a confirmation: "Thanks, Jamie. I have your enquiry and will be in touch by email within a day."
- Enquiries: status filter as text buttons (New, Replied, Converted, Closed), then a plain list: name in bold, postcode and transmission, preferred contact, a dashed divider only between days. Opening one shows the message and three actions: Reply (primary), Convert to pupil, Close.
- Pupils: a search box and status filter, then a plain list of name, transmission, status. Opening one goes to the pupil record.
- Pupil record: every Pupils field in sections (Contact, Address, Licence and tests, Guardian, Reminders, Notes), editable in place with one Save button; status as a radio group; Send login link as a text button; placeholders for the lesson, progress, mock test, payment and message sections with the Phase 2 and 3 empty-state copy; Delete pupil arrives in Phase 5.
- My details: the whitelist fields, the two tick boxes with the consent wording next to the WhatsApp one, read-only licence number and date of birth, one Save button. Confirmation: "Saved."

All instructor pages are checked at 375px in the local harness before deploy, as the spec's mobile-first rule demands.

## 6. Tests

Node tests for the pure parts: enquiry validation (every field, honeypot, bad postcode, bad phone), the rate-limit window arithmetic, the My details whitelist filter, and the Enquiries item shaping. Existing 16 tests keep passing.

## 7. Decisions needed before I write code

**A. Public HTTP endpoint for the enquiry.** The rate limit by IP forces an HTTP function instead of a web module. It is still our own backend code on Wix, with validation, honeypot and limit. Recommend yes.

**B. Member creation on convert.** Convert to pupil creates the Wix member from backend code with a throwaway password and immediately sends the set-password email. The alternative is the dashboard's manual Set Contacts as Members step for every pupil, which defeats the purpose. Recommend the backend route.

**C. Standard first-lesson text.** The reply template needs the instructor's usual first-lesson paragraph (what to bring, where they meet, the taster price). Until supplied, the template holds a clearly marked placeholder paragraph that the instructor can overwrite in the dashboard at any time.

**D. Instructor alert address.** `Settings.instructorEmail` defaults to the Gmail address from the spec. The alert goes to the instructor's member account (the yahoo address) through Wix's emailMember, because Wix triggered emails address members or contacts, not raw addresses. If the alert must reach the Gmail inbox instead, that address needs to exist as a contact or the member's login email must change. Which inbox should receive enquiry alerts?

**E. Pupil email changes.** Decided 2 Nov 2026: pupils may change their email on My details. Wix supports it through `changeLoginEmail`; if it misbehaves on this site the fallback is Wix's own Account Settings page, which already exists in the Members Area.

## 8. Phase 1 test script (from SPEC.md, expanded)

1. From a private window, open `/enquire` and submit with a bad email, then a postcode outside the area, then a valid form. The first is refused inline, the second shows the soft note and sends, the third sends. Six rapid submissions from the same window are refused on the sixth with "That's enough for now; I'll be in touch about the ones you've sent."
2. The instructor's inbox receives the alert; the enquirer's inbox receives the confirmation; `SendLog` has rows for both.
3. On `/enquiries` as the instructor, the new enquiry appears under New. Reply with the template; the enquirer receives it; status becomes Replied.
4. Convert it. A member is created, the set-password email arrives, the Pupils item exists with the member linked, status Converted, and the enquiry shows the pupil link.
5. On `/pupils`, search finds the new pupil; the record opens; change a field and the status; Save; reload shows the change. Send login link sends the email again.
6. Log in as that pupil (set the password from the email). `/my-details` shows their details; change the phone and tick WhatsApp; Save; `whatsAppConsentAt` is set in the collection. Change the email too and log in with the new address. Licence number and date of birth are not editable.
7. As that pupil, open `/pupil-record?id=<another id>` and `/enquiries`: both redirect to `/pupil-home`, and any direct backend call returns `{ ok: false }`.
8. `npm test` passes with the new tests.

### Results, 2 Nov 2026

Run from the instructor's logged-in Chrome session (the enquiry form is public, so the session only changes the nav row). Two bugs found and fixed on the way, each committed and published:

- Emails sent from the HTTP function failed with FORBIDDEN (ten SendLog rows). Fixed by the token handoff described in docs/emails.md; the confirmation and alert then logged as sent.
- The element re-sends its first request after 1.5 s; the duplicate ran the (slow) send action again and its failure overwrote the result. Page code now ignores a repeated request ID.
- Convert to pupil reported "Wix did not create the member account" although it had: the members collection lags a registration. The member ID is now read from the register() result.

| Step | Result |
|---|---|
| 1 | Pass. Bad email refused inline; BR1 postcode shows the soft note and sends; valid form sends; the sixth submission in the hour is refused with the rate-limit wording. |
| 2 | SendLog rows are `sent` for confirmation and alert. Inbox arrival not checked (no access to the inboxes). |
| 3 | Pass. Reply sent to the enquirer, status Replied. |
| 4 | Pass. Member created (keanu7pokemon+convert@gmail.com), set-password email sent, Pupils item linked, enquiry Converted with a link to the record. |
| 5 | Pass. Search finds the pupil; last name and status (Passed) saved and shown after reload; Send login link reports sent. |
| 6 | Not run: needs the pupil's password, which is set from the email in the test inbox. |
| 7 | Not run: same login needed. |
| 8 | Pass, 26 tests. |

Test data left in place: enquiries from "Test Enquirer" to "Dedupe Check", the pupil Convert Tester Edited, the SendLog rows. The five RateLimit rows from the rate-limit test were deleted in the CMS so the retest was not refused.
