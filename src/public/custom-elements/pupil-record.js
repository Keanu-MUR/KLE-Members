// <kle-pupil-record>: one pupil, every field editable by the instructor.
// Lessons, progress, mock tests, payments and messages get their sections
// here in Phases 2 and 3; the empty states are in place now.

import { PortalElement, esc } from './portal-base.js';

class KlePupilRecord extends PortalElement {
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
      '<h2>Lessons</h2>' + this.empty('Lessons appear here once you add them.') +
      '<h2>Progress</h2>' + this.empty('The driver’s record appears here after the first lesson.') +
      '<h2>Mock tests</h2>' + this.empty('Mock tests appear here once recorded.') +
      '<h2>Payments</h2>' + this.empty('Payments and the running balance appear here once a lesson has been taught.') +
      '<h2>Messages</h2>' + this.empty('Messages from this pupil appear here.')
    );
    const form = this.$('#form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.save(p, form);
    });
    this.$('#login-link').addEventListener('click', () => this.loginLink(p, form));
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
