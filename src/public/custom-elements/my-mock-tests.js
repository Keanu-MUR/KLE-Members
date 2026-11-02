// <kle-my-mock-tests>: the pupil's (or guardian's) mock tests, newest first.

import { PortalElement, esc } from './portal-base.js';
import { LESSON_STYLE, dayWords } from './lesson-list.js';

export const MOCK_STYLE = `
.mock { background: var(--paper); border: 2px solid var(--ink); padding: 12px 14px; margin: 0 0 12px; }
.mock-result { font-family: var(--font-head); font-weight: 700; text-transform: uppercase; font-size: 22px; line-height: 1.1; }
.mock-result.fail { color: var(--bad); }
.mock-result.pass { color: var(--ok); }
.mock-counts { color: var(--kle-muted); }
ul.faults { margin: 8px 0 0; padding-left: 18px; }
ul.faults li { padding: 2px 0; }
.mock-feedback { margin: 8px 0 0; white-space: pre-line; }
`;

export function renderMockTest(t) {
  return (
    '<div class="mock" id="mt-' + esc(t._id) + '">' +
    '<span class="when">' + esc(dayWords(t.date, true)) + '</span>' +
    '<div class="mock-result ' + (t.result === 'fail' ? 'fail' : 'pass') + '">' + (t.result === 'pass' ? 'Pass' : 'Fail') + '</div>' +
    '<div class="mock-counts">' + esc(t.countsWords) + '</div>' +
    (t.faults.length
      ? '<ul class="faults">' + t.faults.map((f) => '<li><strong>' + esc(f.categoryName) + '</strong>' + (f.note ? ': ' + esc(f.note) : '') + '</li>').join('') + '</ul>'
      : '') +
    (t.feedback ? '<p class="mock-feedback">' + esc(t.feedback) + '</p>' : '') +
    '</div>'
  );
}

class KleMyMockTests extends PortalElement {
  extraStyle() {
    return LESSON_STYLE + MOCK_STYLE;
  }

  onSession() {
    this.setMain('<p class="muted">Loading your mock tests.</p>');
    this.load();
  }

  async load() {
    const result = await this.call('getMyMockTests');
    if (!result.ok) {
      this.setMain(this.failure(result));
      return;
    }
    const data = result.data;
    const guardian = data.viewerRole === 'guardian';
    this.setMain(
      '<h1>' + (guardian ? esc(data.pupil.firstName) + '’s mock tests' : 'My mock tests') + '</h1>' +
      (guardian ? '<p class="viewer">Viewing as guardian, read only</p>' : '') +
      (data.items.length ? data.items.map(renderMockTest).join('') : this.empty('Mock tests will show here after your first one.'))
    );
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-my-mock-tests')) customElements.define('kle-my-mock-tests', KleMyMockTests);
