/* =========================================================================
   Liste des répliques : construction du DOM, texte (mots découpés ou
   surlignage de recherche), horodatages, options d'affichage.
   ========================================================================= */

import { el } from '../dom.js';
import { state, settings } from '../../app/store.js';
import { on, onSetting, EVENTS } from '../../app/events.js';
import { fmtTime } from '../../core/time.js';
import { sync, resetActive } from './sync.js';
import { scrollToActive } from './autoscroll.js';

const ICON = (paths) => `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const ACTIONS = [
  { cls: 'cue-edit', title: 'Modifier le texte (E)',
    icon: ICON('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>') },
  { cls: 'cue-copy', title: 'Copier cette réplique',
    icon: ICON('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>') },
  { cls: 'cue-delete', title: 'Supprimer cette réplique (Suppr)',
    icon: ICON('<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>') },
];

function createCueElement(cue) {
  const li = document.createElement('li');
  li.className = 'cue';
  li.dataset.i = cue.index;

  const time = document.createElement('button');
  time.className = 'cue-time';
  time.type = 'button';

  const txt = document.createElement('div');
  txt.className = 'cue-text';

  const actions = document.createElement('div');
  actions.className = 'cue-actions';
  for (const a of ACTIONS) {
    const b = document.createElement('button');
    b.className = a.cls;
    b.type = 'button';
    b.title = a.title;
    b.innerHTML = a.icon;
    actions.append(b);
  }

  li.append(time, txt, actions);
  paintCueTime(li, cue);
  paintCueText(cue, txt);
  return li;
}

export function renderCues() {
  el.cues.textContent = '';
  state.cueEls = [];
  resetActive();

  const frag = document.createDocumentFragment();
  for (const cue of state.cues) {
    const li = createCueElement(cue);
    frag.appendChild(li);
    state.cueEls.push(li);
  }
  el.cues.appendChild(frag);

  sync(true);
}

function paintCueTime(li, cue) {
  const time = li.querySelector('.cue-time');
  time.textContent = fmtTime(cue.start + settings.offset);
  time.title = `Aller à ${fmtTime(cue.start + settings.offset)}`;
}

/** Construit le contenu texte d'une réplique (mots découpés, ou surlignage de recherche). */
export function paintCueText(cue, container) {
  container.textContent = '';

  if (cue.speaker && settings.speaker) {
    const sp = document.createElement('span');
    sp.className = 'cue-speaker';
    sp.textContent = cue.speaker;
    container.appendChild(sp);
  }

  const term = state.searchTerm;

  if (term) {
    // mode recherche : on surligne les occurrences (pas de découpe par mot)
    const text = cue.text;
    const low = text.toLowerCase();
    let i = 0, from = 0;
    while ((i = low.indexOf(term, from)) !== -1) {
      if (i > from) container.appendChild(document.createTextNode(text.slice(from, i)));
      const mk = document.createElement('mark');
      mk.className = 'hit';
      mk.textContent = text.slice(i, i + term.length);
      container.appendChild(mk);
      from = i + term.length;
    }
    container.appendChild(document.createTextNode(text.slice(from)));
    return;
  }

  if (settings.words) {
    cue.words.forEach((wd, k) => {
      const s = document.createElement('span');
      s.className = 'w todo';
      s.textContent = wd.w;
      container.appendChild(s);
      if (k < cue.words.length - 1) container.appendChild(document.createTextNode(' '));
    });
  } else {
    container.appendChild(document.createTextNode(cue.text));
  }
}

/** Remet à jour une réplique réinsérée (le décalage ou la recherche ont pu changer). */
export function refreshCueElement(li, cue) {
  li.classList.remove('active', 'past', 'near');
  paintCueTime(li, cue);
  paintCueText(cue, li.querySelector('.cue-text'));
}

export function repaintAllText() {
  state.cues.forEach((cue, i) => {
    const li = state.cueEls[i];
    if (li && i !== state.editingIdx) paintCueText(cue, li.querySelector('.cue-text'));
  });
  state.lastWordIdx = -1;
  sync(true);
}

function refreshTimestamps() {
  state.cues.forEach((cue, i) => {
    const li = state.cueEls[i];
    if (li) paintCueTime(li, cue);
  });
}

const applyTimes = () => el.scriptScroll.classList.toggle('no-times', !settings.times);
const applyDim = () => el.cues.classList.toggle('dim-mode', settings.dim);
const applyFont = () => document.documentElement.style.setProperty('--script-font', settings.font + 'px');

export function initCueList() {
  applyTimes();
  applyDim();
  applyFont();

  onSetting('times', applyTimes);
  onSetting('dim', applyDim);
  onSetting('font', () => { applyFont(); scrollToActive(true); });
  onSetting('words', repaintAllText);
  onSetting('speaker', repaintAllText);
  onSetting('offset', () => { refreshTimestamps(); sync(true); });

  on(EVENTS.CUES_CHANGED, () => { el.scriptEmpty.hidden = state.cues.length > 0; });
}
