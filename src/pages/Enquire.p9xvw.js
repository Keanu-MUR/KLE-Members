import { init } from 'public/portal-pages/enquire';
import { getSession } from 'backend/session';

$w.onReady(() => init($w, { getSession }));
