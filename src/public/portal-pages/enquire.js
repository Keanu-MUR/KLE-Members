// Public enquiry page. The element posts to the HTTP function itself; the
// session is only needed for the navigation row.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'enquire',
    getSession: backend.getSession,
    actions: {}
  });
}
