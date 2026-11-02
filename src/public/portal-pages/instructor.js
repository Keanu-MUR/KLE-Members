// Instructor dashboard page, including the one-off setup actions.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'instructor',
    getSession: backend.getSession,
    actions: {
      getInstructorDashboard: () => backend.getInstructorDashboard(),
      createCollections: () => backend.createCollections(),
      ensureSettings: () => backend.ensureSettings()
    }
  });
}
