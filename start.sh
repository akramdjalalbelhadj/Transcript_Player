#!/usr/bin/env bash
# =========================================================================
#  SRT Reader — lance l'application dans le navigateur
#
#  Usage :  ./start.sh [port] [--no-open]
#     port       port local à utiliser (8765 par défaut)
#     --no-open  ne pas ouvrir le navigateur automatiquement
#
#  Sert le dossier en local (127.0.0.1 uniquement) avec Python, sinon Node.
#  Sans l'un ni l'autre, ouvre directement index.html (file://).
#  Ctrl+C pour arrêter.
# =========================================================================

set -euo pipefail

PORT=8765
OPEN=1
for arg in "$@"; do
  case "$arg" in
    --no-open) OPEN=0 ;;
    -h|--help) sed -n '3,11p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    ''|*[!0-9]*) echo "Argument inconnu : $arg (attendu : un numéro de port ou --no-open)" >&2; exit 1 ;;
    *) PORT="$arg" ;;
  esac
done

# toujours servir le dossier du script, d'où qu'on le lance
cd "$(dirname "$0")"

URL="http://localhost:$PORT"

open_url() {
  [ "$OPEN" = 1 ] || return 0
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) cmd.exe //c start "" "$1" >/dev/null 2>&1 ;;
    Darwin*)              open "$1" ;;
    *)                    xdg-open "$1" >/dev/null 2>&1 || echo "Ouvre $1 dans ton navigateur." ;;
  esac
}

# Windows installe des alias « python » qui ouvrent le Microsoft Store au lieu
# de lancer Python : on vérifie que l'interpréteur fonctionne vraiment.
find_python() {
  for cmd in python3 python py; do
    if command -v "$cmd" >/dev/null 2>&1 && "$cmd" -c 'import http.server' >/dev/null 2>&1; then
      echo "$cmd"; return 0
    fi
  done
  return 1
}

# Petit serveur statique Node, avec prise en charge des requêtes « Range »
# (nécessaires pour avancer / reculer dans une vidéo).
NODE_SERVER='
const http = require("http"), fs = require("fs"), path = require("path");
const root = process.cwd(), port = +process.env.PORT;
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml",
  ".srt": "text/plain; charset=utf-8", ".vtt": "text/vtt; charset=utf-8", ".sbv": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".ogg": "audio/ogg",
  ".flac": "audio/flac", ".aac": "audio/aac", ".opus": "audio/ogg",
};
http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(req.url.split("?")[0]); } catch (_) { res.writeHead(400); return res.end(); }
  const file = path.join(root, rel === "/" ? "index.html" : rel);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end("404"); }
    const head = { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream", "Accept-Ranges": "bytes" };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (m) {
      const start = m[1] ? +m[1] : Math.max(0, st.size - +m[2]);
      const end = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      if (start > end) { res.writeHead(416, { "Content-Range": `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, { ...head, "Content-Range": `bytes ${start}-${end}/${st.size}`, "Content-Length": end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...head, "Content-Length": st.size });
    fs.createReadStream(file).pipe(res);
  });
}).on("error", (e) => {
  if (e.code !== "EADDRINUSE") console.error(e.message);   // port pris : message affiché par le script
  process.exit(1);
}).listen(port, "127.0.0.1");
'

if PY="$(find_python)"; then
  echo "SRT Reader → $URL   (serveur : $PY, Ctrl+C pour arrêter)"
  "$PY" -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
elif command -v node >/dev/null 2>&1; then
  echo "SRT Reader → $URL   (serveur : node, Ctrl+C pour arrêter)"
  PORT="$PORT" node -e "$NODE_SERVER" &
else
  echo "Ni Python ni Node trouvé : ouverture directe de index.html."
  echo "(La plupart des fonctions marchent ; si la copie est bloquée, installe Python ou Node.)"
  OPEN=1
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) open_url "$(pwd -W)/index.html" ;;
    *)                    open_url "file://$(pwd)/index.html" ;;
  esac
  exit 0
fi

SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null; echo; echo "Serveur arrêté."' INT TERM EXIT

# laisse le serveur démarrer ; s'il s'est arrêté tout de suite, le port est pris
sleep 1
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  wait "$SERVER_PID" || true
  echo "Impossible de démarrer le serveur sur le port $PORT (déjà utilisé ?). Essaie : ./start.sh $((PORT + 1))" >&2
  trap - EXIT
  exit 1
fi

open_url "$URL"
wait "$SERVER_PID"
