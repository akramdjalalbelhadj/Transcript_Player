/* =========================================================================
   Barre de progression : position, durée, répliques matérialisées, saut
   au clic / glisser.
   ========================================================================= */

import { el } from './dom.js';
import { state, settings } from '../app/store.js';
import { on, onSetting, EVENTS } from '../app/events.js';
import { fmtTime } from '../core/time.js';
import { seek, currentTime, duration } from './player.js';

function updateProgress() {
  const d = duration();
  const t = currentTime();
  const pct = isFinite(d) && d > 0 ? (t / d) * 100 : 0;
  el.tlPlayed.style.width = pct + '%';
  el.tlKnob.style.left = pct + '%';
  el.curTime.textContent = fmtTime(t);
  el.timeline.setAttribute('aria-valuenow', Math.round(pct));
}

function buildMarkers() {
  el.tlCues.textContent = '';
  const d = duration();
  if (!isFinite(d) || d <= 0 || !state.cues.length) return;
  const frag = document.createDocumentFragment();
  for (const c of state.cues) {
    const i = document.createElement('i');
    const left = ((c.start + settings.offset) / d) * 100;
    const w = Math.max(0.12, ((c.end - c.start) / d) * 100);
    if (left > 100 || left < 0) continue;
    i.style.left = left + '%';
    i.style.width = w + '%';
    frag.appendChild(i);
  }
  el.tlCues.appendChild(frag);
}

/** Position horizontale du pointeur sur la piste, entre 0 et 1. */
function trackRatio(clientX) {
  const r = el.timeline.querySelector('.tl-track').getBoundingClientRect();
  return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
}

export function initTimeline() {
  let dragging = false;

  el.timeline.addEventListener('pointerdown', (e) => {
    if (!isFinite(duration())) return;
    dragging = true;
    el.timeline.classList.add('dragging');
    el.timeline.setPointerCapture(e.pointerId);
    seek(trackRatio(e.clientX) * duration());
  });

  el.timeline.addEventListener('pointermove', (e) => {
    const d = duration();
    if (!isFinite(d)) return;
    const p = trackRatio(e.clientX);
    el.tlTooltip.textContent = fmtTime(p * d);
    el.tlTooltip.style.left = (p * 100) + '%';
    if (dragging) seek(p * d);
  });

  el.timeline.addEventListener('pointerup', (e) => {
    dragging = false;
    el.timeline.classList.remove('dragging');
    try { el.timeline.releasePointerCapture(e.pointerId); } catch (_) {}
  });
  // ← / → sur la barre : gérés par les raccourcis globaux (ui/keyboard.js)

  on(EVENTS.MEDIA_TIME, updateProgress);
  on(EVENTS.MEDIA_METADATA, () => {
    el.durTime.textContent = fmtTime(duration());
    buildMarkers();
  });
  on(EVENTS.CUES_CHANGED, buildMarkers);
  onSetting('offset', buildMarkers);

  updateProgress();
}
