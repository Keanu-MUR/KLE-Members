// Pupil login page. Page code imports the backend web methods (public
// files cannot resolve them) and hands them in; everything else lives here.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'login',
    getSession: backend.getSession,
    actions: {
      requestLoginLink: (payload) => backend.requestLoginLink(payload.email)
    }
  });
}
