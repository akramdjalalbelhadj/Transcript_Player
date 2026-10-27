import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampRate, nextRate, parseRate } from '../src/core/playback-rate.js';
import { kindOf, extOf } from '../src/core/media-type.js';
import { decodeBytes } from '../src/core/encoding.js';
import { normalizeSettings } from '../src/core/settings.js';

test('vitesse : bornes, pas de 5 % alignés, saisie libre', () => {
  assert.equal(clampRate(10), 25);
  assert.equal(clampRate(999), 400);
  assert.equal(nextRate(133, 1), 135);
  assert.equal(nextRate(133, -1), 130);
  assert.equal(nextRate(100, 1), 105);
  assert.equal(parseRate('150'), 150);
  assert.equal(parseRate(' 133 % '), 133);
  assert.equal(parseRate('1,5x'), 150);
  assert.equal(parseRate('1.25×'), 125);
  assert.ok(Number.isNaN(parseRate('vite')));
});

test('type de fichier : extension ou type MIME', () => {
  assert.equal(extOf('Film.Final.MP4'), 'mp4');
  assert.equal(kindOf({ name: 'a.srt', type: '' }), 'sub');
  assert.equal(kindOf({ name: 'a.mkv', type: '' }), 'video');
  assert.equal(kindOf({ name: 'sans-extension', type: 'audio/mpeg' }), 'audio');
  assert.equal(kindOf({ name: 'a.pdf', type: 'application/pdf' }), 'unknown');
});

test('décodage : UTF-8 (avec ou sans BOM) et Windows-1252', () => {
  const utf8 = new TextEncoder().encode('Été');
  assert.equal(decodeBytes(utf8), 'Été');
  assert.equal(decodeBytes(new Uint8Array([0xEF, 0xBB, 0xBF, ...utf8])), 'Été');
  assert.equal(decodeBytes(new Uint8Array([0xC9, 0x74, 0xE9])), 'Été');   // « Été » en ANSI
});

test('préférences : valeurs par défaut et données abîmées', () => {
  const d = normalizeSettings(null);
  assert.equal(d.theme, 'dark');
  assert.equal(d.rate, 1);
  assert.equal(d.follow, true);
  assert.equal(d.overlay, false);
  assert.equal(d.split, null);

  const p = normalizeSettings({ theme: 'light', rate: -2, font: '22', offset: 'x', loop: true });
  assert.equal(p.theme, 'light');
  assert.equal(p.rate, 1);
  assert.equal(p.font, 22);
  assert.equal(p.offset, 0);
  assert.equal(p.loop, true);
});
