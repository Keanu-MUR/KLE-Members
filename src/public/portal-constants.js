// Single source of truth for the lists SPEC.md fixes: skills, levels, slots,
// taught postcodes, status values, message templates and Settings defaults.
// Edited here only; the UI and backend both import from this file.

export const SCHOOL = {
  name: 'KLE Driving School',
  wordmark: ['KLE', 'DRIVING'],
  tagline: 'Drive confidently.',
  siteUrl: 'https://www.kledrivingschool.co.uk',
  areasInWords: 'SE1, SE4, SE8, SE10, SE14, SE15 and SE16',
  defaultHourlyRatePence: 4100,
  minimumLessonMins: 120,
  packages: [
    { key: 'taster', name: 'Taster lesson', hours: 2, pricePence: 7000 },
    { key: 'block-6', name: '6-hour block', hours: 6 },
    { key: 'block-10', name: '10-hour block', hours: 10 },
    { key: 'block-20', name: '20-hour block', hours: 20 }
  ]
};

export const PORTAL_PATHS = {
  login: '/pupil-login',
  enquire: '/enquire',
  pupilHome: '/pupil-home',
  instructorHome: '/instructor'
};

export const ROLES = {
  INSTRUCTOR: 'instructor',
  PUPIL: 'pupil',
  GUARDIAN: 'guardian',
  NONE: 'none'
};

// The Wix member role title the instructor's account must hold.
export const INSTRUCTOR_ROLE_TITLE = 'Instructor';

// DVSA driver's record categories, in display order. manualOnly skills are
// hidden for automatic pupils.
export const SKILLS = [
  { key: 'cockpit-drill', name: 'Cockpit drill and safety checks' },
  { key: 'show-me-tell-me', name: 'Show-me/tell-me questions' },
  { key: 'controls-instruments', name: 'Controls and instruments' },
  { key: 'moving-off-stopping', name: 'Moving off and stopping' },
  { key: 'clutch-control', name: 'Clutch control', manualOnly: true },
  { key: 'safe-positioning', name: 'Safe positioning' },
  { key: 'mirrors-signals-anticipation', name: 'Mirrors, signals and anticipation' },
  { key: 'use-of-speed', name: 'Use of speed' },
  { key: 'meeting-crossing-traffic', name: 'Meeting and crossing traffic' },
  { key: 'junctions', name: 'Junctions' },
  { key: 'roundabouts', name: 'Roundabouts' },
  { key: 'pedestrian-crossings', name: 'Pedestrian crossings' },
  { key: 'dual-carriageways', name: 'Dual carriageways' },
  { key: 'independent-driving', name: 'Independent driving (sat nav and signs)' },
  { key: 'emergency-stop', name: 'Emergency stop' },
  { key: 'reverse-park-road', name: 'Reverse park on the road' },
  { key: 'bay-park', name: 'Bay park' },
  { key: 'pull-up-right-reverse', name: 'Pull up on the right and reverse' },
  { key: 'rural-roads', name: 'Rural roads' },
  { key: 'night-driving', name: 'Night driving' },
  { key: 'eco-safe-driving', name: 'Eco-safe driving' }
];

export const LEVELS = [
  { level: 1, name: 'Introduced' },
  { level: 2, name: 'Under full instruction' },
  { level: 3, name: 'Prompted' },
  { level: 4, name: 'Seldom prompted' },
  { level: 5, name: 'Independent' }
];

// The four fixed two-hour slots from the public site. 'custom' means the
// instructor typed a start time and duration instead.
export const SLOTS = [
  { key: 'early-morning', name: 'Early morning', start: '07:30', end: '09:30' },
  { key: 'late-morning', name: 'Late morning', start: '10:00', end: '12:00' },
  { key: 'early-afternoon', name: 'Early afternoon', start: '12:45', end: '14:45' },
  { key: 'late-afternoon', name: 'Late afternoon', start: '15:15', end: '17:15' }
];
export const CUSTOM_SLOT = 'custom';

export const TAUGHT_POSTCODES = ['SE1', 'SE4', 'SE8', 'SE10', 'SE14', 'SE15', 'SE16'];

export const TRANSMISSION = { MANUAL: 'manual', AUTOMATIC: 'automatic' };
export const PUPIL_STATUS = { ACTIVE: 'active', PASSED: 'passed', INACTIVE: 'inactive' };
export const LESSON_STATUS = {
  PLANNED: 'planned',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no-show'
};
export const MOCK_RESULT = { PASS: 'pass', FAIL: 'fail' };
export const PAYMENT_METHOD = {
  BANK_TRANSFER: 'bank transfer',
  CASH: 'cash',
  CARD_LINK: 'card link',
  PACKAGE: 'package'
};
export const ENQUIRY_STATUS = { NEW: 'new', REPLIED: 'replied', CONVERTED: 'converted', CLOSED: 'closed' };
export const PREFERRED_CONTACT = { PHONE: 'phone', EMAIL: 'email', WHATSAPP: 'whatsapp' };
export const CHANNEL = { EMAIL: 'email', WHATSAPP: 'whatsapp' };
export const SEND_STATUS = { SENT: 'sent', FAILED: 'failed', SKIPPED: 'skipped' };
export const EMAIL_PROVIDER = { WIX: 'wix', RESEND: 'resend' };

export const COLLECTIONS = [
  'Pupils',
  'Lessons',
  'Progress',
  'MockTests',
  'Payments',
  'Enquiries',
  'Messages',
  'Settings',
  'SendLog',
  'RateLimit'
];

// Variables in braces are filled by fillTemplate() in portal-utils.js. The
// WhatsApp lesson reminder is submitted to Meta word for word, so changing
// it here means re-approval.
export const TEMPLATES = {
  lessonReminder:
    'Hi {firstName}, reminder: your {transmission} driving lesson is tomorrow, {dateWords}, {slotTime}. Pick-up: {pickup}. Reply here if anything has changed.',
  newEnquiry:
    'New enquiry from {name}, {postcode}, {transmission}, prefers {preferredContact}. Reply from the portal.',
  enquiryConfirmation:
    'Thanks {firstName}. I have your enquiry and will be in touch by {preferredContact} within a day. If you need me sooner, message me on WhatsApp.',
  whatsAppTemplateNames: { lessonReminder: 'lesson_reminder', newEnquiry: 'new_enquiry' }
};

export const SETTINGS_DEFAULTS = {
  emailRemindersOn: true,
  whatsAppRemindersOn: false,
  emailProvider: EMAIL_PROVIDER.WIX,
  instructorEmail: 'kledrivingschool@gmail.com',
  instructorWhatsApp: '',
  enquiryAlertEmailOn: true,
  enquiryAlertWhatsAppOn: false,
  stripePaymentLinkUrl: '',
  reminderSendHour: 8,
  bankDetailsText: '',
  defaultHourlyRatePence: SCHOOL.defaultHourlyRatePence,
  lastExportAt: null,
  lastExportStatus: '',
  lessonRetentionDays: 120,
  sendLogRetentionDays: 30,
  paymentRetentionDays: 400
};

// Wix Light allows 1,500 items per site across all collections.
export const ITEM_LIMIT = 1500;

export const TIME_ZONE = 'Europe/London';
