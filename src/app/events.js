/* =========================================================================
   Bus d'événements : un module prévient les autres sans les importer.

   Règle : on appelle directement les modules dont on dépend (« vers le bas ») ;
   on émet un événement pour prévenir ceux qui dépendent de nous.
   ========================================================================= */

export const EVENTS = Object.freeze({
  /** { force } — la position de lecture a changé (tic de lecture, saut, pause). */
  MEDIA_TIME: 'media:time',
  /** La durée du média est connue. */
  MEDIA_METADATA: 'media:metadata',
  /** Répliques chargées, modifiées, supprimées ou restaurées. */
  CUES_CHANGED: 'cues:changed',
  /** { key, value } — une préférence a changé (voir core/settings.js). */
  SETTING_CHANGED: 'setting:changed',
});

const listeners = new Map();

/** Abonne `fn` à `type` ; renvoie la fonction de désabonnement. */
export function on(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  return () => listeners.get(type).delete(fn);
}

export function emit(type, detail = {}) {
  listeners.get(type)?.forEach((fn) => fn(detail));
}

/** Raccourci : réagir au changement d'une préférence précise. */
export function onSetting(key, fn) {
  return on(EVENTS.SETTING_CHANGED, (d) => { if (d.key === key) fn(d.value); });
}
