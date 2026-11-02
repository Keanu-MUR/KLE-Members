// The public enquiry pipeline: validate, rate-limit, store, notify.
// handleEnquiry() runs in the HTTP function (http-functions.js), the only
// place that can see the caller's IP address. The emails cannot be sent
// from there: Wix answers a triggered-email call made with no visitor
// identity with FORBIDDEN (found live, 2 Nov 2026). So the HTTP function
// stores the enquiry with a one-time notify token, and the page then calls
// sendEnquiryNotifications() through the web module in enquire.jsw, which
// runs with the visitor's identity. The token is cleared on first use, so
// the emails for an enquiry go out once at most.

import wixData from 'wix-data';
import { loadSettings } from 'backend/settings';
import { sendEmail, sendWhatsApp } from 'backend/messaging';
import { lookupMemberByEmail } from 'backend/pupil-store';
import { validateEnquiry, hashKey, rateLimitDecision, fillTemplate, isTaughtPostcode } from 'public/portal-utils';
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

function notifyToken() {
  let token = '';
  for (let i = 0; i < 32; i++) token += Math.floor(Math.random() * 16).toString(16);
  return token;
}

export async function recordEnquiry(data) {
  return wixData.insert('Enquiries', {
    notifyToken: notifyToken(),
    notifiedAt: '',
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
    // The template carries three variables; the detail lines are built
    // here so the template never needs editing when a field changes.
    const summary = [
      data.postcode + (data.outsideArea ? ' (outside the usual area)' : ''),
      data.transmission + ' lessons',
      'prefers ' + data.preferredContact,
      data.phone,
      data.email,
      data.dateOfBirth ? 'born ' + data.dateOfBirth : '',
      data.message ? 'Message: ' + data.message : 'No message'
    ].filter(Boolean).join('. ');
    alert = await sendEmail('enquiryAlert', to, {
      name: data.name,
      summary,
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
  return {
    ok: true,
    data: {
      firstName: checked.data.firstName,
      preferredContact: checked.data.preferredContact,
      outsideArea: checked.data.outsideArea,
      enquiryId: enquiry._id,
      token: enquiry.notifyToken
    }
  };
}

// Second half of the pipeline, called from the page once the HTTP function
// has stored the enquiry. The token is single use; a wrong or spent token
// is answered with a plain failure and sends nothing.
export async function sendEnquiryNotifications(enquiryId, token) {
  if (!enquiryId || !token || typeof enquiryId !== 'string' || typeof token !== 'string') {
    return { ok: false, error: 'Nothing to send.' };
  }
  const item = await wixData.get('Enquiries', enquiryId, { suppressAuth: true });
  if (!item || !item.notifyToken || item.notifyToken !== token) return { ok: false, error: 'Nothing to send.' };
  await wixData.update('Enquiries', Object.assign({}, item, {
    notifyToken: '',
    notifiedAt: new Date().toISOString()
  }), { suppressAuth: true });

  const parts = String(item.name || '').split(/\s+/).filter(Boolean);
  const data = {
    name: item.name || '',
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
    email: item.email || '',
    phone: item.phone || '',
    dateOfBirth: item.dateOfBirth || '',
    postcode: item.postcode || '',
    outsideArea: !isTaughtPostcode(item.postcode || ''),
    transmission: item.transmission || '',
    preferredContact: item.preferredContact || '',
    message: item.message || ''
  };
  try {
    const sent = await notifyEnquiry(item, data);
    return { ok: true, data: { confirmationSent: Boolean(sent.confirmation && sent.confirmation.ok) } };
  } catch (error) {
    console.error('[portal] notifyEnquiry', error && error.message ? error.message : error);
    return { ok: true, data: { confirmationSent: false } };
  }
}
