// The old one-section pages send visitors to the one-page portal, keeping
// the query (a lesson or pupil id) as the section's parameters:
// /lessons?id=abc -> /instructor?s=lessons&id=abc (wixLocation.to() drops a
// hash, so the section travels as ?s= and the shell folds it into the hash)

import wixLocation from 'wix-location';
import wixWindow from 'wix-window-frontend';

export function redirectToPortal(page, section) {
  // Only in the browser: the server render may be cached for the URL.
  if (wixWindow.rendering.env !== 'browser') return;
  const query = wixLocation.query || {};
  const pairs = ['s=' + encodeURIComponent(section)].concat(
    Object.keys(query).filter((k) => k !== 's').map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(query[k]))
  );
  wixLocation.to(page + '?' + pairs.join('&'));
}
