import { init } from 'public/portal-pages/settings';
import { getSession } from 'backend/session';
import { getSettings, updateSettings } from 'backend/portal-settings';
import { upcomingForTest, testReminder, runPrune } from 'backend/reminders';

$w.onReady(() => init($w, { getSession, getSettings, updateSettings, upcomingForTest, testReminder, runPrune }));
