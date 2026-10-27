/* =========================================================================
   Navigation de réplique en réplique et boucle sur la réplique active.
   ========================================================================= */

import { el } from '../dom.js';
import { state, settings, setSetting } from '../../app/store.js';
import { seek, currentTime } from '../player.js';
import { toast } from '../feedback.js';
import { resumeFollow } from './autoscroll.js';

/** Se place au début de la réplique `i` ; `resume` : relance aussi le suivi automatique. */
export function seekToCue(i, resume) {
  const cue = state.cues[i];
  if (!cue) return;
  if (resume) resumeFollow();
  seek(cue.start + settings.offset + 0.001);
}

export function jumpCue(delta) {
  if (!state.cues.length) return;
  let i = state.activeIdx;
  if (delta < 0) {
    // si on est au tout début de la réplique, on remonte vraiment à la précédente
    const cur = state.cues[i];
    const t = currentTime() - settings.offset;
    i = (cur && t - cur.start > 1) ? i : i - 1;
  } else {
    i = i + 1;
  }
  i = Math.max(0, Math.min(i, state.cues.length - 1));
  seekToCue(i, true);
}

export function replayCue() {
  if (state.activeIdx >= 0) seekToCue(state.activeIdx, true);
}

const applyLoopUi = () => el.loopBtn.setAttribute('aria-pressed', String(settings.loop));

export function toggleLoop() {
  setSetting('loop', !settings.loop);
  applyLoopUi();
  toast(settings.loop ? 'Boucle sur la réplique active' : 'Boucle désactivée');
}

export function initNavigation() {
  applyLoopUi();
  el.prevCue.addEventListener('click', () => jumpCue(-1));
  el.nextCue.addEventListener('click', () => jumpCue(1));
  el.loopBtn.addEventListener('click', toggleLoop);
}
