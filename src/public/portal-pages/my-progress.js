// Pupil (and guardian) progress page.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'my-progress',
    getSession: backend.getSession,
    actions: {
      getMyProgress: () => backend.getMyProgress()
    }
  });
}
