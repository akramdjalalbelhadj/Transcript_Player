import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseSubtitles } from '../src/core/subtitle-parser.js';
import { decodeBytes } from '../src/core/encoding.js';

test('SRT : horodatages, texte multi-lignes, balises retirées', () => {
  const cues = parseSubtitles(
    '1\r\n00:00:01,000 --> 00:00:03,500\r\n<i>Bonjour</i>\r\n{\\an8}à tous\r\n\r\n' +
    '2\r\n00:00:04,000 --> 00:00:05,000\r\nSuite\r\n');
  assert.equal(cues.length, 2);
  assert.deepEqual(cues[0].lines, ['Bonjour', 'à tous']);
  assert.equal(cues[0].text, 'Bonjour à tous');
  assert.equal(cues[0].start, 1);
  assert.equal(cues[0].end, 3.5);
  assert.equal(cues[1].index, 1);
});

test('VTT : en-tête ignoré, horodatages avec point', () => {
  const cues = parseSubtitles('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nSalut\n');
  assert.equal(cues.length, 1);
  assert.equal(cues[0].text, 'Salut');
});

test('SBV : horodatages séparés par une virgule', () => {
  const cues = parseSubtitles('0:00:01.000,0:00:02.500\nTexte SBV\n');
  assert.equal(cues.length, 1);
  assert.equal(cues[0].end, 2.5);
});

test('intervenant détecté et retiré du texte', () => {
  const [cue] = parseSubtitles('1\n00:00:01,000 --> 00:00:02,000\nMARIE: Bonjour\n');
  assert.equal(cue.speaker, 'MARIE');
  assert.equal(cue.text, 'Bonjour');
});

test('répliques triées, fin absente ou incohérente corrigée, blocs vides ignorés', () => {
  const cues = parseSubtitles(
    '1\n00:00:10,000 --> 00:00:05,000\nB\n\n' +
    '2\n00:00:01,000 --> 00:00:02,000\nA\n\n' +
    '3\n00:00:20,000 --> 00:00:21,000\n<i></i>\n');
  assert.deepEqual(cues.map((c) => c.text), ['A', 'B']);
  assert.deepEqual(cues.map((c) => c.index), [0, 1]);
  assert.equal(cues[1].end, 12);           // début + 2 s
});

test('fichier de démo : analysé sans erreur', async () => {
  const buf = await readFile(new URL('../demo/demo.srt', import.meta.url));
  const cues = parseSubtitles(decodeBytes(buf));
  assert.ok(cues.length > 0);
  for (let i = 1; i < cues.length; i++) assert.ok(cues[i].start >= cues[i - 1].start);
});
