#!/usr/bin/env bash
set -e

cd "$(dirname "${BASH_SOURCE[0]}")"

# GET / sirve frontend/dist/ (build de Vite, gitignored) -- se reconstruye
# aquí para no arrancar nunca contra un build desactualizado.
(cd frontend && npm run build)

URL="http://localhost:8000"
# Abre el navegador cuando el servidor ya esté escuchando
(
  for _ in $(seq 1 30); do
    if curl -sf "$URL" >/dev/null 2>&1; then
      google-chrome "$URL" >/dev/null 2>&1 || xdg-open "$URL" >/dev/null 2>&1 || true
      break
    fi
    sleep 0.2
  done
) &

uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
