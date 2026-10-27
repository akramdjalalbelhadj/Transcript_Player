/* =========================================================================
   Recherche dans la transcription, avec navigation entre les résultats.
   ========================================================================= */

import { el } from '../dom.js';
import { state } from '../../app/store.js';
import { on, EVENTS } from '../../app/events.js';
import { findMatches } from '../../core/cue.js';
import { repaintAllText } from './cue-list.js';
import { pauseFollow } from './autoscroll.js';

let matches = [];     // indices des répliques contenant le terme
let matchPos = -1;
let searchTimer = null;

export function focusSearch() {
  el.search.focus();
  el.search.select();
}

function runSearch() {
  const term = el.search.value.trim().toLowerCase();
  const changed = term !== state.searchTerm;
  state.searchTerm = term;
  if (!changed) return;

  matches = findMatches(state.cues, term);
  matchPos = -1;

  repaintAllText();
  showMatchCount();
  if (matches.length) stepMatch(1);
}

function showMatchCount() {
  const has = matches.length > 0;
  el.searchCount.textContent = state.searchTerm ? (has ? `${matches.length} résultats` : 'aucun') : '';
  el.searchNext.hidden = !has;
  el.searchPrev.hidden = !has;
}

/** Après une correction : le texte a changé, les résultats aussi (sans déplacer la vue). */
function refreshMatches() {
  if (!state.searchTerm) return;
  matches = findMatches(state.cues, state.searchTerm);
  matchPos = -1;
  showMatchCount();
}

function stepMatch(dir) {
  if (!matches.length) return;
  matchPos = (matchPos + dir + matches.length) % matches.length;
  const idx = matches[matchPos];

  el.cues.querySelectorAll('mark.hit.current').forEach((m) => m.classList.remove('current'));
  const li = state.cueEls[idx];
  if (!li) return;
  li.querySelectorAll('mark.hit').forEach((m) => m.classList.add('current'));

  pauseFollow();
  const box = el.scriptScroll;
  box.scrollTo({ top: li.offsetTop - box.clientHeight / 2 + li.offsetHeight / 2, behavior: 'smooth' });
  el.searchCount.textContent = `${matchPos + 1}/${matches.length}`;
}

export function initSearch() {
  el.search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 140);
  });

  el.search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); stepMatch(e.shiftKey ? -1 : 1); }
    if (e.key === 'Escape') { el.search.value = ''; runSearch(); el.search.blur(); }
  });

  el.searchNext.addEventListener('click', () => stepMatch(1));
  el.searchPrev.addEventListener('click', () => stepMatch(-1));

  on(EVENTS.CUES_CHANGED, refreshMatches);
}
