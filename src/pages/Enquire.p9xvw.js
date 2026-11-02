import { init } from 'public/portal-pages/enquire';
import { getSession } from 'backend/session';
import { notifyEnquiry } from 'backend/enquire';

$w.onReady(() => init($w, { getSession, notifyEnquiry }));
