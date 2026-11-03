// <kle-enquire>: the public enquiry form. Posts straight to the site's own
// HTTP function, which validates, rate-limits and stores the enquiry, then
// asks the page to send the emails for it (one-time token).

import { PortalElement, esc, FEATURES } from './portal-base.js';

const ENDPOINT = '/_functions/enquire';
const TAUGHT = ['SE1', 'SE4', 'SE8', 'SE10', 'SE14', 'SE15', 'SE16'];
const CONTACT_NOTE = 'I’ll reply by email within a day. Once your lessons are booked, you’ll get an email 24 hours before each one.';
const AREA_NOTE = 'I mostly teach in SE1, SE4, SE8, SE10, SE14, SE15 and SE16. Send it anyway and I’ll let you know.';

function outward(postcode) {
  const compact = String(postcode || '').toUpperCase().replace(/\s+/g, '');
  if (!compact) return '';
  return /^[A-Z]{1,2}\d[A-Z\d]?$/.test(compact) ? compact : compact.slice(0, -3);
}

class KleEnquire extends PortalElement {
  // The Editor's mobile layout gives the element 280px of a 320px screen;
  // take the full width there so the form reaches both edges (3 Nov 2026).
  extraStyle() {
    return '@media (max-width: 767px) { :host { display: block; width: 100vw !important; } }';
  }

  afterShell() {
    this.renderForm();
  }

  renderForm() {
    this.setMain(
      '<h1>Enquire about lessons</h1>' +
      '<p>Tell me a little about yourself and I’ll get back to you within a day.</p>' +
      '<form id="form" novalidate>' +
      this.field({ id: 'name', label: 'Full name', autocomplete: 'name', required: true, maxlength: 80 }) +
      this.field({ id: 'email', label: 'Email', type: 'email', autocomplete: 'email', inputmode: 'email', required: true }) +
      this.field({ id: 'phone', label: 'Phone', type: 'tel', autocomplete: 'tel', inputmode: 'tel', required: true }) +
      this.field({ id: 'dateOfBirth', label: 'Date of birth', type: 'date', autocomplete: 'bday', hint: 'Optional. If you are under 18 I’ll ask for a parent or guardian’s details too.' }) +
      this.field({ id: 'addressLine1', label: 'Address line 1', autocomplete: 'address-line1', required: true, maxlength: 120 }) +
      this.field({ id: 'postcode', label: 'Postcode', autocomplete: 'postal-code', required: true, maxlength: 10 }) +
      this.radios({ name: 'transmission', legend: 'Manual or automatic?', options: [{ value: 'manual', label: 'Manual' }, { value: 'automatic', label: 'Automatic' }] }) +
      (FEATURES.whatsApp
        ? this.radios({ name: 'preferredContact', legend: 'How should I get in touch?', options: [{ value: 'phone', label: 'Phone' }, { value: 'email', label: 'Email' }, { value: 'whatsapp', label: 'WhatsApp' }] })
        : '<p class="notice">' + esc(CONTACT_NOTE) + '</p>') +
      this.textarea({ id: 'message', label: 'Anything else?', rows: 4, maxlength: 1000, hint: 'Optional. Days and times that suit you, or where you are with your theory.' }) +
      '<div class="hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off"></div>' +
      '<div id="status" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn btn-primary" type="submit" id="submit">Send enquiry</button></div>' +
      '</form>'
    );
    const form = this.$('#form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.submit(form);
    });
    this.$('#postcode').addEventListener('blur', () => this.areaNote());
  }

  areaNote() {
    const wrap = this.$('#f-postcode');
    const old = wrap.querySelector('.hint.area');
    if (old) old.remove();
    const code = outward(this.$('#postcode').value);
    if (code && !TAUGHT.includes(code)) {
      const p = document.createElement('p');
      p.className = 'hint area';
      p.textContent = AREA_NOTE;
      wrap.appendChild(p);
    }
  }

  clientErrors(values) {
    const errors = {};
    if (!values.name || values.name.length < 2) errors.name = 'Tell me your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email || '')) errors.email = 'That email address doesn’t look right.';
    if (!values.phone) errors.phone = 'I need a phone number to arrange lessons.';
    if (!values.addressLine1 || values.addressLine1.length < 3) errors.addressLine1 = 'Add the first line of your address.';
    if (!values.postcode) errors.postcode = 'That postcode doesn’t look right.';
    if (!values.transmission) errors.transmission = 'Choose manual or automatic.';
    if (!values.preferredContact) errors.preferredContact = 'Choose how you would like me to get in touch.';
    return errors;
  }

  async submit(form) {
    const values = this.readForm(form);
    if (!FEATURES.whatsApp) values.preferredContact = 'email'; // the form only promises email
    const errors = this.clientErrors(values);
    this.setErrors(form, errors);
    if (Object.keys(errors).length) return;

    this.$('#status').innerHTML = '';
    this.setBusy(form, true);
    let result;
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      result = await response.json();
    } catch (error) {
      result = { ok: false, error: 'I couldn’t send that just now. Check your connection and try again.' };
    }
    if (!result.ok) {
      this.setBusy(form, false);
      if (result.errors) this.setErrors(form, result.errors);
      this.$('#status').innerHTML = this.failure(result);
      return;
    }
    // The enquiry is stored; the emails go out through the page.
    let confirmationSent = false;
    if (result.data.enquiryId) {
      const sent = await this.call('notifyEnquiry', { enquiryId: result.data.enquiryId, token: result.data.token });
      confirmationSent = Boolean(sent.ok && sent.data && sent.data.confirmationSent);
    }
    this.setBusy(form, false);
    const how = { phone: 'phone', email: 'email', whatsapp: 'WhatsApp' }[result.data.preferredContact] || 'email';
    this.setMain(
      '<h1>Thanks, ' + esc(result.data.firstName || 'and hello') + '.</h1>' +
      '<p>I have your enquiry and will be in touch by ' + esc(how) + ' within a day.</p>' +
      (result.data.outsideArea ? '<p class="muted">' + esc(AREA_NOTE) + '</p>' : '') +
      (confirmationSent ? '<p class="muted">A confirmation is on its way to your email.</p>' : '')
    );
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-enquire')) customElements.define('kle-enquire', KleEnquire);
