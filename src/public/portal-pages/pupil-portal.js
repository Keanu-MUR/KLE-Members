// The pupil's and guardian's one-page portal (/pupil): every action the
// pupil sections use, in one place.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'pupil-portal',
    hideSiteHeader: true,
    getSession: backend.getSession,
    actions: {
      getPupilHome: () => backend.getPupilHome(),
      listMyLessons: () => backend.listMyLessons(),
      createMessage: (p) => backend.createMessage(p.body),
      listMyMessages: () => backend.listMyMessages(),
      getMyProgress: () => backend.getMyProgress(),
      getMyMockTests: () => backend.listMyMockTests(),
      getMyDetails: () => backend.getMyDetails(),
      updateMyDetails: (p) => backend.updateMyDetails(p)
    }
  });
}
