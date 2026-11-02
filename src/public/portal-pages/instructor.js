// Instructor dashboard page, including the one-off setup actions and the
// pupil record actions that Phase 1's screens will drive.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'instructor',
    getSession: backend.getSession,
    actions: {
      getInstructorDashboard: () => backend.getInstructorDashboard(),
      createCollections: () => backend.createCollections(),
      ensureSettings: () => backend.ensureSettings(),
      findMemberByEmail: (payload) => backend.findMemberByEmail(payload.email),
      createPupil: (payload) => backend.createPupil(payload)
    }
  });
}
