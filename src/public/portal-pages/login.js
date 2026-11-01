// Pupil login page. The page code file is two lines; everything lives here.

import { mountPortal } from 'public/portal-page';
import { getSession, requestLoginLink } from 'backend/session.web';

export function init($w) {
  return mountPortal($w, '#portal', {
    page: 'login',
    getSession,
    actions: {
      requestLoginLink: (payload) => requestLoginLink(payload.email)
    }
  });
}
