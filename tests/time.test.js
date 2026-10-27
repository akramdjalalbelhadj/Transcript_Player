import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtTime, srtTime, parseTimestamp } from '../src/core/time.js';

test('fmtTime : minutes:secondes, heures seulement si besoin', () => {
  assert.equal(fmtTime(0), '00:00');
  assert.equal(fmtTime(75.5), '01:15');
  assert.equal(fmtTime(3723), '1:02:03');
  assert.equal(fmtTime(75.5, true), '01:15,500');
});

test('fmtTime : valeurs invalides ramenées à 0', () => {
  assert.equal(fmtTime(NaN), '00:00');
  assert.equal(fmtTime(-4), '00:00');
  assert.equal(fmtTime(Infinity), '00:00');
});

test('srtTime : format SRT complet', () => {
  assert.equal(srtTime(0), '00:00:00,000');
  assert.equal(srtTime(3723.042), '01:02:03,042');
});

test('parseTimestamp : SRT, VTT et forme courte', () => {
  assert.equal(parseTimestamp('00:01:15,500'), 75.5);
  assert.equal(parseTimestamp('00:01:15.5'), 75.5);
  assert.equal(parseTimestamp('01:15.500'), 75.5);
  assert.equal(parseTimestamp('n’importe quoi'), null);
});

test('srtTime ∘ parseTimestamp : aller-retour', () => {
  for (const s of [0, 1.001, 75.5, 3723.042]) {
    assert.equal(parseTimestamp(srtTime(s)), s);
  }
});
