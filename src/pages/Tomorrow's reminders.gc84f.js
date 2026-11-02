import { init } from 'public/portal-pages/reminders';
import { getSession } from 'backend/session';
import { getTomorrow, resendReminder } from 'backend/reminders';

$w.onReady(() => init($w, { getSession, getTomorrow, resendReminder }));
