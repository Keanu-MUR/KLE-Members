// Page-code side of the bridge. Each portal page's code file calls one
// init function (see public/portal-pages/*.js), which calls mountPortal():
// it answers the element's 'portal-request' events with backend calls and
// does the role routing before handing the session to the element.

import wixLocation from 'wix-location';
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
  home: [ROLES.PUPIL, ROLES.GUARDIAN],
  instructor: [ROLES.INSTRUCTOR]
};

const LOGGED_OUT = { loggedIn: false, role: ROLES.NONE, pupilId: null, firstName: '', pupilName: null };

export async function mountPortal($w, selector, config) {
  const element = $w(selector);
  const actions = Object.assign(builtInActions(config, () => route(element, config)), config.actions || {});

  element.on('portal-request', async (event) => {
    const detail = (event && event.detail) || {};
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

  await route(element, config);
}

async function readSession(config) {
  try {
    const result = await config.getSession();
    return result && result.ok ? result.data : LOGGED_OUT;
  } catch (error) {
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
  } else {
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
