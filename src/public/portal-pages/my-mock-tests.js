// Pupil (and guardian) mock tests page.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'my-mock-tests',
    getSession: backend.getSession,
    actions: {
      getMyMockTests: () => backend.listMyMockTests()
    }
  });
}
