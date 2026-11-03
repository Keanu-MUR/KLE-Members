// Email and WhatsApp sending, fail soft. Every attempt writes a SendLog
// row; a failure returns { ok: false } and never throws into the caller.
//
// Email has two providers behind one function: Wix Triggered Emails (needs
// a caller identity, so it works from pages but not from scheduled jobs or
// HTTP functions) and Resend (plain fetch with an API key from the Secrets
// Manager, works anywhere). Settings.emailProvider picks the default; a
// caller may force one with options.provider.
//
// WhatsApp goes straight to the Meta Cloud API with a template message.
// Until WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID exist in the
// Secrets Manager every WhatsApp send logs a skipped row with the reason.

import wixData from 'wix-data';
import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
import { triggeredEmails, contacts } from 'wix-crm-backend';
import { CHANNEL, SEND_STATUS, EMAIL_TEMPLATES, EMAIL_PROVIDER, SCHOOL, FEATURES, TEMPLATES } from 'public/portal-constants';
import { fillTemplate } from 'public/portal-utils';

const SEND_TIMEOUT_MS = 10000;
const RESEND_FROM = 'KLE Driving School <reminders@kledrivingschool.co.uk>';
const META_GRAPH = 'https://graph.facebook.com/v21.0/';

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

async function secret(name) {
  try {
    const value = await getSecret(name);
    return value ? String(value).trim() : '';
  } catch (error) {
    return '';
  }
}

// Triggered emails address a contact or a member, never a bare address, so
// an enquirer becomes a contact first (matched by email if they exist).
export async function ensureContact(person) {
  const info = {
    name: { first: person.firstName || '', last: person.lastName || '' },
    emails: [{ email: person.email, tag: 'MAIN' }]
  };
  if (person.phone) info.phones = [{ phone: person.phone, tag: 'MOBILE' }];
  const result = await contacts.appendOrCreateContact(info);
  return result.contactId;
}

// ---- Resend ----------------------------------------------------------------

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function paragraphs(lines) {
  return lines.filter(Boolean).map((line) => '<p style="margin:0 0 14px;font:16px/1.5 Arial,Helvetica,sans-serif;color:#141414">' + escapeHtml(line) + '</p>').join('');
}

const FOOTER = [
  'Kle, KLE Driving School, south-east London.',
  'To change how I contact you, log in to the pupil portal and open My details.'
];

// The same emails the Wix templates send, as plain HTML for Resend.
const RESEND_BODIES = {
  lessonReminder: (v) => ({
    subject: 'Your lesson tomorrow, ' + v.dateWords,
    lines: [
      'Hi ' + v.firstName + ',',
      'Your ' + v.transmission + ' lesson is tomorrow, ' + v.dateWords + ', ' + v.slotTime + '.',
      'Pick-up: ' + v.pickup + '.',
      'Reply to this email' + (FEATURES.whatsApp ? ' or message me on WhatsApp' : '') + ' if anything has changed.',
      'Your lessons: ' + v.link
    ]
  }),
  enquiryConfirmation: (v) => ({
    subject: 'Your enquiry to KLE Driving School',
    lines: [
      'Hi ' + v.firstName + ',',
      fillTemplate(TEMPLATES.enquiryConfirmation, v)
    ]
  }),
  enquiryAlert: (v) => ({
    subject: 'New enquiry from ' + v.name,
    lines: ['New enquiry from ' + v.name + '.', v.summary, 'Reply from the portal: ' + v.link]
  }),
  enquiryReply: (v) => ({
    subject: 'Your driving lessons with KLE',
    lines: ['Hi ' + v.firstName + ',', v.p1, v.p2, v.p3, v.p4]
  })
};

async function sendWithResend(templateKey, to, vars) {
  const key = await secret('RESEND_API_KEY');
  if (!key) return { skipped: true, reason: 'Resend is not set up (no RESEND_API_KEY)' };
  const build = RESEND_BODIES[templateKey];
  if (!build) return { skipped: true, reason: 'No Resend body for ' + templateKey };
  const body = build(stringValues(vars));
  const html = '<div style="max-width:560px;margin:0 auto;padding:24px 16px;background:#FAF7F2">' +
    '<p style="margin:0 0 20px;font:700 22px/1.2 Arial,Helvetica,sans-serif;letter-spacing:.12em;color:#141414">KLE DRIVING</p>' +
    paragraphs(body.lines) +
    '<hr style="border:0;border-top:1px dashed #141414;margin:24px 0">' +
    paragraphs(FOOTER).replace(/color:#141414/g, 'color:#5A5A5A') +
    '</div>';
  const response = await withTimeout(fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to: [to.email], reply_to: SCHOOL.replyTo || undefined, subject: body.subject, html })
  }), SEND_TIMEOUT_MS);
  const text = await response.text();
  if (!response.ok) throw new Error('Resend ' + response.status + ': ' + text.slice(0, 200));
  let id = '';
  try { id = JSON.parse(text).id || ''; } catch (error) { id = ''; }
  return { providerMessageId: id };
}

// ---- Wix Triggered Emails ----------------------------------------------------

async function sendWithWix(templateKey, to, vars) {
  const templateId = EMAIL_TEMPLATES[templateKey];
  if (!templateId || templateId === 'REPLACE_WHEN_CREATED') throw new Error('No Wix template for ' + templateKey);
  const options = { variables: stringValues(vars) };
  if (to.memberId) {
    await withTimeout(triggeredEmails.emailMember(templateId, to.memberId, options), SEND_TIMEOUT_MS);
  } else {
    const contactId = to.contactId || (await ensureContact(to));
    await withTimeout(triggeredEmails.emailContact(templateId, contactId, options), SEND_TIMEOUT_MS);
  }
  return {};
}

// to: { memberId } | { contactId, email } | { email, firstName, lastName, phone }
// context: { pupilId, lessonId }; options: { provider: 'wix' | 'resend' }
export async function sendEmail(templateKey, to, vars, context, options) {
  const base = Object.assign({}, context || {}, { channel: CHANNEL.EMAIL });
  const provider = options && options.provider ? options.provider : EMAIL_PROVIDER.WIX;
  try {
    const result = provider === EMAIL_PROVIDER.RESEND
      ? await sendWithResend(templateKey, to, vars)
      : await sendWithWix(templateKey, to, vars);
    if (result.skipped) {
      await logSend(Object.assign({}, base, { status: SEND_STATUS.SKIPPED, error: result.reason }));
      return { ok: false, skipped: true, error: result.reason };
    }
    await logSend(Object.assign({}, base, { status: SEND_STATUS.SENT, providerMessageId: result.providerMessageId || provider }));
    return { ok: true, provider };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.error('[portal] email failed', templateKey, provider, message);
    await logSend(Object.assign({}, base, { status: SEND_STATUS.FAILED, error: provider + ': ' + message }));
    return { ok: false, error: message, provider };
  }
}

// ---- WhatsApp (Meta Cloud API) -----------------------------------------------

// templateName: an approved template; to: E.164 phone; vars: the body
// parameters in template order; context: { pupilId, lessonId }.
export async function sendWhatsApp(templateName, to, vars, context) {
  const base = Object.assign({}, context || {}, { channel: CHANNEL.WHATSAPP });
  try {
    const [token, phoneNumberId] = await Promise.all([secret('WHATSAPP_ACCESS_TOKEN'), secret('WHATSAPP_PHONE_NUMBER_ID')]);
    if (!token || !phoneNumberId) {
      await logSend(Object.assign({}, base, { status: SEND_STATUS.SKIPPED, error: 'WhatsApp is not set up yet (no Meta token or phone number ID)' }));
      return { ok: false, skipped: true, error: 'WhatsApp not set up' };
    }
    const digits = String(to || '').replace(/[^\d]/g, '');
    if (!digits) {
      await logSend(Object.assign({}, base, { status: SEND_STATUS.SKIPPED, error: 'No phone number to send to' }));
      return { ok: false, skipped: true, error: 'No phone number' };
    }
    const parameters = Object.keys(vars || {}).map((key) => ({ type: 'text', text: String(vars[key] == null ? '' : vars[key]) }));
    const response = await withTimeout(fetch(META_GRAPH + phoneNumberId + '/messages', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: digits,
        type: 'template',
        template: { name: templateName, language: { code: 'en_GB' }, components: [{ type: 'body', parameters }] }
      })
    }), SEND_TIMEOUT_MS);
    const text = await response.text();
    if (!response.ok) throw new Error('Meta ' + response.status + ': ' + text.slice(0, 200));
    let id = '';
    try { id = (JSON.parse(text).messages || [{}])[0].id || ''; } catch (error) { id = ''; }
    await logSend(Object.assign({}, base, { status: SEND_STATUS.SENT, providerMessageId: id }));
    return { ok: true };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.error('[portal] WhatsApp failed', templateName, message);
    await logSend(Object.assign({}, base, { status: SEND_STATUS.FAILED, error: message }));
    return { ok: false, error: message };
  }
}
