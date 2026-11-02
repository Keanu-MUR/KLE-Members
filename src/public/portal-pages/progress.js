// Instructor progress editor; the pupil id arrives in the URL as ?id=.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'progress',
    getSession: backend.getSession,
    actions: {
      getProgress: (p) => backend.getProgress(p.id),
      setSkill: (p) => backend.setSkill(p.id, p.skillKey, p.level, p.note)
    }
  });
}
