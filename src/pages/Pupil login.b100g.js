import { init } from 'public/portal-pages/login';
import { getSession, requestLoginLink } from 'backend/session.web';

$w.onReady(() => init($w, { getSession, requestLoginLink }));
