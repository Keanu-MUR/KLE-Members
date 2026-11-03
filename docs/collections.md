# Collections: manual fallback

The dashboard setup panel (`createCollections` in `backend/setup-actions.jsw`) creates everything below from code and is the normal path. Use this page only if that fails.

Create each collection in the dashboard under **CMS > Create Collection**, with the exact name shown and **Permissions > Custom** set to Admin for read, insert, update and delete. Backend code reads and writes on behalf of pupils with elevated permissions after checking who is asking, so nothing more open is needed. (SPEC.md allows "insert = anyone" on Enquiries; admin-only is tighter and the enquiry web method inserts server-side after validation and rate limiting.)

Field types: *Text* for every date (stored as an ISO-8601 string), *Number* for money in pence and counts, *Boolean* for toggles, *Object* for JSON.

## Pupils
memberId, firstName, lastName, email, phone, addressLine1, addressLine2, town, postcode, transmission, licenceNumber, emergencyContactName, emergencyContactPhone, status, theoryPassed (Boolean), theoryPassDate, practicalTestDate, hourlyRatePence (Number), reminderEmail (Boolean), reminderWhatsApp (Boolean), whatsAppConsentAt, guardianMemberId, guardianName, guardianEmail, instructorNotes, lessonHistory (Object)

## Lessons
pupilId, date, slot, startTime, durationMins (Number), pickupLocation, status, pupilSummary, instructorNotes

## Progress
pupilId, skills (Object), updatedAt

## MockTests
pupilId, date, result, minors (Number), serious (Number), dangerous (Number), faults (Object), feedback

## Payments
pupilId, date, amountPence (Number), method, reference, note

## Enquiries
name, email, phone, addressLine1, postcode, transmission, message, preferredContact, status, repliedAt, convertedPupilId, notifyToken (single use; empty once the emails have gone), notifiedAt

## Messages
pupilId, body, createdAt, readAt, reply

## Settings
emailRemindersOn (Boolean), whatsAppRemindersOn (Boolean), emailProvider, instructorEmail, instructorWhatsApp, enquiryAlertEmailOn (Boolean), enquiryAlertWhatsAppOn (Boolean), reminderSendHour (Number), defaultHourlyRatePence (Number), lastExportAt, lastExportStatus, lessonRetentionDays (Number), sendLogRetentionDays (Number), paymentRetentionDays (Number)

## SendLog
pupilId, lessonId, channel, status, providerMessageId, error, createdAt

## RateLimit
ipHash, windowStart, count (Number)

After creating them by hand, log in as the instructor and press **Create settings** on the dashboard to insert the single Settings item with its defaults.

Note: creating the collections from code writes one "Sandbox environment is disabled" error per collection to Wix Logs. That is Wix noting the site has no sandbox database; the live collections are created normally.
