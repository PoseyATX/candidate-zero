/**
 * CANDIDATE ZERO — 3D boot.
 *
 * Wait for the display faces before the first card is painted (a CanvasTexture
 * baked with a fallback font never repaints itself), then hand off to the
 * client. Everything after this line is the table.
 */

import './hud.css';
import { Client } from './client.js';

function boot(): void {
  const stageHost = document.getElementById('stage');
  const hudHost = document.getElementById('hud');
  if (!stageHost || !hudHost) throw new Error('#stage / #hud missing');

  const client = new Client(stageHost, hudHost);
  void client.title();

  const version = document.getElementById('build-tag');
  if (version) version.textContent = `alpha · v${__APP_VERSION__}`;
}

/**
 * Wait for the display faces, but never on the network's terms.
 *
 * Card faces are baked into canvas textures once, so a face that is not loaded
 * when the first card is painted stays wrong for the life of that card — hence
 * the wait. But a stalled font CDN must not hold the whole game behind a black
 * screen, so the wait is capped and boot proceeds with the fallback stack.
 */
const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
let booted = false;
const bootOnce = (): void => {
  if (booted) return;
  booted = true;
  boot();
};

if (fonts?.ready) {
  fonts.ready.then(bootOnce).catch(bootOnce);
  window.setTimeout(bootOnce, 1500);
} else {
  bootOnce();
}
