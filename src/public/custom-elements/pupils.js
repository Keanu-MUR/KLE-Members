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
    this.setMain('<p class="muted">Loading pupils.</p>');
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
      '<form id="search" novalidate>' + this.field({ id: 'q', label: 'Search by name or email', value: this.search, autocomplete: 'off' }) + '</form>' +
      '<div class="filters" id="filters"></div>' +
      '<div id="rows"></div>'
    );
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
      ? data.items.map((p) =>
        '<div class="row"><div><a href="/pupil-record?id=' + esc(p._id) + '"><strong>' + esc(p.firstName + ' ' + p.lastName) + '</strong></a><br>' +
        '<span class="muted">' + esc(p.transmission) + (p.postcode ? ', ' + esc(p.postcode) : '') + (p.linked ? '' : ', no login yet') + '</span></div>' +
        '<span class="status">' + esc(p.status) + '</span></div>'
      ).join('')
      : this.empty(this.search ? 'No pupils match that.' : 'Pupils appear here when you convert an enquiry.');
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-pupils')) customElements.define('kle-pupils', KlePupils);
