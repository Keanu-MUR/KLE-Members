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
.brand { display: flex; align-items: baseline; gap: 10px; font-family: var(--kle-font-heading); text-transform: uppercase; letter-spacing: 0.14em; }
.brand .kle { font-size: 22px; }
.brand .driving { font-size: 12px; }
.brand-tag { margin: 4px 0 0; color: var(--kle-muted); }
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

function safeParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
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
  }

  static get observedAttributes() {
    return ['session', 'response'];
  }

  connectedCallback() {
    if (!this._rendered) {
      this._rendered = true;
      this.shadowRoot.innerHTML = '<style>' + STYLE + this.extraStyle() + '</style>' + this.shell();
      this.afterShell();
    }
    if (this.session) this.onSession(this.session);
  }

  attributeChangedCallback(name, oldValue, value) {
    if (name === 'session') {
      this.session = safeParse(value);
      if (this._rendered && this.session) this.onSession(this.session);
    } else if (name === 'response') {
      const message = safeParse(value);
      if (message && message.id && this._pending.has(message.id)) {
        const resolve = this._pending.get(message.id);
        this._pending.delete(message.id);
        resolve(message);
      }
    }
  }

  // Resolves with { ok, data } or { ok: false, error } from page code.
  call(action, payload) {
    this._seq += 1;
    const id = this._seq + '-' + Date.now().toString(36);
    return new Promise((resolve) => {
      this._pending.set(id, resolve);
      this.dispatchEvent(new CustomEvent('portal-request', { detail: { id, action, payload: payload || {} } }));
    });
  }

  // Subclasses override these.
  shell() {
    return '<div class="portal"><header>' + WORDMARK + '</header><main id="main"></main></div>';
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
