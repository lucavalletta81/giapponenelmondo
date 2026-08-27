# -*- coding: utf-8 -*-
"""
aggiorna_catalogo.py — ponte fra il radar trend e il catalogo video.

Legge l'output dell'agente trend-analysis (trend_analysis.json + storico log),
ricalcola il tag `trend` di ogni voce del catalogo e propone come nuove voci
i temi che ricorrono nel radar ma che nel catalogo non esistono.
Poi rigenera catalogo_video.html.

Idempotente: si può lanciare quante volte si vuole. Non tocca le voci esistenti
se non per il campo `trend` (e `score`, che ne dipende).
"""
import json, os, re, glob, subprocess, datetime, unicodedata

BASE = os.path.dirname(os.path.abspath(__file__))
CAT = os.path.join(BASE, "catalogo_dati.json")
TREND_JSON = "/Volumes/ssd02/Dropbox/claude_workspace/giapponenelmondo/data/trend_analysis.json"
LOG_DIR = "/Volumes/ssd02/Dropbox/claude_workspace/agenzia-giappone-nel-mondo/dipartimenti/trend-analysis/logs"
FINESTRA = 8          # quanti report recenti pesare
MIN_DATA = "2026-08-26"  # i report precedenti venivano da query circolari
                         # (cercavano solo akiya/showa/haikyo): non fanno testo
SOGLIA_ALTO = 4       # ricorrenze nella finestra per dire "trend alto"
SOGLIA_MEDIO = 2
SOGLIA_PROPOSTA = 4   # ricorrenze per proporre un video nuovo

# tema → (keyword nei titoli del radar, keyword nel catalogo, scheda per la proposta)
TEMI = {
 "akiya":       (["akiya","case abbandonate","case vuote"], ["akiya","case abbandonate"],
                 dict(cluster="societa", tipologia="studio", d=(13,18),
                      nec=["si gira in studio","ricerca fonti","grafiche dati"])),
 "haikyo":      (["haikyo","rovine","abbandonat"], ["haikyo","rovine"],
                 dict(cluster="societa", tipologia="studio", d=(13,18),
                      nec=["si gira in studio","ricerca","archivio foto rovine"])),
 "showa":       (["showa"], ["showa"],
                 dict(cluster="societa", tipologia="studio", d=(12,18),
                      nec=["si gira in studio","ricerca","archivio anni 70-80"])),
 "spopolamento":(["spopolamento","mukoku","villaggi","rural japan"], ["spopolamento","villaggi","mukoku"],
                 dict(cluster="societa", tipologia="studio", d=(12,18),
                      nec=["si gira in studio","ricerca fonti","mappe/grafiche"])),
 "jhorror":     (["j-horror","jhorror","horror","kisaragi","found footage"],
                 ["horror","noroi","kisaragi","battle royale","iceberg"],
                 dict(cluster="jhorror", tipologia="studio", d=(10,15),
                      nec=["si gira in studio","ricerca leggende urbane"])),
 "famicom":     (["famicom","retrogaming","console","nintendo"], ["famicom","sega","console"],
                 dict(cluster="brand", tipologia="studio", d=(12,18),
                      nec=["si gira in studio","ricerca storica","archivio gaming"])),
 "documentario":(["documentario","si documenta","si filma"], ["documentario"],
                 dict(cluster="societa", tipologia="studio", d=(12,18),
                      nec=["si gira in studio","ricerca"])),
}

def norm(s):
    s = unicodedata.normalize("NFKD", s.lower())
    return "".join(c for c in s if not unicodedata.combining(c))

def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", norm(s)).strip("_")[:40]

def titoli_radar():
    """Titoli dei trend IT, raggruppati per report: [[titoli del report 1], [report 2], ...]."""
    report = []
    logs = [f for f in sorted(glob.glob(os.path.join(LOG_DIR, "agent_*.log")), reverse=True)
            if os.path.basename(f)[6:16] >= MIN_DATA]
    for f in logs[:FINESTRA]:
        blocco, titoli = False, []
        for line in open(f, errors="ignore"):
            if "SINTESI FINALE" in line: blocco = True; continue
            if blocco:
                m = re.match(r"\s+\d\.\s+\[.*?\]\s+(.+)", line)
                if m: titoli.append(m.group(1).strip())
                elif line.strip().startswith("═"): blocco = False
        if titoli: report.append(titoli)
    return report

def main():
    cat = json.load(open(CAT))
    report = titoli_radar()
    radar = [t for r in report for t in r]
    if not radar:
        print("[catalogo] nessun report valido (post %s): azzero i tag trend viziati" % MIN_DATA)
        for it in cat["items"]:
            it["trend"] = "nullo"
        for it in cat["items"]:
            pronto = 2 if it["stato"] == "mezzo_fatto" else (1 if it["stato"] == "girato" else 0)
            it["score"] = round(it["fit"] + pronto * 1.5 - (it["effort"] - 1) * 2.5, 2)
        cat["items"].sort(key=lambda x: -x["score"])
        cat["aggiornato"] = f"{datetime.date.today():%Y-%m-%d}"
        cat["ricorrenze_radar"] = {}
        json.dump(cat, open(CAT, "w"), ensure_ascii=False, indent=1)
        subprocess.run(["/usr/bin/env", "python3", os.path.join(BASE, "render_catalogo.py")], check=True)
        return

    # 1. quante volte ricorre ogni tema nella finestra
    ricorrenze = {}
    for tema, (kw_radar, _, _) in TEMI.items():
        # quanti REPORT distinti citano il tema (non quante righe)
        ricorrenze[tema] = sum(1 for r in report
                               if any(k in norm(t) for t in r for k in kw_radar))

    # 2. ricalcola il tag trend di ogni voce
    def livello(n):
        return "alto" if n >= SOGLIA_ALTO else "medio" if n >= SOGLIA_MEDIO else "basso" if n else "nullo"

    for it in cat["items"]:
        hay = norm(it["titolo"] + " " + it.get("nota", ""))
        best = 0
        for tema, (_, kw_cat, _) in TEMI.items():
            if any(k in hay for k in kw_cat):
                best = max(best, ricorrenze[tema])
        # una voce non toccata dai temi del radar non viene declassata sotto "basso"
        nuovo = livello(best)
        if best == 0 and it.get("trend") in ("medio", "alto"):
            nuovo = "basso"          # il segnale è passato: si abbassa, non si azzera
        it["trend"] = nuovo

    # 2-bis. scoperta APERTA: parole-tema ricorrenti nei report, oltre ai 7
    # temi mappati (altrimenti il ponte tracciarebbe solo temi predefiniti —
    # la stessa circolarità del vecchio radar, in piccolo)
    STOP = set("""giappone giapponese giapponesi japan della dello delle degli
        nella nelle come sono stato stata anni ancora senza sempre quando cosa
        perche' perche più mondo video storia dopo prima oltre contro tra fra""".split())
    conta_parole = {}
    for r in report:
        parole_report = set()
        for t in r:
            for w in re.findall(r"[a-zàèéìòù]{5,}", norm(t)):
                if w not in STOP:
                    parole_report.add(w)
        for w in parole_report:
            conta_parole[w] = conta_parole.get(w, 0) + 1
    gia_mappate = {k for _, (kws, _, _) in TEMI.items() for k in kws}
    emergenti = {w: n for w, n in conta_parole.items()
                 if n >= SOGLIA_PROPOSTA and not any(w in k or k in w for k in gia_mappate)}
    if emergenti:
        print("[catalogo] parole-tema emergenti fuori mappa:",
              ", ".join(f"{w}×{n}" for w, n in sorted(emergenti.items(), key=lambda x: -x[1])[:8]),
              "— valutare se aggiungerle a TEMI o proporle come video")

    # 3. proposte nuove per temi caldi non coperti
    esistenti = {slug(i["titolo"]) for i in cat["items"]}
    for tema, (kw_radar, kw_cat, meta) in TEMI.items():
        n = ricorrenze[tema]
        if n < SOGLIA_PROPOSTA:
            continue
        coperto = any(any(k in norm(i["titolo"] + " " + i.get("nota", "")) for k in kw_cat)
                      for i in cat["items"])
        if coperto:
            continue
        titolo = next((t for t in radar if any(k in norm(t) for k in kw_radar)), tema)
        if slug(titolo) in esistenti:
            continue
        cat["items"].append(dict(
            id=slug(titolo), titolo=titolo, cluster=meta["cluster"], stato="proposta",
            effort=1, fit=8, tipo="acquisizione",
            nota=f"Proposta dal radar trend: ricorre in {n} report su {len(report)}. Nessuna voce del catalogo la copre.",
            tipologia=meta["tipologia"], durata_min=meta["d"][0], durata_max=meta["d"][1],
            necessita=meta["nec"], stagione="nessuna", trend="alto",
            origine=f"radar trend {datetime.date.today():%d/%m/%Y}"))
        esistenti.add(slug(titolo))
        print(f"[catalogo] nuova proposta dal radar: {titolo}")

    # 4. ricalcolo punteggio e ordinamento
    for it in cat["items"]:
        pronto = 2 if it["stato"] == "mezzo_fatto" else (1 if it["stato"] == "girato" else 0)
        tw = {"alto": 3, "medio": 1.5, "basso": 0.5, "nullo": 0}[it["trend"]]
        it["score"] = round(it["fit"] + tw + pronto * 1.5 - (it["effort"] - 1) * 2.5, 2)
    cat["items"].sort(key=lambda x: -x["score"])
    cat["aggiornato"] = f"{datetime.date.today():%Y-%m-%d}"
    cat["ricorrenze_radar"] = ricorrenze

    json.dump(cat, open(CAT, "w"), ensure_ascii=False, indent=1)
    subprocess.run(["/usr/bin/env", "python3", os.path.join(BASE, "render_catalogo.py")], check=True)
    caldi = ", ".join(f"{t}×{n}" for t, n in sorted(ricorrenze.items(), key=lambda x: -x[1]) if n)
    print(f"[catalogo] {len(cat['items'])} voci · segnale radar: {caldi}")

if __name__ == "__main__":
    main()
