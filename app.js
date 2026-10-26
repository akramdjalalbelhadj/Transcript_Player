/* =========================================================================
   SRT Reader — lecteur média + transcription synchronisée
   100 % local : aucun fichier ne quitte la machine.
   ========================================================================= */

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  /* ----------------------------------------------------------------- DOM */
  const el = {
    player: $('player'),
    stage: $('stage'),
    audioCard: $('audioCard'),
    audioTitle: $('audioTitle'),
    viz: $('viz'),
    overlayCue: $('overlayCue'),

    mediaInput: $('mediaInput'),
    srtInput: $('srtInput'),
    mediaName: $('mediaName'),
    srtName: $('srtName'),

    timeline: $('timeline'),
    tlPlayed: $('tlPlayed'),
    tlKnob: $('tlKnob'),
    tlCues: $('tlCues'),
    tlTooltip: $('tlTooltip'),

    playBtn: $('playBtn'),
    back5: $('back5'),
    fwd5: $('fwd5'),
    prevCue: $('prevCue'),
    nextCue: $('nextCue'),
    loopBtn: $('loopBtn'),
    listenBtn: $('listenBtn'),
    rateRange: $('rateRange'),
    rateInput: $('rateInput'),
    rateDown: $('rateDown'),
    rateUp: $('rateUp'),
    rateReset: $('rateReset'),
    muteBtn: $('muteBtn'),
    volume: $('volume'),
    fsBtn: $('fsBtn'),
    curTime: $('curTime'),
    durTime: $('durTime'),

    scriptScroll: $('scriptScroll'),
    cues: $('cues'),
    scriptEmpty: $('scriptEmpty'),
    scriptMeta: $('scriptMeta'),
    cueCount: $('cueCount'),
    wordCount: $('wordCount'),
    srtDur: $('srtDur'),
    editBadge: $('editBadge'),

    search: $('search'),
    searchCount: $('searchCount'),
    searchPrev: $('searchPrev'),
    searchNext: $('searchNext'),

    followBtn: $('followBtn'),
    copyAllBtn: $('copyAllBtn'),
    moreBtn: $('moreBtn'),
    moreMenu: $('moreMenu'),
    resumeFollow: $('resumeFollow'),

    optTimes: $('optTimes'),
    optWords: $('optWords'),
    optOverlay: $('optOverlay'),
    optDim: $('optDim'),
    optSpeaker: $('optSpeaker'),
    fontRange: $('fontRange'),
    offsetVal: $('offsetVal'),
    exportTxt: $('exportTxt'),
    exportSrt: $('exportSrt'),
    exportSrtBtn: $('exportSrtBtn'),

    workspace: $('workspace'),
    splitter: $('splitter'),
    dropzone: $('dropzone'),
    helpBtn: $('helpBtn'),
    helpModal: $('helpModal'),
    helpClose: $('helpClose'),
    themeBtn: $('themeBtn'),
    toast: $('toast'),
  };

  /* --------------------------------------------------------------- État */
  const state = {
    cues: [],            // { index, start, end, lines, text, speaker, words[] }
    cueEls: [],
    activeIdx: -1,
    speaking: false,
    follow: true,
    followPaused: false,
    loop: false,
    offset: 0,           // décalage de synchro, en secondes
    mediaURL: null,
    mediaFileName: '',
    srtFileName: '',
    searchTerm: '',
    matches: [],         // indices de répliques contenant le terme
    matchPos: -1,
    lastWordIdx: -1,
    rafId: null,
    programmaticScroll: 0,
    editingIdx: -1,      // réplique en cours de modification
    editResume: false,   // relancer la lecture après la modification
    unsaved: new Set(),  // répliques (objets) modifiées ou supprimées depuis le dernier export .srt
    trash: [],           // répliques supprimées, pour Annuler : { cue, li, at, wasUnsaved }
    listen: false,       // mode écoute : vidéo masquée, animation audio affichée
  };

  const PREF_KEY = 'srtreader.prefs.v1';

  /* ==================================================================== */
  /*  Utilitaires                                                         */
  /* ==================================================================== */

  function fmtTime(sec, withMs) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const pad = (n) => String(n).padStart(2, '0');
    let out = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    if (withMs) out += ',' + String(Math.floor((sec % 1) * 1000)).padStart(3, '0');
    return out;
  }

  function srtTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.round((sec - Math.floor(sec)) * 1000);
    const pad = (n, w) => String(n).padStart(w, '0');
    return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
  }

  let toastTimer = null;
  /** `action` (facultatif) : { label, run } → bouton dans le toast (ex. « Annuler »). */
  function toast(msg, ms = 1900, action) {
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

  async function copyText(txt, okMsg) {
    if (!txt) return false;
    try {
      await navigator.clipboard.writeText(txt);
    } catch (_) {
      // Repli pour les contextes où l'API Clipboard est bloquée
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      ta.remove();
      if (!ok) { toast('Copie impossible — utilise Ctrl+C'); return false; }
    }
    if (okMsg) toast(okMsg);
    return true;
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ==================================================================== */
  /*  Lecture des fichiers                                                */
  /* ==================================================================== */

  const VIDEO_EXT = ['mp4', 'webm', 'ogv', 'mkv', 'avi', 'mov', 'm4v', 'wmv', 'flv', 'mpg', 'mpeg', '3gp'];
  const AUDIO_EXT = ['mp3', 'm4a', 'wav', 'ogg', 'oga', 'flac', 'aac', 'opus', 'wma', 'aiff'];
  const SUB_EXT = ['srt', 'vtt', 'sbv', 'txt'];

  const extOf = (name) => (name.split('.').pop() || '').toLowerCase();

  function kindOf(file) {
    const ext = extOf(file.name);
    if (SUB_EXT.includes(ext)) return 'sub';
    if (file.type.startsWith('video/') || VIDEO_EXT.includes(ext)) return 'video';
    if (file.type.startsWith('audio/') || AUDIO_EXT.includes(ext)) return 'audio';
    return 'unknown';
  }

  /** Décodage tolérant : UTF-8 strict, sinon Windows-1252 (SRT « ANSI »). */
  function decodeBytes(buf) {
    let bytes = new Uint8Array(buf);
    // BOM UTF-8
    if (bytes.length > 2 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      bytes = bytes.subarray(3);
    }
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (_) {
      try { return new TextDecoder('windows-1252').decode(bytes); }
      catch (_) { return new TextDecoder().decode(bytes); }
    }
  }

  function loadMediaFile(file) {
    const kind = kindOf(file);
    if (state.mediaURL) URL.revokeObjectURL(state.mediaURL);
    state.mediaURL = URL.createObjectURL(file);
    state.mediaFileName = file.name;

    el.player.src = state.mediaURL;
    el.player.load();

    const isVideo = kind === 'video';
    el.stage.classList.toggle('has-video', isVideo);
    el.stage.classList.toggle('has-audio', !isVideo);
    el.listenBtn.hidden = !isVideo;
    setListen(false);
    el.audioCard.hidden = isVideo;
    el.audioTitle.textContent = file.name;

    el.mediaName.textContent = file.name;
    el.mediaInput.closest('.file-btn').classList.add('loaded');

    const ext = extOf(file.name);
    if (['avi', 'mkv', 'wmv', 'flv'].includes(ext)) {
      toast(`Format .${ext} : la lecture dépend du navigateur, un .mp4 est plus sûr.`, 4200);
    }
  }

  function loadSubFile(file) {
    if (state.unsaved.size && !confirm(`${state.unsaved.size} modification(s) n'ont pas été exportées.\nCharger « ${file.name} » quand même ?`)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = decodeBytes(reader.result);
      const cues = parseSubtitles(text);
      if (!cues.length) { toast('Aucune réplique trouvée dans ce fichier.', 3200); return; }
      state.editingIdx = -1;
      state.unsaved.clear();
      state.trash = [];
      state.cues = cues;
      state.srtFileName = file.name;
      el.srtName.textContent = file.name;
      el.srtInput.closest('.file-btn').classList.add('loaded');
      renderCues();
      buildTimelineMarkers();
      toast(`${cues.length} répliques chargées`);
    };
    reader.onerror = () => toast('Lecture du fichier de sous-titres impossible.');
    reader.readAsArrayBuffer(file);
  }

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

  /* ==================================================================== */
  /*  Analyse des sous-titres (SRT / VTT / SBV)                           */
  /* ==================================================================== */

  const TS = /(\d{1,3}):(\d{1,2}):(\d{1,2})[.,](\d{1,3})|(\d{1,3}):(\d{1,2})[.,](\d{1,3})/;

  function parseTimestamp(str) {
    const m = str.match(TS);
    if (!m) return null;
    if (m[1] !== undefined) {
      return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4].padEnd(3, '0')) / 1000;
    }
    return (+m[5]) * 60 + (+m[6]) + (+m[7].padEnd(3, '0')) / 1000;
  }

  function cleanLine(line) {
    return line
      .replace(/<[^>]+>/g, '')            // <i>, <font …>
      .replace(/\{[^}]*\}/g, '')          // {\an8}, {\pos…}
      .replace(/\s+/g, ' ')
      .trim();
  }

  const SPEAKER_RE = /^(?:[-–—>\s]*)([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9 .'’_-]{1,28}?)\s*:\s*(.*)$/;

  function parseSubtitles(raw) {
    const text = raw.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
    const blocks = text.split(/\n[ \t]*\n+/);
    const cues = [];

    for (const block of blocks) {
      const lines = block.split('\n').map((l) => l.replace(/\s+$/, ''));
      // ligne contenant le séparateur de temps
      let tIdx = lines.findIndex((l) => l.includes('-->') || /^\d{1,2}:\d{2}:\d{2}[.,]\d{1,3},/.test(l));
      if (tIdx === -1) continue;

      const tl = lines[tIdx];
      let start = null, end = null;
      if (tl.includes('-->')) {
        const [a, b] = tl.split('-->');
        start = parseTimestamp(a);
        end = parseTimestamp(b || '');
      } else {
        const [a, b] = tl.split(',');
        start = parseTimestamp(a);
        end = parseTimestamp(b || '');
      }
      if (start === null) continue;

      const body = lines.slice(tIdx + 1)
        .map(cleanLine)
        .filter((l) => l.length > 0);
      if (!body.length) continue;

      if (end === null || end <= start) end = start + 2;

      const speaker = takeSpeaker(body);
      const txt = body.join(' ');
      if (!txt) continue;

      cues.push({
        index: cues.length,
        start, end,
        lines: body,
        text: txt,
        speaker,
        words: splitWords(txt, start, end),
      });
    }

    cues.sort((a, b) => a.start - b.start);
    cues.forEach((c, i) => { c.index = i; });
    return cues;
  }

  /** Retire « NOM: » de la 1re ligne et renvoie le nom (ou null). Modifie `body`. */
  function takeSpeaker(body) {
    const sm = body[0].match(SPEAKER_RE);
    if (sm && sm[1].trim().length >= 2 && sm[2].trim().length > 0) {
      body[0] = sm[2].trim();
      return sm[1].trim();
    }
    return null;
  }

  /** Répartit la durée de la réplique sur les mots (proportionnel à leur longueur). */
  function splitWords(txt, start, end) {
    const raw = txt.split(/(\s+)/).filter((s) => s.length);
    const words = raw.filter((s) => !/^\s+$/.test(s));
    const total = words.reduce((n, w) => n + w.length + 1, 0) || 1;
    const dur = Math.max(0.2, end - start);
    let acc = 0;
    return words.map((w) => {
      const share = (w.length + 1) / total;
      const t0 = start + dur * acc;
      acc += share;
      return { w, t0, t1: start + dur * acc };
    });
  }

  /* ==================================================================== */
  /*  Rendu de la transcription                                           */
  /* ==================================================================== */

  function renderCues() {
    el.cues.textContent = '';
    state.cueEls = [];
    state.activeIdx = -1;
    state.lastWordIdx = -1;

    const frag = document.createDocumentFragment();

    state.cues.forEach((cue) => {
      const li = document.createElement('li');
      li.className = 'cue';
      li.dataset.i = cue.index;

      const time = document.createElement('button');
      time.className = 'cue-time';
      time.type = 'button';
      time.textContent = fmtTime(cue.start + state.offset);
      time.title = `Aller à ${fmtTime(cue.start + state.offset)}`;

      const txt = document.createElement('div');
      txt.className = 'cue-text';

      const actions = document.createElement('div');
      actions.className = 'cue-actions';

      const edit = document.createElement('button');
      edit.className = 'cue-edit';
      edit.type = 'button';
      edit.title = 'Modifier le texte (E)';
      edit.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';

      const copy = document.createElement('button');
      copy.className = 'cue-copy';
      copy.type = 'button';
      copy.title = 'Copier cette réplique';
      copy.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>';

      const del = document.createElement('button');
      del.className = 'cue-delete';
      del.type = 'button';
      del.title = 'Supprimer cette réplique (Suppr)';
      del.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

      actions.append(edit, copy, del);
      li.append(time, txt, actions);
      frag.appendChild(li);
      state.cueEls.push(li);
      paintCueText(cue, txt);
    });

    el.cues.appendChild(frag);
    el.scriptEmpty.hidden = state.cues.length > 0;

    updateMeta();
    updateEditBadge();
    sync(true);
  }

  function updateMeta() {
    const words = state.cues.reduce((n, c) => n + c.words.length, 0);
    const last = state.cues[state.cues.length - 1];
    el.cueCount.textContent = `${state.cues.length} répliques`;
    el.wordCount.textContent = `${words.toLocaleString('fr-FR')} mots`;
    el.srtDur.textContent = last ? `jusqu'à ${fmtTime(last.end)}` : '—';
    el.scriptMeta.hidden = state.cues.length === 0;
  }

  /** Construit le contenu texte d'une réplique (mots découpés, ou surlignage de recherche). */
  function paintCueText(cue, container) {
    container.textContent = '';

    if (cue.speaker && el.optSpeaker.checked) {
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

    if (el.optWords.checked) {
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

  function repaintAllText() {
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
      if (li) li.querySelector('.cue-time').textContent = fmtTime(cue.start + state.offset);
    });
  }

  /* ==================================================================== */
  /*  Synchronisation                                                     */
  /* ==================================================================== */

  /** Dernière réplique dont le début est <= t (recherche dichotomique). */
  function findCueAt(t) {
    const c = state.cues;
    let lo = 0, hi = c.length - 1, res = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (c[mid].start <= t) { res = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    return res;
  }

  function sync(force) {
    if (!state.cues.length) { updateOverlay(null); return; }

    const t = (el.player.currentTime || 0) - state.offset;
    let idx = findCueAt(t);
    if (idx === -1) idx = 0;                       // avant la 1re réplique
    const cue = state.cues[idx];
    const speaking = t >= cue.start && t < cue.end;

    if (idx !== state.activeIdx || force) {
      const prev = state.cueEls[state.activeIdx];
      if (prev) { prev.classList.remove('active'); prev.classList.add('past'); }

      state.activeIdx = idx;
      const cur = state.cueEls[idx];
      if (cur) { cur.classList.add('active'); cur.classList.remove('past'); }

      // répliques voisines : gardées lisibles en mode « estompé »
      state.cueEls.forEach((n, i) => {
        n.classList.toggle('near', Math.abs(i - idx) <= 1);
        if (i > idx) n.classList.remove('past');
        else if (i < idx) n.classList.add('past');
      });

      state.lastWordIdx = -1;
      scrollToActive(force === true);
    }

    state.speaking = speaking;
    if (el.optWords.checked && !state.searchTerm) paintWords(cue, t, speaking);
    updateOverlay(speaking ? cue : null);

    // Boucle sur la réplique active
    if (state.loop && speaking === false && el.player.currentTime > cue.end + state.offset - 0.05
        && el.player.currentTime < cue.end + state.offset + 1.2 && !el.player.paused) {
      el.player.currentTime = cue.start + state.offset + 0.01;
    }
  }

  function paintWords(cue, t, speaking) {
    const li = state.cueEls[cue.index];
    if (!li) return;
    const spans = li.querySelectorAll('.w');
    if (!spans.length) return;

    let wIdx = -1;
    if (speaking) {
      for (let i = 0; i < cue.words.length; i++) {
        if (t >= cue.words[i].t0) wIdx = i; else break;
      }
    } else if (t >= cue.end) {
      wIdx = cue.words.length;   // réplique terminée
    }

    if (wIdx === state.lastWordIdx) return;
    state.lastWordIdx = wIdx;

    spans.forEach((s, i) => {
      s.className = 'w ' + (i < wIdx ? 'said' : i === wIdx ? 'now' : 'todo');
    });
  }

  function updateOverlay(cue) {
    if (!el.optOverlay.checked || !el.stage.classList.contains('has-video') || !cue) {
      el.overlayCue.hidden = true;
      return;
    }
    el.overlayCue.hidden = false;
    el.overlayCue.textContent = cue.lines.join(' ');
  }

  /* ---------------------------------------------------- défilement auto */

  function selectionInsideTranscript() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false;
    const node = sel.anchorNode;
    return !!node && el.scriptScroll.contains(node.nodeType === 1 ? node : node.parentNode);
  }

  function scrollToActive(instant) {
    if (!state.follow || state.followPaused) return;
    const node = state.cueEls[state.activeIdx];
    if (!node) return;
    // Ne jamais bouger sous une sélection de texte en cours (copier/coller)
    if (selectionInsideTranscript()) return;

    const box = el.scriptScroll;
    const target = node.offsetTop - box.clientHeight / 2 + node.offsetHeight / 2;
    const clamped = Math.max(0, Math.min(target, box.scrollHeight - box.clientHeight));
    const far = Math.abs(box.scrollTop - clamped) > box.clientHeight * 1.6;

    state.programmaticScroll = Date.now();
    box.scrollTo({ top: clamped, behavior: instant || far ? 'auto' : 'smooth' });
  }

  function pauseFollow() {
    if (!state.follow || state.followPaused) return;
    // ignorer les défilements déclenchés par le code
    if (Date.now() - state.programmaticScroll < 400) return;
    state.followPaused = true;
    el.resumeFollow.hidden = false;
  }

  function resumeFollowNow() {
    state.followPaused = false;
    el.resumeFollow.hidden = true;
    scrollToActive(false);
  }

  el.scriptScroll.addEventListener('wheel', pauseFollow, { passive: true });
  el.scriptScroll.addEventListener('touchmove', pauseFollow, { passive: true });
  el.scriptScroll.addEventListener('mousedown', (e) => {
    // clic sur la barre de défilement
    if (e.offsetX > el.scriptScroll.clientWidth) pauseFollow();
  });
  el.scriptScroll.addEventListener('keydown', (e) => {
    if (['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(e.key)) pauseFollow();
  });
  el.resumeFollow.addEventListener('click', resumeFollowNow);

  /* ---------------------------------------------------------- boucle rAF */

  function tick() {
    sync(false);
    updateProgress();
    state.rafId = requestAnimationFrame(tick);
  }

  function startLoopRAF() {
    if (state.rafId === null) state.rafId = requestAnimationFrame(tick);
  }
  function stopLoopRAF() {
    if (state.rafId !== null) { cancelAnimationFrame(state.rafId); state.rafId = null; }
  }

  /* ==================================================================== */
  /*  Lecteur : contrôles                                                 */
  /* ==================================================================== */

  function togglePlay() {
    if (!el.player.src) { el.mediaInput.click(); return; }
    if (el.player.paused) el.player.play().catch(() => toast('Lecture impossible : format non pris en charge.', 3200));
    else el.player.pause();
  }

  function seek(t) {
    if (!el.player.src || !isFinite(el.player.duration)) return;
    el.player.currentTime = Math.max(0, Math.min(t, el.player.duration));
    sync(true);
    updateProgress();
  }

  function seekToCue(i, resume) {
    const cue = state.cues[i];
    if (!cue) return;
    if (resume) resumeFollowNow();
    seek(cue.start + state.offset + 0.001);
  }

  function jumpCue(delta) {
    if (!state.cues.length) return;
    let i = state.activeIdx;
    if (delta < 0) {
      // si on est au tout début de la réplique, on remonte vraiment à la précédente
      const cur = state.cues[i];
      const t = el.player.currentTime - state.offset;
      i = (cur && t - cur.start > 1) ? i : i - 1;
    } else {
      i = i + 1;
    }
    i = Math.max(0, Math.min(i, state.cues.length - 1));
    seekToCue(i, true);
  }

  function replayCue() {
    if (state.activeIdx >= 0) seekToCue(state.activeIdx, true);
  }

  function updateProgress() {
    const d = el.player.duration;
    const t = el.player.currentTime || 0;
    const pct = isFinite(d) && d > 0 ? (t / d) * 100 : 0;
    el.tlPlayed.style.width = pct + '%';
    el.tlKnob.style.left = pct + '%';
    el.curTime.textContent = fmtTime(t);
    el.timeline.setAttribute('aria-valuenow', Math.round(pct));
  }

  function buildTimelineMarkers() {
    el.tlCues.textContent = '';
    const d = el.player.duration;
    if (!isFinite(d) || d <= 0 || !state.cues.length) return;
    const frag = document.createDocumentFragment();
    for (const c of state.cues) {
      const i = document.createElement('i');
      const left = ((c.start + state.offset) / d) * 100;
      const w = Math.max(0.12, ((c.end - c.start) / d) * 100);
      if (left > 100 || left < 0) continue;
      i.style.left = left + '%';
      i.style.width = w + '%';
      frag.appendChild(i);
    }
    el.tlCues.appendChild(frag);
  }

  /* --------------------------------------------------- barre de progression */

  function tlPct(clientX) {
    const r = el.timeline.querySelector('.tl-track').getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  }

  let tlDragging = false;

  el.timeline.addEventListener('pointerdown', (e) => {
    if (!isFinite(el.player.duration)) return;
    tlDragging = true;
    el.timeline.classList.add('dragging');
    el.timeline.setPointerCapture(e.pointerId);
    seek(tlPct(e.clientX) * el.player.duration);
  });

  el.timeline.addEventListener('pointermove', (e) => {
    const d = el.player.duration;
    if (!isFinite(d)) return;
    const p = tlPct(e.clientX);
    el.tlTooltip.textContent = fmtTime(p * d);
    el.tlTooltip.style.left = (p * 100) + '%';
    if (tlDragging) seek(p * d);
  });

  el.timeline.addEventListener('pointerup', (e) => {
    tlDragging = false;
    el.timeline.classList.remove('dragging');
    try { el.timeline.releasePointerCapture(e.pointerId); } catch (_) {}
  });

  el.timeline.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { seek(el.player.currentTime + 5); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { seek(el.player.currentTime - 5); e.preventDefault(); }
  });

  /* ---------------------------------------------------- événements média */

  el.player.addEventListener('loadedmetadata', () => {
    el.durTime.textContent = fmtTime(el.player.duration);
    buildTimelineMarkers();
    updateProgress();
    sync(true);
  });

  el.player.addEventListener('play', () => {
    document.body.classList.add('playing');
    el.viz.classList.add('playing');
    startLoopRAF();
  });

  el.player.addEventListener('pause', () => {
    document.body.classList.remove('playing');
    el.viz.classList.remove('playing');
    stopLoopRAF();
    sync(false);
    updateProgress();
  });

  el.player.addEventListener('ended', () => {
    document.body.classList.remove('playing');
    el.viz.classList.remove('playing');
    stopLoopRAF();
  });

  el.player.addEventListener('seeked', () => { sync(true); updateProgress(); });
  // filet de securite : si le rAF est bride (onglet en arriere-plan), timeupdate prend le relais
  el.player.addEventListener('timeupdate', () => { sync(false); updateProgress(); });
  el.player.addEventListener('ratechange', updateRateUi);

  el.player.addEventListener('error', () => {
    const ext = extOf(state.mediaFileName);
    toast(`Impossible de lire « ${state.mediaFileName} ». Le navigateur ne décode pas ce format (.${ext}) — convertis-le en .mp4 / .mp3.`, 6000);
  });

  el.player.addEventListener('click', togglePlay);

  el.playBtn.addEventListener('click', togglePlay);
  el.back5.addEventListener('click', () => seek(el.player.currentTime - 5));
  el.fwd5.addEventListener('click', () => seek(el.player.currentTime + 5));
  el.prevCue.addEventListener('click', () => jumpCue(-1));
  el.nextCue.addEventListener('click', () => jumpCue(1));

  el.loopBtn.addEventListener('click', () => {
    state.loop = !state.loop;
    el.loopBtn.setAttribute('aria-pressed', String(state.loop));
    toast(state.loop ? 'Boucle sur la réplique active' : 'Boucle désactivée');
    savePrefs();
  });

  /** Mode écoute (vidéo seulement) : l'image est masquée, la lecture continue au même endroit. */
  function setListen(on) {
    state.listen = on;
    el.stage.classList.toggle('listen', on);
    el.listenBtn.setAttribute('aria-pressed', String(on));
    el.listenBtn.title = on ? 'Réafficher la vidéo (V)' : 'Mode écoute : masquer la vidéo (V)';
    if (el.stage.classList.contains('has-video')) el.audioCard.hidden = !on;
  }

  el.listenBtn.addEventListener('click', () => {
    if (!el.stage.classList.contains('has-video')) return;
    setListen(!state.listen);
    toast(state.listen ? 'Mode écoute : vidéo masquée' : 'Vidéo réaffichée');
  });

  /* ------------------------------------------------ vitesse de lecture */

  const RATE_MIN = 25, RATE_MAX = 400, RATE_STEP = 5;   // en %

  const ratePct = () => Math.round(el.player.playbackRate * 100);

  /** Applique une vitesse en %, bornée à [25, 400]. Renvoie la valeur retenue. */
  function applyRate(pct) {
    pct = Math.round(Math.max(RATE_MIN, Math.min(RATE_MAX, pct)));
    // defaultPlaybackRate : la vitesse survit au chargement d'un nouveau média
    el.player.defaultPlaybackRate = pct / 100;
    el.player.playbackRate = pct / 100;
    updateRateUi();
    return pct;
  }

  function setRate(pct, notify) {
    const v = applyRate(pct);
    if (notify) toast(`Vitesse ${v} %`, 900);
    savePrefs();
  }

  /** ±5 %, en s'alignant sur le multiple de 5 suivant (133 % → 135 % / 130 %). */
  function stepRate(dir, notify) {
    const p = ratePct();
    setRate(dir > 0 ? Math.floor(p / RATE_STEP) * RATE_STEP + RATE_STEP
                    : Math.ceil(p / RATE_STEP) * RATE_STEP - RATE_STEP, notify);
  }

  function updateRateUi() {
    const p = ratePct();
    el.rateRange.value = p;
    if (document.activeElement !== el.rateInput) el.rateInput.value = p;
    el.rateReset.classList.toggle('at-default', p === 100);
  }

  /** « 150 », « 150 % », « 1,5x » ou « 1.5× » → 150. NaN si illisible. */
  function parseRate(str) {
    const s = str.replace(/\s+/g, '').replace(',', '.');
    let m = s.match(/^(\d+(?:\.\d+)?)[x×]$/i);
    if (m) return parseFloat(m[1]) * 100;
    m = s.match(/^(\d+(?:\.\d+)?)%?$/);
    return m ? parseFloat(m[1]) : NaN;
  }

  function commitRateInput() {
    const field = el.rateInput.closest('.speed-field');
    const v = parseRate(el.rateInput.value);
    if (isNaN(v)) {
      field.classList.add('invalid');
      toast(`Valeur invalide : entre ${RATE_MIN} et ${RATE_MAX} %`, 2200);
      el.rateInput.value = ratePct();
      return;
    }
    field.classList.remove('invalid');
    if (v > RATE_MAX) toast(`Maximum ${RATE_MAX} %`, 1600);
    else if (v < RATE_MIN) toast(`Minimum ${RATE_MIN} %`, 1600);
    setRate(v);
    el.rateInput.value = ratePct();
  }

  el.rateRange.addEventListener('input', () => setRate(parseFloat(el.rateRange.value)));
  el.rateRange.addEventListener('dblclick', () => setRate(100));
  el.rateDown.addEventListener('click', () => stepRate(-1));
  el.rateUp.addEventListener('click', () => stepRate(1));
  el.rateReset.addEventListener('click', () => setRate(100));

  el.rateInput.addEventListener('focus', () => el.rateInput.select());
  el.rateInput.addEventListener('input', () => el.rateInput.closest('.speed-field').classList.remove('invalid'));
  el.rateInput.addEventListener('blur', commitRateInput);
  el.rateInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitRateInput(); el.rateInput.select(); }
    else if (e.key === 'Escape') { el.rateInput.value = ratePct(); el.rateInput.blur(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      stepRate(e.key === 'ArrowUp' ? 1 : -1);
      el.rateInput.value = ratePct();
      el.rateInput.select();
    }
  });

  el.muteBtn.addEventListener('click', () => {
    el.player.muted = !el.player.muted;
    document.body.classList.toggle('muted', el.player.muted);
  });

  el.volume.addEventListener('input', () => {
    el.player.volume = parseFloat(el.volume.value);
    el.player.muted = el.player.volume === 0;
    document.body.classList.toggle('muted', el.player.muted);
    savePrefs();
  });

  el.fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else el.stage.requestFullscreen?.();
  });

  /* ==================================================================== */
  /*  Interactions sur la transcription                                   */
  /* ==================================================================== */

  // réplique visée par le 1er clic d'un double-clic : le saut peut faire défiler la liste
  // entre les deux clics, le 2e clic tomberait alors sur une autre réplique
  let clickedIdx = -1;

  el.cues.addEventListener('click', (e) => {
    const li = e.target.closest('.cue');
    if (!li || li.classList.contains('editing')) return;
    const i = +li.dataset.i;

    // bouton supprimer (un double-clic ne doit pas emporter la réplique suivante)
    if (e.target.closest('.cue-delete')) { if (e.detail <= 1) deleteCue(i); return; }

    // bouton modifier
    if (e.target.closest('.cue-edit')) { startEdit(i); return; }

    // bouton copier
    const cp = e.target.closest('.cue-copy');
    if (cp) {
      copyText(state.cues[i].text, 'Réplique copiée');
      cp.classList.add('done');
      setTimeout(() => cp.classList.remove('done'), 900);
      return;
    }

    // 2e clic d'un double-clic : c'est le double-clic qui décide (modifier)
    if (e.detail > 1) return;
    clickedIdx = i;

    // horodatage : toujours un saut
    if (e.target.closest('.cue-time')) { seekToCue(i, true); return; }

    // clic sur le texte : saut seulement s'il n'y a pas de sélection en cours
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && String(sel).trim().length) return;
    seekToCue(i, true);
  });

  // double-clic sur le texte = modifier la réplique
  el.cues.addEventListener('dblclick', (e) => {
    const li = e.target.closest('.cue');
    if (!li || li.classList.contains('editing')) return;
    if (e.target.closest('.cue-actions, .cue-time')) return;
    startEdit(clickedIdx !== -1 ? clickedIdx : +li.dataset.i);
  });

  /* ------------------------------------------- modification du texte */

  function autoGrow(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }

  function startEdit(i) {
    const cue = state.cues[i];
    const li = state.cueEls[i];
    if (!cue || !li) return;
    if (state.editingIdx === i) { li.querySelector('.cue-editor').focus(); return; }
    if (state.editingIdx !== -1) commitEdit();   // une seule réplique à la fois

    state.editingIdx = i;
    state.editResume = !el.player.paused;
    el.player.pause();
    window.getSelection()?.removeAllRanges();

    const box = li.querySelector('.cue-text');
    box.textContent = '';

    const ta = document.createElement('textarea');
    ta.className = 'cue-editor';
    ta.rows = 1;
    ta.spellcheck = true;
    ta.setAttribute('aria-label', 'Texte de la réplique');
    // le nom de l'intervenant reste modifiable, sous la même forme que dans le .srt
    ta.value = (cue.speaker ? cue.speaker + ': ' : '') + cue.lines.join('\n');

    const hint = document.createElement('span');
    hint.className = 'cue-edit-hint';
    hint.innerHTML = '<kbd>Entrée</kbd> valider · <kbd>Maj</kbd>+<kbd>Entrée</kbd> nouvelle ligne · <kbd>Échap</kbd> annuler';

    box.append(ta, hint);
    li.classList.add('editing');

    ta.addEventListener('input', () => autoGrow(ta));
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    });
    // clic ailleurs = on valide
    ta.addEventListener('blur', () => { if (state.editingIdx === i) commitEdit(); });

    autoGrow(ta);
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  function closeEditor(changed) {
    const i = state.editingIdx;
    state.editingIdx = -1;               // avant de retirer la zone (le blur ne doit rien refaire)
    const cue = state.cues[i];
    const li = state.cueEls[i];
    li.classList.remove('editing');
    li.classList.toggle('edited', !!cue.edited);
    paintCueText(cue, li.querySelector('.cue-text'));
    state.lastWordIdx = -1;
    sync(false);
    if (changed) {
      refreshSearchMatches();
      updateMeta();
      updateEditBadge();
      toast('Réplique modifiée');
    }
    if (state.editResume) el.player.play().catch(() => {});
  }

  function cancelEdit() {
    if (state.editingIdx !== -1) closeEditor(false);
  }

  function commitEdit() {
    const i = state.editingIdx;
    if (i === -1) return;
    const cue = state.cues[i];
    const ta = state.cueEls[i].querySelector('.cue-editor');

    const lines = ta.value.split('\n').map(cleanLine).filter((l) => l.length > 0);
    if (!lines.length) {
      toast('Une réplique ne peut pas être vide — modification annulée.', 2800);
      closeEditor(false);
      return;
    }
    const speaker = takeSpeaker(lines);

    const changed = speaker !== cue.speaker || lines.join('\n') !== cue.lines.join('\n');
    if (changed) {
      cue.lines = lines;
      cue.text = lines.join(' ');
      cue.speaker = speaker;
      cue.words = splitWords(cue.text, cue.start, cue.end);
      cue.edited = true;
      state.unsaved.add(cue);
    }
    closeEditor(changed);
  }

  /* ------------------------------------------- suppression d'une réplique */

  /** Retire une réplique (bruit, voix de passage…). Annulable : bouton du toast ou Ctrl+Z. */
  function deleteCue(i) {
    const cue = state.cues[i];
    if (!cue) return;
    if (state.editingIdx !== -1) commitEdit();

    const li = state.cueEls[i];
    state.trash.push({ cue, li, at: i, wasUnsaved: state.unsaved.has(cue) });
    state.cues.splice(i, 1);
    state.cueEls.splice(i, 1);
    li.remove();
    state.unsaved.add(cue);
    reindexFrom(i);
    afterCuesChanged();
    toast('Réplique supprimée', 5000, { label: 'Annuler', run: undoDelete });
  }

  function undoDelete() {
    const t = state.trash.pop();
    if (!t) return;
    if (state.editingIdx !== -1) commitEdit();

    const at = Math.min(t.at, state.cues.length);
    state.cues.splice(at, 0, t.cue);
    state.cueEls.splice(at, 0, t.li);
    el.cues.insertBefore(t.li, state.cueEls[at + 1] || null);
    if (!t.wasUnsaved) state.unsaved.delete(t.cue);

    // le décalage ou la recherche ont pu changer entre-temps
    t.li.classList.remove('active', 'past', 'near');
    const time = t.li.querySelector('.cue-time');
    time.textContent = fmtTime(t.cue.start + state.offset);
    time.title = `Aller à ${fmtTime(t.cue.start + state.offset)}`;
    paintCueText(t.cue, t.li.querySelector('.cue-text'));

    reindexFrom(at);
    afterCuesChanged();
    toast('Réplique restaurée');
  }

  function reindexFrom(k) {
    for (; k < state.cues.length; k++) {
      state.cues[k].index = k;
      state.cueEls[k].dataset.i = k;
    }
  }

  function afterCuesChanged() {
    clickedIdx = -1;
    state.activeIdx = -1;      // force le recalcul de la réplique active
    state.lastWordIdx = -1;
    el.scriptEmpty.hidden = state.cues.length > 0;
    sync(false);
    refreshSearchMatches();
    updateMeta();
    updateEditBadge();
    buildTimelineMarkers();
  }

  function updateEditBadge() {
    const n = state.unsaved.size;
    el.editBadge.hidden = n === 0;
    el.editBadge.textContent = n === 1 ? '1 modification · exporter en .srt' : `${n} modifications · exporter en .srt`;
  }

  window.addEventListener('beforeunload', (e) => {
    if (!state.unsaved.size) return;
    e.preventDefault();
    e.returnValue = '';
  });

  el.followBtn.addEventListener('click', () => {
    state.follow = !state.follow;
    el.followBtn.classList.toggle('on', state.follow);
    el.followBtn.setAttribute('aria-pressed', String(state.follow));
    if (state.follow) { state.followPaused = false; el.resumeFollow.hidden = true; scrollToActive(false); }
    else el.resumeFollow.hidden = true;
    toast(state.follow ? 'Suivi automatique activé' : 'Suivi automatique désactivé');
    savePrefs();
  });

  el.copyAllBtn.addEventListener('click', () => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && String(sel).trim().length) {
      copyText(String(sel), 'Sélection copiée');
      return;
    }
    copyText(plainTranscript(), `Transcription copiée (${state.cues.length} répliques)`);
  });

  function plainTranscript() {
    const out = [];
    let lastSpeaker = null;
    for (const c of state.cues) {
      if (c.speaker && c.speaker !== lastSpeaker) { out.push(`\n${c.speaker} :`); lastSpeaker = c.speaker; }
      out.push(c.text);
    }
    return out.join('\n').trim();
  }

  function timedTranscript() {
    return state.cues
      .map((c) => `[${fmtTime(c.start + state.offset)}] ${c.speaker ? c.speaker + ' : ' : ''}${c.text}`)
      .join('\n');
  }

  function toSrt() {
    return state.cues.map((c, i) => {
      const s = Math.max(0, c.start + state.offset);
      const e = Math.max(0, c.end + state.offset);
      const body = (c.speaker ? c.speaker + ': ' : '') + c.lines.join('\n');
      return `${i + 1}\n${srtTime(s)} --> ${srtTime(e)}\n${body}\n`;
    }).join('\n');
  }

  const baseName = () => (state.srtFileName || state.mediaFileName || 'transcription').replace(/\.[^.]+$/, '');

  el.exportTxt.addEventListener('click', () => {
    if (!state.cues.length) return toast('Aucune transcription chargée.');
    download(baseName() + '.txt', timedTranscript());
    closeMenu();
  });

  function exportSrt() {
    closeMenu();
    if (!state.cues.length) return toast('Aucune transcription chargée.');
    if (state.editingIdx !== -1) commitEdit();
    download(baseName() + '-corrige.srt', toSrt());
    state.unsaved.clear();
    state.trash = [];          // le fichier exporté fait foi : plus rien à annuler
    updateEditBadge();
    toast(`${state.cues.length} répliques exportées en .srt`);
  }

  el.exportSrt.addEventListener('click', exportSrt);
  el.exportSrtBtn.addEventListener('click', exportSrt);
  el.editBadge.addEventListener('click', exportSrt);

  /* ==================================================================== */
  /*  Recherche                                                           */
  /* ==================================================================== */

  let searchTimer = null;

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

  function runSearch() {
    const term = el.search.value.trim().toLowerCase();
    const changed = term !== state.searchTerm;
    state.searchTerm = term;
    if (!changed) return;

    state.matches = findMatches(term);
    state.matchPos = -1;

    repaintAllText();
    showMatchCount();
    if (state.matches.length) stepMatch(1);
  }

  function findMatches(term) {
    return term
      ? state.cues.filter((c) => c.text.toLowerCase().includes(term)).map((c) => c.index)
      : [];
  }

  function showMatchCount() {
    const has = state.matches.length > 0;
    el.searchCount.textContent = state.searchTerm ? (has ? `${state.matches.length} résultats` : 'aucun') : '';
    el.searchNext.hidden = !has;
    el.searchPrev.hidden = !has;
  }

  /** Après une correction : le texte a changé, les résultats aussi (sans déplacer la vue). */
  function refreshSearchMatches() {
    if (!state.searchTerm) return;
    state.matches = findMatches(state.searchTerm);
    state.matchPos = -1;
    showMatchCount();
  }

  function stepMatch(dir) {
    if (!state.matches.length) return;
    state.matchPos = (state.matchPos + dir + state.matches.length) % state.matches.length;
    const idx = state.matches[state.matchPos];

    el.cues.querySelectorAll('mark.hit.current').forEach((m) => m.classList.remove('current'));
    const li = state.cueEls[idx];
    if (!li) return;
    li.querySelectorAll('mark.hit').forEach((m) => m.classList.add('current'));

    pauseFollow();
    const box = el.scriptScroll;
    box.scrollTo({ top: li.offsetTop - box.clientHeight / 2 + li.offsetHeight / 2, behavior: 'smooth' });
    el.searchCount.textContent = `${state.matchPos + 1}/${state.matches.length}`;
  }

  /* ==================================================================== */
  /*  Menu d'options                                                      */
  /* ==================================================================== */

  function openMenu() { el.moreMenu.hidden = false; el.moreBtn.setAttribute('aria-expanded', 'true'); }
  function closeMenu() { el.moreMenu.hidden = true; el.moreBtn.setAttribute('aria-expanded', 'false'); }

  el.moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    el.moreMenu.hidden ? openMenu() : closeMenu();
  });

  document.addEventListener('click', (e) => {
    if (!el.moreMenu.hidden && !el.moreMenu.contains(e.target) && e.target !== el.moreBtn) closeMenu();
  });

  el.optTimes.addEventListener('change', () => {
    el.scriptScroll.classList.toggle('no-times', !el.optTimes.checked);
    savePrefs();
  });

  el.optWords.addEventListener('change', () => { repaintAllText(); savePrefs(); });
  el.optSpeaker.addEventListener('change', () => { repaintAllText(); savePrefs(); });
  el.optOverlay.addEventListener('change', () => { sync(true); savePrefs(); });

  el.optDim.addEventListener('change', () => {
    el.cues.classList.toggle('dim-mode', el.optDim.checked);
    savePrefs();
  });

  el.fontRange.addEventListener('input', () => {
    document.documentElement.style.setProperty('--script-font', el.fontRange.value + 'px');
    scrollToActive(true);
    savePrefs();
  });

  el.moreMenu.querySelectorAll('[data-offset]').forEach((b) => {
    b.addEventListener('click', () => {
      const v = b.dataset.offset;
      state.offset = v === 'reset' ? 0 : Math.round((state.offset + parseFloat(v)) * 10) / 10;
      el.offsetVal.textContent = state.offset.toFixed(1).replace('.', ',') + ' s';
      refreshTimestamps();
      buildTimelineMarkers();
      sync(true);
      savePrefs();
    });
  });

  /* ==================================================================== */
  /*  Thème, aide, toasts                                                 */
  /* ==================================================================== */

  el.themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    savePrefs();
  });

  el.helpBtn.addEventListener('click', () => { el.helpModal.hidden = false; });
  el.helpClose.addEventListener('click', () => { el.helpModal.hidden = true; });
  el.helpModal.addEventListener('click', (e) => { if (e.target === el.helpModal) el.helpModal.hidden = true; });

  /* ==================================================================== */
  /*  Fichiers : inputs + glisser-déposer                                 */
  /* ==================================================================== */

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

  /* ==================================================================== */
  /*  Séparateur redimensionnable                                         */
  /* ==================================================================== */

  let splitDragging = false;

  el.splitter.addEventListener('pointerdown', (e) => {
    splitDragging = true;
    el.splitter.classList.add('dragging');
    el.splitter.setPointerCapture(e.pointerId);
  });

  el.splitter.addEventListener('pointermove', (e) => {
    if (!splitDragging) return;
    const r = el.workspace.getBoundingClientRect();
    const px = Math.max(300, Math.min(e.clientX - r.left, r.width - 320));
    applySplit(px / r.width);
  });

  el.splitter.addEventListener('pointerup', (e) => {
    splitDragging = false;
    el.splitter.classList.remove('dragging');
    try { el.splitter.releasePointerCapture(e.pointerId); } catch (_) {}
    savePrefs();
    scrollToActive(true);
  });

  function applySplit(ratio) {
    if (window.innerWidth <= 900) return;
    state.split = Math.max(0.25, Math.min(0.78, ratio));
    el.workspace.style.gridTemplateColumns = `${(state.split * 100).toFixed(2)}% 6px 1fr`;
  }

  /* ==================================================================== */
  /*  Clavier                                                             */
  /* ==================================================================== */

  function isTyping(t) {
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  }

  document.addEventListener('keydown', (e) => {
    // Recherche : Ctrl/Cmd + F ou Ctrl/Cmd + K
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'k')) {
      e.preventDefault();
      el.search.focus();
      el.search.select();
      return;
    }
    if (e.key === 'Escape' && !el.helpModal.hidden) { el.helpModal.hidden = true; return; }
    if (isTyping(e.target)) return;
    // Ctrl/Cmd + Z : annuler la dernière suppression (hors saisie : là, Ctrl+Z reste celui du navigateur)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z') && state.trash.length) {
      e.preventDefault();
      undoDelete();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {
      case ' ':
      case 'k': case 'K':
        e.preventDefault(); togglePlay(); break;
      case 'ArrowRight': e.preventDefault(); seek(el.player.currentTime + 5); break;
      case 'ArrowLeft':  e.preventDefault(); seek(el.player.currentTime - 5); break;
      case 'l': case 'L': seek(el.player.currentTime + 10); break;
      case 'j': case 'J': seek(el.player.currentTime - 10); break;
      case '.': case '>': jumpCue(1); break;
      case ',': case '<': jumpCue(-1); break;
      case 'r': case 'R': replayCue(); break;
      case 'b': case 'B': el.loopBtn.click(); break;
      case 'c': case 'C':
        if (state.activeIdx >= 0) copyText(state.cues[state.activeIdx].text, 'Réplique copiée');
        break;
      case 'e': case 'E':
        // preventDefault : sinon le « e » est tapé dans la zone qui vient de s'ouvrir
        if (state.activeIdx >= 0) { e.preventDefault(); startEdit(state.activeIdx); }
        break;
      case 'Delete':
        if (state.activeIdx >= 0) { e.preventDefault(); deleteCue(state.activeIdx); }
        break;
      case 's': case 'S': el.followBtn.click(); break;
      case 'v': case 'V': el.listenBtn.click(); break;
      case 'm': case 'M': el.muteBtn.click(); break;
      case 'f': case 'F': el.fsBtn.click(); break;
      case 'ArrowUp':   e.preventDefault(); stepRate(1, true); break;
      case 'ArrowDown': e.preventDefault(); stepRate(-1, true); break;
      case '?': el.helpModal.hidden = false; break;
    }
  });

  /* ==================================================================== */
  /*  Préférences                                                         */
  /* ==================================================================== */

  function savePrefs() {
    const p = {
      theme: document.documentElement.dataset.theme,
      rate: el.player.playbackRate,
      volume: el.player.volume,
      font: el.fontRange.value,
      follow: state.follow,
      loop: state.loop,
      offset: state.offset,
      times: el.optTimes.checked,
      words: el.optWords.checked,
      overlay: el.optOverlay.checked,
      dim: el.optDim.checked,
      speaker: el.optSpeaker.checked,
      split: state.split,
    };
    try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (_) {}
  }

  function loadPrefs() {
    let p = {};
    try { p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch (_) {}

    document.documentElement.dataset.theme = p.theme === 'light' ? 'light' : 'dark';

    el.optTimes.checked   = p.times   !== false;
    el.optWords.checked   = p.words   !== false;
    el.optDim.checked     = p.dim     !== false;
    el.optSpeaker.checked = p.speaker !== false;
    el.optOverlay.checked = p.overlay === true;

    el.fontRange.value = p.font || 18;
    document.documentElement.style.setProperty('--script-font', el.fontRange.value + 'px');

    state.follow = p.follow !== false;
    el.followBtn.classList.toggle('on', state.follow);
    el.followBtn.setAttribute('aria-pressed', String(state.follow));

    state.loop = p.loop === true;
    el.loopBtn.setAttribute('aria-pressed', String(state.loop));

    state.offset = typeof p.offset === 'number' ? p.offset : 0;
    el.offsetVal.textContent = state.offset.toFixed(1).replace('.', ',') + ' s';

    applyRate((p.rate || 1) * 100);

    el.player.volume = typeof p.volume === 'number' ? p.volume : 1;
    el.volume.value = el.player.volume;

    el.cues.classList.toggle('dim-mode', el.optDim.checked);
    el.scriptScroll.classList.toggle('no-times', !el.optTimes.checked);

    state.split = typeof p.split === 'number' ? p.split : null;
    if (state.split) applySplit(state.split);
  }

  loadPrefs();
  updateProgress();
  window.addEventListener('resize', () => scrollToActive(true));
})();
