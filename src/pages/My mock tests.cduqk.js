import { init } from 'public/portal-pages/my-mock-tests';
import { getSession } from 'backend/session';
import { listMyMockTests } from 'backend/mock-tests';

$w.onReady(() => init($w, { getSession, listMyMockTests }));
