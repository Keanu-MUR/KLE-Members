// Shared pupil and member helpers used by more than one web module.

import wixData from 'wix-data';
import { loadSettings } from 'backend/settings';
import { PUPIL_STATUS, TRANSMISSION } from 'public/portal-constants';
import { trimTo } from 'public/portal-utils';

// Members/PrivateMembersData is Wix's own members collection; its _id is
// the member ID that currentMember.getMember() reports. Read with elevated
// permissions after the caller has been checked.
export async function lookupMemberByEmail(email) {
  const result = await wixData
    .query('Members/PrivateMembersData')
    .eq('loginEmail', String(email || '').toLowerCase())
    .limit(1)
    .find({ suppressAuth: true });
  const member = result.items[0];
  if (!member) return null;
  return {
    memberId: member._id,
    loginEmail: member.loginEmail || '',
    firstName: member.firstName || '',
    lastName: member.lastName || ''
  };
}

export async function pupilByEmail(email) {
  const result = await wixData.query('Pupils').eq('email', String(email || '').toLowerCase()).limit(1).find({ suppressAuth: true });
  return result.items[0] || null;
}

// Inserts a Pupils item with the defaults every new pupil gets. `fields`
// is already validated by the caller.
export async function insertPupil(fields, memberId) {
  const { settings } = await loadSettings();
  return wixData.insert('Pupils', {
    memberId: memberId || '',
    firstName: fields.firstName,
    lastName: fields.lastName,
    dateOfBirth: trimTo(fields.dateOfBirth, 10),
    email: fields.email,
    phone: fields.phone || '',
    addressLine1: trimTo(fields.addressLine1, 120),
    addressLine2: trimTo(fields.addressLine2, 120),
    town: trimTo(fields.town, 60),
    postcode: trimTo(fields.postcode, 10).toUpperCase(),
    transmission: fields.transmission === TRANSMISSION.AUTOMATIC ? TRANSMISSION.AUTOMATIC : TRANSMISSION.MANUAL,
    licenceNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    status: PUPIL_STATUS.ACTIVE,
    theoryPassed: false,
    theoryPassDate: '',
    practicalTestDate: '',
    hourlyRatePence: settings.defaultHourlyRatePence,
    reminderEmail: true,
    reminderWhatsApp: false,
    whatsAppConsentAt: '',
    guardianMemberId: '',
    guardianName: '',
    guardianEmail: '',
    instructorNotes: '',
    lessonHistory: {}
  }, { suppressAuth: true });
}

// A short random password for members created from an enquiry. It is
// never shown or stored; the set-password email replaces it at once.
export function throwawayPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = 'Kle-';
  for (let i = 0; i < 20; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
