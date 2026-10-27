/* =========================================================================
   Vitesse de lecture, exprimée en % (100 = vitesse normale).
   ========================================================================= */

export const RATE_MIN = 25, RATE_MAX = 400, RATE_STEP = 5;

/** Borne à [25, 400] et arrondit à l'entier. */
export const clampRate = (pct) => Math.round(Math.max(RATE_MIN, Math.min(RATE_MAX, pct)));

/** ±5 %, en s'alignant sur le multiple de 5 suivant (133 % → 135 % / 130 %). Non borné. */
export function nextRate(pct, dir) {
  return dir > 0
    ? Math.floor(pct / RATE_STEP) * RATE_STEP + RATE_STEP
    : Math.ceil(pct / RATE_STEP) * RATE_STEP - RATE_STEP;
}

/** « 150 », « 150 % », « 1,5x » ou « 1.5× » → 150. NaN si illisible. */
export function parseRate(str) {
  const s = str.replace(/\s+/g, '').replace(',', '.');
  let m = s.match(/^(\d+(?:\.\d+)?)[x×]$/i);
  if (m) return parseFloat(m[1]) * 100;
  m = s.match(/^(\d+(?:\.\d+)?)%?$/);
  return m ? parseFloat(m[1]) : NaN;
}
