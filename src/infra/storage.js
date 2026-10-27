/* =========================================================================
   Stockage local (localStorage) — silencieux si indisponible
   (navigation privée, stockage plein ou bloqué).
   ========================================================================= */

export function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch (_) { return null; }
}

export function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}
