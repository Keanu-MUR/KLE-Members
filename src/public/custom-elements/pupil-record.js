// <kle-pupil-record>: one pupil, every field editable by the instructor,
// with the last lessons, the progress summary, mock tests and the pupil's
// messages underneath. Payments are deferred (2 Nov 2026).

import { PortalElement, esc } from './portal-base.js';
import { LESSON_STYLE, renderLessonRow, dayWords } from './lesson-list.js';
import { MOCK_STYLE, renderMockTest } from './my-mock-tests.js';

const RECORD_STYLE = `
.message { padding: 10px 0; }
.message + .message { border-top: 1px solid #e3ded6; }
.message-when { font-variant-caps: all-small-caps; letter-spacing: 0.08em; color: var(--kle-muted); }
.message-body { margin: 2px 0 6px; white-space: pre-line; }
.section-actions { margin-top: 0; }
.reply { border-left: 3px solid var(--kle-primary); padding: 4px 12px; margin: 8px 0 0; }
.fault-row { display: flex; gap: 8px; margin: 8px 0 0; }
.fault-row select { flex: 0 1 45%; }
.fault-row input { flex: 1 1 0; min-height: 44px; }
.counts { display: flex; gap: 12px; }
.counts .field { flex: 1 1 0; }
.mt-form { border-left: 3px solid var(--kle-primary); padding: 0 0 0 12px; margin: 12px 0 16px; }
`;

class KlePupilRecord extends PortalElement {
  extraStyle() {
    return LESSON_STYLE + MOCK_STYLE + RECORD_STYLE;
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
      f('phone', 'Phone', { type: 'tel' }) + f('dateOfBirth', 'Date of birth (optional)', { type: 'date' }) +
      '<h2>Address</h2>' +
      f('addressLine1', 'Address line 1') + f('addressLine2', 'Address line 2') + f('postcode', 'Postcode') +
      '<h2>Lessons and tests</h2>' +
      this.radios({ name: 'transmission', legend: 'Transmission', value: p.transmission, options: [{ value: 'manual', label: 'Manual' }, { value: 'automatic', label: 'Automatic' }] }) +
      this.field({ id: 'hourlyRatePounds', label: 'Hourly rate (£)', type: 'number', value: p.hourlyRatePence != null ? (p.hourlyRatePence / 100).toFixed(2) : '', inputmode: 'decimal' }) +
      f('licenceNumber', 'Licence number (optional)') +
      this.checkbox({ id: 'theoryPassed', label: 'Theory test passed', checked: p.theoryPassed }) +
      f('theoryPassDate', 'Theory pass date', { type: 'date' }) + f('practicalTestDate', 'Practical test date', { type: 'date' }) +
      '<h2>Emergency contact (optional)</h2>' +
      f('emergencyContactName', 'Name') + f('emergencyContactPhone', 'Phone', { type: 'tel' }) +
      '<h2>Guardian</h2>' +
      f('guardianName', 'Guardian name') + f('guardianEmail', 'Guardian email', { type: 'email', hint: 'Gets the lesson reminder too while the pupil is under 18.' }) +
      '<div id="guardian-login">' + this.guardianWords(p) + '</div>' +
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
      '<h2>Mock tests</h2><div id="mock-tests"><p class="muted">Loading.</p></div>' +
      '<h2>Messages</h2><div id="messages"><p class="muted">Loading.</p></div>'
    );
    this.loadLessons(p);
    this.loadProgress(p);
    this.loadMockTests(p);
    this.loadMessages(p);
    const form = this.$('#form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.save(p, form);
    });
    this.$('#login-link').addEventListener('click', () => this.loginLink(p, form));
    this.bindGuardian(p, form);
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

  // ---- mock tests ------------------------------------------------------

  async loadMockTests(p) {
    const result = await this.call('listMockTests', { id: p._id });
    const box = this.$('#mock-tests');
    if (!result.ok) {
      box.innerHTML = this.failure(result);
      return;
    }
    this.mockTests = result.data.items;
    this.categories = result.data.categories;
    this.renderMockTests(p);
  }

  renderMockTests(p) {
    const box = this.$('#mock-tests');
    box.innerHTML =
      '<div class="actions section-actions"><button class="btn btn-text" type="button" id="mt-add">Add mock test</button></div>' +
      '<div id="mt-form"></div>' +
      (this.mockTests.length
        ? this.mockTests.map((t) => renderMockTest(t)).join('')
        : this.empty('Mock tests appear here once recorded.'));
    // Edit buttons go after each test block.
    this.mockTests.forEach((t) => {
      const block = box.querySelector('#mt-' + t._id);
      if (!block) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-text';
      button.textContent = 'Edit';
      button.addEventListener('click', () => this.mockTestForm(p, t));
      block.appendChild(button);
    });
    this.$('#mt-add').addEventListener('click', () => this.mockTestForm(p, null));
  }

  faultRow(fault) {
    const f = fault || { category: '', note: '' };
    return '<div class="fault-row"><select name="fault-cat" aria-label="Fault category"><option value="">Category</option>' +
      this.categories.map((c) => '<option value="' + esc(c.key) + '"' + (c.key === f.category ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') +
      '</select><input name="fault-note" type="text" maxlength="200" placeholder="What happened" aria-label="Fault note" value="' + esc(f.note) + '"></div>';
  }

  mockTestForm(p, test) {
    const t = test || { date: '', result: '', minors: 0, serious: 0, dangerous: 0, faults: [], feedback: '' };
    const wrap = this.$('#mt-form');
    const faults = t.faults.length ? t.faults : [{ category: '', note: '' }];
    wrap.innerHTML =
      '<form id="mtf" class="mt-form" novalidate>' +
      '<h3>' + (test ? 'Edit mock test' : 'New mock test') + '</h3>' +
      this.field({ id: 'mt-date', name: 'date', label: 'Date', type: 'date', value: t.date, required: true }) +
      this.radios({ name: 'result', legend: 'Result', value: t.result, options: [{ value: 'pass', label: 'Pass' }, { value: 'fail', label: 'Fail' }] }) +
      '<div class="counts">' +
      this.field({ id: 'mt-minors', name: 'minors', label: 'Minors', type: 'number', inputmode: 'numeric', value: t.minors }) +
      this.field({ id: 'mt-serious', name: 'serious', label: 'Serious', type: 'number', inputmode: 'numeric', value: t.serious }) +
      this.field({ id: 'mt-dangerous', name: 'dangerous', label: 'Dangerous', type: 'number', inputmode: 'numeric', value: t.dangerous }) +
      '</div>' +
      '<div class="field" id="f-faults"><span class="legend">Faults</span><div id="fault-rows">' + faults.map((f) => this.faultRow(f)).join('') + '</div>' +
      '<button class="btn btn-text" type="button" id="fault-add">Add another fault</button></div>' +
      this.textarea({ id: 'mt-feedback', name: 'feedback', label: 'Feedback for the pupil', rows: 4, maxlength: 2000, value: t.feedback }) +
      '<div id="mt-status" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn btn-primary" type="submit">Save</button>' +
      '<button class="btn btn-text" type="button" id="mt-cancel">Cancel</button>' +
      (test ? '<button class="btn btn-text" type="button" id="mt-delete">Delete</button>' : '') +
      '</div></form>';
    // setErrors looks for #f-<key>; the count fields carry their key as id.
    ['date', 'minors', 'serious', 'dangerous'].forEach((key) => {
      const field = wrap.querySelector('#f-mt-' + key);
      if (field) field.id = 'f-' + key;
    });
    const form = this.$('#mtf');
    this.$('#fault-add').addEventListener('click', () => {
      this.$('#fault-rows').insertAdjacentHTML('beforeend', this.faultRow(null));
    });
    this.$('#mt-cancel').addEventListener('click', () => { wrap.innerHTML = ''; });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.saveMockTest(p, test, form);
    });
    const del = this.$('#mt-delete');
    if (del) del.addEventListener('click', () => this.deleteMockTest(p, test, del));
    form.querySelector('#mt-date').focus();
  }

  async saveMockTest(p, test, form) {
    const values = this.readForm(form);
    const cats = Array.from(form.querySelectorAll('select[name=fault-cat]')).map((s) => s.value);
    const notes = Array.from(form.querySelectorAll('input[name=fault-note]')).map((i) => i.value);
    const fields = {
      pupilId: p._id,
      date: values.date,
      result: values.result,
      minors: values.minors,
      serious: values.serious,
      dangerous: values.dangerous,
      feedback: values.feedback,
      faults: cats.map((category, i) => ({ category, note: notes[i] || '' }))
    };
    this.setErrors(form, {});
    this.setBusy(form, true);
    const result = await this.call('saveMockTest', { id: test ? test._id : null, fields });
    this.setBusy(form, false);
    if (!result.ok) {
      this.$('#mt-status').innerHTML = this.failure(result);
      return;
    }
    if (!result.data.saved) {
      this.setErrors(form, result.data.errors);
      this.$('#mt-status').innerHTML = '<p class="error" role="alert">Check the highlighted fields.</p>';
      return;
    }
    const saved = result.data.test;
    this.mockTests = (test ? this.mockTests.map((t) => (t._id === saved._id ? saved : t)) : [saved].concat(this.mockTests))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    this.renderMockTests(p);
    this.$('#mt-form').innerHTML = '<div class="notice" role="status">Saved. ' + esc(p.firstName) + ' will see it on their mock tests page.</div>';
  }

  async deleteMockTest(p, test, button) {
    if (!button.getAttribute('data-armed')) {
      button.setAttribute('data-armed', '1');
      button.textContent = 'Yes, delete this mock test';
      return;
    }
    button.disabled = true;
    const result = await this.call('deleteMockTest', { id: test._id });
    if (!result.ok) {
      this.$('#mt-status').innerHTML = this.failure(result);
      button.disabled = false;
      return;
    }
    this.mockTests = this.mockTests.filter((t) => t._id !== test._id);
    this.renderMockTests(p);
    this.$('#mt-form').innerHTML = '<div class="notice" role="status">Deleted.</div>';
  }

  // ---- messages --------------------------------------------------------

  async loadMessages(p) {
    const result = await this.call('listPupilMessages', { id: p._id });
    const box = this.$('#messages');
    if (!result.ok) {
      box.innerHTML = this.failure(result);
      return;
    }
    this.messages = result.data.items;
    this.renderMessages(p);
  }

  renderMessage(m) {
    return (
      '<div class="message" id="m-' + esc(m._id) + '"><div class="message-when">' + esc(this.dateWords(m.createdAt, true)) +
      (m.readAt ? '' : ' <span class="lesson-status">Unread</span>') + '</div>' +
      '<p class="message-body">' + esc(m.body) + '</p>' +
      (m.reply ? '<div class="reply"><div class="message-when">Your reply' + (m.repliedAt ? ', ' + esc(this.dateWords(m.repliedAt, true)) : '') + '</div><p class="message-body">' + esc(m.reply) + '</p></div>' : '') +
      '<div class="actions section-actions">' +
      '<button class="btn btn-text" type="button" data-reply="' + esc(m._id) + '">' + (m.reply ? 'Change reply' : 'Reply') + '</button>' +
      (m.readAt ? '' : '<button class="btn btn-text" type="button" data-read="' + esc(m._id) + '">Mark read</button>') +
      '</div><div class="reply-form" id="rf-' + esc(m._id) + '"></div></div>'
    );
  }

  renderMessages(p) {
    const box = this.$('#messages');
    box.innerHTML = this.messages.length
      ? this.messages.map((m) => this.renderMessage(m)).join('')
      : this.empty('Messages from ' + p.firstName + ' appear here.');
    box.querySelectorAll('[data-read]').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      const r = await this.call('markMessageRead', { id: button.getAttribute('data-read') });
      if (!r.ok) {
        button.disabled = false;
        return;
      }
      const m = this.messages.find((x) => x._id === button.getAttribute('data-read'));
      if (m) m.readAt = r.data.readAt;
      this.renderMessages(p);
    }));
    box.querySelectorAll('[data-reply]').forEach((button) => button.addEventListener('click', () => this.replyForm(p, button.getAttribute('data-reply'))));
  }

  replyForm(p, id) {
    const m = this.messages.find((x) => x._id === id);
    const wrap = this.$('#rf-' + id);
    if (!m || !wrap) return;
    wrap.innerHTML =
      '<form class="mt-form" novalidate>' +
      this.textarea({ id: 'reply-' + id, name: 'reply', label: 'Reply to ' + p.firstName, rows: 3, maxlength: 2000, value: m.reply, hint: 'They see this on their lessons page.' }) +
      '<div class="reply-status" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn btn-primary" type="submit">Send reply</button><button class="btn btn-text" type="button" data-cancel>Cancel</button></div></form>';
    const form = wrap.querySelector('form');
    wrap.querySelector('[data-cancel]').addEventListener('click', () => { wrap.innerHTML = ''; });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = this.readForm(form);
      this.setBusy(form, true);
      const result = await this.call('replyToMessage', { id, reply: values.reply });
      this.setBusy(form, false);
      if (!result.ok) {
        wrap.querySelector('.reply-status').innerHTML = this.failure(result);
        return;
      }
      this.messages = this.messages.map((x) => (x._id === id ? result.data.message : x));
      this.renderMessages(p);
    });
    form.querySelector('textarea').focus();
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

  guardianWords(p) {
    const words = p.guardianLinked
      ? '<p class="muted">Guardian login: ' + esc(p.guardianEmail) + ', read only.</p>' +
        '<div class="actions"><button class="btn btn-text" type="button" id="guardian-resend">Send guardian login link</button><button class="btn btn-text" type="button" id="guardian-unlink">Remove guardian login</button></div>'
      : '<p class="muted">No guardian login yet. Save the guardian email above, then link it: the guardian gets a set-password email and sees the pupil’s pages, read only.</p>' +
        '<div class="actions"><button class="btn btn-text" type="button" id="guardian-link">Link guardian login</button></div>';
    return words + '<div id="guardian-status" aria-live="polite"></div>';
  }

  bindGuardian(p, form) {
    const box = this.$('#guardian-login');
    const status = () => this.$('#guardian-status');
    const link = this.$('#guardian-link');
    const resend = this.$('#guardian-resend');
    const unlink = this.$('#guardian-unlink');
    if (link) link.addEventListener('click', async () => {
      const email = (this.$('#guardianEmail') || {}).value || '';
      link.disabled = true;
      const result = await this.call('linkGuardian', { id: p._id, email: email.trim() });
      link.disabled = false;
      if (!result.ok) { status().innerHTML = this.failure(result); return; }
      p.guardianLinked = true;
      p.guardianEmail = result.data.email;
      box.innerHTML = this.guardianWords(p);
      this.bindGuardian(p, form);
      this.$('#guardian-status').innerHTML = '<div class="notice" role="status">Linked. ' + (result.data.sent ? 'A set-password email went to ' + esc(result.data.email) + '.' : 'The set-password email did not send; use "Send guardian login link".') + '</div>';
    });
    if (resend) resend.addEventListener('click', async () => {
      resend.disabled = true;
      const result = await this.call('sendGuardianLoginLink', { id: p._id });
      resend.disabled = false;
      status().innerHTML = result.ok ? '<div class="notice" role="status">Login link sent to ' + esc(result.data.email) + '.</div>' : this.failure(result);
    });
    if (unlink) unlink.addEventListener('click', async () => {
      unlink.disabled = true;
      const result = await this.call('unlinkGuardian', { id: p._id });
      unlink.disabled = false;
      if (!result.ok) { status().innerHTML = this.failure(result); return; }
      p.guardianLinked = false;
      box.innerHTML = this.guardianWords(p);
      this.bindGuardian(p, form);
      this.$('#guardian-status').innerHTML = '<div class="notice" role="status">Guardian login removed.</div>';
    });
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

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-pupil-record')) customElements.define('kle-pupil-record', KlePupilRecord);
