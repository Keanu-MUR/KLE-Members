import { init } from 'public/portal-pages/pupils';
import { getSession } from 'backend/session';
import { listPupils } from 'backend/pupils';

$w.onReady(() => init($w, { getSession, listPupils }));
