// <kle-my-lessons>: the pupil's (or guardian's) lessons, upcoming then
// past with the instructor's summaries, and the Request a change form.

import { PortalElement, esc } from './portal-base.js';
import { LESSON_STYLE, renderLessonRow } from './lesson-list.js';

class KleMyLessons extends PortalElement {
  extraStyle() {
    return LESSON_STYLE + `
.message { margin: 0 0 12px; }
.message-body { margin: 2px 0 6px; white-space: pre-line; }
.reply { border-left: 3px solid var(--kle-primary); padding: 4px 12px; margin: 8px 0 0; }
`;
  }

  onSession() {
    this.setMain('<p class="muted">Loading your lessons.</p>');
    this.load();
  }

  async load() {
    const result = await this.call('listMyLessons');
    if (!result.ok) {
      this.setMain(this.failure(result));
      return;
    }
    this.render(result.data);
  }

  render(data) {
    const guardian = data.viewerRole === 'guardian';
    const years = Object.keys(data.history || {}).sort().reverse();
    const historyLines = years.map((year) => {
      const h = data.history[year] || {};
      const parts = [];
      if (h.count) parts.push(h.count + ' lesson' + (h.count === 1 ? '' : 's'));
      if (h.hours) parts.push(h.hours + ' hour' + (h.hours === 1 ? '' : 's'));
      return parts.length ? '<p class="muted">' + esc(year + ': ' + parts.join(', ')) + '</p>' : '';
    }).join('');
    this.setMain(
      '<h1>' + (guardian ? esc(data.pupil.firstName) + '’s lessons' : 'My lessons') + '</h1>' +
      (guardian ? '<p class="viewer">Viewing as guardian, read only</p>' : '') +
      '<h2>Upcoming</h2>' +
      (data.upcoming.length
        ? data.upcoming.map((l) => renderLessonRow(l, { showDate: true })).join('')
        : this.empty('Your next lesson will show here once it’s booked.')) +
      (guardian ? '' :
        '<div class="actions"><button class="btn btn-text" type="button" id="change">Request a change</button></div>' +
        '<form id="change-form" novalidate hidden>' +
        this.textarea({ id: 'body', label: 'What needs to change?', rows: 4, maxlength: 2000, hint: 'Lesson times, pick-up, or anything else. I read these between lessons.' }) +
        '<div id="change-status" aria-live="polite"></div>' +
        '<div class="actions"><button class="btn btn-primary" type="submit">Send</button><button class="btn btn-text" type="button" id="change-cancel">Cancel</button></div>' +
        '</form>') +
      '<h2>Past</h2>' +
      (data.past.length
        ? data.past.map((l) => renderLessonRow(l, { showDate: true, withYear: true, summary: true })).join('')
        : this.empty('Past lessons and my notes on them will appear here.')) +
      historyLines +
      (guardian ? '' : '<h2>Messages</h2><div id="messages"><p class="muted">Loading.</p></div>')
    );
    if (guardian) return;
    this.loadMessages();
    const button = this.$('#change');
    const form = this.$('#change-form');
    button.addEventListener('click', () => {
      form.hidden = false;
      button.hidden = true;
      this.$('#body').focus();
    });
    this.$('#change-cancel').addEventListener('click', () => {
      form.hidden = true;
      button.hidden = false;
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.send(form);
    });
  }

  async send(form) {
    const values = this.readForm(form);
    this.setErrors(form, {});
    if (!values.body || values.body.length < 2) {
      this.setErrors(form, { body: 'Write a message first.' });
      return;
    }
    this.setBusy(form, true);
    const result = await this.call('createMessage', { body: values.body });
    this.setBusy(form, false);
    if (!result.ok) {
      this.$('#change-status').innerHTML = this.failure(result);
      return;
    }
    form.innerHTML = '<div class="notice" role="status">Sent. My reply will show here.</div>';
    this.loadMessages();
  }

  async loadMessages() {
    const box = this.$('#messages');
    if (!box) return;
    const result = await this.call('listMyMessages');
    if (!result.ok) {
      box.innerHTML = this.failure(result);
      return;
    }
    const items = result.data.items;
    box.innerHTML = items.length
      ? items.map((m) =>
        '<div class="message card"><span class="when">' + esc(this.dateWords(m.createdAt, true)) + '</span>' +
        '<p class="message-body">' + esc(m.body) + '</p>' +
        (m.reply
          ? '<div class="reply"><span class="when">Reply' + (m.repliedAt ? ', ' + esc(this.dateWords(m.repliedAt, true)) : '') + '</span><p class="message-body">' + esc(m.reply) + '</p></div>'
          : '<p class="muted">No reply yet.</p>') +
        '</div>'
      ).join('')
      : this.empty('Messages you send me, and my replies, will show here.');
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-my-lessons')) customElements.define('kle-my-lessons', KleMyLessons);
