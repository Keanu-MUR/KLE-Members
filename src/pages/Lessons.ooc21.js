import { init } from 'public/portal-pages/lessons';
import { getSession } from 'backend/session';
import { listLessons, getLesson, createLesson, updateLesson } from 'backend/lessons';

$w.onReady(() => init($w, { getSession, listLessons, getLesson, createLesson, updateLesson }));
