import { init } from 'public/portal-pages/pupil-record';
import { getSession } from 'backend/session';
import { getPupil, updatePupil, setPupilStatus, sendLoginLink } from 'backend/pupils';

$w.onReady(() => init($w, { getSession, getPupil, updatePupil, setPupilStatus, sendLoginLink }));
