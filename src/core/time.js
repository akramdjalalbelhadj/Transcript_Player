/* =========================================================================
   Temps : affichage (00:00, 1:02:03) et horodatages de sous-titres.
   ========================================================================= */

const pad = (n, w = 2) => String(n).padStart(w, '0');

/** 75.5 → « 01:15 » ; avec `withMs` → « 01:15,500 ». Heures affichées seulement si besoin. */
export function fmtTime(sec, withMs) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  let out = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  if (withMs) out += ',' + pad(Math.floor((sec % 1) * 1000), 3);
  return out;
}

/** 75.5 → « 00:01:15,500 » (format d'horodatage SRT). */
export function srtTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

const TS = /(\d{1,3}):(\d{1,2}):(\d{1,2})[.,](\d{1,3})|(\d{1,3}):(\d{1,2})[.,](\d{1,3})/;

/** « 00:01:15,500 », « 00:01:15.5 » ou « 01:15.500 » → 75.5 ; null si illisible. */
export function parseTimestamp(str) {
  const m = str.match(TS);
  if (!m) return null;
  if (m[1] !== undefined) {
    return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4].padEnd(3, '0')) / 1000;
  }
  return (+m[5]) * 60 + (+m[6]) + (+m[7].padEnd(3, '0')) / 1000;
}
