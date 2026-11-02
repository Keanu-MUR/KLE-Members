// Email and WhatsApp sending, fail soft. Every attempt writes a SendLog
// row; a failure returns { ok: false } and never throws into the caller.
// Phase 1 ships the Wix Triggered Emails provider; Resend and the Meta
// WhatsApp API arrive in Phase 4 behind the same two functions.

import wixData from 'wix-data';
import { triggeredEmails, contacts } from 'wix-crm-backend';
import { CHANNEL, SEND_STATUS, EMAIL_TEMPLATES } from 'public/portal-constants';

const SEND_TIMEOUT_MS = 10000;

export async function logSend(entry) {
  try {
    await wixData.insert('SendLog', {
      pupilId: entry.pupilId || '',
      lessonId: entry.lessonId || '',
      channel: entry.channel,
      status: entry.status,
      providerMessageId: entry.providerMessageId || '',
      error: entry.error ? String(entry.error).slice(0, 500) : '',
      createdAt: new Date().toISOString()
    }, { suppressAuth: true });
  } catch (error) {
    console.error('[portal] SendLog write failed', error && error.message ? error.message : error);
  }
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Timed out after ' + ms + 'ms')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function stringValues(vars) {
  const out = {};
  Object.keys(vars || {}).forEach((key) => {
    out[key] = vars[key] == null ? '' : String(vars[key]);
  });
  return out;
}

// Triggered emails address a contact or a member, never a bare address, so
// an enquirer becomes a contact first (matched by email if they exist).
export async function ensureContact(person) {
  const info = {
    name: { first: person.firstName || '', last: person.lastName || '' },
    emails: [{ email: person.email, tag: 'MAIN' }]
  };
  if (person.phone) info.phones = [{ phone: person.phone, tag: 'MOBILE' }];
  const result = await contacts.appendOrCreateContact(info, { suppressAuth: true });
  return result.contactId;
}

// to: { memberId } | { contactId } | { email, firstName, lastName, phone }
export async function sendEmail(templateKey, to, vars, context) {
  const templateId = EMAIL_TEMPLATES[templateKey];
  const base = Object.assign({}, context || {}, { channel: CHANNEL.EMAIL });
  if (!templateId) {
    await logSend(Object.assign({}, base, { status: SEND_STATUS.FAILED, error: 'Unknown template ' + templateKey }));
    return { ok: false, error: 'Unknown template' };
  }
  try {
    const options = { variables: stringValues(vars) };
    if (to.memberId) {
      await withTimeout(triggeredEmails.emailMember(templateId, to.memberId, options), SEND_TIMEOUT_MS);
    } else {
      const contactId = to.contactId || (await ensureContact(to));
      await withTimeout(triggeredEmails.emailContact(templateId, contactId, options), SEND_TIMEOUT_MS);
    }
    await logSend(Object.assign({}, base, { status: SEND_STATUS.SENT }));
    return { ok: true };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.error('[portal] email failed', templateKey, message);
    await logSend(Object.assign({}, base, { status: SEND_STATUS.FAILED, error: message }));
    return { ok: false, error: message };
  }
}

// Phase 4 hook: the Meta Cloud API call goes here. Until then every request
// is logged as skipped so the dashboard can show that nothing was sent.
export async function sendWhatsApp(templateName, to, vars, context) {
  await logSend(Object.assign({}, context || {}, {
    channel: CHANNEL.WHATSAPP,
    status: SEND_STATUS.SKIPPED,
    error: 'WhatsApp sending arrives in Phase 4 (' + templateName + ')'
  }));
  return { ok: false, skipped: true };
}
