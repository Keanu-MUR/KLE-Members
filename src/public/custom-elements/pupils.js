// <kle-pupils>: the instructor's searchable pupil list.

import { PortalElement, esc } from './portal-base.js';

const STATUSES = [
  { key: 'active', label: 'Active' },
  { key: 'passed', label: 'Passed' },
  { key: 'inactive', label: 'Inactive' }
];

class KlePupils extends PortalElement {
  constructor() {
    super();
    this.filter = 'active';
    this.search = '';
  }

  onSession() {
    this.setMain('<p class="muted">Loading…</p>');
    this.load(true);
  }

  async load(first) {
    const result = await this.call('listPupils', { status: this.filter, search: this.search });
    if (!result.ok) {
      this.setMain(this.failure(result));
      return;
    }
    if (first) this.renderFrame(result.data.counts);
    this.renderRows(result.data);
  }

  renderFrame(counts) {
    this.setMain(
      '<h1>Pupils</h1>' +
      '<div class="actions"><button class="btn btn-primary" type="button" id="add">Add pupil</button></div>' +
      '<div id="add-box"></div>' +
      '<form id="search" novalidate>' + this.field({ id: 'q', label: 'Search by name or email', value: this.search, autocomplete: 'off' }) + '</form>' +
      '<div class="filters" id="filters"></div>' +
      '<div id="rows"></div>'
    );
    this.$('#add').addEventListener('click', () => this.openAdd());
    const form = this.$('#search');
    let timer;
    form.addEventListener('submit', (event) => event.preventDefault());
    const box = this.$('#q');
    box.addEventListener('input', () => {
      clearTimeout(timer);
      // Read the box itself: an event's target is gone by the time the
      // debounce fires inside a shadow root.
      timer = setTimeout(() => {
        this.search = box.value.trim();
        this.load(false);
      }, 300);
    });
  }

  // The Add pupil form, opened above the list.
  openAdd() {
    const button = this.$('#add');
    const box = this.$('#add-box');
    button.hidden = true;
    box.innerHTML =
      '<form id="add-form" class="card" novalidate>' +
      '<h2>Add pupil</h2>' +
      this.field({ id: 'firstName', label: 'First name', autocomplete: 'off', required: true, maxlength: 60 }) +
      this.field({ id: 'lastName', label: 'Last name', autocomplete: 'off', required: true, maxlength: 60 }) +
      this.field({ id: 'email', label: 'Email', type: 'email', inputmode: 'email', autocomplete: 'off', required: true, hint: 'They log in with this address.' }) +
      this.field({ id: 'phone', label: 'Phone', type: 'tel', inputmode: 'tel', autocomplete: 'off' }) +
      this.field({ id: 'addressLine1', label: 'Address line 1', autocomplete: 'off', maxlength: 120 }) +
      this.field({ id: 'postcode', label: 'Postcode', autocomplete: 'off', maxlength: 10 }) +
      this.radios({ name: 'transmission', legend: 'Manual or automatic', value: 'manual', options: [{ value: 'manual', label: 'Manual' }, { value: 'automatic', label: 'Automatic' }] }) +
      this.checkbox({ id: 'createLogin', label: 'Create their login and email them a link to set a password', checked: true }) +
      '<div id="add-status" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn btn-primary" type="submit">Add pupil</button><button class="btn btn-text" type="button" id="add-cancel">Cancel</button></div>' +
      '</form>';
    const form = this.$('#add-form');
    this.$('#add-cancel').addEventListener('click', () => {
      box.innerHTML = '';
      button.hidden = false;
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.saveAdd(form);
    });
    this.$('#firstName').focus();
  }

  async saveAdd(form) {
    const values = this.readForm(form);
    const errors = {};
    if (!values.firstName) errors.firstName = 'Add their first name.';
    if (!values.lastName) errors.lastName = 'Add their last name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email || '')) errors.email = 'That email address doesn’t look right.';
    this.setErrors(form, errors);
    if (Object.keys(errors).length) return;
    this.setBusy(form, true);
    const result = await this.call('createPupil', values);
    this.setBusy(form, false);
    if (!result.ok) {
      this.$('#add-status').innerHTML = this.failure(result);
      return;
    }
    const d = result.data;
    const name = values.firstName + ' ' + values.lastName;
    const login = d.memberCreated
      ? (d.loginEmailSent ? 'I’ve emailed ' + esc(values.email) + ' a link to set a password.' : 'Their login is made, but the password email didn’t send. Use Send login link on their record.')
      : d.linked ? 'Linked to their existing login.' : 'No login yet. Use Send login link on their record when you’re ready.';
    this.$('#add-box').innerHTML = '<div class="notice" role="status">' + esc(name) + ' added. ' + login + ' <a href="/pupil-record?id=' + esc(d.pupilId) + '">Open their record</a></div>';
    this.$('#add').hidden = false;
    this.load(false);
  }

  renderRows(data) {
    const counts = data.counts || {};
    this.$('#filters').innerHTML = STATUSES.map((s) =>
      '<button class="btn btn-text" type="button" data-filter="' + s.key + '" aria-pressed="' + (this.filter === s.key) + '">' +
      esc(s.label) + ' (' + (counts[s.key] || 0) + ')</button>'
    ).join('');
    this.$('#filters').querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
      this.filter = b.getAttribute('data-filter');
      this.load(false);
    }));
    this.$('#rows').innerHTML = data.items.length
      ? '<table class="table"><thead><tr><th>Pupil</th><th>Car</th><th>Postcode</th><th>Status</th></tr></thead><tbody>' +
        data.items.map((p) =>
          '<tr><td><a href="/pupil-record?id=' + esc(p._id) + '">' + esc(p.firstName + ' ' + p.lastName) + '</a>' + (p.linked ? '' : ' <span class="chip">no login yet</span>') + '</td>' +
          '<td data-label="Car">' + esc(p.transmission) + '</td>' +
          '<td data-label="Postcode">' + esc(p.postcode || '') + '</td>' +
          '<td data-label="Status"><span class="pill pill-' + esc(p.status) + '">' + esc(p.status) + '</span></td></tr>'
        ).join('') + '</tbody></table>'
      : this.empty(this.search ? 'No pupils match that search.' : 'No pupils yet. Add one above, or make someone a pupil from their enquiry.');
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-pupils')) customElements.define('kle-pupils', KlePupils);
