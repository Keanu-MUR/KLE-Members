import { init } from 'public/portal-pages/pupil-portal';
import { getSession } from 'backend/session';
import { getPupilHome } from 'backend/portal';
import { listMyLessons } from 'backend/lessons';
import { createMessage, listMyMessages } from 'backend/messages';
import { getMyProgress } from 'backend/progress';
import { listMyMockTests } from 'backend/mock-tests';
import { getMyDetails, updateMyDetails } from 'backend/me';

$w.onReady(() => init($w, { getSession, getPupilHome, listMyLessons, createMessage, listMyMessages, getMyProgress, listMyMockTests, getMyDetails, updateMyDetails }));
