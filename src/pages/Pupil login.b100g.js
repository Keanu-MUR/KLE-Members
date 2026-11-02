import { init } from 'public/portal-pages/login';
import { getSession, requestLoginLink } from 'backend/session';

$w.onReady(() => init($w, { getSession, requestLoginLink }));
