// <kle-instructor-dashboard>: the instructor's landing page. In Phase 0 it
// also hosts the one-off setup panel that creates the collections and the
// Settings item, which only appears while something is missing.

import { PortalElement, esc } from './portal-base.js';
import { LESSON_STYLE, renderLessonRow } from './lesson-list.js';

class KleInstructorDashboard extends PortalElement {
  extraStyle() {
    return LESSON_STYLE;
  }

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
    const rows = (lessons) => lessons.map((l) => renderLessonRow(l, { href: '/lessons?id=' + l._id, who: l.pupilName })).join('');
    const enquiryWords = dash.unreadEnquiries === 1 ? '1 new enquiry' : dash.unreadEnquiries + ' new enquiries';
    const messageWords = dash.unreadMessages === 1 ? '1 unread message' : dash.unreadMessages + ' unread messages';
    this.setMain(
      '<h1>Today</h1>' +
      (needsSetup ? this.setupPanel(setup) : '') +
      '<div class="actions"><a class="btn btn-primary" href="/lessons?new=1">Add lesson</a><a class="btn btn-text" href="/lessons">This week and next</a></div>' +
      (dash.today.length ? rows(dash.today) : this.empty('No lessons today.')) +
      '<h2>Tomorrow</h2>' +
      (dash.tomorrow.length ? rows(dash.tomorrow) : this.empty('Nothing booked for tomorrow yet.')) +
      '<h2>Enquiries and messages</h2>' +
      '<div class="stats">' +
      '<a class="stat" href="/enquiries"><span class="stat-n">' + (dash.unreadEnquiries || 0) + '</span><span class="stat-l">' + (dash.unreadEnquiries === 1 ? 'New enquiry' : 'New enquiries') + '</span></a>' +
      '<div class="stat"><span class="stat-n">' + (dash.unreadMessages || 0) + '</span><span class="stat-l">' + (dash.unreadMessages === 1 ? 'Unread message' : 'Unread messages') + '</span></div>' +
      '</div>' +
      (dash.unread || []).map((m) =>
        '<a class="card" href="/pupil-record?id=' + esc(m.pupilId) + '"><div class="lesson-who">' + esc(m.pupilName) + '</div><div class="lesson-meta">' + esc(m.body) + '</div></a>'
      ).join('') +
      '<h2>Reminders</h2>' +
      this.reminderWords(dash.reminders) +
      '<div class="actions" style="margin-top:12px"><a class="btn" href="/reminders">Tomorrow’s reminders</a><a class="btn btn-text" href="/send-log">Send log</a></div>'
    );
    if (needsSetup) this.wireSetup(setup);
  }

  reminderWords(r) {
    if (!r || !r.today) return this.empty('Sent and failed counts will show here once reminders are switched on.');
    const sent = (r.today.email.sent || 0) + (r.today.whatsapp.sent || 0);
    const failed = (r.today.email.failed || 0) + (r.today.whatsapp.failed || 0);
    const yesterday = (r.yesterday.email.sent || 0) + (r.yesterday.whatsapp.sent || 0);
    const stat = (n, label, cls, href) => (href ? '<a class="stat" href="' + href + '">' : '<div class="stat">') +
      '<span class="stat-n' + (cls ? ' ' + cls : '') + '">' + n + '</span><span class="stat-l">' + label + '</span>' + (href ? '</a>' : '</div>');
    const off = [];
    if (!r.emailOn) off.push('email');
    if (!r.whatsAppOn) off.push('WhatsApp');
    return '<div class="stats">' +
      stat(sent, 'Sent today', '', '') +
      stat(failed, 'Failed today', failed ? 'bad' : '', failed ? '/send-log' : '') +
      stat(yesterday, 'Sent yesterday', '', '') +
      stat(r.today.whatsapp.skipped || 0, 'WhatsApp skipped today', '', '') +
      '</div>' + (off.length ? '<p class="muted">' + esc(off.join(' and ')) + ' reminders are off.</p>' : '');
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

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-instructor-dashboard')) customElements.define('kle-instructor-dashboard', KleInstructorDashboard);
