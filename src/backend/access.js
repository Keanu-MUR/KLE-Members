// Who is calling, and what may they touch. Every web method goes through
// here before it reads or writes anything. The member comes from the
// session, never from the client.

import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';
import { ROLES, INSTRUCTOR_ROLE_TITLE } from 'public/portal-constants';

export class PortalError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'PortalError';
    this.code = code || 'portal';
  }
}

export function ok(data) {
  return { ok: true, data: data === undefined ? null : data };
}

export function fail(error) {
  return { ok: false, error: String(error) };
}

// Only PortalError messages are shown to users; anything else is a bug and
// gets a generic line so internals never leak to the browser.
export function friendlyError(error) {
  if (error instanceof PortalError) return error.message;
  console.error('[portal]', error && error.stack ? error.stack : error);
  return 'Something went wrong on my side. Try again, and tell me if it keeps happening.';
}

// Wraps a web method body so callers always get { ok, data } or
// { ok: false, error } and never an unhandled rejection.
export function guarded(fn) {
  return async function guardedCall() {
    try {
      return ok(await fn.apply(null, arguments));
    } catch (error) {
      return fail(friendlyError(error));
    }
  };
}

async function findPupilBy(field, value) {
  try {
    const result = await wixData.query('Pupils').eq(field, value).limit(1).find({ suppressAuth: true });
    return result.items[0] || null;
  } catch (error) {
    // Before Phase 0 setup has run the collection does not exist; treat that
    // as "not a pupil" rather than failing the whole call.
    return null;
  }
}

export async function getPupilById(pupilId) {
  if (!pupilId || typeof pupilId !== 'string') return null;
  try {
    return await wixData.get('Pupils', pupilId, { suppressAuth: true });
  } catch (error) {
    return null;
  }
}

export async function getCaller() {
  let member = null;
  try {
    member = await currentMember.getMember({ fieldsets: ['FULL'] });
  } catch (error) {
    member = null;
  }
  if (!member || !member._id) {
    return { memberId: null, role: ROLES.NONE, pupil: null, member: null };
  }

  let roles = [];
  try {
    roles = await currentMember.getRoles();
  } catch (error) {
    roles = [];
  }
  if (roles.some((role) => role.title === INSTRUCTOR_ROLE_TITLE)) {
    return { memberId: member._id, role: ROLES.INSTRUCTOR, pupil: null, member };
  }

  const own = await findPupilBy('memberId', member._id);
  if (own) return { memberId: member._id, role: ROLES.PUPIL, pupil: own, member };

  const ward = await findPupilBy('guardianMemberId', member._id);
  if (ward) return { memberId: member._id, role: ROLES.GUARDIAN, pupil: ward, member };

  return { memberId: member._id, role: ROLES.NONE, pupil: null, member };
}

export async function requireInstructor() {
  const caller = await getCaller();
  if (!caller.memberId) throw new PortalError('Please log in.', 'auth');
  if (caller.role !== ROLES.INSTRUCTOR) throw new PortalError('Only the instructor can do that.', 'forbidden');
  return caller;
}

// The pupil themself, their guardian (read only) or the instructor.
export async function requirePupilAccess(pupilId, options) {
  const write = Boolean(options && options.write);
  const caller = await getCaller();
  if (!caller.memberId) throw new PortalError('Please log in.', 'auth');

  if (caller.role === ROLES.INSTRUCTOR) {
    const pupil = await getPupilById(pupilId);
    if (!pupil) throw new PortalError('That pupil record was not found.', 'not-found');
    return { caller, pupil };
  }

  if (!caller.pupil || caller.pupil._id !== pupilId) {
    throw new PortalError('You can only see your own record.', 'forbidden');
  }
  if (write && caller.role !== ROLES.PUPIL) {
    throw new PortalError('Guardians can look but not change anything.', 'forbidden');
  }
  return { caller, pupil: caller.pupil };
}

// For pupil pages, which never send an id: resolve the caller's own pupil.
export async function requireOwnPupil(options) {
  const caller = await getCaller();
  if (!caller.memberId) throw new PortalError('Please log in.', 'auth');
  if (!caller.pupil) throw new PortalError('This account is not linked to a pupil yet.', 'forbidden');
  if (options && options.write && caller.role !== ROLES.PUPIL) {
    throw new PortalError('Guardians can look but not change anything.', 'forbidden');
  }
  return { caller, pupil: caller.pupil };
}

// The pupil fields a pupil or guardian may see. instructorNotes and the
// member link stay on the server.
export function publicPupil(pupil) {
  if (!pupil) return null;
  return {
    _id: pupil._id,
    firstName: pupil.firstName || '',
    lastName: pupil.lastName || '',
    email: pupil.email || '',
    phone: pupil.phone || '',
    transmission: pupil.transmission || '',
    status: pupil.status || '',
    theoryPassed: Boolean(pupil.theoryPassed),
    theoryPassDate: pupil.theoryPassDate || null,
    practicalTestDate: pupil.practicalTestDate || null,
    hourlyRatePence: pupil.hourlyRatePence || null,
    reminderEmail: Boolean(pupil.reminderEmail),
    reminderWhatsApp: Boolean(pupil.reminderWhatsApp)
  };
}
