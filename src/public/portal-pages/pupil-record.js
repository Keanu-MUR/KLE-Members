// Instructor pupil record page; the pupil id arrives in the URL as ?id=.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'pupil-record',
    getSession: backend.getSession,
    actions: {
      getPupil: (p) => backend.getPupil(p.id),
      updatePupil: (p) => backend.updatePupil(p.id, p.fields),
      setPupilStatus: (p) => backend.setPupilStatus(p.id, p.status),
      sendLoginLink: (p) => backend.sendLoginLink(p.id),
      listLessons: (p) => backend.listLessons(p),
      getProgress: (p) => backend.getProgress(p.id),
      listPupilMessages: (p) => backend.listPupilMessages(p.id),
      markMessageRead: (p) => backend.markMessageRead(p.id),
      replyToMessage: (p) => backend.replyToMessage(p.id, p.reply),
      listMockTests: (p) => backend.listMockTests(p.id),
      saveMockTest: (p) => backend.saveMockTest(p.id, p.fields),
      deleteMockTest: (p) => backend.deleteMockTest(p.id),
      replyToMessage: (p) => backend.replyToMessage(p.id, p.reply),
      listMockTests: (p) => backend.listMockTests(p.id),
      saveMockTest: (p) => backend.saveMockTest(p.id, p.fields),
      deleteMockTest: (p) => backend.deleteMockTest(p.id),
      replyToMessage: (p) => backend.replyToMessage(p.id, p.reply),
      listMockTests: (p) => backend.listMockTests(p.id),
      saveMockTest: (p) => backend.saveMockTest(p.id, p.fields),
      deleteMockTest: (p) => backend.deleteMockTest(p.id)
    }
  });
}
