#!/usr/bin/env python3
# ============================================================
#  healthcheck.py — debug settimanale del sito giapponenelmondo.com
#  Gira ogni mercoledì (LaunchAgent com.giapponenelmondo.healthcheck).
#  Controlla il sito LIVE come lo vedrebbe un visitatore + lo stato git,
#  poi manda un'email riepilogo PASS/FAIL.
#
#  Solo libreria standard: nessuna dipendenza, nessun venv.
# ============================================================
import json
import os
import re
import smtplib
import ssl
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate
from pathlib import Path

SITE = "https://giapponenelmondo.com"
REPO = Path(__file__).resolve().parent
ENV_FILE = REPO.parent / "agenzia-giappone-nel-mondo" / "dipartimenti" / "trend-analysis" / ".env"
RSS = "https://api.rss2json.com/v1/api.json?rss_url="
YT_FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=UCiVT7kU5ZLDy-rEDX6ZhxCQ"

UA = {"User-Agent": "Mozilla/5.0 (healthcheck giapponenelmondo)"}


# ── utilità HTTP ────────────────────────────────────────────
def _get(url, timeout=20):
    """Ritorna (status_code, body_text). status 0 = errore di rete."""
    cb = ("&" if "?" in url else "?") + "cb=" + datetime.now().strftime("%H%M%S%f")
    req = urllib.request.Request(url + cb, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        # leggi comunque il corpo: la 404.html di GitHub Pages arriva con status 404
        try:
            return e.code, e.read().decode("utf-8", "replace")
        except Exception:
            return e.code, ""
    except Exception:
        return 0, ""


# ── singoli check ───────────────────────────────────────────
def check(results, name, ok, detail=""):
    results.append({"name": name, "ok": bool(ok), "detail": detail})
    flag = "✓" if ok else "✗"
    print(f"  {flag} {name} — {detail}")


def run_checks():
    res = []

    # 1-4. Pagine principali rispondono 200
    for path, label in [("/", "Home"), ("/dashboard.html", "Dashboard"),
                        ("/report.html", "Report"), ("/404.html", "Pagina 404")]:
        code, _ = _get(SITE + path)
        check(res, f"Pagina {label} ({path})", code == 200, f"HTTP {code}")

    # 5. trend_analysis.json raggiungibile + JSON valido + freschezza
    code, body = _get(SITE + "/data/trend_analysis.json")
    if code != 200:
        check(res, "Dati report (trend_analysis.json)", False, f"HTTP {code}")
    else:
        try:
            data = json.loads(body)
            gen = data.get("generated_at", "")
            age_days = None
            try:
                dt = datetime.strptime(gen[:16], "%Y-%m-%d %H:%M")
                age_days = (datetime.now() - dt).days
            except Exception:
                pass
            fresh = age_days is not None and age_days <= 6
            check(res, "Dati report — JSON valido", True,
                  f"generato {gen} ({data.get('overview', {}) and 'overview ok'})")
            check(res, "Dati report — freschezza",
                  fresh,
                  f"{age_days} giorni fa" if age_days is not None
                  else "data non leggibile")
        except Exception as e:
            check(res, "Dati report — JSON valido", False, f"parse error: {e}")

    # 6. YouTube: il feed (via rss2json) torna video — il bug storico
    code, body = _get(RSS + urllib.parse.quote(YT_FEED, safe=""))
    yt_ok, yt_detail = False, f"HTTP {code}"
    if code == 200:
        try:
            d = json.loads(body)
            n = len(d.get("items", []))
            yt_ok = d.get("status") == "ok" and n > 0
            yt_detail = f"status={d.get('status')} · {n} video"
        except Exception as e:
            yt_detail = f"parse error: {e}"
    check(res, "YouTube — feed video", yt_ok, yt_detail)

    # 7. Regressione: main.js live NON deve contenere il vecchio bug &count
    code, body = _get(SITE + "/js/main.js")
    no_bug = code == 200 and "count=6" not in body and "count=8" not in body
    check(res, "Regressione rss2json (&count assente)", no_bug,
          "ok" if no_bug else "ATTENZIONE: parametro count ricomparso")

    # 8. Un feed dashboard di esempio (Japan Times) funziona
    jt = "https://www.japantimes.co.jp/feed/"
    code, body = _get(RSS + urllib.parse.quote(jt, safe=""))
    jt_ok = False
    try:
        jt_ok = code == 200 and json.loads(body).get("status") == "ok"
    except Exception:
        pass
    check(res, "Feed dashboard (Japan Times)", jt_ok, f"HTTP {code}")

    # 9. Vecchi link /giapponenelmondo/ reindirizzati dalla 404.html
    code, body = _get(SITE + "/giapponenelmondo/dashboard.html")
    redir_ok = "Ti sto riportando al sito" in body
    check(res, "Redirect vecchi link (404.html)", redir_ok,
          "attivo" if redir_ok else "404.html non serve il redirect")

    # 10. Git: locale allineato al remoto (niente push mancanti)
    try:
        subprocess.run(["git", "fetch", "-q", "origin"], cwd=REPO, timeout=30)
        local = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip()
        remote = subprocess.check_output(["git", "rev-parse", "origin/main"], cwd=REPO, text=True).strip()
        check(res, "Git — locale allineato a GitHub", local == remote,
              "in sync" if local == remote else "ci sono commit non pushati")
    except Exception as e:
        check(res, "Git — locale allineato a GitHub", False, f"errore: {e}")

    return res


# ── email ───────────────────────────────────────────────────
def load_env():
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


def build_html(results, n_fail):
    oggi = datetime.now().strftime("%d/%m/%Y %H:%M")
    head = "❌ Problemi rilevati" if n_fail else "✅ Tutto funzionante"
    rows = ""
    for r in results:
        color = "#16a34a" if r["ok"] else "#dc2626"
        icon = "✓" if r["ok"] else "✗"
        rows += (f'<tr><td style="padding:7px 10px;font-size:20px;color:{color}">{icon}</td>'
                 f'<td style="padding:7px 10px;font-weight:600">{r["name"]}</td>'
                 f'<td style="padding:7px 10px;color:#666;font-size:13px">{r["detail"]}</td></tr>')
    return f"""<div style="font-family:-apple-system,Inter,sans-serif;max-width:640px;margin:auto">
      <h2 style="font-weight:600">{head}</h2>
      <p style="color:#666">Debug automatico del sito · {oggi}<br>
      {len(results) - n_fail}/{len(results)} controlli superati</p>
      <table style="border-collapse:collapse;width:100%;border:1px solid #eee">{rows}</table>
      <p style="color:#999;font-size:12px;margin-top:18px">
        giapponenelmondo.com · healthcheck settimanale (mercoledì)</p>
    </div>"""


def send_email(results, n_fail):
    env = load_env()
    addr, pwd, dest = env.get("GMAIL_ADDRESS"), env.get("GMAIL_APP_PASSWORD"), env.get("EMAIL_DESTINATARIO")
    if not (addr and pwd and dest):
        print("  ⚠ Credenziali email mancanti — email saltata (vedi log per i risultati)")
        return False
    oggi = datetime.now().strftime("%d/%m/%Y")
    prefix = f"❌ {n_fail} problemi" if n_fail else "✅ tutto ok"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[Sito GnM] Debug settimanale — {prefix} ({oggi})"
    msg["From"] = f"Healthcheck GnM <{addr}>"
    msg["To"] = dest
    msg["Date"] = formatdate(localtime=True)
    plain = f"Debug sito giapponenelmondo.com\n{len(results)-n_fail}/{len(results)} ok\n" + \
            "\n".join(f"{'OK' if r['ok'] else 'FAIL'} - {r['name']} ({r['detail']})" for r in results)
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(build_html(results, n_fail), "html", "utf-8"))
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ssl.create_default_context()) as s:
            s.login(addr, pwd)
            s.sendmail(addr, dest, msg.as_string())
        print(f"  ✓ Email inviata a {dest}")
        return True
    except Exception as e:
        print(f"  ✗ Invio email fallito: {e}")
        return False


def main():
    print("=" * 50)
    print(f"  HEALTHCHECK SITO — {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print("=" * 50)
    results = run_checks()
    n_fail = sum(1 for r in results if not r["ok"])
    print("-" * 50)
    print(f"  Risultato: {len(results) - n_fail}/{len(results)} ok, {n_fail} problemi")

    # Stato salvato per eventuale uso futuro nella dashboard
    try:
        (REPO / "data" / "healthcheck.json").write_text(json.dumps({
            "checked_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "passed": len(results) - n_fail, "total": len(results),
            "results": results,
        }, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"  ⚠ Salvataggio stato fallito: {e}")

    # Email SEMPRE (così sai che il controllo è girato), evidenziando i fail
    send_email(results, n_fail)
    # exit code != 0 se ci sono problemi (utile nei log del LaunchAgent)
    sys.exit(1 if n_fail else 0)


if __name__ == "__main__":
    main()
