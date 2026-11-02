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
  ENQUIRY_LIMIT,
  SKILLS,
  LEVELS,
  LESSON_STATUS,
  MOCK_RESULT,
  TEMPLATES,
  EMAIL_PROVIDER,
  CHANNEL,
  SCHOOL,
  PORTAL_PATHS
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
      label: slot.start + '–' + slot.end
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

// ---------------------------------------------------------------------------
// Phase 2: lessons and progress.

// Monday-to-Sunday ranges for the week holding `today` and the week after.
export function weekRanges(today) {
  const day = new Date(today + 'T12:00:00Z').getUTCDay(); // 0 Sunday .. 6 Saturday
  const sinceMonday = (day + 6) % 7;
  const monday = addDays(today, -sinceMonday);
  return {
    thisWeek: { from: monday, to: addDays(monday, 6) },
    nextWeek: { from: addDays(monday, 7), to: addDays(monday, 13) }
  };
}

export function lessonEnd(lesson) {
  return addMinutes(lesson.startTime, Number(lesson.durationMins));
}

// True when two lessons on the same date share any minute.
export function lessonsOverlap(a, b) {
  if (!a || !b || a.date !== b.date) return false;
  const toMins = (t) => {
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + m;
  };
  const aStart = toMins(a.startTime);
  const aEnd = aStart + Number(a.durationMins);
  const bStart = toMins(b.startTime);
  const bEnd = bStart + Number(b.durationMins);
  return aStart < bEnd && bStart < aEnd;
}

// "07:30–09:30" for a fixed slot or "11:15–12:45" for a custom time.
export function lessonTimeLabel(lesson) {
  if (!lesson) return '';
  return slotTimeWords(lesson.slot, lesson.startTime, lesson.durationMins);
}

const LESSON_STATUSES = Object.values(LESSON_STATUS);

// Cleans and checks the fields the instructor's lesson form sends. Returns
// { ok, data, errors } with plain-English errors keyed by field.
export function validateLesson(input) {
  const src = input || {};
  const errors = {};
  const pupilId = trimTo(src.pupilId, 64);
  if (!pupilId) errors.pupilId = 'Choose a pupil.';
  const date = trimTo(src.date, 10);
  if (!isValidIsoDate(date)) errors.date = 'Pick a date.';
  const timing = parseSlot(src.slot, trimTo(src.startTime, 5), src.durationMins === '' || src.durationMins == null ? NaN : Number(src.durationMins));
  if (!timing) {
    errors.slot = src.slot === CUSTOM_SLOT
      ? 'A custom lesson needs a start time (like 11:15) and a length between 30 minutes and 8 hours.'
      : 'Choose a slot.';
  }
  const pickupLocation = trimTo(src.pickupLocation, 160);
  if (!pickupLocation) errors.pickupLocation = 'Where are you picking them up?';
  const status = LESSON_STATUSES.includes(src.status) ? src.status : LESSON_STATUS.PLANNED;
  const data = Object.assign({
    pupilId,
    date,
    pickupLocation,
    status,
    pupilSummary: trimTo(src.pupilSummary, 2000),
    instructorNotes: trimTo(src.instructorNotes, 4000)
  }, timing ? { slot: timing.slot, startTime: timing.startTime, durationMins: timing.durationMins } : {});
  return { ok: Object.keys(errors).length === 0, data, errors };
}

// Lessons grouped by date, each day sorted by start time, days ascending.
export function groupLessonsByDay(lessons) {
  const byDate = new Map();
  for (const lesson of lessons || []) {
    if (!byDate.has(lesson.date)) byDate.set(lesson.date, []);
    byDate.get(lesson.date).push(lesson);
  }
  return Array.from(byDate.keys()).sort().map((date) => ({
    date,
    lessons: byDate.get(date).slice().sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
  }));
}

// The skills a pupil's record shows: manual-only ones drop for automatic.
export function visibleSkills(transmission) {
  const automatic = transmission === TRANSMISSION.AUTOMATIC;
  return SKILLS.filter((skill) => !(automatic && skill.manualOnly));
}

// { total, set, strong, words } where words is "14 of 21 skills at level 4
// or above", or '' while nothing has been set.
export function progressSummary(skillsJson, transmission) {
  const data = skillsJson && typeof skillsJson === 'object' ? skillsJson : {};
  const visible = visibleSkills(transmission);
  const set = visible.filter((s) => data[s.key] && Number(data[s.key].level) > 0).length;
  const strong = visible.filter((s) => data[s.key] && Number(data[s.key].level) >= 4).length;
  return {
    total: visible.length,
    set,
    strong,
    words: set ? strong + ' of ' + visible.length + ' skills at level 4 or above' : ''
  };
}

// Checks one tap on the grid: a known, visible skill and a level 1 to 5.
export function validateSkill(skillKey, level, note, transmission) {
  const errors = {};
  const skill = visibleSkills(transmission).find((s) => s.key === skillKey);
  if (!skill) errors.skillKey = 'That skill is not on this pupil’s record.';
  const lvl = Number(level);
  if (!LEVELS.some((l) => l.level === lvl)) errors.level = 'Levels run from 1 to 5.';
  return { ok: Object.keys(errors).length === 0, data: { skillKey, level: lvl, note: trimTo(note, 500) }, errors };
}

// ---------------------------------------------------------------------------
// Phase 3: mock tests and message replies.

const MOCK_RESULTS = Object.values(MOCK_RESULT);
const SKILL_KEYS = SKILLS.map((s) => s.key);

function countField(value) {
  if (value === '' || value == null) return 0;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 99 ? n : null;
}

// Cleans and checks a mock test from the instructor's form. faults is an
// array of { category, note } where category is a skill key.
export function validateMockTest(input) {
  const src = input || {};
  const errors = {};
  const date = trimTo(src.date, 10);
  if (!isValidIsoDate(date)) errors.date = 'Pick the date of the mock test.';
  const result = MOCK_RESULTS.includes(src.result) ? src.result : '';
  if (!result) errors.result = 'Pass or fail?';
  const counts = {};
  [['minors', 'minor'], ['serious', 'serious'], ['dangerous', 'dangerous']].forEach(([key, word]) => {
    const n = countField(src[key]);
    if (n === null) errors[key] = 'A whole number from 0 to 99 of ' + word + ' faults.';
    else counts[key] = n;
  });
  const faults = [];
  const rows = Array.isArray(src.faults) ? src.faults.slice(0, 30) : [];
  rows.forEach((row) => {
    const category = trimTo(row && row.category, 60);
    const note = trimTo(row && row.note, 200);
    if (!category && !note) return;
    if (!SKILL_KEYS.includes(category)) {
      errors.faults = 'Choose a category for every fault.';
      return;
    }
    faults.push({ category, note });
  });
  return {
    ok: Object.keys(errors).length === 0,
    data: Object.assign({ date, result, faults, feedback: trimTo(src.feedback, 2000) }, counts),
    errors
  };
}

// "5 minors, 1 serious, 0 dangerous"
export function mockTestWords(test) {
  const t = test || {};
  const n = (v) => Number(v) || 0;
  return n(t.minors) + ' minor' + (n(t.minors) === 1 ? '' : 's') + ', ' + n(t.serious) + ' serious, ' + n(t.dangerous) + ' dangerous';
}

export function skillName(key) {
  const skill = SKILLS.find((s) => s.key === key);
  return skill ? skill.name : key;
}

export function validateReply(text) {
  const reply = trimTo(text, 2000);
  if (reply.length < 2) return { ok: false, error: 'Write a reply first.' };
  return { ok: true, reply };
}

// ---------------------------------------------------------------------------
// Phase 4: reminders, settings and the send log.

// Decides, per channel, whether tomorrow's reminder for one lesson goes out.
// sentToday is { email: bool, whatsapp: bool }: rows already sent for this
// lesson and channel in today's run, so a second run sends nothing more.
// Returns { email, whatsapp, guardianEmail, reasons } where each channel is
// 'send' or 'skip' and reasons holds the skip reason per channel.
export function reminderDecision(settings, pupil, lesson, sentToday) {
  const s = settings || {};
  const p = pupil || {};
  const sent = sentToday || {};
  const reasons = {};
  let email = 'send';
  if (!s.emailRemindersOn) { email = 'skip'; reasons.email = 'Email reminders are switched off'; }
  else if (!p.reminderEmail) { email = 'skip'; reasons.email = 'Pupil has email reminders off'; }
  else if (!isValidEmail(p.email || '')) { email = 'skip'; reasons.email = 'No valid email on the record'; }
  else if (sent.email) { email = 'skip'; reasons.email = 'Already sent today'; }

  let whatsapp = 'send';
  if (!s.whatsAppRemindersOn) { whatsapp = 'skip'; reasons.whatsapp = 'WhatsApp reminders are switched off'; }
  else if (!p.reminderWhatsApp) { whatsapp = 'skip'; reasons.whatsapp = 'Pupil has WhatsApp reminders off'; }
  else if (!p.whatsAppConsentAt) { whatsapp = 'skip'; reasons.whatsapp = 'No WhatsApp consent recorded'; }
  else if (!p.phone) { whatsapp = 'skip'; reasons.whatsapp = 'No phone number on the record'; }
  else if (sent.whatsapp) { whatsapp = 'skip'; reasons.whatsapp = 'Already sent today'; }

  // Under 18 on the lesson date with a guardian email: the guardian gets the
  // email too. Guardians never receive WhatsApp.
  let guardianEmail = 'skip';
  if (email === 'send' && p.guardianEmail && isValidEmail(p.guardianEmail) && lesson && lesson.date) {
    const age = ageOn(p.dateOfBirth, lesson.date);
    if (age !== null && age < 18) guardianEmail = 'send';
  }
  return { email, whatsapp, guardianEmail, reasons };
}

// The variables every reminder template takes, from a lesson and its pupil.
export function reminderVars(lesson, pupil) {
  const l = lesson || {};
  const p = pupil || {};
  return {
    firstName: p.firstName || '',
    transmission: p.transmission || l.transmission || '',
    dateWords: dateWords(l.date),
    slotTime: slotTimeWords(l.slot, l.startTime, l.durationMins),
    pickup: l.pickupLocation || '',
    link: SCHOOL.siteUrl + PORTAL_PATHS.myLessons
  };
}

// The reminder as one line of text, for WhatsApp and the wa.me fallback.
export function reminderText(lesson, pupil) {
  return fillTemplate(TEMPLATES.lessonReminder, reminderVars(lesson, pupil));
}

// https://wa.me/447700900123?text=... for the manual fallback.
export function waMeLink(phone, text) {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text || '');
}

// ISO cutoff for pruning: rows created before it go.
export function pruneCutoff(now, days) {
  const n = Number(days);
  const keep = Number.isInteger(n) && n >= 7 ? n : 30;
  return new Date((now || new Date()).getTime() - keep * 24 * 60 * 60 * 1000).toISOString();
}

const SETTINGS_BOOLS = ['emailRemindersOn', 'whatsAppRemindersOn', 'enquiryAlertEmailOn', 'enquiryAlertWhatsAppOn'];
const SETTINGS_DAYS = { lessonRetentionDays: [30, 400], sendLogRetentionDays: [7, 400], paymentRetentionDays: [30, 400] };

// Cleans and checks the Settings form. Only known fields are returned.
export function validateSettings(input) {
  const src = input || {};
  const errors = {};
  const data = {};
  SETTINGS_BOOLS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(src, key)) data[key] = Boolean(src[key]);
  });
  if (Object.prototype.hasOwnProperty.call(src, 'emailProvider')) {
    if (!Object.values(EMAIL_PROVIDER).includes(src.emailProvider)) errors.emailProvider = 'Choose Wix or Resend.';
    else data.emailProvider = src.emailProvider;
  }
  if (Object.prototype.hasOwnProperty.call(src, 'instructorEmail')) {
    const email = trimTo(src.instructorEmail, 254).toLowerCase();
    if (!isValidEmail(email)) errors.instructorEmail = "That email address doesn't look right.";
    else data.instructorEmail = email;
  }
  if (Object.prototype.hasOwnProperty.call(src, 'instructorWhatsApp')) {
    const raw = trimTo(src.instructorWhatsApp, 30);
    if (!raw) data.instructorWhatsApp = '';
    else {
      const e164 = toE164(raw);
      if (!e164) errors.instructorWhatsApp = "That phone number doesn't look right.";
      else data.instructorWhatsApp = e164;
    }
  }
  if (Object.prototype.hasOwnProperty.call(src, 'reminderSendHour')) {
    const hour = Number(src.reminderSendHour);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) errors.reminderSendHour = 'Pick an hour from 0 to 23.';
    else data.reminderSendHour = hour;
  }
  if (Object.prototype.hasOwnProperty.call(src, 'defaultHourlyRatePence')) {
    const rate = Number(src.defaultHourlyRatePence);
    if (!Number.isInteger(rate) || rate < 0 || rate > 50000) errors.defaultHourlyRatePence = 'Enter the rate in pounds and pence.';
    else data.defaultHourlyRatePence = rate;
  }
  Object.keys(SETTINGS_DAYS).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(src, key)) return;
    const [min, max] = SETTINGS_DAYS[key];
    const days = Number(src[key]);
    if (!Number.isInteger(days) || days < min || days > max) errors[key] = 'A whole number of days from ' + min + ' to ' + max + '.';
    else data[key] = days;
  });
  return { ok: Object.keys(errors).length === 0, data, errors };
}

// Sent and failed counts per channel from SendLog rows.
export function sendCounts(rows) {
  const out = { email: { sent: 0, failed: 0, skipped: 0 }, whatsapp: { sent: 0, failed: 0, skipped: 0 } };
  (rows || []).forEach((row) => {
    const channel = row.channel === CHANNEL.WHATSAPP ? 'whatsapp' : 'email';
    if (row.status === 'sent') out[channel].sent += 1;
    else if (row.status === 'failed') out[channel].failed += 1;
    else out[channel].skipped += 1;
  });
  return out;
}

// ---- Phase 5: CSV export and lesson compaction ------------------------

// One CSV cell: objects as JSON, dates as ISO, quoted when needed.
export function csvEscape(value) {
  if (value == null) return '';
  let text;
  if (value instanceof Date) text = value.toISOString();
  else if (typeof value === 'object') text = JSON.stringify(value);
  else text = String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

const SYSTEM_COLUMNS = ['_id', '_createdDate', '_updatedDate', '_owner'];

// Every key seen across the rows: the system fields first, then A to Z.
export function csvColumns(rows) {
  const seen = new Set();
  rows.forEach((row) => Object.keys(row || {}).forEach((key) => seen.add(key)));
  const system = SYSTEM_COLUMNS.filter((key) => seen.has(key));
  const rest = Array.from(seen).filter((key) => !SYSTEM_COLUMNS.includes(key)).sort();
  return system.concat(rest);
}

// RFC 4180 text with CRLF line ends and a header row.
export function toCsv(rows, columns) {
  const cols = columns || csvColumns(rows);
  const lines = [cols.map(csvEscape).join(',')];
  rows.forEach((row) => lines.push(cols.map((key) => csvEscape(row ? row[key] : '')).join(',')));
  return lines.join('\r\n') + '\r\n';
}

function emptyYear() {
  return { count: 0, hours: 0, completed: 0, cancelled: 0, noShow: 0 };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// Lessons dated before the cutoff (YYYY-MM-DD) that are not still planned,
// totalled per pupil and year, plus the ids to delete.
export function compactionPlan(lessons, cutoffDate) {
  const totals = {};
  const lessonIds = [];
  (lessons || []).forEach((lesson) => {
    const date = String(lesson.date || '');
    if (!date || date >= cutoffDate || lesson.status === 'planned' || !lesson.pupilId) return;
    const year = date.slice(0, 4);
    const pupil = totals[lesson.pupilId] = totals[lesson.pupilId] || {};
    const y = pupil[year] = pupil[year] || emptyYear();
    y.count += 1;
    y.hours = round1(y.hours + (Number(lesson.durationMins) || 0) / 60);
    if (lesson.status === 'completed') y.completed += 1;
    else if (lesson.status === 'cancelled') y.cancelled += 1;
    else if (lesson.status === 'no-show') y.noShow += 1;
    lessonIds.push(lesson._id);
  });
  return { totals, lessonIds };
}

// Adds a pupil's new yearly totals onto the history already stored.
export function mergeHistory(history, yearTotals) {
  const out = {};
  const base = history && typeof history === 'object' && !Array.isArray(history) ? history : {};
  Object.keys(base).forEach((year) => { out[year] = Object.assign(emptyYear(), base[year]); });
  Object.keys(yearTotals || {}).forEach((year) => {
    const y = out[year] = out[year] || emptyYear();
    const add = yearTotals[year] || {};
    ['count', 'completed', 'cancelled', 'noShow'].forEach((key) => { y[key] = (Number(y[key]) || 0) + (Number(add[key]) || 0); });
    y.hours = round1((Number(y.hours) || 0) + (Number(add.hours) || 0));
  });
  return out;
}
