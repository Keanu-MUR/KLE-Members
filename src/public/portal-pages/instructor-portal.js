// The instructor's one-page portal (/instructor): every action the
// instructor sections use, in one place.

import { mountPortal } from 'public/portal-page';

export function init($w, backend) {
  return mountPortal($w, '#portal', {
    page: 'instructor-portal',
    getSession: backend.getSession,
    actions: {
      // Dashboard and setup
      getInstructorDashboard: () => backend.getInstructorDashboard(),
      createCollections: () => backend.createCollections(),
      ensureSettings: () => backend.ensureSettings(),
      findMemberByEmail: (p) => backend.findMemberByEmail(p.email),
      createPupil: (p) => backend.createPupil(p),
      // Lessons
      listLessons: (p) => backend.listLessons(p),
      getLesson: (p) => backend.getLesson(p.id),
      createLesson: (p) => backend.createLesson(p.fields),
      updateLesson: (p) => backend.updateLesson(p.id, p.fields),
      // Pupils and the pupil record
      listPupils: (p) => backend.listPupils(p),
      getPupil: (p) => backend.getPupil(p.id),
      updatePupil: (p) => backend.updatePupil(p.id, p.fields),
      setPupilStatus: (p) => backend.setPupilStatus(p.id, p.status),
      sendLoginLink: (p) => backend.sendLoginLink(p.id),
      linkGuardian: (p) => backend.linkGuardian(p.id, p.email),
      unlinkGuardian: (p) => backend.unlinkGuardian(p.id),
      sendGuardianLoginLink: (p) => backend.sendGuardianLoginLink(p.id),
      listPupilMessages: (p) => backend.listPupilMessages(p.id),
      markMessageRead: (p) => backend.markMessageRead(p.id),
      replyToMessage: (p) => backend.replyToMessage(p.id, p.reply),
      listMockTests: (p) => backend.listMockTests(p.id),
      saveMockTest: (p) => backend.saveMockTest(p.id, p.fields),
      deleteMockTest: (p) => backend.deleteMockTest(p.id),
      // Progress
      getProgress: (p) => backend.getProgress(p.id),
      setSkill: (p) => backend.setSkill(p.id, p.skillKey, p.level, p.note),
      // Enquiries
      listEnquiries: (p) => backend.listEnquiries(p.status),
      getEnquiry: (p) => backend.getEnquiry(p.id),
      replyToEnquiry: (p) => backend.replyToEnquiry(p.id, p.body),
      convertEnquiry: (p) => backend.convertEnquiry(p.id, p.overrides),
      closeEnquiry: (p) => backend.closeEnquiry(p.id),
      // Reminders, settings, send log
      getTomorrow: () => backend.getTomorrow(),
      resendReminder: (p) => backend.resendReminder(p.lessonId, p.channel),
      getSettings: () => backend.getSettings(),
      updateSettings: (p) => backend.updateSettings(p.fields),
      upcomingForTest: () => backend.upcomingForTest(),
      testReminder: (p) => backend.testReminder(p.lessonId, p.email, p.phone),
      runPrune: () => backend.runPrune(),
      latestBackupLinks: () => backend.latestBackupLinks(),
      runExport: () => backend.runExport(),
      exportCollection: (p) => backend.exportCollection(p.name),
      runCompactionNow: () => backend.runCompactionNow(),
      listSendLog: (p) => backend.listSendLog(p)
    }
  });
}
