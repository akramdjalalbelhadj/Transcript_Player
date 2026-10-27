/* =========================================================================
   Réplique (cue) : contenu, découpage en mots, recherche dans une liste.

   Forme d'une réplique :
   { index, start, end, lines[], text, speaker, words[{ w, t0, t1 }], edited? }
   ========================================================================= */

const SPEAKER_RE = /^(?:[-–—>\s]*)([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9 .'’_-]{1,28}?)\s*:\s*(.*)$/;

/** Retire les balises (<i>, {\an8}…) et normalise les espaces. */
export function cleanLine(line) {
  return line
    .replace(/<[^>]+>/g, '')            // <i>, <font …>
    .replace(/\{[^}]*\}/g, '')          // {\an8}, {\pos…}
    .replace(/\s+/g, ' ')
    .trim();
}

/** Retire « NOM: » de la 1re ligne et renvoie le nom (ou null). Modifie `body`. */
export function takeSpeaker(body) {
  const sm = body[0].match(SPEAKER_RE);
  if (sm && sm[1].trim().length >= 2 && sm[2].trim().length > 0) {
    body[0] = sm[2].trim();
    return sm[1].trim();
  }
  return null;
}

/** Lignes brutes → { lines, speaker, text }, ou null si elles sont vides une fois nettoyées. */
export function parseCueLines(rawLines) {
  const lines = rawLines.map(cleanLine).filter((l) => l.length > 0);
  if (!lines.length) return null;
  const speaker = takeSpeaker(lines);
  return { lines, speaker, text: lines.join(' ') };
}

/** Répartit la durée de la réplique sur les mots (proportionnel à leur longueur). */
export function splitWords(txt, start, end) {
  const words = txt.split(/\s+/).filter((s) => s.length);
  const total = words.reduce((n, w) => n + w.length + 1, 0) || 1;
  const dur = Math.max(0.2, end - start);
  let acc = 0;
  return words.map((w) => {
    const share = (w.length + 1) / total;
    const t0 = start + dur * acc;
    acc += share;
    return { w, t0, t1: start + dur * acc };
  });
}

/** Texte tel qu'il apparaît dans le .srt (et dans l'éditeur) : « NOM: ligne1\nligne2 ». */
export function cueSourceText(cue) {
  return (cue.speaker ? cue.speaker + ': ' : '') + cue.lines.join('\n');
}

/**
 * Remplace le texte d'une réplique par `raw` (saisie de l'utilisateur).
 * → 'empty' (rien n'est modifié), 'unchanged' ou 'changed' (réplique mise à jour).
 */
export function applyCueText(cue, raw) {
  const content = parseCueLines(raw.split('\n'));
  if (!content) return 'empty';
  if (content.speaker === cue.speaker && content.lines.join('\n') === cue.lines.join('\n')) return 'unchanged';
  Object.assign(cue, content, {
    words: splitWords(content.text, cue.start, cue.end),
    edited: true,
  });
  return 'changed';
}

/** Dernière réplique dont le début est <= t (recherche dichotomique). -1 si aucune. */
export function findCueAt(cues, t) {
  let lo = 0, hi = cues.length - 1, res = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= t) { res = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return res;
}

/**
 * Mot en cours de prononciation à l'instant `t`.
 * -1 avant la réplique, words.length une fois la réplique terminée.
 */
export function wordIndexAt(cue, t) {
  if (t >= cue.end) return cue.words.length;
  let wIdx = -1;
  if (t >= cue.start) {
    for (let i = 0; i < cue.words.length; i++) {
      if (t >= cue.words[i].t0) wIdx = i; else break;
    }
  }
  return wIdx;
}

/** Indices des répliques contenant `term` (déjà en minuscules). */
export function findMatches(cues, term) {
  return term
    ? cues.filter((c) => c.text.toLowerCase().includes(term)).map((c) => c.index)
    : [];
}
