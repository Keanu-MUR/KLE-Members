// Pupil home page (also the guardian's landing page, read only).

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'home',
    getSession: backend.getSession,
    actions: {
      getPupilHome: () => backend.getPupilHome()
    }
  });
}
