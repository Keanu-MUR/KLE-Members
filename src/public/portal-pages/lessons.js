// Instructor lessons page: list, add and edit. Parameters arrive in the URL
// (?id=, ?new=1, ?pupil=) and reach the element through mountPortal.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'lessons',
    getSession: backend.getSession,
    actions: {
      listLessons: (p) => backend.listLessons(p),
      getLesson: (p) => backend.getLesson(p.id),
      createLesson: (p) => backend.createLesson(p.fields),
      updateLesson: (p) => backend.updateLesson(p.id, p.fields)
    }
  });
}
