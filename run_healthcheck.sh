#!/bin/bash
# run_healthcheck.sh — wrapper per il debug settimanale del sito.
# Invocato dal LaunchAgent com.giapponenelmondo.healthcheck (Mercoledì 10:00).
set -u

REPO="/Volumes/ssd02/Dropbox/claude_workspace/giapponenelmondo"
PYTHON="/usr/local/bin/python3"
LOG="$REPO/logs/healthcheck_$(date +%Y-%m-%d).log"

export PATH="/usr/local/bin:/usr/bin:/bin"

# Guardia: SSD montato?
if [ ! -d "$REPO" ]; then
  echo "$(date '+%F %T') ✗ Repo non trovato ($REPO) — SSD non montato?" >> "/tmp/healthcheck.err.log"
  exit 1
fi

mkdir -p "$REPO/logs"
cd "$REPO" || exit 1

# Fallback a python3 di sistema se /usr/local/bin/python3 non c'è
[ -x "$PYTHON" ] || PYTHON="/usr/bin/python3"

echo "===== $(date '+%F %T') — healthcheck =====" >> "$LOG"
"$PYTHON" healthcheck.py >> "$LOG" 2>&1
echo "===== $(date '+%F %T') — fine (exit $?) =====" >> "$LOG"
