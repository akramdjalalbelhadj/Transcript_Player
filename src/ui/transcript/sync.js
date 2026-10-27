/* =========================================================================
   Synchronisation transcription ↔ lecture : réplique active, mot en cours,
   sous-titre incrusté, boucle sur la réplique.
   ========================================================================= */

import { el } from '../dom.js';
import { state, settings } from '../../app/store.js';
import { on, onSetting, EVENTS } from '../../app/events.js';
import { findCueAt, wordIndexAt } from '../../core/cue.js';
import { currentTime, isPaused, hasVideo, setCurrentTime } from '../player.js';
import { scrollToActive } from './autoscroll.js';

/** Oublie la réplique active : le prochain sync() la recalcule entièrement. */
export function resetActive() {
  state.activeIdx = -1;
  state.lastWordIdx = -1;
}

/** Met la transcription à l'heure du lecteur. `force` : tout repeindre et recentrer. */
export function sync(force) {
  if (!state.cues.length) { updateOverlay(null); return; }

  const t = currentTime() - settings.offset;
  let idx = findCueAt(state.cues, t);
  if (idx === -1) idx = 0;                       // avant la 1re réplique
  const cue = state.cues[idx];
  const speaking = t >= cue.start && t < cue.end;

  if (idx !== state.activeIdx || force) {
    const prev = state.cueEls[state.activeIdx];
    if (prev) { prev.classList.remove('active'); prev.classList.add('past'); }

    state.activeIdx = idx;
    const cur = state.cueEls[idx];
    if (cur) { cur.classList.add('active'); cur.classList.remove('past'); }

    // répliques voisines : gardées lisibles en mode « estompé »
    state.cueEls.forEach((n, i) => {
      n.classList.toggle('near', Math.abs(i - idx) <= 1);
      if (i > idx) n.classList.remove('past');
      else if (i < idx) n.classList.add('past');
    });

    state.lastWordIdx = -1;
    scrollToActive(force === true);
  }

  if (settings.words && !state.searchTerm) paintWords(cue, t);
  updateOverlay(speaking ? cue : null);

  // Boucle sur la réplique active
  const now = currentTime();
  const end = cue.end + settings.offset;
  if (settings.loop && !speaking && now > end - 0.05 && now < end + 1.2 && !isPaused()) {
    setCurrentTime(cue.start + settings.offset + 0.01);
  }
}

function paintWords(cue, t) {
  const li = state.cueEls[cue.index];
  if (!li) return;
  const spans = li.querySelectorAll('.w');
  if (!spans.length) return;

  const wIdx = wordIndexAt(cue, t);
  if (wIdx === state.lastWordIdx) return;
  state.lastWordIdx = wIdx;

  spans.forEach((s, i) => {
    s.className = 'w ' + (i < wIdx ? 'said' : i === wIdx ? 'now' : 'todo');
  });
}

function updateOverlay(cue) {
  if (!settings.overlay || !hasVideo() || !cue) {
    el.overlayCue.hidden = true;
    return;
  }
  el.overlayCue.hidden = false;
  el.overlayCue.textContent = cue.lines.join(' ');
}

export function initSync() {
  on(EVENTS.MEDIA_TIME, ({ force }) => sync(force));
  onSetting('overlay', () => sync(true));
}
