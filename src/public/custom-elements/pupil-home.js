// <kle-pupil-home>: the pupil's (or guardian's) home: next lesson, the
// one-line progress summary, balance (Phase 3) and the latest note.

import { PortalElement, esc } from './portal-base.js';
import { LESSON_STYLE, renderLessonRow, dayWords } from './lesson-list.js';

class KlePupilHome extends PortalElement {
  extraStyle() {
    return LESSON_STYLE;
  }

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
    const latest = home.latestSummary;
    this.setMain(
      '<h1>' + esc(name) + '</h1>' + viewer +
      '<h2>Next lesson</h2>' +
      (home.nextLesson
        ? renderLessonRow(home.nextLesson, { showDate: true, href: '/my-lessons' })
        : this.empty('Your next lesson will show here once it’s booked.')) +
      '<h2>Progress</h2>' +
      (home.progressSummary
        ? '<p>' + esc(home.progressSummary) + '. <a href="/my-progress">See the driver’s record</a></p>'
        : this.empty('Your driver’s record will appear here after your first lesson.')) +
      '<h2>Balance</h2>' +
      (home.balance ? '' : this.empty('Your balance will show here once a lesson has been taught.')) +
      '<h2>Latest note</h2>' +
      (latest
        ? '<p class="smallcaps muted">' + esc(dayWords(latest.date, true)) + '</p><p class="lesson-summary">' + esc(latest.pupilSummary) + '</p>'
        : this.empty('My notes from your lessons will appear here.'))
    );
  }
}

customElements.define('kle-pupil-home', KlePupilHome);
