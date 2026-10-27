# SRT Reader

Lecteur **audio / vidéo + transcription synchronisée**, pensé pour lire, suivre et **copier-coller** du texte à n'importe quel moment de l'écoute.

Tout se passe dans le navigateur : **aucun fichier n'est envoyé nulle part**, aucune dépendance à installer.

---

## Démarrer

```bash
./start.sh            # port 8765, ouvre le navigateur
./start.sh 9000       # autre port
./start.sh --no-open  # sans ouvrir le navigateur
npm start             # équivalent de ./start.sh
```

Le script sert le dossier en local (`127.0.0.1` uniquement) avec Python, ou Node à défaut, et ouvre `http://localhost:8765`. `Ctrl+C` pour l'arrêter.

> Le double-clic sur `index.html` ne suffit pas : le code est découpé en modules JavaScript (`import` / `export`), que les navigateurs refusent de charger depuis `file://`. Le serveur local ne fait que distribuer les fichiers à ton navigateur ; tes médias restent sur ta machine.

Puis :
1. bouton **Média** → ton `.mp4`, `.m4a`, `.mp3`…
2. bouton **Sous-titres** → ton `.srt` (ou `.vtt`)

Tu peux aussi **glisser-déposer les deux fichiers d'un coup** n'importe où sur la page.

Un exemple est fourni dans `demo/` (`demo.srt` + `demo.wav` + `demo-video.mp4`) pour essayer tout de suite.

---

## Ce que ça fait

**Le texte reste toujours sous tes yeux**
- La réplique en cours est surlignée et **maintenue au centre du panneau** : jamais besoin de faire défiler pour la retrouver.
- **Surlignage mot par mot** à l'intérieur de la réplique, qui suit le rythme de la parole.
- Les répliques inactives sont estompées (désactivable), les répliques déjà lues sont grisées.
- Option **sous-titre incrusté** par-dessus la vidéo, comme un lecteur classique.

**Copier-coller à tout moment**
- Sélectionne n'importe quel passage à la souris et fais `Ctrl+C` : **tant que du texte est sélectionné, le défilement automatique se met en pause** et le clic ne déclenche aucun saut. Rien ne bouge sous ta sélection.
- Bouton **copier** sur chaque réplique (au survol), touche `C` pour copier la réplique en cours.
- **Tout copier** : la transcription entière (ou la sélection en cours si tu en as une).
- Bouton **Exporter .srt** (en haut de la transcription) : télécharge `<nom>-corrige.srt` avec le décalage de synchro, tes corrections et tes suppressions appliqués, répliques renumérotées.
- Export **`.txt`** (avec horodatages) dans **Options**.

**Corriger le texte**
- **Double-clic sur le texte** d’une réplique, bouton **crayon** (au survol), ou touche `E` pour la réplique en cours.
- `Entrée` valide, `Maj+Entrée` passe à la ligne, `Échap` annule, cliquer ailleurs valide. La lecture se met en pause pendant l’édition et reprend ensuite.
- Le nom de l’intervenant (`NOM:` en début de texte) se corrige de la même façon.
- Seul le texte est modifiable, les horodatages ne changent pas.

**Supprimer une réplique parasite** (bruit, quelqu’un qui parle près du micro…)
- Bouton **corbeille** sur chaque réplique (au survol), ou touche `Suppr` pour la réplique en cours.
- Une erreur ? **Annuler** dans la notification, ou `Ctrl+Z` (plusieurs fois pour remonter plusieurs suppressions).

Les répliques corrigées sont marquées d’un point, et un badge compte les modifications (corrections + suppressions) pas encore exportées : un clic dessus télécharge le `.srt` corrigé.

**Navigation**
- Clic sur une réplique (ou son horodatage) → le média saute à ce moment.
- Barre de progression avec les répliques matérialisées, ±5 s / ±10 s.
- **Vitesse de lecture de 25 % à 400 %** : curseur, boutons `−` / `+` (par pas de 5 %) ou saisie directe (`150`, `133 %`, `1,5x`…). Double-clic sur le curseur ou bouton `100 %` pour revenir à la normale.
- **Boucle** sur la réplique en cours (`B`) — pratique pour retranscrire un passage difficile.
- **Mode écoute** (`V`, bouton œil, vidéo uniquement) : masque l'image et affiche l'animation audio, la lecture continue ; re-cliquer réaffiche la vidéo là où elle en est.
- **Recherche** dans toute la transcription, avec navigation entre les résultats.
- **Décalage de synchro** par pas de 0,1 s si le `.srt` est décalé par rapport au média.

**Confort**
- Thème sombre / clair, taille du texte réglable, colonnes redimensionnables.
- Détection des intervenants (`NOM:` en début de réplique) affichés en couleur.
- Toutes les préférences sont mémorisées d'une session à l'autre.

---

## Raccourcis clavier

| Touche | Action |
|---|---|
| `Espace` / `K` | Lecture / pause |
| `←` `→` | −5 s / +5 s |
| `J` `L` | −10 s / +10 s |
| `,` `.` | Réplique précédente / suivante |
| `R` | Rejouer la réplique en cours |
| `B` | Boucler la réplique en cours |
| `C` | Copier la réplique en cours |
| `E` | Modifier le texte de la réplique en cours |
| `Suppr` | Supprimer la réplique en cours |
| `Ctrl+Z` | Annuler la dernière suppression |
| `S` | Suivi automatique on / off |
| `↑` `↓` | Vitesse de lecture ±5 % |
| `V` | Mode écoute : masquer / réafficher la vidéo |
| `M` | Couper le son |
| `F` | Plein écran |
| `Ctrl+F` | Rechercher dans le texte |
| `Entrée` / `Maj+Entrée` | Résultat suivant / précédent |

---

## Formats

| | Pris en charge |
|---|---|
| **Sous-titres** | `.srt`, `.vtt`, `.sbv` — encodage UTF-8 **ou** Windows-1252 (détecté automatiquement, accents préservés) |
| **Audio** | `.mp3`, `.m4a`, `.wav`, `.ogg`, `.flac`, `.aac`, `.opus` |
| **Vidéo** | `.mp4`, `.webm`, `.mov` (et `.mkv` selon le navigateur) |

⚠️ **`.avi`, `.mkv`, `.wmv`, `.flv`** : ces conteneurs ne sont pas décodés par tous les navigateurs — c'est une limite du navigateur, pas de l'app. L'app te prévient quand la lecture échoue. Conversion rapide :

```bash
ffmpeg -i entree.avi -c:v libx264 -c:a aac sortie.mp4
```

---

## Notes techniques

- HTML / CSS / JavaScript natifs (modules ES), **zéro dépendance**, zéro build.
- Le média est lu via `URL.createObjectURL` : le fichier n'est jamais copié ni téléversé, même un fichier de plusieurs Go s'ouvre instantanément.
- Le **surlignage mot par mot est une estimation** : un `.srt` ne contient pas le timing de chaque mot, la durée de la réplique est répartie proportionnellement à la longueur des mots. Le surlignage de la réplique, lui, est exact.
- Le surlignage mot par mot est suspendu pendant une recherche (les deux se disputeraient le même texte).

---

## Architecture

Le code est organisé **en couches** : chaque couche ne dépend que de celles du dessous, jamais l'inverse.

```
index.html              structure de la page
src/
├── main.js             point d'entrée : initialise chaque module d'interface
├── core/               LOGIQUE MÉTIER PURE — aucun accès au DOM ni au navigateur, testée
│   ├── subtitle-parser.js     SRT / VTT / SBV → répliques
│   ├── cue.js                 réplique : nettoyage, intervenant, mots, recherche, correction
│   ├── transcript-format.js   export .srt, texte brut, texte horodaté
│   ├── time.js                formats de temps (00:00, 00:00:00,000)
│   ├── playback-rate.js       vitesse : bornes, pas de 5 %, saisie libre
│   ├── media-type.js          vidéo / audio / sous-titres d'après le fichier
│   ├── encoding.js            UTF-8 ou Windows-1252
│   └── settings.js            préférences : valeurs par défaut et validation
├── infra/              ACCÈS AUX API DU NAVIGATEUR (stockage, presse-papiers, téléchargement)
├── app/                ÉTAT PARTAGÉ
│   ├── store.js               `settings` (sauvegardées) + `state` (session en cours)
│   └── events.js              bus d'événements entre modules
├── ui/                 INTERFACE — un module par zone de l'écran
│   ├── player.js, timeline.js, speed-control.js     lecteur et contrôles
│   ├── file-loader.js, options-menu.js, layout.js, theme.js, help-modal.js
│   ├── keyboard.js            tous les raccourcis clavier, en un seul tableau
│   └── transcript/            liste, synchro, suivi auto, édition, suppression, recherche, export
└── styles/             une feuille par zone, assemblées par main.css
tests/                  tests unitaires de core/ (node:test, sans dépendance)
```

**Règles suivies**
- **`core/` est pur** : entrées → sorties, sans DOM. C'est là qu'est la logique délicate (analyse des formats, calculs de temps), et c'est ce qui est testé.
- **Dépendances à sens unique** : `ui → app → infra / core`. Aucun import circulaire.
- **Communication par événements** : un module appelle directement ceux dont il dépend ; pour prévenir les autres, il émet un événement (`media:time`, `cues:changed`, `setting:changed`…). Le lecteur, par exemple, ignore tout de la transcription : il annonce la position de lecture, la transcription s'y synchronise.
- **Préférences centralisées** : toujours modifiées via `setSetting()`, qui sauvegarde et prévient les modules concernés.

**Tests**

```bash
npm test        # Node 21 ou plus récent
```
