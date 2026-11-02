// Instructor pupils list page.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'pupils',
    getSession: backend.getSession,
    actions: {
      listPupils: (p) => backend.listPupils(p)
    }
  });
}
