// The public enquiry pipeline: validate, rate-limit, store, notify. Called
// by the HTTP function in http-functions.js, which is the only place that
// can see the caller's IP address.

import wixData from 'wix-data';
import { loadSettings } from 'backend/settings';
import { sendEmail, sendWhatsApp } from 'backend/messaging';
import { lookupMemberByEmail } from 'backend/pupil-store';
import { validateEnquiry, hashKey, rateLimitDecision, fillTemplate } from 'public/portal-utils';
import { ENQUIRY_STATUS, ENQUIRY_LIMIT, TEMPLATES, PORTAL_PATHS, SCHOOL } from 'public/portal-constants';

// The salt only stops the hash being a bare lookup of the IP; it is not a
// secret in the Secrets Manager sense.
const IP_SALT = 'kle-enquiry-2026';

export async function checkRateLimit(ip, now) {
  const ipHash = hashKey(ip + '|' + IP_SALT);
  const since = new Date(now.getTime() - ENQUIRY_LIMIT.windowMs).toISOString();
  const result = await wixData
    .query('RateLimit')
    .eq('ipHash', ipHash)
    .ge('windowStart', since)
    .limit(50)
    .find({ suppressAuth: true });
  return Object.assign({ ipHash }, rateLimitDecision(result.items, now));
}

export async function recordAttempt(ipHash, now) {
  await wixData.insert('RateLimit', { ipHash, windowStart: now.toISOString(), count: 1 }, { suppressAuth: true });
}

export async function recordEnquiry(data) {
  return wixData.insert('Enquiries', {
    name: data.name,
    email: data.email,
    phone: data.phone,
    dateOfBirth: data.dateOfBirth,
    addressLine1: data.addressLine1,
    postcode: data.postcode,
    transmission: data.transmission,
    message: data.message,
    preferredContact: data.preferredContact,
    status: ENQUIRY_STATUS.NEW,
    repliedAt: '',
    convertedPupilId: ''
  }, { suppressAuth: true });
}

// The three notifications, each fail soft and logged, none blocking the
// others.
export async function notifyEnquiry(enquiry, data) {
  const { settings } = await loadSettings();
  const context = { pupilId: '', lessonId: '' };

  const confirmation = await sendEmail('enquiryConfirmation', {
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone
  }, {
    firstName: data.firstName,
    preferredContact: data.preferredContact,
    schoolName: SCHOOL.name
  }, context);

  let alert = { ok: false, skipped: true };
  if (settings.enquiryAlertEmailOn) {
    const instructor = await lookupMemberByEmail(settings.instructorEmail);
    const to = instructor ? { memberId: instructor.memberId } : { email: settings.instructorEmail, firstName: 'Instructor', lastName: '' };
    alert = await sendEmail('enquiryAlert', to, {
      name: data.name,
      postcode: data.postcode,
      transmission: data.transmission,
      preferredContact: data.preferredContact,
      phone: data.phone,
      email: data.email,
      message: data.message || '(no message)',
      outsideArea: data.outsideArea ? 'Outside the usual area.' : '',
      link: SCHOOL.siteUrl + PORTAL_PATHS.enquiries
    }, context);
  }

  let whatsApp = { ok: false, skipped: true };
  if (settings.enquiryAlertWhatsAppOn) {
    whatsApp = await sendWhatsApp(TEMPLATES.whatsAppTemplateNames.newEnquiry, settings.instructorWhatsApp, {
      name: data.name,
      postcode: data.postcode,
      transmission: data.transmission,
      preferredContact: data.preferredContact
    }, context);
  }

  return { confirmation, alert, whatsApp };
}

// Runs the whole pipeline and returns the { ok, data | error } shape the
// element expects. Never throws.
export async function handleEnquiry(body, ip) {
  const now = new Date();
  const checked = validateEnquiry(body);
  if (!checked.ok) return { ok: false, error: 'Please check the highlighted fields.', errors: checked.errors };
  if (checked.bot) return { ok: true, data: { firstName: '', preferredContact: '', outsideArea: false } };

  const limit = await checkRateLimit(ip || 'unknown', now);
  if (!limit.allowed) return { ok: false, error: fillTemplate(TEMPLATES.enquiryRateLimited, {}) };
  await recordAttempt(limit.ipHash, now);

  const enquiry = await recordEnquiry(checked.data);
  try {
    await notifyEnquiry(enquiry, checked.data);
  } catch (error) {
    console.error('[portal] notifyEnquiry', error && error.message ? error.message : error);
  }
  return {
    ok: true,
    data: {
      firstName: checked.data.firstName,
      preferredContact: checked.data.preferredContact,
      outsideArea: checked.data.outsideArea
    }
  };
}
