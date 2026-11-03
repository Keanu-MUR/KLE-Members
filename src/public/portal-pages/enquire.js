// Public enquiry page. The element posts to the HTTP function itself, then
// asks for the notifications to be sent through the web module (see
// backend/enquiry-pipeline.js for why it takes two steps). The Wix
// reCAPTCHA element (#captcha, under the form) supplies the token for that
// second step; the element hears its state through the captcha attribute.

import { mountPortal } from 'public/portal-page';

function captchaElement($w) {
  try {
    const el = $w('#captcha');
    return el && typeof el.onVerified === 'function' ? el : null;
  } catch (error) {
    return null;
  }
}

export function init($w, backend) {
  const captcha = captchaElement($w);
  const portal = $w('#portal');
  const tell = (state) => { try { portal.setAttribute('captcha', state); } catch (error) { /* element not ready */ } };
  if (captcha) {
    tell('needed');
    captcha.onVerified(() => tell('ready'));
    captcha.onTimeout(() => tell('needed'));
    captcha.onError(() => tell('error'));
  } else {
    console.error('[portal] the Enquire page has no #captcha element; enquiries will be refused');
  }
  return mountPortal($w, '#portal', {
    page: 'enquire',
    getSession: backend.getSession,
    actions: {
      notifyEnquiry: async (payload) => {
        const result = await backend.notifyEnquiry(payload.enquiryId, payload.token, captcha ? captcha.token : '');
        // Tokens are single use, so the box resets after every attempt.
        if (captcha) {
          try { captcha.reset(); } catch (error) { /* already reset */ }
          tell('needed');
        }
        return result;
      }
    }
  });
}
