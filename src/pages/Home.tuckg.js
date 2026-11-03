// Home page: the "Recent passes" hero photos come from the Media Manager
// folder "car photos" (backend/passPhotos.jsw). The slots start with a
// random five (three on mobile) and one slot swaps every few seconds from
// the rest of the folder.

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
  const slots = [];
  for (let n = 1; n <= slotCount; n++) slots.push($w(`#passPhoto${n}`));

  // Fill the slots, then keep the rest in a queue
  const showing = photos.slice(0, slotCount);
  const queue = photos.slice(slotCount);
  slots.forEach((img, i) => { img.src = showing[i]; });

  // Not enough photos to rotate
  if (!queue.length) return;

  let last = -1;
  setInterval(async () => {
    // Pick a slot, never the same one twice in a row
    let i;
    do { i = Math.floor(Math.random() * slotCount); } while (i === last && slotCount > 1);
    last = i;

    const next = queue.shift();
    queue.push(showing[i]);
    showing[i] = next;

    await slots[i].hide('fade', { duration: 400 });
    slots[i].src = next;
    await slots[i].show('fade', { duration: 400 });
  }, 4000);
});
