// Home page.
// - "Recent passes" hero photos come from the Media Manager folder
//   "car photos" (backend/passPhotos.jsw). Each visit shows a random five
//   (three on mobile); they stay put once shown (rotation removed 5 Nov
//   2026 at the owner's request).
// - Locations: each street sign (#box10-#box16) opens its area's panel
//   (#panelSE8 etc, hidden in the Editor) when tapped; one open at a time.

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

function setupAreas() {
  AREAS.forEach((a) => {
    a.tagHtml = $w(`#more${a.pc}`).html;
    const toggle = () => toggleArea(a);
    [a.box, a.name, `#more${a.pc}`].forEach((id) => $w(id).onClick(toggle));
  });
}

function closeArea(a) {
  $w(a.box).style.backgroundColor = '#FFFFFF';
  $w(`#more${a.pc}`).html = a.tagHtml;
  $w(`#panel${a.pc}`).hide('fade', { duration: 150 });
}

function toggleArea(a) {
  const wasOpen = openArea === a;
  if (openArea) closeArea(openArea);
  openArea = null;
  if (wasOpen) return;
  openArea = a;
  $w(a.box).style.backgroundColor = '#F3C852';
  $w(`#more${a.pc}`).html = a.tagHtml.replace(/\+\d+ more/, 'Hide');
  $w(`#panel${a.pc}`).show('fade', { duration: 150 });
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
