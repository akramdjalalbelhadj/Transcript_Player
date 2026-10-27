/* =========================================================================
   SRT Reader — lecteur média + transcription synchronisée
   100 % local : aucun fichier ne quitte la machine.

   Point d'entrée : branche chaque module d'interface sur la page.
   Organisation du code (voir README) :
     core/   logique métier pure (analyse, formats, calculs) — sans DOM, testée
     infra/  accès aux API du navigateur (stockage, presse-papiers, téléchargement)
     app/    état partagé + bus d'événements entre modules
     ui/     un module par zone de l'interface
   ========================================================================= */

import { initTheme } from './ui/theme.js';
import { initPlayer } from './ui/player.js';
import { initSpeedControl } from './ui/speed-control.js';
import { initTimeline } from './ui/timeline.js';
import { initAutoscroll } from './ui/transcript/autoscroll.js';
import { initSync } from './ui/transcript/sync.js';
import { initCueList } from './ui/transcript/cue-list.js';
import { initMetaBar } from './ui/transcript/meta-bar.js';
import { initCueInteractions } from './ui/transcript/cue-interactions.js';
import { initNavigation } from './ui/transcript/navigation.js';
import { initSearch } from './ui/transcript/search.js';
import { initExport } from './ui/transcript/export.js';
import { initOptionsMenu } from './ui/options-menu.js';
import { initFileLoader } from './ui/file-loader.js';
import { initLayout } from './ui/layout.js';
import { initHelpModal } from './ui/help-modal.js';
import { initKeyboard } from './ui/keyboard.js';

initTheme();
initPlayer();
initSpeedControl();
initTimeline();
initAutoscroll();
initSync();
initCueList();
initMetaBar();
initCueInteractions();
initNavigation();
initSearch();
initExport();
initOptionsMenu();
initFileLoader();
initLayout();
initHelpModal();
initKeyboard();
