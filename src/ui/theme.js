/* =========================================================================
   Thème clair / sombre.
   ========================================================================= */

import { el } from './dom.js';
import { settings, setSetting } from '../app/store.js';

const applyTheme = () => { document.documentElement.dataset.theme = settings.theme; };

export function initTheme() {
  applyTheme();
  el.themeBtn.addEventListener('click', () => {
    setSetting('theme', settings.theme === 'dark' ? 'light' : 'dark');
    applyTheme();
  });
}
