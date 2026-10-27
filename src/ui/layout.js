/* =========================================================================
   Séparateur redimensionnable entre la colonne média et la transcription.
   ========================================================================= */

import { el } from './dom.js';
import { settings, setSetting } from '../app/store.js';
import { scrollToActive } from './transcript/autoscroll.js';

/** Applique la largeur de la colonne média (0..1) ; renvoie la valeur retenue, ou null sur petit écran. */
function applySplit(ratio) {
  if (window.innerWidth <= 900) return null;
  const split = Math.max(0.25, Math.min(0.78, ratio));
  el.workspace.style.gridTemplateColumns = `${(split * 100).toFixed(2)}% 6px 1fr`;
  return split;
}

export function initLayout() {
  if (settings.split) applySplit(settings.split);

  let dragging = false;
  let split = null;

  el.splitter.addEventListener('pointerdown', (e) => {
    dragging = true;
    split = null;
    el.splitter.classList.add('dragging');
    el.splitter.setPointerCapture(e.pointerId);
  });

  el.splitter.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const r = el.workspace.getBoundingClientRect();
    const px = Math.max(300, Math.min(e.clientX - r.left, r.width - 320));
    split = applySplit(px / r.width) ?? split;
  });

  el.splitter.addEventListener('pointerup', (e) => {
    dragging = false;
    el.splitter.classList.remove('dragging');
    try { el.splitter.releasePointerCapture(e.pointerId); } catch (_) {}
    if (split !== null) setSetting('split', split);
    scrollToActive(true);
  });
}
