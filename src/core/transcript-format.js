/* =========================================================================
   Sérialisation de la transcription : .srt, texte brut, texte horodaté.
   `offset` : décalage de synchro (s) appliqué aux horodatages exportés.
   ========================================================================= */

import { fmtTime, srtTime } from './time.js';
import { cueSourceText } from './cue.js';

/** Fichier .srt complet, répliques renumérotées à partir de 1. */
export function toSrt(cues, offset = 0) {
  return cues.map((c, i) => {
    const s = Math.max(0, c.start + offset);
    const e = Math.max(0, c.end + offset);
    return `${i + 1}\n${srtTime(s)} --> ${srtTime(e)}\n${cueSourceText(c)}\n`;
  }).join('\n');
}

/** Texte seul, avec le nom de l'intervenant à chaque changement de voix. */
export function toPlainText(cues) {
  const out = [];
  let lastSpeaker = null;
  for (const c of cues) {
    if (c.speaker && c.speaker !== lastSpeaker) { out.push(`\n${c.speaker} :`); lastSpeaker = c.speaker; }
    out.push(c.text);
  }
  return out.join('\n').trim();
}

/** Une ligne par réplique : « [01:15] NOM : texte ». */
export function toTimedText(cues, offset = 0) {
  return cues
    .map((c) => `[${fmtTime(c.start + offset)}] ${c.speaker ? c.speaker + ' : ' : ''}${c.text}`)
    .join('\n');
}
