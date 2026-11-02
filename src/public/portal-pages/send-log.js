// Instructor Send log page.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'send-log',
    getSession: backend.getSession,
    actions: {
      listSendLog: (p) => backend.listSendLog(p)
    }
  });
}
