/* =========================================================================
   Ouverture des fichiers : boutons Média / Sous-titres et glisser-déposer.
   ========================================================================= */

import { el } from './dom.js';
import { state } from '../app/store.js';
import { emit, EVENTS } from '../app/events.js';
import { kindOf, extOf, UNRELIABLE_EXT } from '../core/media-type.js';
import { decodeBytes } from '../core/encoding.js';
import { parseSubtitles } from '../core/subtitle-parser.js';
import { toast } from './feedback.js';
import { loadMedia } from './player.js';
import { renderCues } from './transcript/cue-list.js';

function markLoaded(input, nameEl, fileName) {
  nameEl.textContent = fileName;
  input.closest('.file-btn').classList.add('loaded');
}

function loadMediaFile(file) {
  loadMedia(file, kindOf(file) === 'video');
  markLoaded(el.mediaInput, el.mediaName, file.name);

  const ext = extOf(file.name);
  if (UNRELIABLE_EXT.includes(ext)) {
    toast(`Format .${ext} : la lecture dépend du navigateur, un .mp4 est plus sûr.`, 4200);
  }
}

async function loadSubFile(file) {
  if (state.unsaved.size && !confirm(`${state.unsaved.size} modification(s) n'ont pas été exportées.\nCharger « ${file.name} » quand même ?`)) return;

  let buf;
  try { buf = await file.arrayBuffer(); }
  catch (_) { toast('Lecture du fichier de sous-titres impossible.'); return; }

  const cues = parseSubtitles(decodeBytes(buf));
  if (!cues.length) { toast('Aucune réplique trouvée dans ce fichier.', 3200); return; }

  state.editingIdx = -1;
  state.unsaved.clear();
  state.trash = [];
  state.cues = cues;
  state.srtFileName = file.name;
  markLoaded(el.srtInput, el.srtName, file.name);

  renderCues();
  emit(EVENTS.CUES_CHANGED);
  toast(`${cues.length} répliques chargées`);
}

/** Plusieurs fichiers d'un coup : le 1er média et le 1er sous-titre trouvés. */
function handleFiles(files) {
  let media = null, sub = null;
  for (const f of files) {
    const k = kindOf(f);
    if (k === 'sub' && !sub) sub = f;
    else if ((k === 'video' || k === 'audio') && !media) media = f;
  }
  if (media) loadMediaFile(media);
  if (sub) loadSubFile(sub);
  if (!media && !sub) toast('Format non reconnu. Média (mp4, mp3, m4a…) ou sous-titres (.srt, .vtt).', 3400);
}

export function initFileLoader() {
  el.mediaInput.addEventListener('change', (e) => { if (e.target.files[0]) loadMediaFile(e.target.files[0]); });
  el.srtInput.addEventListener('change', (e) => { if (e.target.files[0]) loadSubFile(e.target.files[0]); });

  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragDepth++;
    el.dropzone.hidden = false;
  });
  window.addEventListener('dragover', (e) => { e.preventDefault(); });
  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    if (--dragDepth <= 0) { dragDepth = 0; el.dropzone.hidden = true; }
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    el.dropzone.hidden = true;
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  });
}
