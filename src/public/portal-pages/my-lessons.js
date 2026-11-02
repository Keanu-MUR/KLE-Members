// Pupil (and guardian) lessons page.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'my-lessons',
    getSession: backend.getSession,
    actions: {
      listMyLessons: () => backend.listMyLessons(),
      createMessage: (p) => backend.createMessage(p.body)
    }
  });
}
