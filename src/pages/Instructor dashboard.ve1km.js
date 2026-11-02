import { init } from 'public/portal-pages/instructor';
import { getSession } from 'backend/session';
import { getInstructorDashboard } from 'backend/portal';
import { createCollections, ensureSettings } from 'backend/setup-actions';
import { findMemberByEmail, createPupil } from 'backend/pupils';

$w.onReady(() => init($w, { getSession, getInstructorDashboard, createCollections, ensureSettings, findMemberByEmail, createPupil }));
