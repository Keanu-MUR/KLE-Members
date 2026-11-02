// <kle-my-details>: the pupil's own contact details and reminder choices.

import { PortalElement, esc } from './portal-base.js';

class KleMyDetails extends PortalElement {
  onSession() {
    this.setMain('<p class="muted">Loading your details.</p>');
    this.load();
  }

  async load() {
    const result = await this.call('getMyDetails');
    if (!result.ok) {
      this.setMain(this.failure(result));
      return;
    }
    this.render(result.data);
  }

  render(d) {
    const readOnly = d.viewerRole !== 'pupil';
    const f = (id, label, extra) => this.field(Object.assign({ id, label, value: d[id], readOnly }, extra || {}));
    this.setMain(
      '<h1>My details</h1>' +
      (readOnly ? '<p class="viewer">Viewing as guardian, read only</p>' : '') +
      '<form id="form" novalidate>' +
      '<h2>Contact</h2>' +
      f('email', 'Email', { type: 'email', autocomplete: 'email', hint: 'You log in with this address. Change it here and you’ll log in with the new one from then on.' }) +
      f('phone', 'Phone', { type: 'tel', autocomplete: 'tel' }) +
      '<h2>Address</h2>' +
      f('addressLine1', 'Address line 1', { autocomplete: 'address-line1' }) +
      f('addressLine2', 'Address line 2', { autocomplete: 'address-line2' }) +
      f('town', 'Town', { autocomplete: 'address-level2' }) +
      f('postcode', 'Postcode', { autocomplete: 'postal-code' }) +
      '<h2>Emergency contact</h2>' +
      f('emergencyContactName', 'Name') + f('emergencyContactPhone', 'Phone', { type: 'tel' }) +
      '<h2>Reminders</h2>' +
      this.checkbox({ id: 'reminderEmail', label: 'Email me the day before each lesson', checked: d.reminderEmail }) +
      this.checkbox({ id: 'reminderWhatsApp', label: 'WhatsApp me the day before each lesson', checked: d.reminderWhatsApp }) +
      '<h2>Licence</h2>' +
      this.field({ id: 'licenceNumber', label: 'Licence number', value: d.licenceNumber, readOnly: true, hint: 'Ask me if this needs changing.' }) +
      this.field({ id: 'dateOfBirth', label: 'Date of birth', value: d.dateOfBirth, readOnly: true }) +
      '<div id="status" aria-live="polite"></div>' +
      (readOnly ? '' : '<div class="actions"><button class="btn btn-primary" type="submit">Save</button></div>') +
      '</form>'
    );
    const form = this.$('#form');
    if (readOnly) {
      form.querySelectorAll('input[type=checkbox]').forEach((cb) => { cb.disabled = true; });
      return;
    }
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.save(d, form);
    });
  }

  async save(d, form) {
    const values = this.readForm(form);
    delete values.licenceNumber;
    delete values.dateOfBirth;
    this.setErrors(form, {});
    this.setBusy(form, true);
    const result = await this.call('updateMyDetails', values);
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
    const emailChanged = values.email && values.email.toLowerCase() !== (d.email || '').toLowerCase();
    d.email = result.data.details.email;
    this.$('#status').innerHTML =
      '<div class="notice" role="status">Saved.' +
      (emailChanged ? ' You’ll log in with ' + esc(d.email) + ' from now on.' : '') +
      '</div>';
  }
}

customElements.define('kle-my-details', KleMyDetails);
