/* =========================================================================
   Sortie du travail : copie, export .txt / .srt, alerte avant de quitter
   avec des modifications non exportées.
   ========================================================================= */

import { el } from '../dom.js';
import { state, settings } from '../../app/store.js';
import { toSrt, toPlainText, toTimedText } from '../../core/transcript-format.js';
import { downloadText } from '../../infra/download.js';
import { toast, copyText } from '../feedback.js';
import { closeMenu } from '../options-menu.js';
import { updateEditBadge } from './meta-bar.js';
import { isEditing, commitEdit } from './editing.js';

const baseName = () => (state.srtFileName || state.mediaFileName || 'transcription').replace(/\.[^.]+$/, '');

/** Sélection en cours si elle existe, sinon toute la transcription. */
function copyAll() {
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && String(sel).trim().length) {
    copyText(String(sel), 'Sélection copiée');
    return;
  }
  copyText(toPlainText(state.cues), `Transcription copiée (${state.cues.length} répliques)`);
}

function exportTxt() {
  if (!state.cues.length) return toast('Aucune transcription chargée.');
  downloadText(baseName() + '.txt', toTimedText(state.cues, settings.offset));
  closeMenu();
}

function exportSrt() {
  closeMenu();
  if (!state.cues.length) return toast('Aucune transcription chargée.');
  if (isEditing()) commitEdit();
  downloadText(baseName() + '-corrige.srt', toSrt(state.cues, settings.offset));
  state.unsaved.clear();
  state.trash = [];          // le fichier exporté fait foi : plus rien à annuler
  updateEditBadge();
  toast(`${state.cues.length} répliques exportées en .srt`);
}

export function initExport() {
  el.copyAllBtn.addEventListener('click', copyAll);
  el.exportTxt.addEventListener('click', exportTxt);
  el.exportSrt.addEventListener('click', exportSrt);
  el.exportSrtBtn.addEventListener('click', exportSrt);
  el.editBadge.addEventListener('click', exportSrt);

  window.addEventListener('beforeunload', (e) => {
    if (!state.unsaved.size) return;
    e.preventDefault();
    e.returnValue = '';
  });
}
