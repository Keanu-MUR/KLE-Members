// <kle-lessons>: the instructor's lessons. Without parameters it lists this
// week and next, grouped by day. ?pupil=<id> lists one pupil's lessons.
// ?new=1 (optionally with &pupil=) opens the add form; ?id=<lessonId>
// opens a lesson to edit.

import { PortalElement, esc } from './portal-base.js';
import { LESSON_STYLE, renderDays, dayWords } from './lesson-list.js';

// The four fixed slots, shown by their times only (2 Nov 2026).
const SLOTS = [
  { key: 'early-morning', times: '07:30–09:30' },
  { key: 'late-morning', times: '10:00–12:00' },
  { key: 'early-afternoon', times: '12:45–14:45' },
  { key: 'late-afternoon', times: '15:15–17:15' }
];
const STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no-show', label: 'No show' }
];

class KleLessons extends PortalElement {
  extraStyle() {
    return LESSON_STYLE + `
.custom-time { display: flex; gap: 12px; }
.custom-time .field { flex: 1 1 0; }
select { appearance: auto; }
`;
  }

  onSession() {
    const p = this.params || {};
    if (p.id || p.new) this.openForm(p.id || 'new', p.pupil || '');
    else this.openList(p.pupil || '');
  }

  // ---- list -------------------------------------------------------------

  async openList(pupilId) {
    this.setMain('<p class="muted">Loading…</p>');
    const result = await this.call('listLessons', pupilId ? { pupilId } : {});
    if (!result.ok) {
      this.setMain(this.failure(result));
      return;
    }
    const { items, ranges, today } = result.data;
    const row = (lesson) => ({ href: '/lessons?id=' + lesson._id, who: lesson.pupilName });
    let body;
    if (pupilId) {
      const name = items[0] ? items[0].pupilName : '';
      body =
        '<p><a href="/pupil-record?id=' + esc(pupilId) + '">Back to pupil</a></p>' +
        '<h1>' + esc(name ? name + '’s lessons' : 'Lessons') + '</h1>' +
        '<div class="actions"><a class="btn btn-primary" href="/lessons?new=1&pupil=' + esc(pupilId) + '">Add lesson</a></div>' +
        (items.length ? renderDays(items, row) : this.empty('No lessons for this pupil yet. Add one above.'));
    } else {
      const thisWeek = items.filter((l) => l.date <= ranges.thisWeek.to);
      const nextWeek = items.filter((l) => l.date > ranges.thisWeek.to);
      body =
        '<h1>Lessons</h1>' +
        '<div class="actions"><a class="btn btn-primary" href="/lessons?new=1">Add lesson</a></div>' +
        '<h2 class="week">This week</h2>' +
        (thisWeek.length ? renderDays(thisWeek, row) : this.empty(today > ranges.thisWeek.from ? 'Nothing else booked this week.' : 'Nothing booked this week yet.')) +
        '<h2 class="week">Next week</h2>' +
        (nextWeek.length ? renderDays(nextWeek, row) : this.empty('Nothing booked for next week yet.'));
    }
    this.setMain(body);
  }

  // ---- form -------------------------------------------------------------

  async openForm(id, presetPupilId) {
    this.setMain('<p class="muted">Loading…</p>');
    const result = await this.call('getLesson', { id });
    if (!result.ok) {
      this.setMain('<p><a href="/lessons">All lessons</a></p>' + this.failure(result));
      return;
    }
    this.renderForm(result.data.lesson, result.data.pupils, presetPupilId);
  }

  renderForm(lesson, pupils, presetPupilId) {
    const isNew = !lesson;
    const l = lesson || { pupilId: presetPupilId || '', date: '', slot: '', startTime: '', durationMins: '', pickupLocation: '', status: 'planned', pupilSummary: '', instructorNotes: '' };
    const custom = l.slot === 'custom';
    const back = presetPupilId
      ? '<p><a href="/pupil-record?id=' + esc(presetPupilId) + '">Back to pupil</a></p>'
      : '<p><a href="/lessons">All lessons</a></p>';
    const heading = isNew ? 'Add lesson' : esc(l.pupilName || 'Lesson') + ', ' + esc(dayWords(l.date));
    this.setMain(
      back +
      '<h1>' + heading + '</h1>' +
      '<form id="form" novalidate>' +
      '<div class="field" id="f-pupilId"><label for="pupilId">Pupil</label><select id="pupilId" name="pupilId">' +
      '<option value="">Choose a pupil</option>' +
      pupils.map((p) => '<option value="' + esc(p._id) + '"' + (p._id === l.pupilId ? ' selected' : '') + ' data-address="' + esc([p.addressLine1, p.postcode].filter(Boolean).join(', ')) + '">' + esc(p.name) + ' (' + esc(p.transmission) + ')</option>').join('') +
      (!isNew && !pupils.some((p) => p._id === l.pupilId) ? '<option value="' + esc(l.pupilId) + '" selected>' + esc(l.pupilName || 'Current pupil') + '</option>' : '') +
      '</select></div>' +
      this.field({ id: 'date', label: 'Date', type: 'date', value: l.date, required: true }) +
      this.radios({ name: 'slot', legend: 'Time', value: l.slot, options: SLOTS.map((s) => ({ value: s.key, label: s.times })).concat([{ value: 'custom', label: 'Another time' }]) }) +
      '<div class="custom-time" id="custom-time"' + (custom ? '' : ' hidden') + '>' +
      this.field({ id: 'startTime', label: 'Start', type: 'time', value: custom ? l.startTime : '' }) +
      this.field({ id: 'durationMins', label: 'Length (minutes)', type: 'number', inputmode: 'numeric', value: custom ? l.durationMins : '120' }) +
      '</div>' +
      this.field({ id: 'pickupLocation', label: 'Pick-up', value: l.pickupLocation, required: true, maxlength: 160, hint: 'Filled in from the pupil’s address. Change it if you’re meeting somewhere else.' }) +
      (isNew ? '' : this.radios({ name: 'status', legend: 'Status', value: l.status, options: STATUSES })) +
      this.textarea({ id: 'pupilSummary', label: isNew ? 'Note for the pupil' : 'Summary for the pupil', rows: 4, maxlength: 2000, value: l.pupilSummary, hint: 'The pupil sees this in their lessons. After the lesson, add a line on what you covered.' }) +
      this.textarea({ id: 'instructorNotes', label: 'Private notes', rows: 3, maxlength: 4000, value: l.instructorNotes, hint: 'Only you see these.' }) +
      '<div id="status" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn btn-primary" type="submit">' + (isNew ? 'Add lesson' : 'Save changes') + '</button>' +
      (isNew || !l.pupilId ? '' : '<a class="btn btn-text" href="/progress?id=' + esc(l.pupilId) + '">Update progress</a>') +
      '</div></form>'
    );
    const form = this.$('#form');
    const pupilSelect = this.$('#pupilId');
    const pickup = this.$('#pickupLocation');
    const fillPickup = () => {
      const option = pupilSelect.options[pupilSelect.selectedIndex];
      const address = option ? option.getAttribute('data-address') : '';
      if (address && !pickup.value.trim()) pickup.value = address;
    };
    pupilSelect.addEventListener('change', fillPickup);
    if (isNew) fillPickup();
    form.querySelectorAll('input[name=slot]').forEach((radio) => radio.addEventListener('change', () => {
      this.$('#custom-time').hidden = radio.value !== 'custom' || !radio.checked;
    }));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.save(form, lesson, presetPupilId);
    });
  }

  async save(form, lesson, presetPupilId) {
    const values = this.readForm(form);
    this.setErrors(form, {});
    this.setBusy(form, true);
    const result = lesson
      ? await this.call('updateLesson', { id: lesson._id, fields: values })
      : await this.call('createLesson', { fields: values });
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
    const saved = result.data.lesson;
    if (!lesson) {
      // Stay on the new lesson so a second edit is one tap away.
      this.replaceUrl('/lessons?id=' + saved._id);
      this.renderForm(saved, [], presetPupilId);
      this.$('#pupilId').innerHTML = '<option value="' + esc(saved.pupilId) + '" selected>' + esc(saved.pupilName) + '</option>';
      this.$('#status').innerHTML = '<div class="notice" role="status">Added. ' + esc(saved.pupilName) + ' will see it in their lessons. <a href="/lessons?new=1">Add another lesson</a></div>';
      return;
    }
    Object.assign(lesson, saved);
    this.$('#status').innerHTML = '<div class="notice" role="status">Saved. ' + esc(saved.pupilName) + ' will see the change next time they log in.</div>';
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-lessons')) customElements.define('kle-lessons', KleLessons);
