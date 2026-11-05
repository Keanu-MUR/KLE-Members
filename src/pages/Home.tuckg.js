// Home page.
// - "Recent passes" hero photos come from the Media Manager folder
//   "car photos" (backend/passPhotos.jsw). Each visit shows a random five
//   (three on mobile); they stay put once shown (rotation removed 5 Nov
//   2026 at the owner's request).
// - Locations: each street sign (#box10-#box16) opens its area's panel
//   (#panelSE8 etc) when tapped; one open at a time. The panels are set to
//   Collapsed by default in the Editor and expand inline, pushing the page
//   down rather than sitting over it.

import { getPassPhotos } from 'backend/passPhotos';
import wixWindowFrontend from 'wix-window-frontend';

const AREAS = [
  { pc: 'SE8', box: '#box10', name: '#text45' },
  { pc: 'SE14', box: '#box11', name: '#text46' },
  { pc: 'SE15', box: '#box12', name: '#text47' },
  { pc: 'SE16', box: '#box13', name: '#text48' },
  { pc: 'SE10', box: '#box14', name: '#text49' },
  { pc: 'SE4', box: '#box15', name: '#text50' },
  { pc: 'SE1', box: '#box16', name: '#text51' }
];
let openArea = null;
// The name and "+N more" texts sit inside the sign's box, so one tap on
// them fires their click and the box's. Clicks this close together count
// as one tap, or the panel would open and close again at once.
let lastToggleAt = 0;
const TAP_MS = 300;

function setupAreas() {
  AREAS.forEach((a) => {
    a.tagHtml = $w(`#more${a.pc}`).html;
    const toggle = () => {
      const now = Date.now();
      if (now - lastToggleAt < TAP_MS) return;
      lastToggleAt = now;
      toggleArea(a);
    };
    [a.box, a.name, `#more${a.pc}`].forEach((id) => $w(id).onClick(toggle));
  });
}

function closeArea(a) {
  $w(a.box).style.backgroundColor = '#FFFFFF';
  $w(`#more${a.pc}`).html = a.tagHtml;
  $w(`#panel${a.pc}`).collapse();
}

function toggleArea(a) {
  const wasOpen = openArea === a;
  if (openArea) closeArea(openArea);
  openArea = null;
  if (wasOpen) return;
  openArea = a;
  $w(a.box).style.backgroundColor = '#F3C852';
  $w(`#more${a.pc}`).html = a.tagHtml.replace(/\+\d+ more/, 'Hide');
  $w(`#panel${a.pc}`).expand();
}

$w.onReady(async function () {
  if (wixWindowFrontend.rendering.env !== 'browser') return;
  setupAreas();

  const photos = await getPassPhotos();
  if (!photos.length) return;

  // Shuffle
  for (let i = photos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [photos[i], photos[j]] = [photos[j], photos[i]];
  }

  // Mobile only shows the first three slots
  const isMobile = wixWindowFrontend.formFactor === 'Mobile';
  const slotCount = Math.min(isMobile ? 3 : 5, photos.length);
  for (let n = 1; n <= slotCount; n++) {
    $w(`#passPhoto${n}`).src = photos[n - 1];
  }
});
