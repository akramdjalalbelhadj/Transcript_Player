/* =========================================================================
   Suppression d'une réplique parasite (bruit, voix de passage…),
   annulable : bouton du toast ou Ctrl+Z.
   ========================================================================= */

import { el } from '../dom.js';
import { state } from '../../app/store.js';
import { emit, EVENTS } from '../../app/events.js';
import { toast } from '../feedback.js';
import { refreshCueElement } from './cue-list.js';
import { sync, resetActive } from './sync.js';
import { isEditing, commitEdit } from './editing.js';

export const canUndoDelete = () => state.trash.length > 0;

export function deleteCue(i) {
  const cue = state.cues[i];
  if (!cue) return;
  if (isEditing()) commitEdit();

  const li = state.cueEls[i];
  state.trash.push({ cue, li, at: i, wasUnsaved: state.unsaved.has(cue) });
  state.cues.splice(i, 1);
  state.cueEls.splice(i, 1);
  li.remove();
  state.unsaved.add(cue);
  reindexFrom(i);
  afterCuesChanged();
  toast('Réplique supprimée', 5000, { label: 'Annuler', run: undoDelete });
}

export function undoDelete() {
  const t = state.trash.pop();
  if (!t) return;
  if (isEditing()) commitEdit();

  const at = Math.min(t.at, state.cues.length);
  state.cues.splice(at, 0, t.cue);
  state.cueEls.splice(at, 0, t.li);
  el.cues.insertBefore(t.li, state.cueEls[at + 1] || null);
  if (!t.wasUnsaved) state.unsaved.delete(t.cue);
  refreshCueElement(t.li, t.cue);

  reindexFrom(at);
  afterCuesChanged();
  toast('Réplique restaurée');
}

function reindexFrom(k) {
  for (; k < state.cues.length; k++) {
    state.cues[k].index = k;
    state.cueEls[k].dataset.i = k;
  }
}

function afterCuesChanged() {
  resetActive();   // force le recalcul de la réplique active
  sync(false);
  emit(EVENTS.CUES_CHANGED);
}
