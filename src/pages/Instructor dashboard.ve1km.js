import { init } from 'public/portal-pages/instructor-portal';
import { getSession } from 'backend/session';
import { getInstructorDashboard } from 'backend/portal';
import { createCollections, ensureSettings } from 'backend/setup-actions';
import { listLessons, getLesson, createLesson, updateLesson } from 'backend/lessons';
import { listPupils, getPupil, updatePupil, setPupilStatus, sendLoginLink, findMemberByEmail, createPupil, linkGuardian, unlinkGuardian, sendGuardianLoginLink } from 'backend/pupils';
import { listPupilMessages, markMessageRead, replyToMessage } from 'backend/messages';
import { listMockTests, saveMockTest, deleteMockTest } from 'backend/mock-tests';
import { getProgress, setSkill } from 'backend/progress';
import { listEnquiries, getEnquiry, replyToEnquiry, convertEnquiry, closeEnquiry } from 'backend/enquiries';
import { getTomorrow, resendReminder, upcomingForTest, testReminder, runPrune } from 'backend/reminders';
import { getSettings, updateSettings, latestBackupLinks, runExport, exportCollection, runCompactionNow } from 'backend/portal-settings';
import { listSendLog } from 'backend/send-log';

$w.onReady(() => init($w, {
  getSession,
  getInstructorDashboard, createCollections, ensureSettings, findMemberByEmail, createPupil,
  listLessons, getLesson, createLesson, updateLesson,
  listPupils, getPupil, updatePupil, setPupilStatus, sendLoginLink, linkGuardian, unlinkGuardian, sendGuardianLoginLink,
  listPupilMessages, markMessageRead, replyToMessage,
  listMockTests, saveMockTest, deleteMockTest,
  getProgress, setSkill,
  listEnquiries, getEnquiry, replyToEnquiry, convertEnquiry, closeEnquiry,
  getTomorrow, resendReminder, upcomingForTest, testReminder, runPrune,
  getSettings, updateSettings, latestBackupLinks, runExport, exportCollection, runCompactionNow,
  listSendLog
}));
