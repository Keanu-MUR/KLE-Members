// Who is logged in and where they should land. Callable by anyone so the
// login page can tell a logged-out visitor from a member.

import { Permissions, webMethod } from 'wix-web-module';
import { authentication } from 'wix-members-backend';
import { getCaller, guarded, PortalError } from 'backend/access';
import { isValidEmail } from 'public/portal-utils';
import { ROLES } from 'public/portal-constants';

function memberFirstName(member) {
  const contact = member && member.contactDetails;
  if (contact && contact.firstName) return contact.firstName;
  if (member && member.profile && member.profile.nickname) return member.profile.nickname;
  return '';
}

export const getSession = webMethod(
  Permissions.Anyone,
  guarded(async () => {
    const caller = await getCaller();
    const pupil = caller.pupil;
    return {
      loggedIn: Boolean(caller.memberId),
      role: caller.role,
      pupilId: pupil ? pupil._id : null,
      firstName: caller.role === ROLES.PUPIL && pupil ? pupil.firstName : memberFirstName(caller.member),
      pupilName: pupil ? [pupil.firstName, pupil.lastName].filter(Boolean).join(' ') : null,
      transmission: pupil ? pupil.transmission || null : null
    };
  })
);

// "Email me a login link". Wix Members has no passwordless login, so this
// sends Wix's set-password email (decision B, 1 Nov 2026). The response is
// the same whether or not the address belongs to a member, so the form
// cannot be used to find out who is a pupil.
export const requestLoginLink = webMethod(
  Permissions.Anyone,
  guarded(async (email) => {
    const address = String(email || '').trim();
    if (!isValidEmail(address)) throw new PortalError("That email address doesn't look right.");
    try {
      await authentication.sendSetPasswordEmail(address);
    } catch (error) {
      console.warn('[portal] requestLoginLink did not send');
    }
    return { sent: true };
  })
);
