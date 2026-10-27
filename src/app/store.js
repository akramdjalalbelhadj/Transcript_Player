/* =========================================================================
   État de l'application, partagé entre les modules d'interface.

   - `settings` : préférences, sauvegardées d'une session à l'autre.
     Toujours les modifier via setSetting() (sauvegarde + notification).
   - `state`    : données de la session en cours (répliques, sélection…).
   ========================================================================= */

import { readJSON, writeJSON } from '../infra/storage.js';
import { normalizeSettings } from '../core/settings.js';
import { emit, EVENTS } from './events.js';

const SETTINGS_KEY = 'srtreader.prefs.v1';

export const settings = normalizeSettings(readJSON(SETTINGS_KEY));

export function setSetting(key, value) {
  settings[key] = value;
  writeJSON(SETTINGS_KEY, settings);
  emit(EVENTS.SETTING_CHANGED, { key, value });
}

export const state = {
  cues: [],            // répliques, voir core/cue.js
  cueEls: [],          // <li> correspondants, même ordre que `cues`
  activeIdx: -1,       // réplique active (sous la tête de lecture)
  lastWordIdx: -1,     // dernier mot surligné dans la réplique active
  searchTerm: '',      // recherche en cours (minuscules), '' si aucune
  mediaFileName: '',
  srtFileName: '',
  editingIdx: -1,      // réplique en cours de modification
  editResume: false,   // relancer la lecture après la modification
  unsaved: new Set(),  // répliques (objets) modifiées ou supprimées depuis le dernier export .srt
  trash: [],           // répliques supprimées, pour Annuler : { cue, li, at, wasUnsaved }
};
