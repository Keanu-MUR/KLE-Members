# Light-plan audit (2 Nov 2026)

Every Wix API and feature the portal uses, with what it needs. None requires the Core plan or above; everything runs on the Light plan the site is on. Wix's own limits that matter: 1,500 collection items (tracked on Settings), 2 GB media storage (the weekly backups are a few hundred KB each), one sender for triggered emails.

| Used | Where | Plan need |
|---|---|---|
| Velo (Dev Mode), page code, public and backend modules, Git Integration | everything | Free and up |
| Custom elements (web components) from Velo files | `public/custom-elements/*` | Free and up (custom elements render on any plan; they need a connected domain, which the site has) |
| Wix Data collections, `wix-data` queries, inserts, updates, bulkRemove, `suppressAuth` | all backend modules | Free and up; the 1,500-item cap is the Light plan limit |
| Wix Members: `wix-members-backend` (currentMember, authentication.register, sendSetPasswordEmail, approveByToken, members.getMember, members.deleteMember) and `wix-members-frontend` (login, logout) | `backend/access.js`, `pupil-store.js`, `pupils.jsw`, `session.jsw`, `public/portal-page.js` | Free and up (Members Area app installed) |
| Member roles (the "Instructor" role) | `backend/access.js` | Free and up |
| `Members/PrivateMembersData` collection read | `backend/pupil-store.js` | Free and up |
| Wix CRM: `wix-crm-backend` contacts.deleteContact; triggered emails via `wix-crm-backend` emailContact / emailMember | `backend/pupils.jsw`, `backend/messaging.js` | Free and up; triggered emails are limited by the plan's monthly email quota, not the feature |
| Triggered Emails (three templates in the dashboard) | `EMAIL_TEMPLATES` | Free and up (one sender on Light) |
| Secrets Manager (`wix-secrets-backend`) | `backend/messaging.js` | Free and up |
| reCAPTCHA: the `$w` reCAPTCHA element on the Enquire page and `wix-captcha-backend` authorize() | `public/portal-pages/enquire.js`, `backend/enquiry-pipeline.js` | Free and up; Wix supplies the Google keys, so no Google account or charge |
| `wix-fetch` to Resend and the Meta WhatsApp Cloud API | `backend/messaging.js` | Free and up (external services, dormant until their secrets exist) |
| Scheduled jobs (`backend/jobs.config`: hourly reminders, nightly prune and compaction, weekly backup) | `backend/jobs.js` | Free and up (up to 20 jobs; the site uses 3) |
| HTTP functions (`backend/http-functions.js`, the public enquiry endpoint) | `backend/http-functions.js` | Free and up |
| Media Manager (`wix-media-backend` upload, getDownloadUrl, moveFilesToTrash) for private backup files | `backend/backup.js` | Free and up; storage counts against the plan's 2 GB |
| `wix-location`, `wix-window-frontend` (rendering env, query) | `public/portal-page.js`, `portal-redirect.js` | Free and up |
| Page caching control ("Never") on the portal pages | Editor page settings | Free and up |

Not used, by design: Wix Bookings, Stores, Payments, Forms, Events, Pricing Plans, Automations, Wix Blocks, any paid app, any CDN script, Twilio or SMS, Stripe SDK. The site still has no dependency outside this repository and the Wix platform.
