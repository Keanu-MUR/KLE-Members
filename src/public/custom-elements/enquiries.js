// <kle-enquiries>: the instructor's enquiry list and the reply, convert and
// close actions on one enquiry.

import { PortalElement, esc } from './portal-base.js';

const STATUSES = [
  { key: 'new', label: 'New' },
  { key: 'replied', label: 'Replied' },
  { key: 'converted', label: 'Converted' },
  { key: 'closed', label: 'Closed' }
];
const CONTACT = { phone: 'phone', email: 'email', whatsapp: 'WhatsApp' };

class KleEnquiries extends PortalElement {
  constructor() {
    super();
    this.filter = 'new';
  }

  onSession() {
    this.setMain('<p class="muted">Loading enquiries.</p>');
    this.loadList();
  }

  async loadList() {
    const result = await this.call('listEnquiries', { status: this.filter });
    if (!result.ok) {
      this.setMain(this.failure(result));
      return;
    }
    this.renderList(result.data);
  }

  renderList(data) {
    const counts = data.counts || {};
    const filters = STATUSES.map((s) =>
      '<button class="btn btn-text" type="button" data-filter="' + s.key + '" aria-pressed="' + (this.filter === s.key) + '">' +
      esc(s.label) + ' (' + (counts[s.key] || 0) + ')</button>'
    ).join('');
    const rows = data.items.length
      ? '<table class="table"><thead><tr><th>Name</th><th>Postcode</th><th>Car</th><th>Prefers</th><th>Received</th></tr></thead><tbody>' +
        data.items.map((e) =>
          '<tr><td><a href="#" data-open="' + esc(e._id) + '">' + esc(e.name) + '</a></td>' +
          '<td data-label="Postcode">' + esc(e.postcode) + '</td>' +
          '<td data-label="Car">' + esc(e.transmission) + '</td>' +
          '<td data-label="Prefers">' + esc(CONTACT[e.preferredContact] || e.preferredContact) + '</td>' +
          '<td data-label="Received">' + esc(this.dateWords(e.createdAt)) + '</td></tr>'
        ).join('') + '</tbody></table>'
      : this.empty(this.filter === 'new' ? 'No new enquiries. New ones arrive here the moment someone sends the form.' : 'Nothing here.');

    this.setMain('<h1>Enquiries</h1><div class="filters">' + filters + '</div>' + rows);
    this.main.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
      this.filter = b.getAttribute('data-filter');
      this.loadList();
    }));
    this.main.querySelectorAll('[data-open]').forEach((a) => a.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(a.getAttribute('data-open'));
    }));
  }

  async open(id) {
    this.setMain('<p class="muted">Loading.</p>');
    const result = await this.call('getEnquiry', { id });
    if (!result.ok) {
      this.setMain(this.failure(result));
      return;
    }
    this.renderOne(result.data.enquiry, result.data.replyDefault);
  }

  renderOne(e, replyDefault) {
    const converted = e.status === 'converted' && e.convertedPupilId;
    this.setMain(
      '<p><button class="btn btn-text" type="button" id="back">All enquiries</button></p>' +
      '<h1>' + esc(e.name) + '</h1>' +
      '<p><span class="pill pill-' + esc(e.status) + '">' + esc(e.status) + '</span></p>' +
      '<p>' + esc(e.email) + '<br>' + esc(e.phone) + '<br>' + esc(e.addressLine1) + ', ' + esc(e.postcode) + '</p>' +
      '<p>' + esc(e.transmission) + ' lessons, prefers ' + esc(CONTACT[e.preferredContact] || e.preferredContact) +
      (e.dateOfBirth ? ', born ' + esc(this.longDate(e.dateOfBirth)) : '') + '</p>' +
      (e.message ? '<p>' + esc(e.message).replace(/\n/g, '<br>') + '</p>' : this.empty('No message.')) +
      '<p class="muted">Received ' + esc(this.dateWords(e.createdAt, true)) + (e.repliedAt ? '. Replied ' + esc(this.dateWords(e.repliedAt, true)) : '') + '</p>' +
      '<hr class="road">' +
      (converted
        ? '<p>Converted to a pupil. <a href="/pupil-record?id=' + esc(e.convertedPupilId) + '">Open the pupil record</a>.</p>'
        : '<form id="reply" novalidate>' +
          this.textarea({ id: 'body', label: 'Reply by email', rows: 9, maxlength: 4000, value: replyDefault, hint: 'Sent from the school’s address with your standard first-lesson details. Edit it before sending if you like.' }) +
          '<div id="status" aria-live="polite"></div>' +
          '<div class="actions"><button class="btn btn-primary" type="submit">Send reply</button>' +
          '<button class="btn btn-text" type="button" id="convert">Convert to pupil</button>' +
          (e.status !== 'closed' ? '<button class="btn btn-text" type="button" id="close">Close</button>' : '') +
          '</div></form>')
    );
    this.$('#back').addEventListener('click', () => this.loadList());
    const form = this.$('#reply');
    if (!form) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.reply(e, form);
    });
    this.$('#convert').addEventListener('click', () => this.convert(e, form));
    const close = this.$('#close');
    if (close) close.addEventListener('click', () => this.close(e, form));
  }

  async reply(e, form) {
    const values = this.readForm(form);
    this.setBusy(form, true);
    const result = await this.call('replyToEnquiry', { id: e._id, body: values.body });
    this.setBusy(form, false);
    if (!result.ok) {
      this.$('#status').innerHTML = this.failure(result);
      return;
    }
    this.$('#status').innerHTML = '<div class="notice" role="status">Sent to ' + esc(e.email) + '. ' + esc(e.name.split(' ')[0]) + ' will see it in their inbox.</div>';
  }

  async convert(e, form) {
    this.setBusy(form, true);
    this.$('#status').innerHTML = '<p class="muted">Creating the pupil and their login.</p>';
    const result = await this.call('convertEnquiry', { id: e._id });
    this.setBusy(form, false);
    if (!result.ok) {
      this.$('#status').innerHTML = this.failure(result);
      return;
    }
    const d = result.data;
    this.$('#status').innerHTML =
      '<div class="notice" role="status">' +
      (d.memberCreated ? 'Login created and ' : 'Existing login linked and ') +
      (d.loginEmailSent ? 'a set-password email sent to ' + esc(e.email) + '. ' : 'but the set-password email did not send; use Send login link on the record. ') +
      '<a href="/pupil-record?id=' + esc(d.pupilId) + '">Open the pupil record</a>.</div>';
  }

  async close(e, form) {
    this.setBusy(form, true);
    const result = await this.call('closeEnquiry', { id: e._id });
    this.setBusy(form, false);
    if (!result.ok) {
      this.$('#status').innerHTML = this.failure(result);
      return;
    }
    this.filter = 'closed';
    this.loadList();
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-enquiries')) customElements.define('kle-enquiries', KleEnquiries);
