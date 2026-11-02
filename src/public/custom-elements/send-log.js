// <kle-send-log>: send attempts with filters, newest first.

import { PortalElement, esc } from './portal-base.js';

const CHANNELS = [{ key: '', label: 'All channels' }, { key: 'email', label: 'Email' }, { key: 'whatsapp', label: 'WhatsApp' }];
const STATUSES = [{ key: '', label: 'All' }, { key: 'sent', label: 'Sent' }, { key: 'failed', label: 'Failed' }, { key: 'skipped', label: 'Skipped' }];
const DAYS = [7, 30, 90];

function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
}

class KleSendLog extends PortalElement {
  constructor() {
    super();
    this.filter = { channel: '', status: '', days: 30 };
  }

  extraStyle() {
    return `
.log { padding: 10px 0; }
.log + .log { border-top: 1px solid #e3ded6; }
.log .top { display: flex; justify-content: space-between; gap: 12px; }
.log .word { font-variant-caps: all-small-caps; letter-spacing: 0.08em; }
.log .word.failed { color: var(--kle-red); }
.log .why { color: var(--kle-muted); margin: 2px 0 0; word-break: break-word; }
`;
  }

  onSession() {
    this.setMain('<h1>Send log</h1><div class="filters" id="f-channel"></div><div class="filters" id="f-status"></div><div class="filters" id="f-days"></div><div id="rows"><p class="muted">Loading.</p></div>');
    this.renderFilters();
    this.load();
  }

  renderFilters() {
    const group = (id, list, key, current, label) => {
      this.$('#' + id).innerHTML = list.map((o) => '<button class="btn btn-text" type="button" data-' + key + '="' + esc(o.key != null ? o.key : o) + '" aria-pressed="' + (String(current) === String(o.key != null ? o.key : o)) + '">' + esc(o.label || (o + ' days')) + '</button>').join('');
      this.$('#' + id).querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        this.filter[key] = key === 'days' ? Number(b.getAttribute('data-days')) : b.getAttribute('data-' + key);
        this.renderFilters();
        this.load();
      }));
    };
    group('f-channel', CHANNELS, 'channel', this.filter.channel);
    group('f-status', STATUSES, 'status', this.filter.status);
    group('f-days', DAYS, 'days', this.filter.days);
  }

  async load() {
    const result = await this.call('listSendLog', this.filter);
    const box = this.$('#rows');
    if (!result.ok) {
      box.innerHTML = this.failure(result);
      return;
    }
    const items = result.data.items;
    box.innerHTML = items.length
      ? items.map((r) =>
        '<div class="log"><div class="top"><span><strong>' + esc(r.pupilName) + '</strong> <span class="muted">' + esc(r.channel) + '</span></span>' +
        '<span class="word ' + (r.status === 'failed' ? 'failed' : '') + '">' + esc(r.status) + '</span></div>' +
        '<div class="muted">' + esc(when(r.createdAt)) + (r.lessonId && !r.lessonId.startsWith('probe:') ? ' · <a href="/lessons?id=' + esc(r.lessonId) + '">lesson</a>' : '') + '</div>' +
        (r.error ? '<p class="why">' + esc(r.error) + '</p>' : '') + '</div>'
      ).join('')
      : this.empty('No send attempts in the last ' + result.data.days + ' days match.');
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-send-log')) customElements.define('kle-send-log', KleSendLog);
