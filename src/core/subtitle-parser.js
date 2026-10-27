/* =========================================================================
   Analyse des sous-titres (SRT / VTT / SBV) → liste de répliques.
   ========================================================================= */

import { parseTimestamp } from './time.js';
import { parseCueLines, splitWords } from './cue.js';

/** Texte d'un fichier de sous-titres → répliques triées par début. */
export function parseSubtitles(raw) {
  const text = raw.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const blocks = text.split(/\n[ \t]*\n+/);
  const cues = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.replace(/\s+$/, ''));
    // ligne contenant le séparateur de temps (« --> » en SRT/VTT, « , » en SBV)
    const tIdx = lines.findIndex((l) => l.includes('-->') || /^\d{1,2}:\d{2}:\d{2}[.,]\d{1,3},/.test(l));
    if (tIdx === -1) continue;

    const [a, b] = lines[tIdx].split(lines[tIdx].includes('-->') ? '-->' : ',');
    const start = parseTimestamp(a);
    let end = parseTimestamp(b || '');
    if (start === null) continue;

    const content = parseCueLines(lines.slice(tIdx + 1));
    if (!content) continue;

    if (end === null || end <= start) end = start + 2;

    cues.push({
      index: cues.length,
      start, end,
      ...content,
      words: splitWords(content.text, start, end),
    });
  }

  cues.sort((a, b) => a.start - b.start);
  cues.forEach((c, i) => { c.index = i; });
  return cues;
}
