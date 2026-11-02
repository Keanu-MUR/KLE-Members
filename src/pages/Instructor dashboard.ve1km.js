import { init } from 'public/portal-pages/instructor';
import { getSession } from 'backend/session.web';
import { getInstructorDashboard } from 'backend/portal.web';
import { createCollections, ensureSettings } from 'backend/setup.web';

$w.onReady(() => init($w, { getSession, getInstructorDashboard, createCollections, ensureSettings }));
