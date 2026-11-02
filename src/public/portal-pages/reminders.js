// Instructor Tomorrow's reminders page.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'reminders',
    getSession: backend.getSession,
    actions: {
      getTomorrow: () => backend.getTomorrow(),
      resendReminder: (p) => backend.resendReminder(p.lessonId, p.channel)
    }
  });
}
