#!/usr/bin/env bash
# ============================================================
#  publish.sh — pubblica il sito su GitHub Pages (giapponenelmondo.com)
#  Pensato per essere chiamato dall'agente dopo aver rigenerato
#  data/trend_analysis.json (o qualsiasi altro file del sito).
#
#  Uso:   ./publish.sh "messaggio commit (opzionale)"
#  L'autenticazione usa il token GitHub salvato nel Portachiavi macOS
#  (credential.helper = osxkeychain) → push non interattivo.
# ============================================================
set -euo pipefail

cd "$(dirname "$0")"

# Niente da pubblicare? esci pulito.
if [ -z "$(git status --porcelain)" ]; then
  echo "[publish] Nessuna modifica da pubblicare."
  exit 0
fi

MSG="${1:-Aggiornamento automatico report $(date '+%Y-%m-%d %H:%M')}"

git add -A
git commit -q -m "$MSG"
git push -q origin main
echo "[publish] Pubblicato: $MSG"
echo "[publish] Live tra 1-2 min su https://giapponenelmondo.com"
