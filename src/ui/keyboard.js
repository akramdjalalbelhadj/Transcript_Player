/* =========================================================================
   Raccourcis clavier (liste affichée dans la fenêtre d'aide de index.html).
   ========================================================================= */

import { state } from '../app/store.js';
import { copyText } from './feedback.js';
import { togglePlay, seekBy, toggleListen, toggleMute, toggleFullscreen } from './player.js';
import { stepRate } from './speed-control.js';
import { isHelpOpen, openHelp, closeHelp } from './help-modal.js';
import { jumpCue, replayCue, toggleLoop } from './transcript/navigation.js';
import { toggleFollow } from './transcript/autoscroll.js';
import { startEdit } from './transcript/editing.js';
import { deleteCue, undoDelete, canUndoDelete } from './transcript/deletion.js';
import { focusSearch } from './transcript/search.js';

const hasActiveCue = () => state.activeIdx >= 0;

/** Touche (minuscule pour les lettres) → action. `prevent` : bloquer l'effet par défaut du navigateur. */
const SHORTCUTS = {
  ' ':          { run: togglePlay, prevent: true },
  'k':          { run: togglePlay, prevent: true },
  'ArrowRight': { run: () => seekBy(5), prevent: true },
  'ArrowLeft':  { run: () => seekBy(-5), prevent: true },
  'l':          { run: () => seekBy(10) },
  'j':          { run: () => seekBy(-10) },
  '.':          { run: () => jumpCue(1) },
  '>':          { run: () => jumpCue(1) },
  ',':          { run: () => jumpCue(-1) },
  '<':          { run: () => jumpCue(-1) },
  'r':          { run: replayCue },
  'b':          { run: toggleLoop },
  'c':          { run: () => copyText(state.cues[state.activeIdx].text, 'Réplique copiée'), when: hasActiveCue },
  // prevent : sinon le « e » est tapé dans la zone qui vient de s'ouvrir
  'e':          { run: () => startEdit(state.activeIdx), when: hasActiveCue, prevent: true },
  'Delete':     { run: () => deleteCue(state.activeIdx), when: hasActiveCue, prevent: true },
  's':          { run: toggleFollow },
  'v':          { run: toggleListen },
  'm':          { run: toggleMute },
  'f':          { run: toggleFullscreen },
  'ArrowUp':    { run: () => stepRate(1, true), prevent: true },
  'ArrowDown':  { run: () => stepRate(-1, true), prevent: true },
  '?':          { run: openHelp },
};

function isTyping(t) {
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

function onKeyDown(e) {
  const mod = e.ctrlKey || e.metaKey;
  // Recherche : Ctrl/Cmd + F ou Ctrl/Cmd + K
  if (mod && (e.key === 'f' || e.key === 'k')) {
    e.preventDefault();
    focusSearch();
    return;
  }
  if (e.key === 'Escape' && isHelpOpen()) { closeHelp(); return; }
  if (isTyping(e.target)) return;
  // Ctrl/Cmd + Z : annuler la dernière suppression (hors saisie : là, Ctrl+Z reste celui du navigateur)
  if (mod && !e.shiftKey && (e.key === 'z' || e.key === 'Z') && canUndoDelete()) {
    e.preventDefault();
    undoDelete();
    return;
  }
  if (mod || e.altKey) return;

  const sc = SHORTCUTS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (!sc || (sc.when && !sc.when())) return;
  if (sc.prevent) e.preventDefault();
  sc.run();
}

export function initKeyboard() {
  document.addEventListener('keydown', onKeyDown);
}
