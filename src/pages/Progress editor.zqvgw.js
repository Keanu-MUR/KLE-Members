import { init } from 'public/portal-pages/progress';
import { getSession } from 'backend/session';
import { getProgress, setSkill } from 'backend/progress';

$w.onReady(() => init($w, { getSession, getProgress, setSkill }));
