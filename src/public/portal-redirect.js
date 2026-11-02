// The old one-section pages send visitors to the one-page portal, keeping
// the query (a lesson or pupil id) as the section's parameters:
// /lessons?id=abc -> /instructor#lessons?id=abc

import wixLocation from 'wix-location';
import wixWindow from 'wix-window-frontend';

export function redirectToPortal(page, section) {
  // Only in the browser: the server render may be cached for the URL.
  if (wixWindow.rendering.env !== 'browser') return;
  const query = wixLocation.query || {};
  const pairs = Object.keys(query).map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(query[k]));
  wixLocation.to(page + '#' + section + (pairs.length ? '?' + pairs.join('&') : ''));
}
