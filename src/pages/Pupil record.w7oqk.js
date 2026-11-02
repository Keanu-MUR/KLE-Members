import { init } from 'public/portal-pages/pupil-record';
import { getSession } from 'backend/session';
import { getPupil, updatePupil, setPupilStatus, sendLoginLink } from 'backend/pupils';
import { listLessons } from 'backend/lessons';
import { getProgress } from 'backend/progress';
import { listPupilMessages, markMessageRead } from 'backend/messages';

$w.onReady(() => init($w, { getSession, getPupil, updatePupil, setPupilStatus, sendLoginLink, listLessons, getProgress, listPupilMessages, markMessageRead }));
