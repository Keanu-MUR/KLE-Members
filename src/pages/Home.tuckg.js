// Home page: the "Recent passes" hero photos come from the Media Manager
// folder "car photos" (backend/passPhotos.jsw), five at random per visit.

import { getPassPhotos } from 'backend/passPhotos';

$w.onReady(async function () {
  const photos = await getPassPhotos();
  for (let i = photos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [photos[i], photos[j]] = [photos[j], photos[i]];
  }
  for (let n = 1; n <= 5 && n <= photos.length; n++) {
    $w(`#passPhoto${n}`).src = photos[n - 1];
  }
});
