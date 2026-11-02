// Public enquiry page. The element posts to the HTTP function itself, then
// asks for the notifications to be sent through the web module (see
// backend/enquiry-pipeline.js for why it takes two steps).

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'enquire',
    getSession: backend.getSession,
    actions: {
      notifyEnquiry: (payload) => backend.notifyEnquiry(payload.enquiryId, payload.token)
    }
  });
}
