// <kle-login>: the own-styled login form. Password login and the "email me
// a login link" button both go through page code, which holds the Wix
// Members calls and the redirect.

import { PortalElement, esc, WORDMARK } from './portal-base.js';

const ENQUIRE_PATH = '/enquire';

class KleLogin extends PortalElement {
  extraStyle() {
    return `
.login { padding: 24px 16px 56px; }
.login-card { max-width: 420px; margin: 0 auto; background: var(--paper); border: 2px solid var(--ink); }
.plate { background: var(--plate); color: var(--ink); border-bottom: 2px solid var(--ink); padding: 12px 20px; font-family: var(--font-head); font-weight: 700; font-size: 22px; text-transform: uppercase; letter-spacing: 0.02em; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.plate .brand { color: var(--ink); }
.plate .brand .kle, .plate .brand .driving { font-size: 16px; }
.panel { padding: 20px 20px 24px; }
.panel h1 { font-size: 24px; margin: 0 0 12px; }
.panel .actions { flex-direction: column; align-items: stretch; gap: 8px; }
.panel .actions .btn-primary { width: 100%; }
@media (min-width: 600px) { .login { padding: 48px 24px 72px; } }
`;
  }

  shell() {
    return (
      '<div class="login">' +
      '<div class="login-card">' +
      '<div class="plate"><span>Pupil login</span>' + WORDMARK + '</div>' +
      '<main class="panel" id="main"></main>' +
      '</div></div>'
    );
  }

  afterShell() {
    this.renderForm();
  }

  onSession(session) {
    if (session.loggedIn && session.role === 'none') {
      this.renderNotLinked();
    }
  }

  renderForm() {
    this.setMain(
      '<h1>Log in to see your lessons</h1>' +
      '<form id="form" novalidate>' +
      '<div id="f-email"><label for="email">Email</label>' +
      '<input id="email" name="email" type="email" autocomplete="username" inputmode="email" required></div>' +
      '<div id="f-password"><label for="password">Password</label>' +
      '<input id="password" name="password" type="password" autocomplete="current-password" required></div>' +
      '<div id="status" aria-live="polite"></div>' +
      '<div class="actions">' +
      '<button class="btn btn-primary" type="submit" id="submit">Log in</button>' +
      '<button class="btn btn-text" type="button" id="link">Email me a login link</button>' +
      '</div>' +
      '</form>' +
      '<hr class="road">' +
      '<p>Not a pupil yet? <a href="' + ENQUIRE_PATH + '">Send me an enquiry</a></p>'
    );
    this.$('#form').addEventListener('submit', (event) => {
      event.preventDefault();
      this.submitLogin();
    });
    this.$('#link').addEventListener('click', () => this.requestLink());
  }

  renderNotLinked() {
    this.setMain(
      '<h1>Nearly there</h1>' +
      '<p>You’re logged in, but I haven’t linked this login to a pupil yet. Message me and I’ll sort it.</p>' +
      '<div class="actions"><button class="btn btn-text" type="button" id="logout">Log out</button></div>'
    );
    this.$('#logout').addEventListener('click', async () => {
      await this.call('logout');
      this.renderForm();
    });
  }

  readField(id) {
    const input = this.$('#' + id);
    return { input, value: (input.value || '').trim() };
  }

  setFieldError(id, message) {
    const wrap = this.$('#f-' + id);
    const old = wrap.querySelector('.error');
    if (old) old.remove();
    wrap.classList.toggle('field-error', Boolean(message));
    if (message) {
      const p = document.createElement('p');
      p.className = 'error';
      p.textContent = message;
      wrap.appendChild(p);
    }
  }

  setStatus(html) {
    this.$('#status').innerHTML = html;
  }

  setBusy(busy) {
    this.$('#submit').disabled = busy;
    this.$('#link').disabled = busy;
  }

  validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async submitLogin() {
    const email = this.readField('email');
    const password = this.readField('password');
    this.setFieldError('email', this.validEmail(email.value) ? '' : 'That email address doesn’t look right.');
    this.setFieldError('password', password.input.value ? '' : 'Enter your password.');
    if (!this.validEmail(email.value) || !password.input.value) return;

    this.setStatus('');
    this.setBusy(true);
    const result = await this.call('login', { email: email.value, password: password.input.value });
    this.setBusy(false);
    if (!result.ok) {
      this.setStatus(this.failure(result));
      return;
    }
    if (result.data && result.data.redirected) return;
    // Logged in, but no pupil record points at this member yet.
    this.renderNotLinked();
  }

  async requestLink() {
    const email = this.readField('email');
    if (!this.validEmail(email.value)) {
      this.setFieldError('email', 'Enter your email address first and I’ll send the link there.');
      email.input.focus();
      return;
    }
    this.setFieldError('email', '');
    this.setBusy(true);
    const result = await this.call('requestLoginLink', { email: email.value });
    this.setBusy(false);
    if (!result.ok) {
      this.setStatus(this.failure(result));
      return;
    }
    this.setStatus(
      '<div class="notice" role="status">If ' + esc(email.value) +
      ' is one of my pupils, I’ve emailed a login link there. Check your spam folder if it hasn’t arrived in a few minutes.</div>'
    );
  }
}

// Guarded: Wix may load this file in more than one bundle on a page.
if (!customElements.get('kle-login')) customElements.define('kle-login', KleLogin);
