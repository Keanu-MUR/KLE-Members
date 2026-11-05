// Home page: the "Recent passes" hero photos come from the Media Manager
// folder "car photos" (backend/passPhotos.jsw). Each visit shows a random
// five (three on mobile); they stay put once shown (rotation removed
// 5 Nov 2026 at the owner's request).

import { getPassPhotos } from 'backend/passPhotos';
import wixWindowFrontend from 'wix-window-frontend';

$w.onReady(async function () {
  if (wixWindowFrontend.rendering.env !== 'browser') return;

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
