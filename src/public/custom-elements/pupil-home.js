// <kle-pupil-home>: the pupil's (or guardian's) home. Phase 0 proves the
// role routing and shows the four empty states; Phase 2 fills them.

import { PortalElement, esc } from './portal-base.js';

class KlePupilHome extends PortalElement {
  onSession() {
    this.setMain('<p class="muted">Loading your record.</p>');
    this.load();
  }

  async load() {
    const result = await this.call('getPupilHome');
    if (!result.ok) {
      this.setMain(this.failure(result));
      return;
    }
    this.render(result.data);
  }

  render(home) {
    const pupil = home.pupil || {};
    const name = [pupil.firstName, pupil.lastName].filter(Boolean).join(' ');
    const viewer = home.viewerRole === 'guardian' ? '<p class="viewer">Viewing as guardian, read only</p>' : '';
    this.setMain(
      '<h1>' + esc(name) + '</h1>' + viewer +
      '<h2>Next lesson</h2>' +
      (home.nextLesson ? '' : this.empty('Your next lesson will show here once it’s booked.')) +
      '<h2>Progress</h2>' +
      (home.progressSummary ? '' : this.empty('Your driver’s record will appear here after your first lesson.')) +
      '<h2>Balance</h2>' +
      (home.balance ? '' : this.empty('Your balance will show here once a lesson has been taught.')) +
      '<h2>Latest note</h2>' +
      (home.latestSummary ? '' : this.empty('My notes from your lessons will appear here.'))
    );
  }
}

customElements.define('kle-pupil-home', KlePupilHome);
