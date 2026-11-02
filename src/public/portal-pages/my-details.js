// Pupil My details page (guardian read only).

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'my-details',
    getSession: backend.getSession,
    actions: {
      getMyDetails: () => backend.getMyDetails(),
      updateMyDetails: (p) => backend.updateMyDetails(p)
    }
  });
}
