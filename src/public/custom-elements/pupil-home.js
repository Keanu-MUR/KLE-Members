// <kle-pupil-home>: the pupil's (or guardian's) home: next lesson, the
// one-line progress summary and the latest note.

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

  // "14 of 21 skills at level 4 or above" as a big number with its label.
  progressStat(summary) {
    const m = String(summary).match(/^(\d+)\s+(.*)$/);
    const n = m ? m[1] : '';
    const label = m ? m[2] : summary;
    return '<div class="stats"><a class="stat" href="/my-progress">' +
      (n ? '<span class="stat-n">' + esc(n) + '</span>' : '') + '<span class="stat-l">' + esc(label) + '. See the driver’s record</span></a></div>';
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
        ? this.progressStat(home.progressSummary)
        : this.empty('Your driver’s record will appear here after your first lesson.')) +
      '<h2>Latest note</h2>' +
      (latest
        ? '<div class="card"><span class="when">' + esc(dayWords(latest.date, true)) + '</span><p class="lesson-summary">' + esc(latest.pupilSummary) + '</p></div>'
        : this.empty('My notes from your lessons will appear here.'))
    );
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-pupil-home')) customElements.define('kle-pupil-home', KlePupilHome);
