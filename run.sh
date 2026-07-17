#!/usr/bin/env bash
set -e

cd "$(dirname "${BASH_SOURCE[0]}")"
source ~/.venvs/inversiones/bin/activate

URL="http://localhost:5000"
# Abre el navegador cuando el servidor ya esté escuchando
(
  for _ in $(seq 1 30); do
    if curl -sf "$URL" >/dev/null 2>&1; then
      xdg-open "$URL" >/dev/null 2>&1 || true
      break
    fi
    sleep 0.2
  done
) &

python app.py
