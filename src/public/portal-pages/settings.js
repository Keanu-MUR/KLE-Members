// Instructor Settings page, including the reminder test.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'settings',
    getSession: backend.getSession,
    actions: {
      getSettings: () => backend.getSettings(),
      updateSettings: (p) => backend.updateSettings(p.fields),
      upcomingForTest: () => backend.upcomingForTest(),
      testReminder: (p) => backend.testReminder(p.lessonId, p.email, p.phone),
      runPrune: () => backend.runPrune()
    }
  });
}
