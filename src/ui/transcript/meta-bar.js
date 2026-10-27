/* =========================================================================
   Bandeau d'infos de la transcription : nombre de répliques et de mots,
   durée, badge des modifications non exportées.
   ========================================================================= */

import { el } from '../dom.js';
import { state } from '../../app/store.js';
import { on, EVENTS } from '../../app/events.js';
import { fmtTime } from '../../core/time.js';

function updateMeta() {
  const words = state.cues.reduce((n, c) => n + c.words.length, 0);
  const last = state.cues[state.cues.length - 1];
  el.cueCount.textContent = `${state.cues.length} répliques`;
  el.wordCount.textContent = `${words.toLocaleString('fr-FR')} mots`;
  el.srtDur.textContent = last ? `jusqu'à ${fmtTime(last.end)}` : '—';
  el.scriptMeta.hidden = state.cues.length === 0;
}

export function updateEditBadge() {
  const n = state.unsaved.size;
  el.editBadge.hidden = n === 0;
  el.editBadge.textContent = n === 1 ? '1 modification · exporter en .srt' : `${n} modifications · exporter en .srt`;
}

export function initMetaBar() {
  on(EVENTS.CUES_CHANGED, () => { updateMeta(); updateEditBadge(); });
}
