import { init } from 'public/portal-pages/home';
import { getSession } from 'backend/session';
import { getPupilHome } from 'backend/portal';

$w.onReady(() => init($w, { getSession, getPupilHome }));
