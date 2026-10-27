/* =========================================================================
   Suivi automatique : garde la réplique active au centre du panneau,
   se met en pause dès que l'utilisateur fait défiler lui-même.
   ========================================================================= */

import { el } from '../dom.js';
import { state, settings, setSetting } from '../../app/store.js';
import { toast } from '../feedback.js';

let followPaused = false;    // l'utilisateur a fait défiler : on ne suit plus jusqu'à « Revenir »
let programmaticScroll = 0;  // date du dernier défilement déclenché par le code

function selectionInsideTranscript() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false;
  const node = sel.anchorNode;
  return !!node && el.scriptScroll.contains(node.nodeType === 1 ? node : node.parentNode);
}

export function scrollToActive(instant) {
  if (!settings.follow || followPaused) return;
  const node = state.cueEls[state.activeIdx];
  if (!node) return;
  // Ne jamais bouger sous une sélection de texte en cours (copier/coller)
  if (selectionInsideTranscript()) return;

  const box = el.scriptScroll;
  const target = node.offsetTop - box.clientHeight / 2 + node.offsetHeight / 2;
  const clamped = Math.max(0, Math.min(target, box.scrollHeight - box.clientHeight));
  const far = Math.abs(box.scrollTop - clamped) > box.clientHeight * 1.6;

  programmaticScroll = Date.now();
  box.scrollTo({ top: clamped, behavior: instant || far ? 'auto' : 'smooth' });
}

export function pauseFollow() {
  if (!settings.follow || followPaused) return;
  // ignorer les défilements déclenchés par le code
  if (Date.now() - programmaticScroll < 400) return;
  followPaused = true;
  el.resumeFollow.hidden = false;
}

export function resumeFollow() {
  followPaused = false;
  el.resumeFollow.hidden = true;
  scrollToActive(false);
}

function applyFollowUi() {
  el.followBtn.classList.toggle('on', settings.follow);
  el.followBtn.setAttribute('aria-pressed', String(settings.follow));
}

export function toggleFollow() {
  setSetting('follow', !settings.follow);
  applyFollowUi();
  if (settings.follow) { followPaused = false; el.resumeFollow.hidden = true; scrollToActive(false); }
  else el.resumeFollow.hidden = true;
  toast(settings.follow ? 'Suivi automatique activé' : 'Suivi automatique désactivé');
}

export function initAutoscroll() {
  applyFollowUi();

  el.scriptScroll.addEventListener('wheel', pauseFollow, { passive: true });
  el.scriptScroll.addEventListener('touchmove', pauseFollow, { passive: true });
  el.scriptScroll.addEventListener('mousedown', (e) => {
    // clic sur la barre de défilement
    if (e.offsetX > el.scriptScroll.clientWidth) pauseFollow();
  });
  el.scriptScroll.addEventListener('keydown', (e) => {
    if (['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(e.key)) pauseFollow();
  });

  el.resumeFollow.addEventListener('click', resumeFollow);
  el.followBtn.addEventListener('click', toggleFollow);
  window.addEventListener('resize', () => scrollToActive(true));
}
