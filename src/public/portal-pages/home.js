// Pupil home page (also the guardian's landing page, read only).

import { mountPortal } from 'public/portal-page';
import { getSession } from 'backend/session.web';
import { getPupilHome } from 'backend/portal.web';

export function init($w) {
  return mountPortal($w, '#portal', {
    page: 'home',
    getSession,
    actions: {
      getPupilHome: () => getPupilHome()
    }
  });
}
