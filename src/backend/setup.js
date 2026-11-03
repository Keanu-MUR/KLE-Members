// One-off site setup: create the ten collections from code with the
// tightest permissions, and report which are missing. Everything is
// idempotent so the instructor can run it again safely.

import { collections } from 'wix-data.v2';
import { elevate } from 'wix-auth';
import { COLLECTIONS } from 'public/portal-constants';

// All collections are admin-only in the dashboard; backend code reads and
// writes on the caller's behalf with suppressAuth after the access check.
// This is tighter than "Enquiries insert = anyone" because the enquiry
// web method inserts server-side after validation and rate limiting.
const ADMIN_ONLY = { insert: 'ADMIN', update: 'ADMIN', remove: 'ADMIN', read: 'ADMIN' };

const text = (key, displayName) => ({ key, displayName, type: 'TEXT' });
const number = (key, displayName) => ({ key, displayName, type: 'NUMBER' });
const bool = (key, displayName) => ({ key, displayName, type: 'BOOLEAN' });
const json = (key, displayName) => ({ key, displayName, type: 'OBJECT' });

// Dates are ISO-8601 strings (TEXT), per SPEC.md, so they sort and compare
// without time-zone surprises.
export const SCHEMAS = {
  Pupils: [
    text('memberId', 'Member ID'),
    text('firstName', 'First name'),
    text('lastName', 'Last name'),
    text('email', 'Email'),
    text('phone', 'Phone (E.164)'),
    text('addressLine1', 'Address line 1'),
    text('addressLine2', 'Address line 2'),
    text('town', 'Town'),
    text('postcode', 'Postcode'),
    text('transmission', 'Transmission'),
    text('licenceNumber', 'Licence number'),
    text('emergencyContactName', 'Emergency contact name'),
    text('emergencyContactPhone', 'Emergency contact phone'),
    text('status', 'Status'),
    bool('theoryPassed', 'Theory passed'),
    text('theoryPassDate', 'Theory pass date'),
    text('practicalTestDate', 'Practical test date'),
    number('hourlyRatePence', 'Hourly rate (pence)'),
    bool('reminderEmail', 'Email reminders'),
    bool('reminderWhatsApp', 'WhatsApp reminders'),
    text('whatsAppConsentAt', 'WhatsApp consent at'),
    text('guardianMemberId', 'Guardian member ID'),
    text('guardianName', 'Guardian name'),
    text('guardianEmail', 'Guardian email'),
    text('instructorNotes', 'Instructor notes (private)'),
    json('lessonHistory', 'Lesson history (yearly totals)')
  ],
  Lessons: [
    text('pupilId', 'Pupil ID'),
    text('date', 'Date'),
    text('slot', 'Slot'),
    text('startTime', 'Start time'),
    number('durationMins', 'Duration (minutes)'),
    text('pickupLocation', 'Pick-up location'),
    text('status', 'Status'),
    text('pupilSummary', 'Summary for pupil'),
    text('instructorNotes', 'Instructor notes (private)')
  ],
  Progress: [
    text('pupilId', 'Pupil ID'),
    json('skills', 'Skills'),
    text('updatedAt', 'Updated at')
  ],
  MockTests: [
    text('pupilId', 'Pupil ID'),
    text('date', 'Date'),
    text('result', 'Result'),
    number('minors', 'Minors'),
    number('serious', 'Serious'),
    number('dangerous', 'Dangerous'),
    json('faults', 'Faults'),
    text('feedback', 'Feedback')
  ],
  Payments: [
    text('pupilId', 'Pupil ID'),
    text('date', 'Date'),
    number('amountPence', 'Amount (pence)'),
    text('method', 'Method'),
    text('reference', 'Reference'),
    text('note', 'Note')
  ],
  Enquiries: [
    text('name', 'Name'),
    text('email', 'Email'),
    text('phone', 'Phone'),
    text('addressLine1', 'Address line 1'),
    text('postcode', 'Postcode'),
    text('transmission', 'Transmission'),
    text('message', 'Message'),
    text('preferredContact', 'Preferred contact'),
    text('status', 'Status'),
    text('repliedAt', 'Replied at'),
    text('convertedPupilId', 'Converted pupil ID')
  ],
  Messages: [
    text('pupilId', 'Pupil ID'),
    text('body', 'Message'),
    text('createdAt', 'Created at'),
    text('readAt', 'Read at'),
    text('reply', 'Reply')
  ],
  Settings: [
    bool('emailRemindersOn', 'Email reminders on'),
    bool('whatsAppRemindersOn', 'WhatsApp reminders on'),
    text('emailProvider', 'Email provider'),
    text('instructorEmail', 'Instructor email'),
    text('instructorWhatsApp', 'Instructor WhatsApp'),
    bool('enquiryAlertEmailOn', 'Enquiry alert by email'),
    bool('enquiryAlertWhatsAppOn', 'Enquiry alert by WhatsApp'),
    number('reminderSendHour', 'Reminder send hour'),
    number('defaultHourlyRatePence', 'Default hourly rate (pence)'),
    text('lastExportAt', 'Last export at'),
    text('lastExportStatus', 'Last export status'),
    json('backups', 'Backups (file list)'),
    number('lessonRetentionDays', 'Lesson retention (days)'),
    number('sendLogRetentionDays', 'Send log retention (days)'),
    number('paymentRetentionDays', 'Payment retention (days)')
  ],
  SendLog: [
    text('pupilId', 'Pupil ID'),
    text('lessonId', 'Lesson ID'),
    text('channel', 'Channel'),
    text('status', 'Status'),
    text('providerMessageId', 'Provider message ID'),
    text('error', 'Error'),
    text('createdAt', 'Created at')
  ],
  RateLimit: [
    text('ipHash', 'IP hash'),
    text('windowStart', 'Window start'),
    number('count', 'Count')
  ]
};

const listCollections = elevate(collections.listDataCollections);
const createCollection = elevate(collections.createDataCollection);

export async function existingCollectionIds() {
  const ids = new Set();
  let offset = 0;
  const limit = 100;
  // Loop defensively; a site will never have hundreds, but the API pages.
  for (let page = 0; page < 10; page += 1) {
    const result = await listCollections({ paging: { limit, offset } });
    const items = (result && result.collections) || [];
    items.forEach((c) => ids.add(c._id));
    if (items.length < limit) break;
    offset += limit;
  }
  return ids;
}

export async function checkSetup() {
  try {
    const existing = await existingCollectionIds();
    const missing = COLLECTIONS.filter((id) => !existing.has(id));
    return { checked: true, missing };
  } catch (error) {
    console.error('[portal] checkSetup', error && error.message ? error.message : error);
    return { checked: false, missing: COLLECTIONS.slice(), error: 'Could not list collections.' };
  }
}

export async function createMissingCollections() {
  const existing = await existingCollectionIds();
  const created = [];
  const skipped = [];
  const failed = [];
  for (const id of COLLECTIONS) {
    if (existing.has(id)) {
      skipped.push(id);
      continue;
    }
    try {
      await createCollection({
        _id: id,
        displayName: id,
        permissions: ADMIN_ONLY,
        fields: SCHEMAS[id]
      });
      created.push(id);
    } catch (error) {
      failed.push({ id, error: error && error.message ? error.message : String(error) });
    }
  }
  return { created, skipped, failed };
}
