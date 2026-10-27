/* =========================================================================
   Retours à l'utilisateur : notifications (toasts) et copie avec message.
   ========================================================================= */

import { el } from './dom.js';
import { copyToClipboard } from '../infra/clipboard.js';

let toastTimer = null;

/** `action` (facultatif) : { label, run } → bouton dans le toast (ex. « Annuler »). */
export function toast(msg, ms = 1900, action) {
  el.toast.textContent = msg;
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toast-action';
    b.textContent = action.label;
    b.addEventListener('click', () => { el.toast.hidden = true; action.run(); });
    el.toast.append(b);
  }
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, ms);
}

/** Copie `txt` et le signale par un toast (`okMsg` en cas de succès). */
export async function copyText(txt, okMsg) {
  if (!txt) return false;
  if (!(await copyToClipboard(txt))) {
    toast('Copie impossible — utilise Ctrl+C');
    return false;
  }
  if (okMsg) toast(okMsg);
  return true;
}
