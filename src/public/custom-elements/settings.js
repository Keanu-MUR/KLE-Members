// <kle-settings>: the instructor's switches, contact details, reminder
// hour, retention windows with the item counts, and the reminder test.

import { PortalElement, esc, FEATURES } from './portal-base.js';

// Record types in the instructor's words, keyed by the stored name.
const RECORD_WORDS = { Pupils: 'Pupils', Lessons: 'Lessons', Progress: 'Progress', MockTests: 'Mock tests', Payments: 'Payments', Enquiries: 'Enquiries', Messages: 'Messages', Settings: 'Settings', SendLog: 'Sent reminders', RateLimit: 'Send limits' };
const recordWords = (name) => RECORD_WORDS[name] || name;

class KleSettings extends PortalElement {
  extraStyle() {
    return `
.counts { margin: 8px 0 0; padding: 0; list-style: none; color: var(--kle-muted); }
.counts li { display: flex; justify-content: space-between; padding: 2px 0; }
.counts li.total { color: var(--kle-ink); font-weight: 600; border-top: 1px dashed var(--kle-line); margin-top: 6px; padding-top: 6px; }
.result { padding: 10px 0; }
.result + .result { border-top: 1px solid #e3ded6; }
select { appearance: auto; }
`;
  }

  onSession() {
    this.setMain('<p class="muted">Loading…</p>');
    this.load();
  }

  async load() {
    const [result, upcoming] = await Promise.all([this.call('getSettings'), this.call('upcomingForTest')]);
    if (!result.ok) {
      this.setMain(this.failure(result));
      return;
    }
    this.render(result.data, upcoming.ok ? upcoming.data : { lessons: [], defaults: {}, provider: '' });
  }

  render(data, upcoming) {
    const s = data.settings;
    const items = data.items;
    const probe = data.probe || {};
    const probeLine = !probe.ran
      ? 'Reminder emails haven’t been checked yet. The check runs once an hour.'
      : probe.ok
        ? 'Reminder emails are working (last checked ' + esc(this.dateWords(probe.at, true)) + ').'
        : 'Reminder emails are failing (last checked ' + esc(this.dateWords(probe.at, true)) + '). Reminders are going through Resend instead, which needs the RESEND_API_KEY secret and the two DNS records on the domain.';
    this.setMain(
      '<h1>Settings</h1>' +
      '<form id="form" novalidate>' +
      '<h2>Reminders</h2>' +
      this.checkbox({ id: 'emailRemindersOn', label: 'Email reminders 24 hours before each lesson', checked: s.emailRemindersOn }) +
      (FEATURES.whatsApp ? this.checkbox({ id: 'whatsAppRemindersOn', label: 'WhatsApp reminders the day before a lesson', checked: s.whatsAppRemindersOn, consent: 'Needs the Meta token and phone number ID in the Secrets Manager. Until then every WhatsApp reminder is recorded as skipped.' }) : '') +
      '<p class="hint">Each reminder goes out in the hour the lesson starts, the day before. A lesson booked with less than a day to go gets its reminder within the hour.</p>' +
      '<h2>Enquiry alerts</h2>' +
      this.checkbox({ id: 'enquiryAlertEmailOn', label: 'Email me each new enquiry', checked: s.enquiryAlertEmailOn }) +
      (FEATURES.whatsApp ? this.checkbox({ id: 'enquiryAlertWhatsAppOn', label: 'WhatsApp me each new enquiry', checked: s.enquiryAlertWhatsAppOn }) : '') +
      '<h2>Email</h2>' +
      this.radios({ name: 'emailProvider', legend: 'Send emails with', value: s.emailProvider, options: [{ value: 'wix', label: 'Wix (default)' }, { value: 'resend', label: 'Resend' }] }) +
      '<p class="hint">' + probeLine + '</p>' +
      '<h2>My contact details</h2>' +
      this.field({ id: 'instructorEmail', label: 'Email me at', type: 'email', value: s.instructorEmail, autocomplete: 'email' }) +
      (FEATURES.whatsApp ? this.field({ id: 'instructorWhatsApp', label: 'WhatsApp number', type: 'tel', value: s.instructorWhatsApp, hint: 'For enquiry alerts and the reminder test. Leave empty to skip WhatsApp.' }) : '') +
      '<h2>Lessons</h2>' +
      this.field({ id: 'hourlyRatePounds', label: 'Default hourly rate for new pupils (£)', type: 'number', inputmode: 'decimal', value: (Number(s.defaultHourlyRatePence) / 100).toFixed(2) }) +
      '<h2>Records</h2>' +
      this.field({ id: 'sendLogRetentionDays', label: 'Keep sent reminder records for (days)', type: 'number', inputmode: 'numeric', value: s.sendLogRetentionDays, hint: 'Older send records are deleted automatically.' }) +
      this.field({ id: 'lessonRetentionDays', label: 'Keep full lesson detail for (days)', type: 'number', inputmode: 'numeric', value: s.lessonRetentionDays, hint: 'After this, lessons are kept as yearly totals, as long as there’s been a backup in the last 8 days.' }) +
      this.field({ id: 'paymentRetentionDays', label: 'Keep payment records for (days)', type: 'number', inputmode: 'numeric', value: s.paymentRetentionDays }) +
      '<ul class="counts">' +
      Object.keys(items.counts).map((name) => '<li><span>' + esc(recordWords(name)) + '</span><span>' + (items.counts[name] == null ? '?' : items.counts[name]) + '</span></li>').join('') +
      '<li class="total"><span>Records used</span><span>' + items.total + ' of ' + Number(items.limit).toLocaleString('en-GB') + '</span></li>' +
      '</ul>' + (items.headroom > 300 ? '' : '<p class="hint">' + (items.headroom > 0 ? 'Getting close to the limit. Shorten the windows above.' : 'Over the limit. Shorten the windows above.') + '</p>') +
      '<div id="status" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn btn-primary" type="submit">Save changes</button><a class="btn btn-text" href="/send-log">Sent reminders</a></div>' +
      '</form>' +
      '<hr class="road">' +
      '<h2>Backups</h2>' +
      this.backupWords(data) +
      '<div id="backup-status" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn btn-text" type="button" id="backup-links">Download latest backup</button><button class="btn btn-text" type="button" id="backup-now">Back up now</button><button class="btn btn-text" type="button" id="compact-now">Tidy up old lessons now</button></div>' +
      '<div id="backup-out"></div>' +
      '<h2>Download all data</h2>' +
      '<p class="muted">Downloads a spreadsheet (CSV) for each type of record.</p>' +
      '<div class="filters">' + Object.keys(items.counts).map((name) => '<button class="btn btn-text" type="button" data-export="' + esc(name) + '">' + esc(recordWords(name)) + '</button>').join('') + '</div>' +
      '<div id="export-status" aria-live="polite"></div>' +
      '<hr class="road">' +
      '<h2>Test a reminder</h2>' +
      '<p class="muted">Sends a reminder for one lesson to the ' + (FEATURES.whatsApp ? 'email and phone' : 'email') + ' below, recorded like a real one. Reminders currently go out through ' + esc(upcoming.provider === 'resend' ? 'Resend' : 'Wix emails') + '.</p>' +
      '<form id="test" novalidate>' +
      '<div class="field" id="f-lessonId"><label for="lessonId">Lesson</label><select id="lessonId" name="lessonId">' +
      (upcoming.lessons.length ? upcoming.lessons.map((l) => '<option value="' + esc(l._id) + '">' + esc(l.label) + '</option>').join('') : '<option value="">No planned lessons to test with</option>') +
      '</select></div>' +
      this.field({ id: 'testEmail', name: 'email', label: 'Send the email to', type: 'email', value: upcoming.defaults.email || '' }) +
      (FEATURES.whatsApp ? this.field({ id: 'testPhone', name: 'phone', label: 'Send the WhatsApp to', type: 'tel', value: upcoming.defaults.phone || '', hint: 'Leave empty to test email only.' }) : '') +
      '<div id="test-status" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn btn-primary" type="submit">Send test reminder</button><button class="btn btn-text" type="button" id="run-prune">Delete old send records now</button></div>' +
      '</form>'
    );
    const form = this.$('#form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.save(form);
    });
    const test = this.$('#test');
    test.addEventListener('submit', (event) => {
      event.preventDefault();
      this.sendTest(test);
    });
    this.$('#run-prune').addEventListener('click', () => this.prune());
    this.bindBackups();
  }

  async save(form) {
    const values = this.readForm(form);
    const pounds = values.hourlyRatePounds;
    delete values.hourlyRatePounds;
    if (pounds !== '' && pounds != null) values.defaultHourlyRatePence = Math.round(Number(pounds) * 100);
    this.setErrors(form, {});
    this.setBusy(form, true);
    const result = await this.call('updateSettings', { fields: values });
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
    this.$('#status').innerHTML = '<div class="notice" role="status">Saved.</div>';
  }

  backupWords(data) {
    const s = data.settings;
    const latest = (data.backups || [])[0];
    const lines = [];
    if (!s.lastExportAt) lines.push('No backup yet. Backups run every Monday at 02:00.');
    else if (s.lastExportStatus === 'ok' && latest) lines.push('Last backup ' + esc(this.dateWords(latest.at || s.lastExportAt, true)) + ', ' + latest.files + ' files, ' + latest.items + ' records. Backup files are private. Download links expire after an hour.');
    else lines.push('The last backup on ' + esc(this.dateWords(s.lastExportAt, true)) + ' failed. ' + esc(s.lastExportStatus || ''));
    lines.push(data.compaction === 'ready' ? 'Old lessons will be tidied up tonight.' : esc(data.compaction));
    return lines.map((l) => '<p class="muted">' + l + '</p>').join('');
  }

  bindBackups() {
    this.$('#backup-links').addEventListener('click', () => this.showLinks());
    this.$('#backup-now').addEventListener('click', () => this.backupNow());
    this.$('#compact-now').addEventListener('click', () => this.compactNow());
    this.main.querySelectorAll('[data-export]').forEach((b) => b.addEventListener('click', () => this.exportOne(b.getAttribute('data-export'), b)));
  }

  async showLinks() {
    const out = this.$('#backup-out');
    out.innerHTML = '<p class="muted">Getting the links…</p>';
    const result = await this.call('latestBackupLinks');
    if (!result.ok) { out.innerHTML = this.failure(result); return; }
    const d = result.data;
    if (!d.links.length) { out.innerHTML = this.empty('No backup files yet.'); return; }
    out.innerHTML = '<p class="muted">Backup from ' + esc(this.dateWords(d.at || d.date, true)) + ', links valid for ' + d.minutes + ' minutes.</p><ul class="plain">' +
      d.links.map((l) => '<li>' + (l.url ? '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(recordWords(l.collection)) + ' (CSV)</a>' : esc(recordWords(l.collection)) + ', ' + esc(l.error || 'no link')) + ' <span class="muted">' + l.items + ' records</span></li>').join('') + '</ul>';
  }

  async backupNow() {
    const button = this.$('#backup-now');
    button.disabled = true;
    this.$('#backup-status').innerHTML = '<p class="muted">Backing up. This takes a few seconds…</p>';
    const result = await this.call('runExport');
    button.disabled = false;
    // Reload the section for the new backup line, then say what happened.
    await this.load();
    this.$('#backup-status').innerHTML = result.ok
      ? '<div class="notice" role="status">' + (result.data.ok ? 'Backed up ' + result.data.files + ' files, ' + result.data.items + ' records.' : 'Backup failed. ' + esc(result.data.error)) + '</div>'
      : this.failure(result);
  }

  async compactNow() {
    const button = this.$('#compact-now');
    button.disabled = true;
    const result = await this.call('runCompactionNow');
    button.disabled = false;
    await this.load();
    this.$('#backup-status').innerHTML = result.ok
      ? '<div class="notice" role="status">' + (result.data.ran ? 'Tidied up ' + result.data.lessons + ' lesson' + (result.data.lessons === 1 ? '' : 's') + ' for ' + result.data.pupils + ' pupil' + (result.data.pupils === 1 ? '' : 's') + '.' : esc(result.data.reason)) + '</div>'
      : this.failure(result);
  }

  async exportOne(name, button) {
    button.disabled = true;
    const result = await this.call('exportCollection', { name });
    button.disabled = false;
    if (!result.ok) { this.$('#export-status').innerHTML = this.failure(result); return; }
    const blob = new Blob([result.data.csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    this.shadowRoot.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    this.$('#export-status').innerHTML = '<div class="notice" role="status">' + esc(recordWords(name)) + ' downloaded, ' + result.data.items + ' records.</div>';
  }

  resultLines(results) {
    const words = { email: 'Email', guardian: 'Guardian email', whatsapp: 'WhatsApp' };
    return Object.keys(results).map((key) => {
      const r = results[key];
      const status = r.ok ? 'sent' : r.skipped ? 'skipped' : 'failed';
      return '<div class="result"><strong>' + words[key] + '</strong>: ' + status + (r.error ? '. ' + esc(r.error) : '') + (r.provider ? ' (' + esc(r.provider) + ')' : '') + '</div>';
    }).join('');
  }

  async sendTest(form) {
    const values = this.readForm(form);
    this.setErrors(form, {});
    this.setBusy(form, true);
    const result = await this.call('testReminder', { lessonId: values.lessonId, email: values.email, phone: values.phone });
    this.setBusy(form, false);
    this.$('#test-status').innerHTML = result.ok
      ? '<div class="notice" role="status">' + this.resultLines(result.data.results) + '<p class="muted">These also show under Sent reminders.</p></div>'
      : this.failure(result);
  }

  async prune() {
    const button = this.$('#run-prune');
    button.disabled = true;
    const result = await this.call('runPrune');
    button.disabled = false;
    this.$('#test-status').innerHTML = result.ok
      ? '<div class="notice" role="status">Deleted ' + result.data.SendLog + ' old send records and ' + result.data.RateLimit + ' send limit records.</div>'
      : this.failure(result);
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-settings')) customElements.define('kle-settings', KleSettings);
