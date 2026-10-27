/* =========================================================================
   Fenêtre d'aide (raccourcis clavier).
   ========================================================================= */

import { el } from './dom.js';

export const isHelpOpen = () => !el.helpModal.hidden;
export function openHelp() { el.helpModal.hidden = false; }
export function closeHelp() { el.helpModal.hidden = true; }

export function initHelpModal() {
  el.helpBtn.addEventListener('click', openHelp);
  el.helpClose.addEventListener('click', closeHelp);
  // clic sur le fond (hors de la carte) = fermer
  el.helpModal.addEventListener('click', (e) => { if (e.target === el.helpModal) closeHelp(); });
}
