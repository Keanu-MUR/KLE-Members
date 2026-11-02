import { init } from 'public/portal-pages/home';
import { getSession } from 'backend/session.web';
import { getPupilHome } from 'backend/portal.web';

$w.onReady(() => init($w, { getSession, getPupilHome }));
