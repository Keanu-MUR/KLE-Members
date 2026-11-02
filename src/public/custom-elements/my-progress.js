// <kle-my-progress>: the pupil's (or guardian's) driver's record, read only.

import { PortalElement, esc } from './portal-base.js';
import { GRID_STYLE, renderGrid, renderLegend, updatedWords } from './progress-grid.js';

class KleMyProgress extends PortalElement {
  extraStyle() {
    return GRID_STYLE;
  }

  onSession() {
    this.setMain('<p class="muted">Loading your driver’s record.</p>');
    this.load();
  }

  async load() {
    const result = await this.call('getMyProgress');
    if (!result.ok) {
      this.setMain(this.failure(result));
      return;
    }
    this.render(result.data);
  }

  render(s) {
    const pupil = s.pupil;
    const guardian = s.viewerRole === 'guardian';
    const theory = pupil.theoryPassed
      ? 'Theory test passed' + (pupil.theoryPassDate ? ' ' + this.longDate(pupil.theoryPassDate) : '') + '.'
      : 'Theory test not passed yet.';
    const practical = pupil.practicalTestDate
      ? 'Practical test ' + this.dateWords(pupil.practicalTestDate, true) + '.'
      : 'Practical test not booked yet.';
    const hasData = Object.keys(s.data || {}).length > 0;
    this.setMain(
      '<h1>' + (guardian ? esc(pupil.firstName) + '’s progress' : 'My progress') + '</h1>' +
      (guardian ? '<p class="viewer">Viewing as guardian, read only</p>' : '') +
      '<p class="muted">' + esc(theory + ' ' + practical) + '</p>' +
      (s.summary ? '<p class="record-summary">' + esc(s.summary) + '</p>' : '') +
      (hasData
        ? renderLegend(s.levels) + renderGrid({ skills: s.skills, groups: s.groups, levels: s.levels, data: s.data, transmission: pupil.transmission, editable: false }) +
          (s.updatedAt ? '<p class="skill-updated">' + esc(updatedWords(s.updatedAt)) + '</p>' : '')
        : this.empty('Your driver’s record will appear here after your first lesson.'))
    );
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-my-progress')) customElements.define('kle-my-progress', KleMyProgress);
