import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanLine, takeSpeaker, splitWords, cueSourceText, applyCueText,
  findCueAt, wordIndexAt, findMatches,
} from '../src/core/cue.js';

const cue = (start, end, text, speaker = null) => ({
  index: 0, start, end, lines: [text], text, speaker, words: splitWords(text, start, end),
});

test('cleanLine : balises et espaces', () => {
  assert.equal(cleanLine('  <b>Bon</b>{\\pos(1,2)}jour   toi '), 'Bonjour toi');
});

test('takeSpeaker : nom en majuscules suivi de « : »', () => {
  const body = ['- JEAN-PAUL : Salut'];
  assert.equal(takeSpeaker(body), 'JEAN-PAUL');
  assert.deepEqual(body, ['Salut']);
  assert.equal(takeSpeaker(['Il est 10:30']), null);
  assert.equal(takeSpeaker(['NOM:']), null);          // rien après le nom
});

test('splitWords : couvre toute la réplique, dans l’ordre', () => {
  const w = splitWords('un deux trois', 10, 13);
  assert.deepEqual(w.map((x) => x.w), ['un', 'deux', 'trois']);
  assert.equal(w[0].t0, 10);
  assert.ok(Math.abs(w[2].t1 - 13) < 1e-9);
  for (let i = 1; i < w.length; i++) assert.equal(w[i].t0, w[i - 1].t1);
});

test('findCueAt : dernière réplique commencée', () => {
  const cues = [cue(0, 1, 'a'), cue(2, 3, 'b'), cue(5, 6, 'c')];
  assert.equal(findCueAt(cues, -1), -1);
  assert.equal(findCueAt(cues, 0), 0);
  assert.equal(findCueAt(cues, 4), 1);
  assert.equal(findCueAt(cues, 99), 2);
  assert.equal(findCueAt([], 1), -1);
});

test('wordIndexAt : avant, pendant, après', () => {
  const c = cue(10, 12, 'aa bb');
  assert.equal(wordIndexAt(c, 9), -1);
  assert.equal(wordIndexAt(c, 10), 0);
  assert.equal(wordIndexAt(c, 11.9), 1);
  assert.equal(wordIndexAt(c, 12), 2);
});

test('findMatches : insensible à la casse (terme déjà en minuscules)', () => {
  const cues = [cue(0, 1, 'Bonjour'), cue(1, 2, 'Salut'), cue(2, 3, 'bonsoir')];
  cues.forEach((c, i) => { c.index = i; });
  assert.deepEqual(findMatches(cues, 'bon'), [0, 2]);
  assert.deepEqual(findMatches(cues, ''), []);
});

test('applyCueText : modification, intervenant, vide, inchangé', () => {
  const c = cue(0, 2, 'Bonjour', 'MARIE');
  assert.equal(cueSourceText(c), 'MARIE: Bonjour');

  assert.equal(applyCueText(c, 'MARIE: Bonjour'), 'unchanged');
  assert.equal(c.edited, undefined);

  assert.equal(applyCueText(c, '   \n <i></i> '), 'empty');
  assert.equal(c.text, 'Bonjour');

  assert.equal(applyCueText(c, 'PAUL: Salut\nà tous'), 'changed');
  assert.equal(c.speaker, 'PAUL');
  assert.deepEqual(c.lines, ['Salut', 'à tous']);
  assert.equal(c.text, 'Salut à tous');
  assert.equal(c.words.length, 3);
  assert.equal(c.edited, true);
});
