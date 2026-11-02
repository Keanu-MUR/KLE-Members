// Pure helpers shared by backend, page code and tests. Nothing here touches
// Wix APIs, so every function runs under plain node.

import {
  SLOTS,
  CUSTOM_SLOT,
  TAUGHT_POSTCODES,
  TIME_ZONE,
  TRANSMISSION,
  PREFERRED_CONTACT,
  MY_DETAILS_FIELDS,
  ENQUIRY_LIMIT
} from './portal-constants.js';

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/;
const OUTWARD_ONLY = /^[A-Z]{1,2}\d[A-Z\d]?$/;

export function normalisePostcode(input) {
  return String(input || '').toUpperCase().replace(/\s+/g, '');
}

// Accepts a full postcode or just the outward part ("SE15" or "SE15 4AB").
export function isValidPostcode(input) {
  const compact = normalisePostcode(input);
  return UK_POSTCODE.test(compact) || OUTWARD_ONLY.test(compact);
}

export function outwardCode(input) {
  const compact = normalisePostcode(input);
  if (!compact) return '';
  if (OUTWARD_ONLY.test(compact)) return compact;
  // The inward part is always one digit and two letters, so the outward
  // code is whatever comes before the last three characters.
  return compact.slice(0, -3);
}

export function isTaughtPostcode(input) {
  return TAUGHT_POSTCODES.includes(outwardCode(input));
}

export function isValidEmail(input) {
  const value = String(input || '').trim();
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Phones are stored in E.164. UK numbers typed with a leading 0 or +44 are
// normalised; anything else must already be E.164.
export function toE164(input) {
  const digits = String(input || '').replace(/[\s\-()]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(digits)) return digits;
  if (/^07\d{9}$/.test(digits)) return '+44' + digits.slice(1);
  if (/^0044\d{10}$/.test(digits)) return '+44' + digits.slice(4);
  return null;
}

export function minutesBetween(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

export function addMinutes(start, mins) {
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

// Resolves a slot key, or a custom start time and duration, into the fields
// a Lessons item stores. Returns null when the input cannot be a lesson.
export function parseSlot(slotKey, startTime, durationMins) {
  if (slotKey !== CUSTOM_SLOT) {
    const slot = SLOTS.find((s) => s.key === slotKey);
    if (!slot) return null;
    return {
      slot: slot.key,
      startTime: slot.start,
      durationMins: minutesBetween(slot.start, slot.end),
      label: slot.name + ', ' + slot.start + '–' + slot.end
    };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(startTime || ''))) return null;
  const mins = Number(durationMins);
  if (!Number.isInteger(mins) || mins < 30 || mins > 480) return null;
  return {
    slot: CUSTOM_SLOT,
    startTime,
    durationMins: mins,
    label: startTime + '–' + addMinutes(startTime, mins)
  };
}

export function slotTimeWords(slotKey, startTime, durationMins) {
  const parsed = parseSlot(slotKey, startTime, durationMins);
  return parsed ? parsed.label : '';
}

// "Tuesday 4 November" in Europe/London, from an ISO date (YYYY-MM-DD) or
// a full ISO timestamp.
export function dateWords(iso, options) {
  const date = isoToDate(iso);
  if (!date) return '';
  const fmt = new Intl.DateTimeFormat('en-GB', Object.assign({
    timeZone: TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }, options || {}));
  return fmt.format(date);
}

export function isoToDate(iso) {
  if (!iso) return null;
  const text = String(iso);
  // A bare date is treated as midday London time so the calendar day never
  // shifts across the BST boundary.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(text + 'T12:00:00Z') : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Calendar date (YYYY-MM-DD) in Europe/London for a given instant.
export function londonDate(instant) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(instant || new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return get('year') + '-' + get('month') + '-' + get('day');
}

export function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function londonHour(instant) {
  const hour = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: 'numeric', hour12: false })
    .format(instant || new Date());
  return Number(hour) % 24;
}

// Whole years between a date of birth and a date, both YYYY-MM-DD.
export function ageOn(dateOfBirth, onDate) {
  if (!dateOfBirth || !onDate) return null;
  const [by, bm, bd] = dateOfBirth.split('-').map(Number);
  const [oy, om, od] = onDate.split('-').map(Number);
  if (![by, bm, bd, oy, om, od].every(Number.isInteger)) return null;
  let age = oy - by;
  if (om < bm || (om === bm && od < bd)) age -= 1;
  return age;
}

export function fillTemplate(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] != null ? String(vars[key]) : match
  );
}

export function pence(amount) {
  const n = Number(amount);
  return Number.isInteger(n) ? n : null;
}

export function poundsWords(pence) {
  const n = Number(pence) || 0;
  const sign = n < 0 ? '-' : '';
  return sign + '£' + (Math.abs(n) / 100).toFixed(2);
}

export function trimTo(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

// YYYY-MM-DD and a real calendar date.
export function isValidIsoDate(value) {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function splitName(fullName) {
  const parts = fullName.split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

// Server-side validation of the public enquiry form. Returns cleaned data
// or per-field errors in plain English. A filled honeypot is reported as
// `bot: true` so the caller can pretend success without storing anything.
export function validateEnquiry(input, today) {
  const data = input || {};
  const errors = {};
  const name = trimTo(data.name, 80);
  const email = trimTo(data.email, 254).toLowerCase();
  const phoneRaw = trimTo(data.phone, 30);
  const phone = phoneRaw ? toE164(phoneRaw) : null;
  const dateOfBirth = trimTo(data.dateOfBirth, 10);
  const addressLine1 = trimTo(data.addressLine1, 120);
  const postcode = trimTo(data.postcode, 10).toUpperCase().replace(/\s+/g, ' ');
  const transmission = trimTo(data.transmission, 20);
  const preferredContact = trimTo(data.preferredContact, 20);
  const message = trimTo(data.message, 1000);
  const honeypot = trimTo(data.website, 200);

  if (honeypot) return { ok: true, bot: true, data: null, errors: {} };

  if (name.length < 2) errors.name = 'Tell me your name.';
  if (!isValidEmail(email)) errors.email = "That email address doesn't look right.";
  if (!phoneRaw) errors.phone = 'I need a phone number to arrange lessons.';
  else if (!phone) errors.phone = "That phone number doesn't look right.";
  if (dateOfBirth) {
    const age = isValidIsoDate(dateOfBirth) ? ageOn(dateOfBirth, today || londonDate()) : null;
    if (age === null || age < 14 || age > 100) errors.dateOfBirth = "That date of birth doesn't look right.";
  }
  if (addressLine1.length < 3) errors.addressLine1 = 'Add the first line of your address.';
  if (!isValidPostcode(postcode)) errors.postcode = "That postcode doesn't look right.";
  if (transmission !== TRANSMISSION.MANUAL && transmission !== TRANSMISSION.AUTOMATIC) {
    errors.transmission = 'Choose manual or automatic.';
  }
  if (!Object.values(PREFERRED_CONTACT).includes(preferredContact)) {
    errors.preferredContact = 'Choose how you would like me to get in touch.';
  }

  if (Object.keys(errors).length) return { ok: false, bot: false, data: null, errors };

  return {
    ok: true,
    bot: false,
    errors: {},
    data: Object.assign(splitName(name), {
      name,
      email,
      phone,
      dateOfBirth,
      addressLine1,
      postcode,
      transmission,
      preferredContact,
      message,
      outsideArea: !isTaughtPostcode(postcode)
    })
  };
}

// FNV-1a, 32-bit, as hex. Not cryptographic: it only has to bucket IPs for
// the rate limit without storing them.
export function hashKey(text) {
  let hash = 0x811c9dc5;
  const s = String(text);
  for (let i = 0; i < s.length; i += 1) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// Given the RateLimit rows already stored for a key (each with windowStart
// ISO and count), decides whether one more request is allowed now.
export function rateLimitDecision(rows, now, limits) {
  const limit = (limits && limits.perWindow) || ENQUIRY_LIMIT.perWindow;
  const windowMs = (limits && limits.windowMs) || ENQUIRY_LIMIT.windowMs;
  const nowMs = (now || new Date()).getTime();
  const recent = (rows || []).filter((row) => {
    const start = new Date(row.windowStart).getTime();
    return !Number.isNaN(start) && nowMs - start < windowMs;
  });
  const count = recent.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  return { allowed: count < limit, count, limit };
}

// Keeps only the My details fields and validates them. Returns cleaned
// values or per-field errors.
export function pickMyDetails(input) {
  const data = input || {};
  const errors = {};
  const out = {};
  for (const key of MY_DETAILS_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    const value = data[key];
    if (key === 'reminderEmail' || key === 'reminderWhatsApp') {
      out[key] = Boolean(value);
    } else if (key === 'email') {
      const email = trimTo(value, 254).toLowerCase();
      if (!isValidEmail(email)) errors.email = "That email address doesn't look right.";
      else out.email = email;
    } else if (key === 'phone' || key === 'emergencyContactPhone') {
      const raw = trimTo(value, 30);
      if (!raw) out[key] = '';
      else {
        const e164 = toE164(raw);
        if (!e164) errors[key] = "That phone number doesn't look right.";
        else out[key] = e164;
      }
    } else if (key === 'postcode') {
      const pc = trimTo(value, 10).toUpperCase().replace(/\s+/g, ' ');
      if (pc && !isValidPostcode(pc)) errors.postcode = "That postcode doesn't look right.";
      else out.postcode = pc;
    } else {
      out[key] = trimTo(value, 120);
    }
  }
  return { ok: Object.keys(errors).length === 0, data: out, errors };
}
