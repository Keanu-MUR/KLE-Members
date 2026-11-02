// Shared base for every portal custom element: the design-brief styles and
// the bridge to page code. Custom elements cannot call Velo, so an element
// dispatches a 'portal-request' event and page code answers by setting the
// 'response' attribute; call() turns that round trip into a promise.

const STYLE = `
:host {
  --kle-primary: #FF5A25;
  --kle-primary-dark: #E04A18;
  --kle-ink: #141414;
  --kle-paper: #FAF7F2;
  --kle-muted: #5A5A5A;
  --kle-line: #141414;
  --kle-red: #D0021B;
  --kle-gold: #F3C852;
  --kle-font-heading: 'lulo-clean-w01-one-bold', 'Barlow Condensed', 'Arial Narrow', sans-serif;
  --kle-font-body: 'poppins-v2', 'Source Sans 3', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  display: block;
  font-family: var(--kle-font-body);
  font-size: 16px;
  line-height: 1.5;
  color: var(--kle-ink);
  background: var(--kle-paper);
  text-align: left;
}
*, *::before, *::after { box-sizing: border-box; }
.portal { max-width: 720px; margin: 0 auto; padding: 24px 16px 56px; }
.portal.embedded { max-width: none; padding: 0; }
.brand { display: flex; align-items: baseline; gap: 10px; font-family: var(--kle-font-heading); text-transform: uppercase; letter-spacing: 0.14em; }
.brand .kle { font-size: 22px; }
.brand .driving { font-size: 12px; }
.brand-tag { margin: 4px 0 0; color: var(--kle-muted); }
nav.portal-nav { display: flex; flex-wrap: wrap; gap: 4px 20px; margin: 14px 0 0; }
nav.portal-nav a { text-decoration: none; padding: 6px 0; border-bottom: 2px solid transparent; }
nav.portal-nav a[aria-current="page"] { border-bottom-color: var(--kle-primary); }
.field { margin: 18px 0 0; }
.field label, .field .legend { display: block; font-weight: 600; margin: 0 0 6px; }
.field .hint { margin: 6px 0 0; color: var(--kle-muted); }
.field input[readonly] { background: transparent; border-color: #bdbdbd; color: var(--kle-muted); }
fieldset { border: 0; padding: 0; margin: 18px 0 0; min-width: 0; }
.choices { display: flex; flex-wrap: wrap; gap: 8px 20px; }
.choices label, .check { display: flex; align-items: flex-start; gap: 10px; font-weight: 400; margin: 0; cursor: pointer; }
.choices input, .check input { width: 20px; height: 20px; min-height: 0; margin: 2px 0 0; flex: 0 0 auto; accent-color: var(--kle-primary); }
.check { margin-top: 18px; }
.check .consent { display: block; color: var(--kle-muted); margin-top: 4px; }
.row { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; padding: 12px 0; }
.row + .row { border-top: 1px solid #e3ded6; }
.row a { text-decoration: none; }
.row .meta { color: var(--kle-muted); white-space: nowrap; }
.filters { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 16px 0 8px; }
.filters .btn-text[aria-pressed="true"] { text-decoration: none; border-bottom: 2px solid var(--kle-primary); }
.status { display: inline-block; font-variant-caps: all-small-caps; letter-spacing: 0.08em; color: var(--kle-muted); }
.hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
.sr-only-focusable:focus { position: static; width: auto; height: auto; }
.dark { background: var(--kle-ink); color: #fff; }
.dark .brand-tag { color: #d9d9d9; }
.viewer { margin: 0; color: var(--kle-muted); }
h1, h2, h3 { font-family: var(--kle-font-heading); font-weight: 600; line-height: 1.15; letter-spacing: 0.01em; margin: 0; }
h1 { font-size: 28px; margin: 28px 0 8px; }
h2 { font-size: 18px; margin: 32px 0 8px; }
p { margin: 0 0 12px; }
.muted, .empty { color: var(--kle-muted); }
.smallcaps { font-variant-caps: all-small-caps; letter-spacing: 0.08em; }
.road { border: 0; border-top: 1px dashed var(--kle-line); margin: 28px 0; }
ul.plain { list-style: none; padding: 0; margin: 0; }
ul.plain li { padding: 8px 0; }
label { display: block; font-weight: 600; margin: 18px 0 6px; }
input, select, textarea { width: 100%; font: inherit; color: inherit; background: #fff; border: 1px solid var(--kle-ink); border-radius: 4px; padding: 12px; min-height: 48px; }
textarea { min-height: 120px; resize: vertical; }
.field-error input, .field-error textarea, .field-error select { border-color: var(--kle-red); }
.error { color: var(--kle-red); margin: 6px 0 0; }
.notice { border-left: 3px solid var(--kle-primary); padding: 8px 12px; margin: 20px 0; }
.btn { font: inherit; font-weight: 600; min-height: 48px; padding: 12px 20px; border-radius: 4px; border: 1px solid transparent; cursor: pointer; background: transparent; color: inherit; }
.btn-primary { background: var(--kle-primary); border-color: var(--kle-primary); color: var(--kle-ink); }
.btn-primary:hover { background: var(--kle-primary-dark); border-color: var(--kle-primary-dark); }
.btn-text { padding-left: 0; padding-right: 0; text-decoration: underline; text-underline-offset: 3px; }
.btn[disabled] { opacity: 0.55; cursor: default; }
.actions { display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: center; margin-top: 24px; }
a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
:focus-visible { outline: 3px solid var(--kle-primary); outline-offset: 2px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;

// Mirrors NAV_BY_ROLE in public/portal-constants.js (custom elements do
// not import it, so the two lists are kept in step by hand).
const NAV_BY_ROLE = {
  instructor: [
    { label: 'Today', path: '/instructor' },
    { label: 'Lessons', path: '/lessons' },
    { label: 'Pupils', path: '/pupils' },
    { label: 'Enquiries', path: '/enquiries' },
    { label: 'Reminders', path: '/reminders' },
    { label: 'Settings', path: '/settings' }
  ],
  pupil: [
    { label: 'Home', path: '/pupil-home' },
    { label: 'Lessons', path: '/my-lessons' },
    { label: 'Progress', path: '/my-progress' },
    { label: 'Mock tests', path: '/my-mock-tests' },
    { label: 'My details', path: '/my-details' }
  ],
  guardian: [
    { label: 'Home', path: '/pupil-home' },
    { label: 'Lessons', path: '/my-lessons' },
    { label: 'Progress', path: '/my-progress' },
    { label: 'Mock tests', path: '/my-mock-tests' }
  ]
};

function safeParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

// A small browser-side cache so a page paints at once with the session and
// data it showed last time, then refreshes from the backend. Lives in
// sessionStorage: it goes when the tab closes, and every access is wrapped
// because private windows and strict settings can refuse it.
const CACHE_PREFIX = 'kle.';
const SESSION_KEY = CACHE_PREFIX + 'session';
const DATA_PREFIX = CACHE_PREFIX + 'data.';
const DATA_TTL_MS = 30 * 60 * 1000;
// Actions that only read; their results may be shown from the cache.
const CACHEABLE = /^(get|list)[A-Z]/;

function cacheRead(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry !== 'object' || !entry.at || Date.now() - entry.at > DATA_TTL_MS) return null;
    return entry.value;
  } catch (error) {
    return null;
  }
}

function cacheWrite(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), value }));
  } catch (error) {
    // Storage full or refused: the page just loads from the backend.
  }
}

// Drops the data entries (after a change) or everything (after a logout).
function cacheClear(all) {
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && (all ? key.startsWith(CACHE_PREFIX) : key.startsWith(DATA_PREFIX))) keys.push(key);
    }
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch (error) {
    // Nothing to clear.
  }
}

export function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const WORDMARK = '<span class="brand" aria-label="KLE Driving"><span class="kle">KLE</span><span class="driving">Driving</span></span>';

export class PortalElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._pending = new Map();
    this._seq = 0;
    this.session = null;
    // True while the session on show came from the cache rather than page code.
    this._provisional = false;
    // Cache keys already refreshed from the backend on this page view.
    this._fresh = new Set();
  }

  static get observedAttributes() {
    return ['session', 'response', 'params'];
  }

  connectedCallback() {
    if (!this._rendered) {
      this._rendered = true;
      this.shadowRoot.innerHTML = '<style>' + STYLE + this.extraStyle() + '</style>' + this.shell();
      this.renderNav();
      this.afterShell();
      this.shadowRoot.addEventListener('click', (event) => this.onLinkClick(event));
    }
    if (this.session) {
      this.onSession(this.session);
      return;
    }
    // No session from page code yet: show the one from the last page so the
    // nav and content do not appear to sign the visitor out on every page.
    const cached = cacheRead(SESSION_KEY);
    if (cached && cached.loggedIn) {
      this.session = cached;
      this._provisional = true;
      this.renderNav();
      this.onSession(cached);
    }
  }

  attributeChangedCallback(name, oldValue, value) {
    if (name === 'session') {
      const next = safeParse(value);
      const same = JSON.stringify(next) === JSON.stringify(this.session);
      this._provisional = false;
      if (next && next.loggedIn) cacheWrite(SESSION_KEY, next);
      else cacheClear(true);
      // The same session again (page code confirming the cached one, or the
      // shell repeating it) means the page is already showing the right
      // thing; loading it again would only flicker.
      if (same) return;
      this.session = next;
      if (this._rendered) this.renderNav();
      if (this._rendered && this.session) this.onSession(this.session);
    } else if (name === 'params') {
      this.params = safeParse(value) || {};
    } else if (name === 'response') {
      const message = safeParse(value);
      if (message && message.id && this._pending.has(message.id)) {
        this._bridgeReady = true;
        const resolve = this._pending.get(message.id);
        this._pending.delete(message.id);
        // Without the id, so two answers to the same read compare equal.
        delete message.id;
        resolve(message);
      }
    }
  }

  // A click on a link within the site goes through page code's
  // wixLocation.to(), which swaps the page without reloading the whole Wix
  // framework (two to three seconds a time); the href stays for new tabs,
  // middle clicks and the harness, where the page just loads normally.
  onLinkClick(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.composedPath().find((node) => node && node.tagName === 'A');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (!href.startsWith('/') || href.startsWith('//') || link.getAttribute('target') || link.hasAttribute('download')) return;
    event.preventDefault();
    this.navigateTo(href);
  }

  // Goes to a path on the site. Inside the one-page portal the shell
  // decides (a section switch, or page code for anything else).
  navigateTo(href) {
    if (this.hasAttribute('embedded')) {
      this.dispatchEvent(new CustomEvent('portal-link', { detail: { href } }));
      return;
    }
    let done = false;
    this.request('navigate', { path: href }).then(() => { done = true; });
    // No answer and this element is still on the page: page code did not
    // take the navigation (the harness, or the bridge not wired yet). An
    // element Wix has already removed means the page swap is under way.
    setTimeout(() => { if (!done && this.isConnected) location.assign(href); }, 1200);
  }

  // Rewrites the address bar without a load (a new lesson getting its id).
  replaceUrl(href) {
    if (this.hasAttribute('embedded')) {
      this.dispatchEvent(new CustomEvent('portal-replace', { detail: { href } }));
      return;
    }
    if (typeof history !== 'undefined' && history.replaceState) history.replaceState(null, '', href);
  }

  // Resolves with { ok, data } or { ok: false, error } from page code.
  // A read (get*/list*) answered on an earlier view resolves at once from
  // the cache while the real answer is fetched; if that differs, the page
  // loads again from onSession() with the fresh data. Any other action is
  // a change, so it empties the data cache first.
  call(action, payload) {
    const key = CACHEABLE.test(action) && action !== 'getSession'
      ? DATA_PREFIX + location.pathname + location.hash.split('?')[0] + '.' + action + '.' + JSON.stringify(payload || {})
      : null;
    if (!key) {
      cacheClear(false);
      this._fresh.clear();
      if (action === 'logout') cacheClear(true);
      return this.request(action, payload);
    }
    const cached = cacheRead(key);
    // Already refreshed on this view (the page is loading again after a
    // change in the data): the cache is the fresh answer.
    if (cached && this._fresh.has(key)) return Promise.resolve(cached);
    const fetched = this.request(action, payload).then((result) => {
      if (result && result.ok) cacheWrite(key, result);
      this._fresh.add(key);
      return result;
    });
    if (!cached) return fetched;
    fetched.then((result) => {
      if (result && result.ok && JSON.stringify(result) !== JSON.stringify(cached) && this.session) this.onSession(this.session);
    });
    return Promise.resolve(cached);
  }

  // The round trip itself.
  request(action, payload) {
    this._seq += 1;
    const id = this._seq + '-' + Date.now().toString(36);
    const detail = { id, action, payload: payload || {} };
    return new Promise((resolve) => {
      this._pending.set(id, resolve);
      // Wix wires its event forwarding a moment after it applies attributes,
      // so a request fired straight from attributeChangedCallback is lost.
      // Send on a fresh task, and until the first reply has proven the
      // bridge, keep sending the same request every half second for a
      // while (page code ignores the copies it has already seen).
      const send = () => this.dispatchEvent(new CustomEvent('portal-request', { detail }));
      setTimeout(send, 0);
      let tries = 0;
      const again = () => {
        tries += 1;
        if (this._bridgeReady || !this._pending.has(id) || tries > 8) return;
        send();
        setTimeout(again, 500);
      };
      setTimeout(again, 500);
    });
  }

  // Subclasses override these.
  // A section inside the one-page portal (see portal-shell.js) has the
  // brand and nav drawn by the shell, so it renders only its main.
  shell() {
    if (this.hasAttribute('embedded')) return '<div class="portal embedded"><main id="main"><p class="muted">Loading.</p></main></div>';
    return '<div class="portal"><header>' + WORDMARK + '<nav class="portal-nav" id="nav" aria-label="Portal"></nav></header><main id="main"><p class="muted">Loading.</p></main></div>';
  }

  // Text links for the current role, with the current page marked.
  renderNav() {
    const nav = this.shadowRoot.getElementById('nav');
    if (!nav) return;
    const role = this.session && this.session.loggedIn ? this.session.role : null;
    const links = (role && NAV_BY_ROLE[role]) || [];
    const here = typeof location !== 'undefined' ? location.pathname.replace(/\/$/, '') : '';
    nav.innerHTML = links
      .map((l) => '<a href="' + l.path + '"' + (here === l.path ? ' aria-current="page"' : '') + '>' + esc(l.label) + '</a>')
      .join('');
    nav.hidden = links.length === 0;
  }

  // Form building blocks, all with real labels and plain-English errors.
  field(opts) {
    const type = opts.type || 'text';
    const attrs = [
      'id="' + esc(opts.id) + '"',
      'name="' + esc(opts.name || opts.id) + '"',
      'type="' + esc(type) + '"',
      'value="' + esc(opts.value == null ? '' : opts.value) + '"'
    ];
    if (opts.autocomplete) attrs.push('autocomplete="' + esc(opts.autocomplete) + '"');
    if (opts.inputmode) attrs.push('inputmode="' + esc(opts.inputmode) + '"');
    if (opts.readOnly) attrs.push('readonly aria-readonly="true"');
    if (opts.required) attrs.push('required');
    if (opts.maxlength) attrs.push('maxlength="' + opts.maxlength + '"');
    if (opts.hint) attrs.push('aria-describedby="' + esc(opts.id) + '-hint"');
    return (
      '<div class="field" id="f-' + esc(opts.id) + '"><label for="' + esc(opts.id) + '">' + esc(opts.label) + '</label>' +
      '<input ' + attrs.join(' ') + '>' +
      (opts.hint ? '<p class="hint" id="' + esc(opts.id) + '-hint">' + esc(opts.hint) + '</p>' : '') +
      '</div>'
    );
  }

  textarea(opts) {
    return (
      '<div class="field" id="f-' + esc(opts.id) + '"><label for="' + esc(opts.id) + '">' + esc(opts.label) + '</label>' +
      '<textarea id="' + esc(opts.id) + '" name="' + esc(opts.name || opts.id) + '"' +
      (opts.maxlength ? ' maxlength="' + opts.maxlength + '"' : '') + (opts.rows ? ' rows="' + opts.rows + '"' : '') + '>' +
      esc(opts.value == null ? '' : opts.value) + '</textarea>' +
      (opts.hint ? '<p class="hint">' + esc(opts.hint) + '</p>' : '') + '</div>'
    );
  }

  radios(opts) {
    return (
      '<fieldset class="field" id="f-' + esc(opts.name) + '"><legend class="legend">' + esc(opts.legend) + '</legend><div class="choices">' +
      opts.options.map((o) =>
        '<label><input type="radio" name="' + esc(opts.name) + '" value="' + esc(o.value) + '"' +
        (opts.value === o.value ? ' checked' : '') + '><span>' + esc(o.label) + '</span></label>'
      ).join('') + '</div></fieldset>'
    );
  }

  checkbox(opts) {
    return (
      '<div class="field" id="f-' + esc(opts.id) + '"><label class="check"><input type="checkbox" id="' + esc(opts.id) + '" name="' + esc(opts.name || opts.id) + '"' +
      (opts.checked ? ' checked' : '') + '><span>' + esc(opts.label) +
      (opts.consent ? '<span class="consent">' + esc(opts.consent) + '</span>' : '') + '</span></label></div>'
    );
  }

  // Values of every named control in a form, checkboxes as booleans.
  readForm(form) {
    const out = {};
    const data = new FormData(form);
    form.querySelectorAll('input[type=checkbox][name]').forEach((cb) => { out[cb.name] = cb.checked; });
    data.forEach((value, key) => { if (!(key in out)) out[key] = typeof value === 'string' ? value.trim() : value; });
    return out;
  }

  setErrors(form, errors) {
    form.querySelectorAll('.error').forEach((p) => p.remove());
    form.querySelectorAll('.field-error').forEach((w) => w.classList.remove('field-error'));
    let first = null;
    Object.keys(errors || {}).forEach((key) => {
      const wrap = form.querySelector('#f-' + key);
      if (!wrap) return;
      wrap.classList.add('field-error');
      const p = document.createElement('p');
      p.className = 'error';
      p.textContent = errors[key];
      wrap.appendChild(p);
      if (!first) first = wrap.querySelector('input, textarea, select');
    });
    if (first) first.focus();
  }

  setBusy(form, busy) {
    form.querySelectorAll('button').forEach((b) => { b.disabled = busy; });
  }

  // "14 May 2008": a date without the weekday, for birthdays and the like.
  longDate(iso) {
    if (!iso) return '';
    const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + 'T12:00:00Z') : new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }

  // "Tuesday 4 November 2026" for an ISO date or timestamp, London time.
  dateWords(iso, withYear) {
    if (!iso) return '';
    const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + 'T12:00:00Z') : new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const o = { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long' };
    if (withYear) o.year = 'numeric';
    return new Intl.DateTimeFormat('en-GB', o).format(d);
  }
  extraStyle() {
    return '';
  }
  afterShell() {}
  onSession() {}

  get main() {
    return this.shadowRoot.getElementById('main');
  }

  setMain(html) {
    this.main.innerHTML = html;
  }

  $(selector) {
    return this.shadowRoot.querySelector(selector);
  }

  empty(text) {
    return '<p class="empty">' + esc(text) + '</p>';
  }

  // Generic failure line, in the instructor's voice.
  failure(result) {
    const message = result && result.error ? result.error : 'Something went wrong on my side. Try again in a moment.';
    return '<p class="error" role="alert">' + esc(message) + '</p>';
  }
}
