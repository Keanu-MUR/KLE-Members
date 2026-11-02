// The one-page portal: one Wix page per role holds a shell element that
// renders the brand and nav and mounts the section elements inside it.
// Switching section changes the URL hash and swaps the child element, so
// there is no Wix page load between sections. Page code talks to the shell
// only; the shell relays each section's requests up and the answers down.

import { PortalElement, WORDMARK, esc } from './portal-base.js';

// Old page paths still used in links inside the sections, mapped to the
// section they now open.
const PATH_TO_SECTION = {
  '/pupil-home': 'home',
  '/my-lessons': 'lessons',
  '/my-progress': 'progress',
  '/my-mock-tests': 'mock-tests',
  '/my-details': 'details',
  '/instructor': 'home',
  '/lessons': 'lessons',
  '/pupils': 'pupils',
  '/pupil-record': 'pupil',
  '/enquiries': 'enquiries',
  '/progress': 'progress',
  '/reminders': 'reminders',
  '/settings': 'settings',
  '/send-log': 'send-log'
};

function parseQuery(text) {
  const out = {};
  String(text || '').split('&').forEach((pair) => {
    if (!pair) return;
    const i = pair.indexOf('=');
    const k = decodeURIComponent(i < 0 ? pair : pair.slice(0, i));
    const v = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1));
    if (k) out[k] = v;
  });
  return out;
}

// "#lessons?id=abc" -> { section: 'lessons', query: 'id=abc', params }
function parseHash(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  const q = raw.indexOf('?');
  const section = (q < 0 ? raw : raw.slice(0, q)) || 'home';
  const query = q < 0 ? '' : raw.slice(q + 1);
  return { section, query, params: parseQuery(query) };
}

// "/lessons?id=abc" -> "#lessons?id=abc", or null for a path outside the portal.
export function hrefToHash(href) {
  const q = href.indexOf('?');
  const path = (q < 0 ? href : href.slice(0, q)).replace(/\/$/, '') || '/';
  const section = PATH_TO_SECTION[path];
  if (!section) return null;
  return '#' + section + (q < 0 ? '' : href.slice(q));
}

export class PortalShell extends PortalElement {
  // Subclasses give { sections: { name: { tag, label?, roles? } }, nav: [{ label, section, roles? }] }
  config() {
    return { sections: {}, nav: [] };
  }

  extraStyle() {
    return '.section { display: block; }';
  }

  shell() {
    return '<div class="portal"><header>' + WORDMARK + '<nav class="portal-nav" id="nav" aria-label="Portal"></nav></header><main id="main"></main></div>';
  }

  afterShell() {
    this._onHash = () => this.mount();
    window.addEventListener('hashchange', this._onHash);
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this._onHash);
  }

  // The shell's nav, from its own config, marked for the current section.
  renderNav() {
    const nav = this.shadowRoot && this.shadowRoot.getElementById('nav');
    if (!nav) return;
    const role = this.session && this.session.loggedIn ? this.session.role : null;
    const links = role ? this.config().nav.filter((l) => !l.roles || l.roles.includes(role)) : [];
    const here = parseHash(location.hash).section;
    nav.innerHTML = links
      .map((l) => '<a href="#' + esc(l.section) + '"' + (here === l.section ? ' aria-current="page"' : '') + '>' + esc(l.label) + '</a>')
      .join('');
    nav.hidden = links.length === 0;
  }

  onSession(session) {
    const before = this._section;
    this.mount();
    // mount() gives a new section the session itself; an existing one
    // hears about the change here.
    if (this._section && this._section === before) this._section.setAttribute('session', JSON.stringify(session));
  }

  attributeChangedCallback(name, oldValue, value) {
    super.attributeChangedCallback(name, oldValue, value);
    // Answers from page code go to whichever section asked; a section
    // ignores ids it does not know.
    if (name === 'response' && this._section) this._section.setAttribute('response', value);
    if (name === 'params') this.mount();
  }

  // A redirect from an old page arrives as /instructor?s=lessons&id=abc,
  // because Wix drops a hash on its own navigation; move that into the
  // hash form the shell uses, without a load.
  foldQuery() {
    const q = parseQuery(location.search.replace(/^\?/, ''));
    if (!q.s) return;
    const rest = Object.keys(q).filter((k) => k !== 's').map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(q[k]));
    const hash = '#' + q.s + (rest.length ? '?' + rest.join('&') : '');
    if (history.replaceState) history.replaceState(null, '', location.pathname + hash);
    else location.hash = hash;
  }

  // Puts the section the hash names into main, if it is not there already.
  mount() {
    if (!this.session || !this.session.loggedIn) return;
    this.foldQuery();
    const role = this.session.role;
    const { sections } = this.config();
    let { section, params } = parseHash(location.hash);
    let def = sections[section];
    if (!def || (def.roles && !def.roles.includes(role))) {
      section = 'home';
      def = sections.home;
      params = {};
    }
    this.renderNav();
    const paramsJson = JSON.stringify(params);
    if (this._section && this._sectionName === section && this._paramsJson === paramsJson) return;
    if (this._section) this._section.remove();
    const el = document.createElement(def.tag);
    el.className = 'section';
    el.setAttribute('embedded', '');
    el.setAttribute('params', paramsJson);
    el.addEventListener('portal-request', (event) => {
      this.dispatchEvent(new CustomEvent('portal-request', { detail: event.detail }));
    });
    el.addEventListener('portal-link', (event) => this.go(event.detail.href));
    el.addEventListener('portal-replace', (event) => {
      const hash = hrefToHash(event.detail.href);
      if (hash) {
        this._paramsJson = JSON.stringify(parseHash(hash).params);
        history.replaceState(null, '', location.pathname + hash);
        this.renderNav();
      }
    });
    el.setAttribute('session', JSON.stringify(this.session));
    this._section = el;
    this._sectionName = section;
    this._paramsJson = paramsJson;
    this.main.appendChild(el);
    if (this._mountedOnce) window.scrollTo(0, 0);
    this._mountedOnce = true;
  }

  // A link from inside a section: a portal path becomes a hash change,
  // anything else (the enquiry form, logging out) goes through page code.
  go(href) {
    const hash = hrefToHash(href);
    if (hash) {
      if (location.hash === hash) this.mount();
      else location.hash = hash;
      return;
    }
    this.navigateTo(href);
  }
}
