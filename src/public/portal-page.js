// Page-code side of the bridge. Each portal page's code file calls one
// init function (see public/portal-pages/*.js), which calls mountPortal():
// it answers the element's 'portal-request' events with backend calls and
// does the role routing before handing the session to the element.

import wixLocation from 'wix-location';
import wixWindow from 'wix-window-frontend';
import { authentication } from 'wix-members-frontend';
import { PORTAL_PATHS, ROLES } from 'public/portal-constants';

const HOME_BY_ROLE = {};
HOME_BY_ROLE[ROLES.INSTRUCTOR] = PORTAL_PATHS.instructorHome;
HOME_BY_ROLE[ROLES.PUPIL] = PORTAL_PATHS.pupilHome;
HOME_BY_ROLE[ROLES.GUARDIAN] = PORTAL_PATHS.pupilHome;

// Which roles may open each page. The backend re-checks on every call, so
// this is routing, not security.
const PAGE_ROLES = {
  login: null,
  enquire: null,
  home: [ROLES.PUPIL, ROLES.GUARDIAN],
  'my-details': [ROLES.PUPIL, ROLES.GUARDIAN],
  instructor: [ROLES.INSTRUCTOR],
  enquiries: [ROLES.INSTRUCTOR],
  pupils: [ROLES.INSTRUCTOR],
  'pupil-record': [ROLES.INSTRUCTOR]
};

// Pages anyone may open; they still receive the session for the nav.
const PUBLIC_PAGES = ['login', 'enquire'];

const LOGGED_OUT = { loggedIn: false, role: ROLES.NONE, pupilId: null, firstName: '', pupilName: null };

export async function mountPortal($w, selector, config) {
  const element = $w(selector);
  const actions = Object.assign(builtInActions(config, () => route(element, config)), config.actions || {});

  // The element re-sends its first request if no reply has arrived after a
  // moment (see call() in portal-base.js). When both copies get through,
  // the second must not run the action again: a slow email send would
  // otherwise be answered by its own duplicate's failure.
  const seen = new Set();
  element.on('portal-request', async (event) => {
    const detail = (event && event.detail) || {};
    if (detail.id) {
      if (seen.has(detail.id)) return;
      seen.add(detail.id);
    }
    let result;
    const handler = actions[detail.action];
    if (!handler) {
      result = { ok: false, error: 'That action is not available on this page.' };
    } else {
      try {
        result = await handler(detail.payload || {});
      } catch (error) {
        console.error('[portal] action failed', detail.action, error);
        result = { ok: false, error: 'Something went wrong on my side. Try again in a moment.' };
      }
    }
    element.setAttribute('response', JSON.stringify(Object.assign({ id: detail.id }, result)));
  });

  // Wix renders page code on the server first and may cache that response
  // for the URL. A member-specific redirect made there would be served to
  // the next visitor, so routing only ever runs in the browser.
  if (wixWindow.rendering.env !== 'browser') return;
  element.setAttribute('params', JSON.stringify(wixLocation.query || {}));
  await route(element, config);
}

async function readSession(config) {
  try {
    const result = await config.getSession();
    if (result && result.ok) return result.data;
    // Surfaced in the browser console so a backend failure is visible
    // during testing instead of looking like a logged-out visitor.
    console.warn('[portal] getSession returned', result && result.error);
    return LOGGED_OUT;
  } catch (error) {
    console.warn('[portal] getSession failed', error && error.message ? error.message : error);
    return LOGGED_OUT;
  }
}

// Returns true when the visitor stays on this page.
async function route(element, config) {
  const session = await readSession(config);
  const home = HOME_BY_ROLE[session.role];

  if (config.page === 'login') {
    if (session.loggedIn && home) {
      wixLocation.to(home);
      return false;
    }
  } else if (!PUBLIC_PAGES.includes(config.page)) {
    if (!session.loggedIn) {
      wixLocation.to(PORTAL_PATHS.login);
      return false;
    }
    const allowed = PAGE_ROLES[config.page] || [];
    if (!allowed.includes(session.role)) {
      wixLocation.to(home || PORTAL_PATHS.login);
      return false;
    }
  }
  element.setAttribute('session', JSON.stringify(session));
  return true;
}

function builtInActions(config, reroute) {
  return {
    getSession: () => config.getSession(),

    login: async (payload) => {
      try {
        await authentication.login(String(payload.email || ''), String(payload.password || ''));
      } catch (error) {
        return { ok: false, error: 'That email and password don’t match.' };
      }
      const stayed = await reroute();
      return { ok: true, data: { redirected: !stayed } };
    },

    logout: async () => {
      await authentication.logout();
      return { ok: true, data: null };
    }
  };
}
