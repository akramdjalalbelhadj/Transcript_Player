/* =========================================================================
   Correction du texte d'une réplique, directement dans la liste.
   ========================================================================= */

import { state } from '../../app/store.js';
import { emit, EVENTS } from '../../app/events.js';
import { applyCueText, cueSourceText } from '../../core/cue.js';
import { isPaused, pause, play } from '../player.js';
import { toast } from '../feedback.js';
import { paintCueText } from './cue-list.js';
import { sync } from './sync.js';

export const isEditing = () => state.editingIdx !== -1;

function autoGrow(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

export function startEdit(i) {
  const cue = state.cues[i];
  const li = state.cueEls[i];
  if (!cue || !li) return;
  if (state.editingIdx === i) { li.querySelector('.cue-editor').focus(); return; }
  if (isEditing()) commitEdit();   // une seule réplique à la fois

  state.editingIdx = i;
  state.editResume = !isPaused();
  pause();
  window.getSelection()?.removeAllRanges();

  const box = li.querySelector('.cue-text');
  box.textContent = '';

  const ta = document.createElement('textarea');
  ta.className = 'cue-editor';
  ta.rows = 1;
  ta.spellcheck = true;
  ta.setAttribute('aria-label', 'Texte de la réplique');
  // le nom de l'intervenant reste modifiable, sous la même forme que dans le .srt
  ta.value = cueSourceText(cue);

  const hint = document.createElement('span');
  hint.className = 'cue-edit-hint';
  hint.innerHTML = '<kbd>Entrée</kbd> valider · <kbd>Maj</kbd>+<kbd>Entrée</kbd> nouvelle ligne · <kbd>Échap</kbd> annuler';

  box.append(ta, hint);
  li.classList.add('editing');

  ta.addEventListener('input', () => autoGrow(ta));
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  });
  // clic ailleurs = on valide
  ta.addEventListener('blur', () => { if (state.editingIdx === i) commitEdit(); });

  autoGrow(ta);
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
}

function closeEditor(changed) {
  const i = state.editingIdx;
  state.editingIdx = -1;               // avant de retirer la zone (le blur ne doit rien refaire)
  const cue = state.cues[i];
  const li = state.cueEls[i];
  li.classList.remove('editing');
  li.classList.toggle('edited', !!cue.edited);
  paintCueText(cue, li.querySelector('.cue-text'));
  state.lastWordIdx = -1;
  sync(false);
  if (changed) {
    emit(EVENTS.CUES_CHANGED);
    toast('Réplique modifiée');
  }
  if (state.editResume) play().catch(() => {});
}

export function cancelEdit() {
  if (isEditing()) closeEditor(false);
}

export function commitEdit() {
  if (!isEditing()) return;
  const cue = state.cues[state.editingIdx];
  const ta = state.cueEls[state.editingIdx].querySelector('.cue-editor');

  const result = applyCueText(cue, ta.value);
  if (result === 'empty') {
    toast('Une réplique ne peut pas être vide — modification annulée.', 2800);
    closeEditor(false);
    return;
  }
  if (result === 'changed') state.unsaved.add(cue);
  closeEditor(result === 'changed');
}
