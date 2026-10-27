/* =========================================================================
   Vitesse de lecture : curseur, boutons −/+, saisie directe, 100 %.
   ========================================================================= */

import { el } from './dom.js';
import { settings, setSetting } from '../app/store.js';
import { RATE_MIN, RATE_MAX, clampRate, nextRate, parseRate } from '../core/playback-rate.js';
import { toast } from './feedback.js';

const ratePct = () => Math.round(el.player.playbackRate * 100);

/** Applique une vitesse en %, bornée à [25, 400]. Renvoie la valeur retenue. */
function applyRate(pct) {
  pct = clampRate(pct);
  // defaultPlaybackRate : la vitesse survit au chargement d'un nouveau média
  el.player.defaultPlaybackRate = pct / 100;
  el.player.playbackRate = pct / 100;
  updateRateUi();
  return pct;
}

function setRate(pct, notify) {
  const v = applyRate(pct);
  if (notify) toast(`Vitesse ${v} %`, 900);
  setSetting('rate', v / 100);
}

/** ±5 % (dir = 1 ou -1). */
export function stepRate(dir, notify) {
  setRate(nextRate(ratePct(), dir), notify);
}

function updateRateUi() {
  const p = ratePct();
  el.rateRange.value = p;
  if (document.activeElement !== el.rateInput) el.rateInput.value = p;
  el.rateReset.classList.toggle('at-default', p === 100);
}

function commitRateInput() {
  const field = el.rateInput.closest('.speed-field');
  const v = parseRate(el.rateInput.value);
  if (isNaN(v)) {
    field.classList.add('invalid');
    toast(`Valeur invalide : entre ${RATE_MIN} et ${RATE_MAX} %`, 2200);
    el.rateInput.value = ratePct();
    return;
  }
  field.classList.remove('invalid');
  if (v > RATE_MAX) toast(`Maximum ${RATE_MAX} %`, 1600);
  else if (v < RATE_MIN) toast(`Minimum ${RATE_MIN} %`, 1600);
  setRate(v);
  el.rateInput.value = ratePct();
}

export function initSpeedControl() {
  applyRate(settings.rate * 100);

  el.player.addEventListener('ratechange', updateRateUi);

  el.rateRange.addEventListener('input', () => setRate(parseFloat(el.rateRange.value)));
  el.rateRange.addEventListener('dblclick', () => setRate(100));
  el.rateDown.addEventListener('click', () => stepRate(-1));
  el.rateUp.addEventListener('click', () => stepRate(1));
  el.rateReset.addEventListener('click', () => setRate(100));

  el.rateInput.addEventListener('focus', () => el.rateInput.select());
  el.rateInput.addEventListener('input', () => el.rateInput.closest('.speed-field').classList.remove('invalid'));
  el.rateInput.addEventListener('blur', commitRateInput);
  el.rateInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitRateInput(); el.rateInput.select(); }
    else if (e.key === 'Escape') { el.rateInput.value = ratePct(); el.rateInput.blur(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      stepRate(e.key === 'ArrowUp' ? 1 : -1);
      el.rateInput.value = ratePct();
      el.rateInput.select();
    }
  });
}
