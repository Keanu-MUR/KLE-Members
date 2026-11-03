# KLE Driving School pupil portal — handover

Everything below happens at **kledrivingschool.co.uk/instructor** after you log in with your instructor account. Pupils and guardians use **kledrivingschool.co.uk/pupil** (they land there after logging in on the Pupil login page). The sections are the links under the KLE wordmark: Today, Lessons, Pupils, Enquiries, Reminders, Settings.

## Add a pupil

Most pupils arrive as enquiries. **Enquiries** > open the enquiry > **Make them a pupil**: this creates their record and login and emails them a set-password link. For someone who did not enquire through the site: **Pupils** > **Add pupil**, fill in their name, email, phone, address, postcode and manual or automatic, and press **Add pupil**. Their login is made and the set-password email goes out straight away, unless you untick that box, in which case use **Send login link** on their record later.

## Add or change a lesson

**Lessons** > **Add lesson**: pick the pupil, the date, a slot (or a custom time), and the pick-up place. The portal refuses a time that overlaps another lesson. To change one, open it from the list, edit the status (planned, completed, cancelled, no-show), the summary the pupil sees and your private notes, then **Save**. Reminders go out the day before at the hour set on Settings.

## Set progress

**Pupils** > the pupil > **Progress**, or **Lessons** > the lesson > the progress link. Tap the block for the level reached on each skill; add a note if you like. Pupils see the same driver's record, read only, with your notes.

## Mock tests and messages

On the pupil's record: **Mock tests** to add a result with faults and feedback (the pupil sees it); **Messages** shows anything the pupil sent from their Lessons page, with a reply box that emails them.

## Reply to an enquiry

**Enquiries** > open it > type your reply (the standard first-lesson text is filled in) > **Send reply**. Convert when they book, or close it.

## Reminders and the toggles

**Settings**: email and WhatsApp reminders on or off, the hour they go out, enquiry alerts by email or WhatsApp, and your own contact details. WhatsApp sends stay "skipped" until the Meta token and phone number ID are added to the Secrets Manager. **Reminders** shows tomorrow's lessons with each channel's status, a Send again button and a link to send a WhatsApp by hand. The **Send log** (linked from Settings) lists every attempt.

## Guardians

On a pupil's record, fill in the guardian email and **Link guardian login**. The guardian gets a set-password email and sees the pupil's pages, read only. **Remove guardian login** takes it away. The guardian email also gets a copy of every lesson reminder. Clear it if the pupil no longer wants that.

## Where the weekly backup is

Every Monday at 02:00 the portal writes one CSV per collection to a private folder in your Wix Media Manager (portal-backups) and emails you "Weekly backup". The last four weeks are kept. To get the files: **Settings** > **Backups** > **Download latest backup**; the links work for an hour. **Back up now** runs the same backup at any time, and **Export all data** downloads any collection as a CSV straight away. **Export this pupil** on a record gives one CSV with everything about that pupil.

Old lessons (older than the "Keep full lesson detail" window on Settings, 120 days by default) are folded into yearly totals each night, but only once a backup has succeeded in the last 8 days, so nothing is removed that is not already in a CSV. The item count on Settings shows how much of the Wix plan's 1,500-item limit is in use.

## When a pupil leaves

Set their status to passed or inactive on the record; they keep their login and history. If they ask for their data to be removed: **Export this pupil** first if you want a copy, then **Delete pupil (GDPR)** and type their full name. That removes the record, lessons, progress, mock tests, messages, send log rows, the enquiry and their login. If the Wix member or contact could not be removed, the page says so and you can finish it under Site Members or Contacts in the Wix dashboard.

## Things only you can change in Wix

- The three email templates (Developer Tools > Triggered Emails) and the sender name.
- Secrets Manager: RESEND_API_KEY, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, if you set those up.
- The portal pages themselves live in the Editor (Pupil portal, Instructor dashboard, Pupil login, Enquire); the code comes from the GitHub repository.

## If something looks wrong

Settings shows whether Wix emails are sending from the reminder job and when the last backup ran. The Send log shows failures with the reason. Pages keep the last thing they showed for up to 30 minutes and refresh behind the scenes, so a change you make elsewhere can take a moment to show; a reload fetches it at once.
