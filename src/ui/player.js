/* =========================================================================
   Lecteur média : chargement, lecture / pause, déplacement, volume,
   plein écran, mode écoute. Annonce la position de lecture (MEDIA_TIME)
   sans connaître la transcription.
   ========================================================================= */

import { el } from './dom.js';
import { state, settings, setSetting } from '../app/store.js';
import { emit, EVENTS } from '../app/events.js';
import { extOf } from '../core/media-type.js';
import { toast } from './feedback.js';

let mediaURL = null;
let rafId = null;
let listening = false;   // mode écoute : vidéo masquée, animation audio affichée

/* ----------------------------------------------------------- lecture */

export const hasMedia = () => !!el.player.src;
export const hasVideo = () => el.stage.classList.contains('has-video');
export const isPaused = () => el.player.paused;
export const currentTime = () => el.player.currentTime || 0;
export const duration = () => el.player.duration;

export const play = () => el.player.play();
export const pause = () => el.player.pause();

/** Change la position sans prévenir personne (utilisé par la boucle de réplique). */
export function setCurrentTime(t) { el.player.currentTime = t; }

const notifyTime = (force) => emit(EVENTS.MEDIA_TIME, { force });

export function togglePlay() {
  if (!hasMedia()) { el.mediaInput.click(); return; }
  if (isPaused()) play().catch(() => toast('Lecture impossible : format non pris en charge.', 3200));
  else pause();
}

export function seek(t) {
  if (!hasMedia() || !isFinite(el.player.duration)) return;
  el.player.currentTime = Math.max(0, Math.min(t, el.player.duration));
  notifyTime(true);
}

export const seekBy = (delta) => seek(el.player.currentTime + delta);

/** Charge un fichier local (lu via une URL blob : rien n'est copié ni envoyé). */
export function loadMedia(file, isVideo) {
  if (mediaURL) URL.revokeObjectURL(mediaURL);
  mediaURL = URL.createObjectURL(file);
  state.mediaFileName = file.name;

  el.player.src = mediaURL;
  el.player.load();

  el.stage.classList.toggle('has-video', isVideo);
  el.stage.classList.toggle('has-audio', !isVideo);
  el.listenBtn.hidden = !isVideo;
  setListen(false);
  el.audioCard.hidden = isVideo;
  el.audioTitle.textContent = file.name;
}

/* ---------------------------------- boucle d'affichage pendant la lecture */

function tick() {
  notifyTime(false);
  rafId = requestAnimationFrame(tick);
}

function startTicking() {
  if (rafId === null) rafId = requestAnimationFrame(tick);
}

function stopTicking() {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}

function setPlayingUi(playing) {
  document.body.classList.toggle('playing', playing);
  el.viz.classList.toggle('playing', playing);
}

/* -------------------------------------------------------- mode écoute */

/** Vidéo seulement : l'image est masquée, la lecture continue au même endroit. */
function setListen(on) {
  listening = on;
  el.stage.classList.toggle('listen', on);
  el.listenBtn.setAttribute('aria-pressed', String(on));
  el.listenBtn.title = on ? 'Réafficher la vidéo (V)' : 'Mode écoute : masquer la vidéo (V)';
  if (hasVideo()) el.audioCard.hidden = !on;
}

export function toggleListen() {
  if (!hasVideo()) return;
  setListen(!listening);
  toast(listening ? 'Mode écoute : vidéo masquée' : 'Vidéo réaffichée');
}

/* ------------------------------------------------ son et plein écran */

export function toggleMute() {
  el.player.muted = !el.player.muted;
  document.body.classList.toggle('muted', el.player.muted);
}

export function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else el.stage.requestFullscreen?.();
}

/* ------------------------------------------------------------- init */

export function initPlayer() {
  const p = el.player;

  p.addEventListener('loadedmetadata', () => {
    emit(EVENTS.MEDIA_METADATA);
    notifyTime(true);
  });
  p.addEventListener('play', () => { setPlayingUi(true); startTicking(); });
  p.addEventListener('pause', () => { setPlayingUi(false); stopTicking(); notifyTime(false); });
  p.addEventListener('ended', () => { setPlayingUi(false); stopTicking(); });
  p.addEventListener('seeked', () => notifyTime(true));
  // filet de sécurité : si le rAF est bridé (onglet en arrière-plan), timeupdate prend le relais
  p.addEventListener('timeupdate', () => notifyTime(false));
  p.addEventListener('error', () => {
    const ext = extOf(state.mediaFileName);
    toast(`Impossible de lire « ${state.mediaFileName} ». Le navigateur ne décode pas ce format (.${ext}) — convertis-le en .mp4 / .mp3.`, 6000);
  });
  p.addEventListener('click', togglePlay);

  el.playBtn.addEventListener('click', togglePlay);
  el.back5.addEventListener('click', () => seekBy(-5));
  el.fwd5.addEventListener('click', () => seekBy(5));
  el.listenBtn.addEventListener('click', toggleListen);
  el.muteBtn.addEventListener('click', toggleMute);
  el.fsBtn.addEventListener('click', toggleFullscreen);

  p.volume = settings.volume;
  el.volume.value = p.volume;
  el.volume.addEventListener('input', () => {
    p.volume = parseFloat(el.volume.value);
    p.muted = p.volume === 0;
    document.body.classList.toggle('muted', p.muted);
    setSetting('volume', p.volume);
  });
}
