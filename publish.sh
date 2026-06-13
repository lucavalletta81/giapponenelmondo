#!/usr/bin/env bash
# ============================================================
#  publish.sh — pubblica il sito su GitHub Pages (giapponenelmondo.com)
#  Pensato per essere chiamato dall'agente dopo aver rigenerato
#  data/trend_analysis.json (o qualsiasi altro file del sito).
#
#  Uso:   ./publish.sh "messaggio commit (opzionale)"
#  Cosa fa:
#    1. timbra la data/ora corrente in OGNI pagina (index, dashboard, report)
#       sostituendo il testo tra <!--STAMP--> e <!--/STAMP-->
#    2. commit + push su GitHub (token nel Portachiavi macOS → non interattivo)
# ============================================================
set -euo pipefail

cd "$(dirname "$0")"

# ── 1. Timbra la data su ogni pagina ────────────────────────
STAMP="Aggiornato il $(date '+%d/%m/%Y %H:%M')"
/usr/bin/env python3 - "$STAMP" <<'PY'
import re, sys, pathlib
stamp = sys.argv[1]
pages = ["index.html", "dashboard.html", "report.html"]
pat = re.compile(r"(<!--STAMP-->).*?(<!--/STAMP-->)", re.DOTALL)
for name in pages:
    p = pathlib.Path(name)
    if not p.exists():
        continue
    txt = p.read_text(encoding="utf-8")
    new = pat.sub(lambda m: m.group(1) + stamp + m.group(2), txt)
    if new != txt:
        p.write_text(new, encoding="utf-8")
        print(f"  timbrato: {name}")
PY

# ── 2. Commit ───────────────────────────────────────────────
MSG="${1:-Aggiornamento automatico report $(date '+%Y-%m-%d %H:%M')}"

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -q -m "$MSG"
else
  echo "[publish] Nessuna modifica nuova da committare."
fi

# ── 3. Riallinea col remoto ─────────────────────────────────
# Se su GitHub sono arrivati commit da altre parti (altre sessioni,
# Actions), il push verrebbe rifiutato e il sito resterebbe fermo.
# Rebase del lavoro locale sopra il remoto; sui file generati in
# conflitto vince la versione locale (più recente: -X theirs in rebase).
if ! git pull --rebase -X theirs origin main; then
  git rebase --abort 2>/dev/null || true
  echo "[publish] ERRORE: riallineamento col remoto fallito (rebase). Sito NON aggiornato." >&2
  exit 1
fi

# ── 4. Push ─────────────────────────────────────────────────
if [ -z "$(git rev-list origin/main..main 2>/dev/null)" ]; then
  echo "[publish] Niente da pubblicare: il sito è già allineato."
  exit 0
fi

if ! git push -q origin main; then
  echo "[publish] ERRORE: push fallito. Controllare l'autenticazione (gh auth status / portachiavi). Sito NON aggiornato." >&2
  exit 1
fi
echo "[publish] Pubblicato: $MSG"
echo "[publish] Live tra 1-2 min su https://giapponenelmondo.com"
