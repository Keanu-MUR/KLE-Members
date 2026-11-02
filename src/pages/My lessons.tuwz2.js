import { init } from 'public/portal-pages/my-lessons';
import { getSession } from 'backend/session';
import { listMyLessons } from 'backend/lessons';
import { createMessage } from 'backend/messages';

$w.onReady(() => init($w, { getSession, listMyLessons, createMessage }));
