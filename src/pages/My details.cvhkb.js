import { init } from 'public/portal-pages/my-details';
import { getSession } from 'backend/session';
import { getMyDetails, updateMyDetails } from 'backend/me';

$w.onReady(() => init($w, { getSession, getMyDetails, updateMyDetails }));
