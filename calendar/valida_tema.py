#!/usr/bin/env python3
"""
valida_tema.py — test di domanda per un'idea video, PRIMA di produrla.

Cerca i video comparabili su YouTube (IT e EN), ne misura views e
view-velocity, e risponde alla domanda che il radar non sa fare:
«questo tema lo cerca/guarda davvero qualcuno, e quanto rende in italiano?»

Uso:
  python3 valida_tema.py "storia canon" ["history of canon cameras"]
  (secondo argomento = query EN; se assente, usa la stessa query)

Lettura del verdetto:
  - mediana IT dei comparabili ≈ quello che può aspettarsi un canale piccolo
  - il massimo IT dice il tetto del tema nel mercato italiano
  - EN dice se esiste un genere da cui tradurre/anticipare
"""
import os, sys, statistics
BASE = "/Volumes/ssd02/Dropbox/claude_workspace/agenzia-giappone-nel-mondo/dipartimenti/trend-analysis"
sys.path.insert(0, BASE)
from dotenv import load_dotenv
load_dotenv(os.path.join(BASE, ".env"))
from googleapiclient.discovery import build
from datetime import datetime, timezone

def cerca(yt, q, lang, region, n=8):
    r = yt.search().list(q=q, part="snippet", type="video", relevanceLanguage=lang,
                         regionCode=region, order="relevance", maxResults=n).execute()
    ids = [i["id"]["videoId"] for i in r.get("items", [])]
    if not ids: return []
    s = yt.videos().list(part="statistics,snippet", id=",".join(ids)).execute()
    out = []
    for it in s.get("items", []):
        v = int(it["statistics"].get("viewCount", 0))
        pub = it["snippet"]["publishedAt"]
        giorni = max((datetime.now(timezone.utc) - datetime.fromisoformat(pub.replace("Z", "+00:00"))).days, 1)
        out.append({"views": v, "vpd": round(v / giorni, 1), "data": pub[:10],
                    "canale": it["snippet"]["channelTitle"][:24], "titolo": it["snippet"]["title"][:64]})
    out.sort(key=lambda x: -x["views"])
    return out

def stampa(nome, res):
    print(f"\n───── {nome} ─────")
    if not res:
        print("  nessun risultato")
        return
    for r in res:
        print(f"  {r['views']:>10,}v  {r['vpd']:>7}/g  {r['data']}  {r['canale']:24s} {r['titolo']}")
    vv = [r["views"] for r in res]
    print(f"  → mediana {statistics.median(vv):,.0f} · max {max(vv):,.0f}")

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    q_it = sys.argv[1]
    q_en = sys.argv[2] if len(sys.argv) > 2 else q_it
    yt = build("youtube", "v3", developerKey=os.environ["YOUTUBE_API_KEY"])
    it = cerca(yt, q_it, "it", "IT")
    en = cerca(yt, q_en, "en", "US")
    stampa(f"ITALIA — «{q_it}»", it)
    stampa(f"EN — «{q_en}»", en)
    if it:
        med = statistics.median([r["views"] for r in it])
        recenti = [r for r in it if r["data"] >= "2025-01-01"]
        med_rec = statistics.median([r["views"] for r in recenti]) if recenti else 0
        print(f"\nVERDETTO GREZZO: mediana IT {med:,.0f} views"
              f"{f' · solo recenti (2025+): {med_rec:,.0f}' if recenti else ''}"
              f" — {'tema vivo' if med_rec > 2000 else 'nicchia piccola' if med_rec > 300 else 'domanda quasi assente in IT'}"
              " (giudica anche il pacchetto: un angolo diverso può battere i comparabili)")

if __name__ == "__main__":
    main()
