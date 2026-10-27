import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSrt, toPlainText, toTimedText } from '../src/core/transcript-format.js';
import { parseSubtitles } from '../src/core/subtitle-parser.js';

const SRT =
  '1\n00:00:01,000 --> 00:00:02,500\nMARIE: Bonjour\nà tous\n\n' +
  '2\n00:00:03,000 --> 00:00:04,000\nMARIE: Ça va ?\n\n' +
  '3\n00:00:05,000 --> 00:00:06,000\nPAUL: Oui\n';

test('toSrt : relu à l’identique par le parseur (aller-retour)', () => {
  const cues = parseSubtitles(SRT);
  const again = parseSubtitles(toSrt(cues));
  assert.deepEqual(
    again.map(({ start, end, lines, speaker }) => ({ start, end, lines, speaker })),
    cues.map(({ start, end, lines, speaker }) => ({ start, end, lines, speaker })));
});

test('toSrt : décalage appliqué, jamais négatif, renumérotation', () => {
  const cues = parseSubtitles(SRT).slice(1);
  const out = toSrt(cues, -3.5);
  assert.match(out, /^1\n00:00:00,000 --> 00:00:00,500\n/);
  assert.match(out, /\n2\n00:00:01,500 --> 00:00:02,500\nPAUL: Oui\n$/);
});

test('toPlainText : nom de l’intervenant à chaque changement de voix', () => {
  assert.equal(toPlainText(parseSubtitles(SRT)), 'MARIE :\nBonjour à tous\nÇa va ?\n\nPAUL :\nOui');
});

test('toTimedText : une ligne horodatée par réplique', () => {
  assert.equal(toTimedText(parseSubtitles(SRT), 60).split('\n')[2], '[01:05] PAUL : Oui');
});
