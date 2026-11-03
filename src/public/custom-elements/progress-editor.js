// <kle-progress-editor>: the instructor sets a pupil's levels. Opens one
// pupil by ?id=. Every tap on a block saves at once; notes save with their
// own button.

import { PortalElement, esc } from './portal-base.js';
import { GRID_STYLE, renderGrid, renderLegend } from './progress-grid.js';

class KleProgressEditor extends PortalElement {
  extraStyle() {
    return GRID_STYLE + '\n.save-status { min-height: 24px; margin: 8px 0 0; color: var(--kle-muted); }';
  }

  onSession() {
    const id = this.params && this.params.id;
    if (!id) {
      this.setMain('<h1>Progress</h1>' + this.empty('Open a pupil from the Pupils list and choose Edit progress.'));
      return;
    }
    this.setMain('<p class="muted">Loading…</p>');
    this.load(id);
  }

  async load(id) {
    const result = await this.call('getProgress', { id });
    if (!result.ok) {
      this.setMain('<p><a href="/pupils">All pupils</a></p>' + this.failure(result));
      return;
    }
    this.state = result.data;
    this.render();
  }

  render() {
    const s = this.state;
    const pupil = s.pupil;
    this.setMain(
      '<p><a href="/pupil-record?id=' + esc(pupil._id) + '">Back to pupil</a></p>' +
      '<h1>' + esc(pupil.firstName + ' ' + pupil.lastName) + '</h1>' +
      '<p class="muted">' + esc(pupil.transmission === 'automatic' ? 'Automatic. ' : 'Manual. ') + 'Tap a square to set the level. It saves straight away.</p>' +
      '<p class="record-summary" id="summary">' + esc(s.summary || 'Nothing set yet.') + '</p>' +
      '<div class="save-status" id="save-status" aria-live="polite"></div>' +
      renderLegend(s.levels) +
      '<div id="grid">' + renderGrid({ skills: s.skills, groups: s.groups, levels: s.levels, data: s.data, transmission: pupil.transmission, editable: true }) + '</div>'
    );
    this.$('#grid').addEventListener('click', (event) => this.onClick(event));
  }

  onClick(event) {
    const block = event.target.closest('[data-level]');
    if (block) {
      this.setLevel(block.getAttribute('data-skill'), Number(block.getAttribute('data-level')));
      return;
    }
    const noteButton = event.target.closest('[data-note]');
    if (noteButton) this.openNote(noteButton.getAttribute('data-note'));
  }

  async setLevel(skillKey, level) {
    const current = this.state.data[skillKey] || {};
    await this.saveSkill(skillKey, level, current.note || '');
  }

  openNote(skillKey) {
    const form = this.$('#note-' + skillKey);
    if (!form) return;
    const current = this.state.data[skillKey] || {};
    const skill = this.state.skills.find((s) => s.key === skillKey);
    form.hidden = false;
    form.innerHTML =
      '<label for="t-' + esc(skillKey) + '">Note for ' + esc(this.state.pupil.firstName) + ' on ' + esc(skill ? skill.name.toLowerCase() : 'this skill') + '</label>' +
      '<textarea id="t-' + esc(skillKey) + '" maxlength="500">' + esc(current.note || '') + '</textarea>' +
      '<div class="actions"><button class="btn btn-primary" type="button" data-save-note="' + esc(skillKey) + '">Save note</button>' +
      '<button class="btn btn-text" type="button" data-cancel-note="' + esc(skillKey) + '">Cancel</button></div>';
    form.querySelector('[data-save-note]').addEventListener('click', () => {
      const text = form.querySelector('textarea').value;
      if (!current.level) {
        this.$('#save-status').textContent = 'Set a level first, then add the note.';
        return;
      }
      this.saveSkill(skillKey, current.level, text);
    });
    form.querySelector('[data-cancel-note]').addEventListener('click', () => {
      form.hidden = true;
      form.innerHTML = '';
    });
    form.querySelector('textarea').focus();
  }

  async saveSkill(skillKey, level, note) {
    const status = this.$('#save-status');
    status.textContent = 'Saving…';
    const result = await this.call('setSkill', { id: this.state.pupil._id, skillKey, level, note });
    if (!result.ok) {
      status.innerHTML = this.failure(result);
      return;
    }
    this.state.data[skillKey] = result.data.entry;
    this.state.summary = result.data.summary;
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    this.$('#grid').innerHTML = renderGrid({ skills: this.state.skills, groups: this.state.groups, levels: this.state.levels, data: this.state.data, transmission: this.state.pupil.transmission, editable: true });
    this.$('#summary').textContent = this.state.summary || 'Nothing set yet.';
    if (typeof window !== 'undefined') window.scrollTo(0, scrollY);
    status.textContent = 'Saved. ' + this.state.pupil.firstName + ' sees it next time they log in.';
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-progress-editor')) customElements.define('kle-progress-editor', KleProgressEditor);
