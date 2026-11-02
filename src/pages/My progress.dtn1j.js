import { init } from 'public/portal-pages/my-progress';
import { getSession } from 'backend/session';
import { getMyProgress } from 'backend/progress';

$w.onReady(() => init($w, { getSession, getMyProgress }));
