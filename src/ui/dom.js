/* =========================================================================
   Références vers les éléments de index.html.
   Le script est chargé en module (différé) : le DOM est déjà prêt ici.
   ========================================================================= */

const $ = (id) => document.getElementById(id);

export const el = {
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
