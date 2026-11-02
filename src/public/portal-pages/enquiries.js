// Instructor enquiries page.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'enquiries',
    getSession: backend.getSession,
    actions: {
      listEnquiries: (p) => backend.listEnquiries(p.status),
      getEnquiry: (p) => backend.getEnquiry(p.id),
      replyToEnquiry: (p) => backend.replyToEnquiry(p.id, p.body),
      convertEnquiry: (p) => backend.convertEnquiry(p.id, p.overrides),
      closeEnquiry: (p) => backend.closeEnquiry(p.id)
    }
  });
}
