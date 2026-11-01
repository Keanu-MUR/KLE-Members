// <kle-instructor-dashboard>: the instructor's landing page. In Phase 0 it
// also hosts the one-off setup panel that creates the collections and the
// Settings item, which only appears while something is missing.

import { PortalElement, esc } from './portal-base.js';

class KleInstructorDashboard extends PortalElement {
  onSession() {
    this.setMain('<p class="muted">Loading today.</p>');
    this.load();
  }

  async load() {
    const result = await this.call('getInstructorDashboard');
    if (!result.ok) {
      this.setMain(this.failure(result));
      return;
    }
    this.render(result.data);
  }

  render(dash) {
    const setup = dash.setup || { checked: false, missing: [] };
    const needsSetup = !setup.checked || setup.missing.length > 0 || !setup.settingsExists;
    this.setMain(
      '<h1>Today</h1>' +
      (needsSetup ? this.setupPanel(setup) : '') +
      (dash.today.length ? '' : this.empty('No lessons today.')) +
      '<h2>Tomorrow</h2>' +
      (dash.tomorrow.length ? '' : this.empty('Nothing booked for tomorrow yet.')) +
      '<h2>Enquiries and messages</h2>' +
      this.empty(dash.unreadEnquiries ? dash.unreadEnquiries + ' new enquiries.' : 'No new enquiries.') +
      this.empty(dash.unreadMessages ? dash.unreadMessages + ' unread messages.' : 'No unread messages.') +
      '<h2>Reminders for tomorrow</h2>' +
      this.empty('Sent and failed counts will show here once reminders are switched on.')
    );
    if (needsSetup) this.wireSetup(setup);
  }

  setupPanel(setup) {
    if (!setup.checked) {
      return (
        '<div class="notice" role="status"><p>I couldn’t check the portal’s data collections. ' +
        'Reload the page; if this keeps happening, create them by hand using docs/collections.md.</p></div>'
      );
    }
    const missingList = setup.missing.length
      ? '<p>Missing: ' + setup.missing.map(esc).join(', ') + '.</p>'
      : '<p>All collections exist. The Settings record still needs creating.</p>';
    return (
      '<div class="notice" id="setup"><p>Before anything else, the portal’s data collections need creating. ' +
      'This runs once and is safe to repeat.</p>' + missingList +
      '<div id="setup-status" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn btn-primary" type="button" id="setup-run">' +
      (setup.missing.length ? 'Create collections' : 'Create settings') +
      '</button></div></div>'
    );
  }

  wireSetup(setup) {
    const button = this.$('#setup-run');
    if (!button) return;
    button.addEventListener('click', async () => {
      button.disabled = true;
      const status = this.$('#setup-status');
      status.innerHTML = '<p class="muted">Working.</p>';
      const action = setup.missing.length ? 'createCollections' : 'ensureSettings';
      const result = await this.call(action);
      if (!result.ok) {
        status.innerHTML = this.failure(result);
        button.disabled = false;
        return;
      }
      status.innerHTML = this.setupSummary(action, result.data);
      // Re-read so the panel disappears when everything is in place.
      setTimeout(() => this.load(), 1500);
    });
  }

  setupSummary(action, data) {
    if (action === 'ensureSettings') {
      return '<p>' + (data.created ? 'Settings created with defaults.' : 'Settings already existed.') + '</p>';
    }
    const lines = [];
    if (data.created.length) lines.push('Created: ' + data.created.map(esc).join(', ') + '.');
    if (data.skipped.length) lines.push('Already there: ' + data.skipped.map(esc).join(', ') + '.');
    if (data.settingsCreated) lines.push('Settings created with defaults.');
    if (data.failed.length) {
      lines.push('Could not create: ' + data.failed.map((f) => esc(f.id) + ' (' + esc(f.error) + ')').join('; ') + '.');
    }
    return '<p>' + lines.join(' ') + '</p>';
  }
}

customElements.define('kle-instructor-dashboard', KleInstructorDashboard);
