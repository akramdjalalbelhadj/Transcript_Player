/* =========================================================================
   Menu « Options » : relie ses contrôles aux préférences. Les modules
   concernés réagissent eux-mêmes au changement (SETTING_CHANGED).
   ========================================================================= */

import { el } from './dom.js';
import { settings, setSetting } from '../app/store.js';

/** Case à cocher du menu → préférence correspondante. */
const CHECKBOXES = {
  optTimes: 'times',
  optWords: 'words',
  optOverlay: 'overlay',
  optDim: 'dim',
  optSpeaker: 'speaker',
};

function openMenu() { el.moreMenu.hidden = false; el.moreBtn.setAttribute('aria-expanded', 'true'); }
export function closeMenu() { el.moreMenu.hidden = true; el.moreBtn.setAttribute('aria-expanded', 'false'); }

const showOffset = () => { el.offsetVal.textContent = settings.offset.toFixed(1).replace('.', ',') + ' s'; };

export function initOptionsMenu() {
  el.moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    el.moreMenu.hidden ? openMenu() : closeMenu();
  });

  document.addEventListener('click', (e) => {
    if (!el.moreMenu.hidden && !el.moreMenu.contains(e.target) && e.target !== el.moreBtn) closeMenu();
  });

  for (const [id, key] of Object.entries(CHECKBOXES)) {
    el[id].checked = settings[key];
    el[id].addEventListener('change', () => setSetting(key, el[id].checked));
  }

  el.fontRange.value = settings.font;
  el.fontRange.addEventListener('input', () => setSetting('font', Number(el.fontRange.value)));

  showOffset();
  el.moreMenu.querySelectorAll('[data-offset]').forEach((b) => {
    b.addEventListener('click', () => {
      const v = b.dataset.offset;
      setSetting('offset', v === 'reset' ? 0 : Math.round((settings.offset + parseFloat(v)) * 10) / 10);
      showOffset();
    });
  });
}
