// <kle-pupil-portal>: the pupil's and guardian's one-page portal.

import { PortalShell } from './portal-shell.js';
import './pupil-home.js';
import './my-lessons.js';
import './my-progress.js';
import './my-mock-tests.js';
import './my-details.js';

const SECTIONS = {
  home: { tag: 'kle-pupil-home' },
  lessons: { tag: 'kle-my-lessons' },
  progress: { tag: 'kle-my-progress' },
  'mock-tests': { tag: 'kle-my-mock-tests' },
  details: { tag: 'kle-my-details', roles: ['pupil'] }
};

const NAV = [
  { label: 'Home', section: 'home' },
  { label: 'Lessons', section: 'lessons' },
  { label: 'Progress', section: 'progress' },
  { label: 'Mock tests', section: 'mock-tests' },
  { label: 'My details', section: 'details', roles: ['pupil'] }
];

class KlePupilPortal extends PortalShell {
  config() {
    return { sections: SECTIONS, nav: NAV };
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-pupil-portal')) customElements.define('kle-pupil-portal', KlePupilPortal);
