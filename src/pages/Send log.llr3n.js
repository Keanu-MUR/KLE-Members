import { init } from 'public/portal-pages/send-log';
import { getSession } from 'backend/session';
import { listSendLog } from 'backend/send-log';

$w.onReady(() => init($w, { getSession, listSendLog }));
