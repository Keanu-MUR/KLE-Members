# Triggered emails

Set up in the Wix dashboard on 2 Nov 2026 (Developer Tools > Triggered Emails). IDs live in `EMAIL_TEMPLATES` in `src/public/portal-constants.js`.

| Key | Wix email ID | Subject | Variables |
|---|---|---|---|
| enquiryConfirmation | VZpOgVC | Your enquiry to KLE Driving School | firstName, preferredContact |
| enquiryAlert | VZpQOuG | New enquiry from the website | name, summary, link |
| enquiryReply | VZpRqqd | Your driving lessons with KLE | firstName, p1, p2, p3, p4 |
| lessonReminder | VZqtht5 | Your driving lesson tomorrow | firstName, body, link |

Sender: "KLE Driving School", reply-to mkledian@yahoo.com (the Light plan allows one sender). The Wix footer branding cannot be removed on Light.

## Editing a template

- Variables must be inserted with the editor's Add Variable dialog. Typing `{{name}}` into the text produces plain text, not a variable.
- The reply email is plain text split into up to four paragraphs (p1 to p4) because triggered-email variables cannot carry line breaks. A fifth paragraph and beyond are joined onto p4.
- The alert's `summary` is one line built in `backend/enquiry-pipeline.js` (postcode, transmission, preferred contact, phone, email, message), so the template never needs editing when a field is added.
- The reminder's `body` is the whole reminder sentence from `reminderText()` in `public/portal-utils.js` (`TEMPLATES.lessonReminder` filled in), for the same reason. The Resend provider gets the full variable set (firstName, transmission, dateWords, slotTime, pickup, link) and builds its own HTML.
- The reply template's standard first-lesson paragraph is still a placeholder in `TEMPLATES.enquiryReplyDefault`; the instructor can also overwrite the text in the reply box before sending.

## How a send works

`sendEmail()` in `backend/messaging.js` emails a member by ID when one exists, otherwise it creates or matches a contact by email and emails the contact. Every attempt writes a `SendLog` row.

Wix refuses triggered emails (and contact creation) from an HTTP function with `FORBIDDEN`, because that request carries no visitor identity. Web methods called from a page work, even for anonymous visitors. So the enquiry form posts to `/_functions/enquire` (which can see the IP for the rate limit and stores the enquiry with a single-use `notifyToken`), and the page then calls `notifyEnquiry(enquiryId, token)` in `backend/enquire.jsw`, which sends the confirmation and the alert once and clears the token.

A contact marked unsubscribed in Wix does not receive triggered emails; the send still logs as sent.

Scheduled jobs are different from HTTP functions: the Phase 4 probe job (`probeJobEmail`, hourly, 2 Nov 2026) sent a triggered email to the instructor's member account from the job without any caller identity, logged as sent at 21:30, and the 22:00 reminder pass then sent a real lesson reminder the same way. So the reminder job uses Wix emails by default; Resend stays as the switchable alternative (`Settings.emailProvider`), and with no `RESEND_API_KEY` a Resend send logs a skipped row saying so. The probe job was removed from `jobs.config` once this was recorded; the Settings page still shows the last probe row's verdict while it exists.
