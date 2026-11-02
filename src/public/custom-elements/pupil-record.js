// <kle-pupil-record>: one pupil, every field editable by the instructor,
// with the last lessons, the progress summary and the pupil's messages
// underneath. Mock tests and payments arrive in Phase 3.

import { PortalElement, esc } from './portal-base.js';
import { LESSON_STYLE, renderLessonRow, dayWords } from './lesson-list.js';

const RECORD_STYLE = `
.message { padding: 10px 0; }
.message + .message { border-top: 1px solid #e3ded6; }
.message-when { font-variant-caps: all-small-caps; letter-spacing: 0.08em; color: var(--kle-muted); }
.message-body { margin: 2px 0 6px; white-space: pre-line; }
.section-actions { margin-top: 0; }
`;

class KlePupilRecord extends PortalElement {
  extraStyle() {
    return LESSON_STYLE + RECORD_STYLE;
  }

  onSession() {
    const id = this.params && this.params.id;
    if (!id) {
      this.setMain('<h1>Pupil record</h1>' + this.empty('Open a pupil from the Pupils list.'));
      return;
    }
    this.setMain('<p class="muted">Loading the record.</p>');
    this.load(id);
  }

  async load(id) {
    const result = await this.call('getPupil', { id });
    if (!result.ok) {
      this.setMain('<p><a href="/pupils">All pupils</a></p>' + this.failure(result));
      return;
    }
    this.render(result.data);
  }

  render(p) {
    const f = (id, label, extra) => this.field(Object.assign({ id, label, value: p[id] }, extra || {}));
    this.setMain(
      '<p><a href="/pupils">All pupils</a></p>' +
      '<h1>' + esc(p.firstName + ' ' + p.lastName) + '</h1>' +
      '<p class="muted">' + (p.memberId ? 'Has a login.' : 'No login yet.') + '</p>' +
      '<form id="form" novalidate>' +
      this.radios({ name: 'status', legend: 'Status', value: p.status, options: [{ value: 'active', label: 'Active' }, { value: 'passed', label: 'Passed' }, { value: 'inactive', label: 'Inactive' }] }) +
      '<h2>Contact</h2>' +
      f('firstName', 'First name', { required: true }) + f('lastName', 'Last name', { required: true }) +
      f('email', 'Email', { type: 'email', hint: 'Also the login email once they have an account.' }) +
      f('phone', 'Phone', { type: 'tel' }) + f('dateOfBirth', 'Date of birth', { type: 'date' }) +
      '<h2>Address</h2>' +
      f('addressLine1', 'Address line 1') + f('addressLine2', 'Address line 2') + f('town', 'Town') + f('postcode', 'Postcode') +
      '<h2>Lessons and tests</h2>' +
      this.radios({ name: 'transmission', legend: 'Transmission', value: p.transmission, options: [{ value: 'manual', label: 'Manual' }, { value: 'automatic', label: 'Automatic' }] }) +
      this.field({ id: 'hourlyRatePounds', label: 'Hourly rate (£)', type: 'number', value: p.hourlyRatePence != null ? (p.hourlyRatePence / 100).toFixed(2) : '', inputmode: 'decimal' }) +
      f('licenceNumber', 'Licence number') +
      this.checkbox({ id: 'theoryPassed', label: 'Theory test passed', checked: p.theoryPassed }) +
      f('theoryPassDate', 'Theory pass date', { type: 'date' }) + f('practicalTestDate', 'Practical test date', { type: 'date' }) +
      '<h2>Emergency contact</h2>' +
      f('emergencyContactName', 'Name') + f('emergencyContactPhone', 'Phone', { type: 'tel' }) +
      '<h2>Guardian</h2>' +
      f('guardianName', 'Guardian name') + f('guardianEmail', 'Guardian email', { type: 'email', hint: 'Gets the lesson reminder too while the pupil is under 18. Linking a guardian login comes later.' }) +
      '<h2>Reminders</h2>' +
      this.checkbox({ id: 'reminderEmail', label: 'Email reminders', checked: p.reminderEmail }) +
      this.checkbox({ id: 'reminderWhatsApp', label: 'WhatsApp reminders', checked: p.reminderWhatsApp, consent: p.whatsAppConsentAt ? 'Consent recorded ' + this.dateWords(p.whatsAppConsentAt, true) + '.' : 'No consent recorded yet.' }) +
      '<h2>My notes</h2>' +
      this.textarea({ id: 'instructorNotes', label: 'Private notes', rows: 5, maxlength: 4000, value: p.instructorNotes, hint: 'Only you see these.' }) +
      '<div id="status" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn btn-primary" type="submit">Save</button>' +
      '<button class="btn btn-text" type="button" id="login-link">Send login link</button></div>' +
      '</form>' +
      '<hr class="road">' +
      '<h2>Lessons</h2><div id="lessons"><p class="muted">Loading.</p></div>' +
      '<h2>Progress</h2><div id="progress"><p class="muted">Loading.</p></div>' +
      '<h2>Mock tests</h2>' + this.empty('Mock tests appear here once recorded.') +
      '<h2>Payments</h2>' + this.empty('Payments and the running balance appear here once a lesson has been taught.') +
      '<h2>Messages</h2><div id="messages"><p class="muted">Loading.</p></div>'
    );
    this.loadLessons(p);
    this.loadProgress(p);
    this.loadMessages(p);
    const form = this.$('#form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.save(p, form);
    });
    this.$('#login-link').addEventListener('click', () => this.loginLink(p, form));
  }

  async loadLessons(p) {
    const result = await this.call('listLessons', { pupilId: p._id });
    const box = this.$('#lessons');
    if (!result.ok) {
      box.innerHTML = this.failure(result);
      return;
    }
    const all = result.data.items;
    const items = all.slice(0, 5);
    box.innerHTML =
      '<div class="actions section-actions"><a class="btn btn-text" href="/lessons?new=1&pupil=' + esc(p._id) + '">Add lesson</a>' +
      (all.length > 5 ? '<a class="btn btn-text" href="/lessons?pupil=' + esc(p._id) + '">All ' + all.length + ' lessons</a>' : '') + '</div>' +
      (items.length
        ? items.map((l) => renderLessonRow(l, { href: '/lessons?id=' + l._id, showDate: true, withYear: true })).join('')
        : this.empty('Lessons appear here once you add them.'));
  }

  async loadProgress(p) {
    const result = await this.call('getProgress', { id: p._id });
    const box = this.$('#progress');
    if (!result.ok) {
      box.innerHTML = this.failure(result);
      return;
    }
    const s = result.data;
    box.innerHTML =
      (s.summary
        ? '<p>' + esc(s.summary) + (s.updatedAt ? ', last updated ' + esc(dayWords(s.updatedAt.slice(0, 10))) : '') + '.</p>'
        : this.empty('Nothing set on the driver’s record yet.')) +
      '<div class="actions section-actions"><a class="btn btn-text" href="/progress?id=' + esc(p._id) + '">' + (s.summary ? 'Edit progress' : 'Start the driver’s record') + '</a></div>';
  }

  async loadMessages(p) {
    const result = await this.call('listPupilMessages', { id: p._id });
    const box = this.$('#messages');
    if (!result.ok) {
      box.innerHTML = this.failure(result);
      return;
    }
    const items = result.data.items;
    box.innerHTML = items.length
      ? items.map((m) =>
        '<div class="message" id="m-' + esc(m._id) + '"><div class="message-when">' + esc(this.dateWords(m.createdAt, true)) +
        (m.readAt ? '' : ' <span class="lesson-status">Unread</span>') + '</div>' +
        '<p class="message-body">' + esc(m.body) + '</p>' +
        (m.readAt ? '' : '<button class="btn btn-text" type="button" data-read="' + esc(m._id) + '">Mark read</button>') + '</div>'
      ).join('')
      : this.empty('Messages from ' + p.firstName + ' appear here.');
    box.querySelectorAll('[data-read]').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      const r = await this.call('markMessageRead', { id: button.getAttribute('data-read') });
      if (!r.ok) {
        button.disabled = false;
        return;
      }
      const wrap = this.$('#m-' + button.getAttribute('data-read'));
      const flag = wrap.querySelector('.lesson-status');
      if (flag) flag.remove();
      button.remove();
    }));
  }

  async save(p, form) {
    const values = this.readForm(form);
    const status = values.status;
    delete values.status;
    const rate = values.hourlyRatePounds;
    delete values.hourlyRatePounds;
    if (rate !== '' && rate != null) values.hourlyRatePence = Math.round(Number(rate) * 100);

    this.setErrors(form, {});
    this.setBusy(form, true);
    const result = await this.call('updatePupil', { id: p._id, fields: values });
    let statusResult = { ok: true };
    if (result.ok && result.data.saved && status && status !== p.status) {
      statusResult = await this.call('setPupilStatus', { id: p._id, status });
    }
    this.setBusy(form, false);

    if (!result.ok) {
      this.$('#status').innerHTML = this.failure(result);
      return;
    }
    if (!result.data.saved) {
      this.setErrors(form, result.data.errors);
      this.$('#status').innerHTML = '<p class="error" role="alert">Check the highlighted fields.</p>';
      return;
    }
    if (!statusResult.ok) {
      this.$('#status').innerHTML = this.failure(statusResult);
      return;
    }
    p.status = status || p.status;
    this.$('#status').innerHTML = '<div class="notice" role="status">Saved. ' + esc(values.firstName || p.firstName) + ' will see any changes next time they log in.</div>';
  }

  async loginLink(p, form) {
    this.setBusy(form, true);
    const result = await this.call('sendLoginLink', { id: p._id });
    this.setBusy(form, false);
    this.$('#status').innerHTML = result.ok
      ? '<div class="notice" role="status">Login link sent to ' + esc(p.email) + '.</div>'
      : this.failure(result);
  }
}

customElements.define('kle-pupil-record', KlePupilRecord);
