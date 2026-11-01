// Instructor dashboard page, including the one-off setup actions.

import { mountPortal } from 'public/portal-page';
import { getSession } from 'backend/session.web';
import { getInstructorDashboard } from 'backend/portal.web';
import { createCollections, ensureSettings } from 'backend/setup.web';

export function init($w) {
  return mountPortal($w, '#portal', {
    page: 'instructor',
    getSession,
    actions: {
      getInstructorDashboard: () => getInstructorDashboard(),
      createCollections: () => createCollections(),
      ensureSettings: () => ensureSettings()
    }
  });
}
