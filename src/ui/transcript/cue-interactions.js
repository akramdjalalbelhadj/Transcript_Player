/* =========================================================================
   Souris sur la liste : clic = aller à la réplique, double-clic = modifier,
   boutons d'action (modifier, copier, supprimer).
   ========================================================================= */

import { el } from '../dom.js';
import { state } from '../../app/store.js';
import { on, EVENTS } from '../../app/events.js';
import { copyText } from '../feedback.js';
import { startEdit } from './editing.js';
import { deleteCue } from './deletion.js';
import { seekToCue } from './navigation.js';

// réplique visée par le 1er clic d'un double-clic : le saut peut faire défiler la liste
// entre les deux clics, le 2e clic tomberait alors sur une autre réplique
let clickedIdx = -1;

function onClick(e) {
  const li = e.target.closest('.cue');
  if (!li || li.classList.contains('editing')) return;
  const i = +li.dataset.i;

  // bouton supprimer (un double-clic ne doit pas emporter la réplique suivante)
  if (e.target.closest('.cue-delete')) { if (e.detail <= 1) deleteCue(i); return; }

  // bouton modifier
  if (e.target.closest('.cue-edit')) { startEdit(i); return; }

  // bouton copier
  const cp = e.target.closest('.cue-copy');
  if (cp) {
    copyText(state.cues[i].text, 'Réplique copiée');
    cp.classList.add('done');
    setTimeout(() => cp.classList.remove('done'), 900);
    return;
  }

  // 2e clic d'un double-clic : c'est le double-clic qui décide (modifier)
  if (e.detail > 1) return;
  clickedIdx = i;

  // horodatage : toujours un saut
  if (e.target.closest('.cue-time')) { seekToCue(i, true); return; }

  // clic sur le texte : saut seulement s'il n'y a pas de sélection en cours
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && String(sel).trim().length) return;
  seekToCue(i, true);
}

// double-clic sur le texte = modifier la réplique
function onDoubleClick(e) {
  const li = e.target.closest('.cue');
  if (!li || li.classList.contains('editing')) return;
  if (e.target.closest('.cue-actions, .cue-time')) return;
  startEdit(clickedIdx !== -1 ? clickedIdx : +li.dataset.i);
}

export function initCueInteractions() {
  el.cues.addEventListener('click', onClick);
  el.cues.addEventListener('dblclick', onDoubleClick);
  // les indices ont pu bouger : le 1er clic mémorisé ne vaut plus rien
  on(EVENTS.CUES_CHANGED, () => { clickedIdx = -1; });
}
