// <kle-reminders>: tomorrow's lessons with the reminder status per channel,
// Resend per channel, and the wa.me link for sending by hand.

import { PortalElement, esc } from './portal-base.js';
import { LESSON_STYLE, renderLessonRow, dayWords } from './lesson-list.js';

function timeWords(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }).format(d);
}

class KleReminders extends PortalElement {
  extraStyle() {
    return LESSON_STYLE + `
.channels { margin: 6px 0 0; }
.channel { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: baseline; padding: 4px 0; }
.channel .name { font-weight: 600; min-width: 80px; }
.channel .word { font-variant-caps: all-small-caps; letter-spacing: 0.08em; }
.channel .word.failed { color: var(--kle-red); }
.channel .why { color: var(--kle-muted); }
.channel .btn-text { min-height: 36px; padding-top: 4px; padding-bottom: 4px; }
.row-actions { margin: 6px 0 14px; }
`;
  }

  onSession() {
    this.setMain('<p class="muted">Loading tomorrow.</p>');
    this.load();
  }

  async load() {
    const result = await this.call('getTomorrow');
    if (!result.ok) {
      this.setMain(this.failure(result));
      return;
    }
    this.render(result.data);
  }

  channelLine(item, channel, label, on) {
    const st = item.channels[channel];
    const would = item.wouldSend[channel];
    let word;
    let why = '';
    let cls = '';
    if (st) {
      word = st.status + (st.status === 'sent' && st.at ? ' ' + timeWords(st.at) : '');
      why = st.status === 'sent' ? '' : st.error;
      cls = st.status === 'failed' ? 'failed' : '';
    } else if (!on) {
      word = 'off';
      why = item.wouldSend.reasons[channel] || '';
    } else {
      word = would === 'send' ? 'due' : 'will skip';
      why = item.wouldSend.reasons[channel] || '';
    }
    return (
      '<div class="channel"><span class="name">' + label + '</span><span class="word ' + cls + '">' + esc(word) + '</span>' +
      (why ? '<span class="why">' + esc(why) + '</span>' : '') +
      '<button class="btn btn-text" type="button" data-resend="' + esc(item._id) + '" data-channel="' + channel + '">' + (st && st.status === 'sent' ? 'Send again' : 'Send now') + '</button>' +
      '</div>'
    );
  }

  render(data) {
    const items = data.items;
    this.setMain(
      '<h1>Tomorrow’s reminders</h1>' +
      '<p class="muted">' + esc(dayWords(data.tomorrow, true)) + '. The job sends at ' + String(data.settings.reminderSendHour).padStart(2, '0') + ':00' +
      (data.settings.emailRemindersOn ? '' : '; email reminders are off') + (data.settings.whatsAppRemindersOn ? '' : '; WhatsApp reminders are off') + '.</p>' +
      '<div id="status" aria-live="polite"></div>' +
      (items.length ? items.map((item) =>
        '<div class="item" id="r-' + esc(item._id) + '">' +
        renderLessonRow(item, { href: '/lessons?id=' + item._id, who: item.pupilName }) +
        '<div class="channels">' +
        this.channelLine(item, 'email', 'Email', data.settings.emailRemindersOn) +
        this.channelLine(item, 'whatsapp', 'WhatsApp', data.settings.whatsAppRemindersOn) +
        '</div>' +
        '<div class="row-actions">' + (item.waMe ? '<a class="btn btn-text" href="' + esc(item.waMe) + '" target="_blank" rel="noopener">Send on WhatsApp by hand</a>' : '<span class="muted">No phone number for the WhatsApp fallback.</span>') + '</div>' +
        '</div>'
      ).join('') : this.empty('Nothing booked for tomorrow.'))
    );
    this.main.querySelectorAll('[data-resend]').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      const result = await this.call('resendReminder', { lessonId: button.getAttribute('data-resend'), channel: button.getAttribute('data-channel') });
      if (!result.ok) {
        this.$('#status').innerHTML = this.failure(result);
        button.disabled = false;
        return;
      }
      const r = result.data.results[button.getAttribute('data-channel')] || {};
      this.$('#status').innerHTML = '<div class="notice" role="status">' + (r.ok ? 'Sent.' : r.skipped ? 'Skipped: ' + esc(r.error) : 'Failed: ' + esc(r.error)) + '</div>';
      this.load();
    }));
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-reminders')) customElements.define('kle-reminders', KleReminders);
