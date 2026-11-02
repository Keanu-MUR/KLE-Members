// <kle-instructor-portal>: the instructor's one-page portal.

import { PortalShell } from './portal-shell.js';
import './instructor-dashboard.js';
import './lessons.js';
import './pupils.js';
import './pupil-record.js';
import './enquiries.js';
import './progress-editor.js';
import './reminders.js';
import './settings.js';
import './send-log.js';

const SECTIONS = {
  home: { tag: 'kle-instructor-dashboard' },
  lessons: { tag: 'kle-lessons' },
  pupils: { tag: 'kle-pupils' },
  pupil: { tag: 'kle-pupil-record' },
  enquiries: { tag: 'kle-enquiries' },
  progress: { tag: 'kle-progress-editor' },
  reminders: { tag: 'kle-reminders' },
  settings: { tag: 'kle-settings' },
  'send-log': { tag: 'kle-send-log' }
};

const NAV = [
  { label: 'Today', section: 'home' },
  { label: 'Lessons', section: 'lessons' },
  { label: 'Pupils', section: 'pupils' },
  { label: 'Enquiries', section: 'enquiries' },
  { label: 'Reminders', section: 'reminders' },
  { label: 'Settings', section: 'settings' }
];

class KleInstructorPortal extends PortalShell {
  config() {
    return { sections: SECTIONS, nav: NAV };
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-instructor-portal')) customElements.define('kle-instructor-portal', KleInstructorPortal);
