/* =========================================================================
   MOTORE — tutta la "intelligenza" del servizio, senza una riga di AI.
   Tre motori: itinerario, costo, prosa. Più il motore dei compromessi,
   che non è altro che ri-eseguire i primi due con un input modificato.
   Gira interamente nel browser: nessuna chiamata di rete, nessun costo.
   ========================================================================= */
window.MOTORE = (function () {
"use strict";
var D = window.DATI;

/* ------------------------------------------------------------- UTILITÀ --- */
function byId(arr, id) { for (var i=0;i<arr.length;i++) if (arr[i].id===id) return arr[i]; return null; }
function citta(id)     { return byId(D.citta, id); }
function luogo(id)     { return byId(D.luoghi, id); }
function stagione(id)  { return byId(D.stagioni, id); }
function partenza(id)  { return byId(D.partenze, id); }
function serie(id)     { return byId(D.anime, id); }
function eur(yen)      { return yen / cambio().v; }
function clamp(v,a,b)  { return Math.max(a, Math.min(b, v)); }
function arrotonda(n, step) { step = step || 5; return Math.round(n/step)*step; }

function haversine(a, b) {
  var R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLon=(b.lon-a.lon)*Math.PI/180;
  var la1=a.lat*Math.PI/180, la2=b.lat*Math.PI/180;
  var h=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.sin(dLon/2)*Math.sin(dLon/2)*Math.cos(la1)*Math.cos(la2);
  return 2*R*Math.asin(Math.sqrt(h));
}

/* Chi non vuole voli interni viaggia solo su rotaia: cambia i conti, e spesso
   ribalta il verdetto sul Japan Rail Pass. Flag di modulo, impostato da pianifica(). */
var SOLO_TRENO = false;

/* Tratta fra due città. Se non è in tabella, la stima su distanza:
   tariffa Shinkansen ~ base + yen/km. La stima è SEMPRE marcata come tale. */
function tratta(a, b) {
  if (a === b) return { min:0, yen:0, jr:true, mezzo:"-", stimata:false };
  for (var i=0;i<D.tratte.length;i++) {
    var t = D.tratte[i];
    if ((t.a===a && t.b===b) || (t.a===b && t.b===a)) {
      if (SOLO_TRENO && t.mezzo.indexOf("volo") !== -1) break;   // si passa alla stima su rotaia
      return { min:t.min, yen:t.yen, jr:t.jr, mezzo:t.mezzo,
               stimata:false, verificata: t.c === "V" };
    }
  }
  var km = haversine(citta(a), citta(b));
  return {
    min: Math.round(35 + km/2.2),
    yen: Math.round((1300 + 21.5*km)/100)*100,
    jr: km < 1600,
    mezzo: "treno (tratta stimata su distanza)",
    stimata: true, verificata: false
  };
}

/* ------------------------------------------------------- VOLI REALI -----
   data/voli.js è generato da voli/aggiorna_voli.py leggendo Google Flights.
   Se manca (o manca la coppia richiesta) il motore continua a funzionare con
   le stime: il listino reale è un miglioramento, non una dipendenza.        */
function voloReale(partenzaId, stagioneId, fascia) {
  var P = window.PREZZI;
  if (!P || !P.voli) return null;
  var o = P.voli[partenzaId]; if (!o) return null;
  var s = o[stagioneId];      if (!s) return null;
  var v = s[fascia];          if (!v || !v.eur) return null;
  return v;
}

function alloggioReale(zona, fascia, stagioneId) {
  var P = window.PREZZI;
  if (!P || !P.alloggi) return null;
  var z = P.alloggi[zona];    if (!z) return null;
  var f = z[fascia];          if (!f) return null;
  var a = f[stagioneId];      if (!a || !a.eur) return null;
  return a;
}

/* Il cambio vero della BCE se c'è; altrimenti quello del catalogo, dichiarato. */
function cambio() {
  var P = window.PREZZI;
  if (P && P.cambio && P.cambio.jpy_per_eur)
    return { v: P.cambio.jpy_per_eur, vero: true, data: P.cambio.data };
  return { v: D.cambio.jpy_per_eur, vero: false, data: null };
}

/* "a Asakusa" stona: davanti a vocale ci vuole "ad". */
function aZona(id) {
  var n = nomeZona(id);
  return (/^[AEIOU]/i.test(n) ? "ad " : "a ") + n;
}

function nomeZona(id) {
  var z = zoneDisponibili();
  for (var i=0;i<z.length;i++) if (z[i].id === id) return z[i].nome;
  return id;
}

function zoneDisponibili() {
  var P = window.PREZZI;
  return (P && P.zone) ? P.zone : [];
}

/* --------------------------------------------------- RITMO E STILE ------- */
var RITMI = {
  lento:  { gg_citta:2.8, ore_giorno:5.5, nome:"lento",  desc:"poche basi, tempo di stare fermi" },
  medio:  { gg_citta:2.1, ore_giorno:7.0, nome:"medio",  desc:"vedi molto senza correre" },
  veloce: { gg_citta:1.5, ore_giorno:9.0, nome:"veloce", desc:"tanti posti, valigia sempre in mano" }
};
/* Le tre fasce. Ognuna pesca da una sorgente diversa per volo e alloggio:
   sono prezzi VERI, non tre moltiplicatori applicati allo stesso numero.     */
var STILI = {
  essenziale:  { nome:"Il minimo",      volo:"economico", alloggio:"ostello",  cibo:"essenziale",  quota_attivita:0.55 },
  equilibrato: { nome:"Normale",        volo:"normale",   alloggio:"business", cibo:"equilibrato", quota_attivita:1.00 },
  comodo:      { nome:"Senza pensieri", volo:"lusso",     alloggio:"lusso",    cibo:"comodo",      quota_attivita:1.25 }
};

/* Le mete raggiungibili in giornata da Tokyo: la gita consuma il giorno intero
   e costa il treno andata e ritorno, ma non cambia l'albergo.                */
var GITE = ["kamakura", "nikko", "hakone", "fuji", "chichibu"];

/* ================================================== MOTORE 1: ITINERARIO == */

/* Punteggio di un luogo rispetto agli interessi scelti. */
function punteggioLuogo(l, input, mese) {
  if (l.solo && l.solo.length && l.solo.indexOf(mese) === -1) return -1;   // fuori stagione
  var p = 0;
  for (var i=0;i<l.tag.length;i++) if (input.interessi.indexOf(l.tag[i]) !== -1) p += 1;
  if (p === 0) p = 0.15;                                                    // riempitivo
  if (l.anime) {
    if (input.anime.indexOf(l.anime) !== -1) p += 4;                        // serie scelta
    else if (input.interessi.indexOf("anime") !== -1) p += 0.6;
  }
  if (l.top && l.top.indexOf(mese) !== -1) p += 1.5;                        // è il suo mese
  if (l.solo && l.solo.length) p += 1.2;                                    // c'è solo ora
  if (l.yen === 0) p += 0.15;                                               // a parità, meglio gratis
  return p;
}

function punteggioCitta(cid, input, mese) {
  var lista = [];
  for (var i=0;i<D.luoghi.length;i++) {
    if (D.luoghi[i].citta !== cid) continue;
    var p = punteggioLuogo(D.luoghi[i], input, mese);
    if (p >= 0) lista.push({ l:D.luoghi[i], p:p });
  }
  lista.sort(function(x,y){ return y.p - x.p; });
  var somma = 0, k = Math.min(5, lista.length);
  for (var j=0;j<k;j++) somma += lista[j].p * (1 - j*0.12);                 // rendimento calante
  /* ore = quanta roba SENSATA c'è davvero da fare qui. Serve a distribuire i
     giorni: il picco di desiderabilità dice DOVE andare, le ore dicono QUANTO
     restarci. Confonderli è l'errore che manda 3 giorni a Takayama e 1 a Kyoto. */
  var ore = 0;
  for (var h=0;h<lista.length;h++) if (lista[h].p >= 0.4) ore += lista[h].l.ore + 0.7;
  return { punti:somma, ore:ore, luoghi:lista };
}

function costruisciItinerario(input) {
  var st = stagione(input.stagione), mese = st.mese;
  var ggGiappone = Math.max(2, input.giorni - 1);       // andata/ritorno mangiano ~1 giorno pieno
  var ritmo = RITMI[input.ritmo];

  /* punteggio di tutte le città */
  var score = {}, dettagli = {}, oreCitta = {};
  for (var i=0;i<D.citta.length;i++) {
    var r = punteggioCitta(D.citta[i].id, input, mese);
    score[D.citta[i].id] = r.punti;
    oreCitta[D.citta[i].id] = r.ore;
    dettagli[D.citta[i].id] = r.luoghi;
  }

  /* SOLO TOKYO (fase 1 del progetto): una base sola, e le mete vicine
     diventano gite in giornata invece di tappe con cambio d'albergo.
     Il codice multi-città resta sotto, per quando si allargherà.            */
  if (input.soloTokyo !== false) return itinerarioTokyo(input, mese, score, oreCitta, dettagli);

  /* la base di partenza: dove atterri */
  var base = input.ancoraggio || "tokyo";
  input.giaVisti = input.giaVisti || [];
  var selezionate = [base];
  var nCitta = clamp(Math.round(ggGiappone / ritmo.gg_citta), 1, 8);

  /* selezione greedy: punteggio alto, ma penalizzato dal costo di arrivarci */
  while (selezionate.length < nCitta) {
    var migliore = null, migliorValore = -1e9;
    for (var c=0;c<D.citta.length;c++) {
      var id = D.citta[c].id;
      if (selezionate.indexOf(id) !== -1) continue;
      /* distanza dalla città già scelta più vicina */
      var costoMin = 1e9, minutiMin = 1e9;
      for (var s=0;s<selezionate.length;s++) {
        var t = tratta(selezionate[s], id);
        if (t.yen < costoMin) costoMin = t.yen;
        if (t.min < minutiMin) minutiMin = t.min;
      }
      /* La penalità di distanza va rapportata alla lunghezza del viaggio: in
         7 giorni scendere a Hiroshima è una follia, in 21 è normale.        */
      var scala = clamp(9 / ggGiappone, 0.45, 1.6);
      var penalita = (costoMin/6500 + minutiMin/95) * scala;
      var valore = score[id] - penalita;
      /* prima volta in Giappone: le tappe iconiche pesano di più. Chi ci torna
         non le rivuole, e chi ha già visto una città la esclude del tutto.    */
      if (input.primaVolta && D.citta[c].iconica) valore += 2.2;
      if (!input.primaVolta && D.citta[c].iconica) valore -= 0.5;
      if (input.giaVisti && input.giaVisti.indexOf(id) !== -1) valore -= 100;
      if (valore > migliorValore) { migliorValore = valore; migliore = id; }
    }
    if (!migliore || migliorValore < -4) break;   // non vale la pena aggiungerne altre
    selezionate.push(migliore);
  }

  /* ordinamento del percorso: nearest neighbour dalla base */
  var rotta = [base], resto = selezionate.slice(1);
  while (resto.length) {
    var ultimo = rotta[rotta.length-1], best = 0, bestMin = 1e9;
    for (var k=0;k<resto.length;k++) {
      var tt = tratta(ultimo, resto[k]);
      if (tt.min < bestMin) { bestMin = tt.min; best = k; }
    }
    rotta.push(resto.splice(best,1)[0]);
  }

  /* tempo perso nei trasferimenti */
  var minutiTot = 0, gambe = [];
  for (var g=0; g<rotta.length-1; g++) {
    var leg = tratta(rotta[g], rotta[g+1]);
    leg.da = rotta[g]; leg.a = rotta[g+1];
    gambe.push(leg); minutiTot += leg.min;
  }
  var ritornoBase = null;
  if (rotta.length > 1) {
    ritornoBase = tratta(rotta[rotta.length-1], base);
    ritornoBase.da = rotta[rotta.length-1]; ritornoBase.a = base; ritornoBase.ritorno = true;
    minutiTot += ritornoBase.min;
  }
  var ggPersi = minutiTot / 60 / 9;                 // 9 ore di "giornata utile"

  /* ripartizione dei giorni: proporzionale alle ORE di cose da fare, non al
     picco di desiderabilità. Metodo del resto maggiore, minimo 1 notte,
     massimo 5 notti nella stessa base (oltre si annoia chiunque).           */
  var ggDisponibili = Math.max(rotta.length, ggGiappone);
  if (input.giaVisti.indexOf(base) !== -1)
    oreCitta[base] = Math.min((oreCitta[base]||0) * 0.2, ritmo.ore_giorno * 2);
  var desiderati = [], sommaDes = 0;
  for (var w=0;w<rotta.length;w++) {
    var d1 = clamp((oreCitta[rotta[w]] || ritmo.ore_giorno) / ritmo.ore_giorno, 1, 5);
    desiderati.push(d1); sommaDes += d1;
  }
  var tappe = [], resti = [], usati = 0;
  for (var w2=0;w2<rotta.length;w2++) {
    var esatto = desiderati[w2] / sommaDes * ggDisponibili;
    var intero = Math.max(1, Math.floor(esatto));
    tappe.push({ citta: rotta[w2], giorni: intero, ore_disponibili: oreCitta[rotta[w2]] });
    resti.push({ i:w2, resto: esatto - intero });
    usati += intero;
  }
  resti.sort(function(a,b){ return b.resto - a.resto; });
  var avanzo = ggDisponibili - usati, giro = 0;
  while (avanzo > 0 && giro < 400) {
    var t3 = tappe[resti[giro % resti.length].i];
    if (t3.giorni < 5) { t3.giorni++; avanzo--; }
    giro++;
  }
  while (avanzo < 0) {
    var tolto = false;
    for (var y=resti.length-1; y>=0 && avanzo<0; y--) {
      var t4 = tappe[resti[y].i];
      if (t4.giorni > 1) { t4.giorni--; avanzo++; tolto = true; }
    }
    if (!tolto) break;
  }

  /* riempi le giornate con i luoghi */
  var pianoGiorni = [], numero = 1, attivitaScelte = [];
  for (var p=0;p<tappe.length;p++) {
    var tap = tappe[p];
    tap.giornoInizio = numero;
    if (p > 0) gambe[p-1].giorno = numero;    // il trasferimento avviene qui
    var pool = dettagli[tap.citta].slice();
    var oreViaggio = p>0 ? gambe[p-1].min/60 : 0;
    for (var d=0; d<tap.giorni; d++) {
      var oreDisp = ritmo.ore_giorno - (d===0 ? Math.min(oreViaggio, ritmo.ore_giorno-2) : 0);
      var voci = [];
      while (pool.length && oreDisp > 1) {
        var cand = pool.shift();
        if (cand.l.ore > oreDisp + 1.5) { continue; }
        voci.push(cand.l); attivitaScelte.push(cand.l);
        oreDisp -= cand.l.ore + 0.7;                 // 0.7 = spostamenti e pause
      }
      pianoGiorni.push({
        n: numero++,
        citta: tap.citta,
        trasferimento: (d===0 && p>0) ? gambe[p-1] : null,
        luoghi: voci
      });
    }
  }

  /* città scartate ma buone: servono al motore dei compromessi */
  var scartate = [];
  for (var z=0;z<D.citta.length;z++) {
    var cid = D.citta[z].id;
    if (rotta.indexOf(cid) === -1) scartate.push({ id:cid, punti:score[cid] });
  }
  scartate.sort(function(a,b){ return b.punti - a.punti; });

  return {
    rotta: rotta, tappe: tappe, gambe: gambe, ritorno: ritornoBase,
    giorni: pianoGiorni, attivita: attivitaScelte,
    ggGiappone: ggGiappone, ggPersiInTreno: ggPersi,
    scartate: scartate.slice(0,6), score: score, ore: oreCitta, base: base,
    input_partenza: input.partenza, input_stagione: input.stagione
  };
}

/* Itinerario tutto su Tokyo: giornate in città più eventuali gite in giornata.
   Le gite competono con le giornate normali a punteggio, ma costano un treno
   andata e ritorno e si mangiano l'intera giornata.                          */
function itinerarioTokyo(input, mese, score, oreCitta, dettagli) {
  var ritmo = RITMI[input.ritmo];
  var ggTokyo = Math.max(2, input.giorni - 1);

  var inCitta = (dettagli["tokyo"] || []).filter(function (x) { return x.p >= 0; });

  /* ogni meta vicina diventa UNA gita, col suo costo di treno */
  var gite = [];
  GITE.forEach(function (cid) {
    var voci = (dettagli[cid] || []).filter(function (x) { return x.p >= 0.4; });
    if (!voci.length) return;
    var t = tratta("tokyo", cid);
    var punti = 0;
    voci.slice(0, 3).forEach(function (v, i) { punti += v.p * (1 - i * 0.15); });
    punti -= t.min / 120;                       /* più è lontana, meno rende */
    gite.push({ citta: cid, punti: punti, tratta: t,
                luoghi: voci.slice(0, 3).map(function (v) { return v.l; }) });
  });
  gite.sort(function (a, b) { return b.punti - a.punti; });

  /* quante gite: una ogni 4 giorni, e solo se battono una giornata in città */
  var sogliaCitta = inCitta.length ? inCitta[Math.min(3, inCitta.length - 1)].p : 0;
  var quante = clamp(Math.floor(ggTokyo / 4), 0, 3);
  gite = gite.filter(function (g) { return g.punti > sogliaCitta * 0.8; }).slice(0, quante);

  /* le giornate: prima Tokyo, poi una gita ogni tanto, mai due di fila */
  var pool = inCitta.slice(), giorni = [], attivita = [], usateGite = 0;
  for (var d = 0; d < ggTokyo; d++) {
    var faiGita = usateGite < gite.length && d >= 2 && (d % 3 === 2);
    if (faiGita) {
      var g = gite[usateGite++];
      g.luoghi.forEach(function (l) { attivita.push(l); });
      giorni.push({ n: d + 1, citta: g.citta, gita: g, luoghi: g.luoghi });
      continue;
    }
    var ore = ritmo.ore_giorno, voci = [];
    while (pool.length && ore > 1) {
      var cand = pool.shift();
      if (cand.l.ore > ore + 1.5) continue;
      voci.push(cand.l); attivita.push(cand.l);
      ore -= cand.l.ore + 0.7;
    }
    giorni.push({ n: d + 1, citta: "tokyo", luoghi: voci });
  }

  /* il conto dei treni: qui non ci sono trasferimenti, solo le gite */
  var gambe = gite.map(function (g) {
    var t = tratta("tokyo", g.citta);
    return { da: "tokyo", a: g.citta, min: t.min * 2, yen: t.yen * 2, jr: t.jr,
             mezzo: t.mezzo + " (andata e ritorno in giornata)",
             stimata: t.stimata, verificata: false, giorno: 1, gita: true };
  });

  var scartate = [];
  for (var z = 0; z < D.citta.length; z++) {
    var cid2 = D.citta[z].id;
    if (cid2 !== "tokyo") scartate.push({ id: cid2, punti: score[cid2] });
  }
  scartate.sort(function (a, b) { return b.punti - a.punti; });

  return {
    soloTokyo: true, rotta: ["tokyo"], base: "tokyo",
    tappe: [{ citta: "tokyo", giorni: ggTokyo }],
    gambe: gambe, ritorno: null, giorni: giorni, attivita: attivita,
    gite: gite, ggGiappone: ggTokyo, ggPersiInTreno: 0,
    scartate: scartate.slice(0, 6), score: score, ore: oreCitta,
    input_partenza: input.partenza, input_stagione: input.stagione
  };
}

/* ======================================================= MOTORE 2: COSTO == */

/* Confronto pay-as-you-go contro Japan Rail Pass. Aritmetica pura. */
function calcolaTreni(itin, ggGiappone) {
  var tutte = itin.gambe.slice();
  if (itin.ritorno) { itin.ritorno.giorno = ggGiappone; tutte.push(itin.ritorno); }
  var totale = 0, coperto = 0, nonCoperto = 0, stimate = 0;
  for (var i=0;i<tutte.length;i++) {
    totale += tutte[i].yen;
    if (tutte[i].jr) coperto += tutte[i].yen; else nonCoperto += tutte[i].yen;
    if (tutte[i].stimata) stimate++;
  }
  var locale = D.trasporto_locale_yen_giorno * ggGiappone;
  var senzaPass = totale + locale;

  /* Il pass non deve coprire tutto il viaggio: si attiva nella settimana in cui
     fai i trasferimenti cari. È esattamente quello che fa chi viaggia davvero,
     ed è il calcolo che nessun calcolatore online si prende la briga di fare.  */
  var migliore = null;
  for (var p=0;p<D.pass.length;p++) {
    var pass = D.pass[p];
    var megliofinestra = 0, giornoAttivazione = 1;
    for (var start=1; start<=Math.max(1, ggGiappone); start++) {
      var dentro = 0;
      for (var q=0;q<tutte.length;q++) {
        var gg = tutte[q].giorno || 1;
        if (tutte[q].jr && gg >= start && gg < start + pass.giorni) dentro += tutte[q].yen;
      }
      if (dentro > megliofinestra) { megliofinestra = dentro; giornoAttivazione = start; }
    }
    var giorniAttivi = Math.min(pass.giorni, ggGiappone);
    var localeScontato = locale - 0.35 * D.trasporto_locale_yen_giorno * giorniAttivi;
    var conPass = pass.yen + (totale - megliofinestra) + localeScontato;
    if (!migliore || conPass < migliore.yen)
      migliore = { pass:pass, yen:conPass, coperto:megliofinestra, dal:giornoAttivazione };
  }
  var usaPass = migliore && migliore.yen < senzaPass;
  return {
    senzaPass: senzaPass, conPass: migliore ? migliore.yen : null,
    pass: migliore ? migliore.pass : null,
    passDal: migliore ? migliore.dal : null,
    passCopre: migliore ? migliore.coperto : 0,
    usaPass: !!usaPass,
    scelto: usaPass ? migliore.yen : senzaPass,
    risparmio: migliore ? Math.abs(senzaPass - migliore.yen) : 0,
    biglietti: tutte, locale: locale, stimate: stimate
  };
}

function calcolaLivello(input, itin, treni, stileKey) {
  var st = stagione(input.stagione), stile = STILI[stileKey];

  /* --- alloggio: prezzo VERO a notte per zona e fascia, se ce l'abbiamo.
     Il moltiplicatore di stagione NON si applica al prezzo reale: la stagione
     è già dentro, perché la notte l'abbiamo chiesta proprio in quella data.  */
  var alloggio = 0, notti = 0, dettAlloggio = [], alloggioFonte = null;
  var zona = input.zona || "shinjuku";
  var reale = alloggioReale(zona, stile.alloggio, input.stagione);
  if (reale) {
    notti = itin.ggGiappone;
    alloggio = null;                              /* in euro, non in yen */
    alloggioFonte = reale;
    dettAlloggio.push({ citta: nomeZona(zona), notti: notti,
                        tariffaEur: reale.eur, subEur: reale.eur * notti,
                        campione: reale.campione, esempio: reale.esempio,
                        min: reale.min, max: reale.max });
  } else {
    for (var i=0;i<itin.tappe.length;i++) {
      var c = citta(itin.tappe[i].citta);
      var chiaveVecchia = { ostello:"ostello", business:"business", lusso:"medio" }[stile.alloggio] || "business";
      var tariffa = c.alloggio[chiaveVecchia] || c.alloggio.medio || c.alloggio.alto;
      var n = itin.tappe[i].giorni;
      var sub = tariffa * st.hotel * n;
      alloggio += sub; notti += n;
      dettAlloggio.push({ citta:c.nome, notti:n, tariffa:Math.round(tariffa*st.hotel), sub:Math.round(sub) });
    }
  }

  /* --- cibo: per giorno, col modificatore della città in cui sei */
  var cibo = 0;
  for (var g=0; g<itin.giorni.length; g++)
    cibo += D.cibo[stile.cibo].yen * citta(itin.giorni[g].citta).cibo_mod;

  /* --- attività: quota diversa per livello */
  var attCosti = [];
  for (var a=0;a<itin.attivita.length;a++) if (itin.attivita[a].yen > 0) attCosti.push(itin.attivita[a]);
  attCosti.sort(function(x,y){ return x.yen - y.yen; });
  var attivita = 0, incluse = [];
  var quanti = Math.round(attCosti.length * Math.min(stile.quota_attivita, 1));
  for (var b=0;b<quanti;b++) { attivita += attCosti[b].yen; incluse.push(attCosti[b]); }
  if (stile.quota_attivita > 1) attivita *= stile.quota_attivita;   // il livello alto aggiunge esperienze

  /* --- transfer aeroportuali */
  var transfer = D.transfer_aeroporto_yen * 2;

  /* --- volo: prezzo VERO di Google per (aeroporto × stagione × fascia).
     Niente moltiplicatore di stagione sopra: il prezzo reale ce l'ha dentro. */
  var v = voloReale(input.partenza, input.stagione, stile.volo);
  var volo = v ? v.eur : partenza(input.partenza).volo.media * st.volo
                         * (stile.volo === "lusso" ? 3.4 : 1);

  /* --- extra in euro */
  var e = D.extra;
  var extra = e.assicurazione_giorno * input.giorni + e.esim + e.souvenir[stileKey];

  var vociYen = {
    trasporti: treni.scelto + transfer,
    alloggio: alloggio,                 /* null quando il prezzo è già in euro */
    cibo: cibo,
    attivita: attivita
  };
  var alloggioEur = alloggioFonte ? alloggioFonte.eur * notti : eur(alloggio);
  var perPersona = volo + extra
    + eur(vociYen.trasporti) + alloggioEur + eur(vociYen.cibo) + eur(vociYen.attivita);
  var imprevisti = perPersona * e.imprevisti_perc;
  perPersona += imprevisti;

  var persone = input.adulti + input.bambini * 0.65;
  return {
    stile: stileKey, nome: stile.nome,
    volo_fonte: v || null,
    alloggio_fonte: alloggioFonte,
    zona: zona,
    voci: {
      volo: volo,
      trasporti: eur(vociYen.trasporti),
      alloggio: alloggioEur,
      cibo: eur(vociYen.cibo),
      attivita: eur(vociYen.attivita),
      extra: extra,
      imprevisti: imprevisti
    },
    dettAlloggio: dettAlloggio, attIncluse: incluse, notti: notti,
    perPersona: perPersona,
    gruppo: perPersona * persone,
    alGiorno: perPersona / input.giorni
  };
}

/* ====================================================== PIANIFICAZIONE ==== */
function pianifica(input) {
  SOLO_TRENO = (input.voliInterni === "no");
  var itin = costruisciItinerario(input);
  var treni = calcolaTreni(itin, itin.ggGiappone);
  if (input.jrPass === "si") treni.usaPass = true,  treni.scelto = treni.conPass || treni.senzaPass;
  if (input.jrPass === "no") treni.usaPass = false, treni.scelto = treni.senzaPass;
  var livelli = {
    essenziale:  calcolaLivello(input, itin, treni, "essenziale"),
    equilibrato: calcolaLivello(input, itin, treni, "equilibrato"),
    comodo:      calcolaLivello(input, itin, treni, "comodo")
  };
  itin.fascia_volo = STILI[input.stile].volo;
  itin.alloggio_vero = !!livelli[input.stile].alloggio_fonte;
  return { input:input, itinerario:itin, treni:treni, livelli:livelli,
           stagione: stagione(input.stagione), cambio: cambio(),
           zone: zoneDisponibili(), attendibilita: contaStime(itin, livelli[input.stile]) };
}

/* Quante voci usate sono ancora stime: si dichiara a schermo.
   Regola: è verificato SOLO ciò che porta c:"V" esplicito. Una voce senza
   marca è una voce che nessuno ha controllato, quindi conta come stima —
   il contrario faceva sembrare verificato tutto ciò che avevo dimenticato
   di marcare, ed era il contatore stesso a mentire. */
function verificato(x) { return !!x && x.c === "V"; }

/* Due numeri, non uno. Contare le VOCI dice che verificare i souvenir vale quanto
   verificare l'alloggio, il che è falso: premia il lavoro sbagliato. Il numero che
   conta è la quota dell'IMPORTO che arriva da voci verificate. Li pubblichiamo
   entrambi, con la formula scritta a schermo, così chiunque può rifare il conto.  */
function contaStime(itin, liv) {
  var tot=0, stime=0;
  for (var i=0;i<itin.attivita.length;i++){ tot++; if (!verificato(itin.attivita[i])) stime++; }
  for (var j=0;j<itin.tappe.length;j++){ tot++; if (!verificato(citta(itin.tappe[j].citta))) stime++; }
  var g = itin.gambe.concat(itin.ritorno? [itin.ritorno]:[]);
  for (var k=0;k<g.length;k++){ tot++; if (g[k].stimata || !g[k].verificata) stime++; }
  var voloVero = !!voloReale(itin.input_partenza, itin.input_stagione, itin.fascia_volo || "normale");
  tot += 3;                                   // volo, alloggio, cambio
  if (!cambio().vero) stime += 1;
  if (!voloVero) stime += 1;
  if (!itin.alloggio_vero) stime += 1;

  /* la quota in euro: quanto del totale viene da una fonte verificata */
  var euroVeri = 0, euroTot = 0;
  if (liv) {
    var v = liv.voci;
    euroTot = v.volo + v.trasporti + v.alloggio + v.cibo + v.attivita + v.extra + v.imprevisti;
    if (voloVero) euroVeri += v.volo;
    if (itin.alloggio_vero) euroVeri += v.alloggio;
  }
  return {
    totale: tot, stime: stime, perc: Math.round(stime/tot*100),
    euro_tot: euroTot, euro_veri: euroVeri,
    perc_importo: euroTot ? Math.round((1 - euroVeri/euroTot) * 100) : null
  };
}

/* ============================================ MOTORE 3: I COMPROMESSI ===== */
/* Nessuna magia: si ri-esegue il preventivo con un input modificato
   e si mostra la differenza. È il pezzo che rende il servizio utile.        */
function compromessi(input, base) {
  var out = [], stileRif = input.stile;
  function delta(patch, etichetta, avvertenza, cambiaFascia) {
    var nuovo = {}; for (var k in input) nuovo[k] = input[k];
    for (var k2 in patch) nuovo[k2] = patch[k2];
    var r;
    try { r = pianifica(nuovo); } catch(e) { return; }
    var quale = cambiaFascia ? (patch.stile || stileRif) : stileRif;
    var d = r.livelli[quale].gruppo - base.livelli[stileRif].gruppo;
    if (Math.abs(d) < 15) return;
    out.push({ etichetta: etichetta, delta: d, avvertenza: avvertenza || "", patch: patch });
  }

  /* in modalità Tokyo le leve utili sono la zona e la fascia, non altre città */
  if (base.itinerario.soloTokyo) {
    var zAttuale = input.zona || "shinjuku";
    var fasciaAll = STILI[stileRif].alloggio;
    var candidate = [];
    zoneDisponibili().forEach(function (z) {
      var a = alloggioReale(z.id, fasciaAll, input.stagione);
      if (a && z.id !== zAttuale) candidate.push({ id: z.id, nome: z.nome, eur: a.eur, nota: z.nota });
    });
    candidate.sort(function (a, b) { return a.eur - b.eur; });
    if (candidate.length) {
      delta({ zona: candidate[0].id }, "Dormi " + aZona(candidate[0].id) +
            " invece che " + aZona(zAttuale), candidate[0].nota);
      var caro = candidate[candidate.length - 1];
      if (caro.id !== candidate[0].id)
        delta({ zona: caro.id }, "Dormi " + aZona(caro.id) + ", la zona più cara del campione", caro.nota);
    }
    var att = stagione(input.stagione);
    var alt = D.stagioni.filter(function (x) {
      return x.id !== att.id && Math.abs(x.mese - att.mese) <= 2;
    });
    alt.forEach(function (x) {
      var vv = voloReale(input.partenza, x.id, STILI[stileRif].volo);
      var aa = alloggioReale(zAttuale, fasciaAll, x.id);
      if (vv && aa) x._tot = vv.eur + aa.eur * base.itinerario.ggGiappone;
    });
    alt = alt.filter(function (x) { return x._tot; }).sort(function (a, b) { return a._tot - b._tot; });
    if (alt.length) delta({ stagione: alt[0].id }, "Sposti il viaggio a " + alt[0].nome, alt[0].nota);
    if (input.giorni > 5)  delta({ giorni: input.giorni - 2 }, "Due giorni in meno");
    if (input.giorni < 25) delta({ giorni: input.giorni + 2 }, "Due giorni in più");
    var vOra = voloReale(input.partenza, input.stagione, STILI[stileRif].volo);
    var vPre = voloReale(input.partenza, input.stagione, "premium");
    if (vOra && vPre && vPre.eur > vOra.eur) {
      var persone = input.adulti + input.bambini * 0.65;
      out.push({
        etichetta: "Passa in premium economy" + (vPre.scali === 0 ? " (volo diretto)" : ""),
        delta: (vPre.eur - vOra.eur) * persone,
        avvertenza: "Sedile più largo e bagaglio incluso, senza arrivare alla business. " +
                    "Cambia solo il volo, non il resto del viaggio.",
        soloInfo: true, patch: {}
      });
    }
    if (stileRif !== "essenziale") delta({ stile: "essenziale" }, "Scendi alla fascia minima",
      "Ostello, volo al minimo, si mangia al konbini.", true);
    if (stileRif !== "comodo") delta({ stile: "comodo" }, "Sali a senza pensieri",
      "Business a bordo e hotel di categoria: è un altro viaggio, e si vede.", true);
    out.sort(function (a, b) { return a.delta - b.delta; });
    return out;
  }


  /* stagione: la più economica entro 2 mesi di distanza */
  var attuale = stagione(input.stagione);
  var candidate = D.stagioni.filter(function(s){
    return s.id !== attuale.id && Math.abs(s.mese - attuale.mese) <= 2 && s.volo < attuale.volo;
  }).sort(function(a,b){ return a.volo - b.volo; });
  if (candidate.length) delta({ stagione: candidate[0].id },
      "Sposti il viaggio a " + candidate[0].nome, candidate[0].nota);

  /* durata */
  if (input.giorni > 6)  delta({ giorni: input.giorni - 2 }, "Due giorni in meno");
  if (input.giorni < 24) delta({ giorni: input.giorni + 2 }, "Due giorni in più");

  /* ritmo */
  if (input.ritmo !== "lento")  delta({ ritmo:"lento"  }, "Ritmo più lento (meno tappe, meno treni)");
  if (input.ritmo !== "veloce") delta({ ritmo:"veloce" }, "Ritmo più veloce (più tappe)");

  /* pass forzato al contrario di quello consigliato */
  if (base.treni.usaPass) delta({ jrPass:"no" }, "Rinunci al Japan Rail Pass",
      "Il motore lo sconsiglia: guarda la differenza.");
  else delta({ jrPass:"si" }, "Compri comunque il Japan Rail Pass",
      "Col tuo itinerario non conviene.");

  /* aggiunta della città migliore fra quelle scartate */
  if (base.itinerario.scartate.length) {
    var top = base.itinerario.scartate[0];
    var nuoviInteressi = input.interessi.slice();
    /* forzare una città si fa col ritmo: qui mostriamo il costo dei giorni extra + tratta */
    var t = tratta(base.itinerario.rotta[base.itinerario.rotta.length-1], top.id);
    var stimaExtra = eur(t.yen*2) +
        eur(citta(top.id).alloggio[STILI[stileRif].alloggio] * base.stagione.hotel * 2) +
        eur(D.cibo[stileRif].yen*2);
    out.push({
      etichetta: "Aggiungi 2 giorni a " + citta(top.id).nome,
      delta: stimaExtra * (input.adulti + input.bambini*0.65),
      avvertenza: "Stima: treno andata/ritorno + 2 notti + pasti.",
      patch: { giorni: input.giorni + 2 }
    });
  }

  out.sort(function(a,b){ return a.delta - b.delta; });
  return out;
}

/* ============================================== MOTORE 4: LA PROSA ======== */
/* Testo a slot, scritto una volta a mano. Nessun modello, nessuna bolletta. */
function prosa(r) {
  var i = r.input, it = r.itinerario, st = r.stagione, liv = r.livelli[i.stile];
  var nomi = it.rotta.map(function(c){ return citta(c).nome; });
  var elenco = nomi.length===1 ? nomi[0]
    : nomi.slice(0,-1).join(", ") + " e " + nomi[nomi.length-1];
  var p = [];

  if (it.soloTokyo) {
    var g = (it.gite || []).map(function(x){ return citta(x.citta).nome; });
    p.push("Tokyo per " + it.ggGiappone + " giorni pieni, con base a " + nomeZona(liv.zona) +
      (g.length ? ", più " + g.length + (g.length===1 ? " gita in giornata: " : " gite in giornata: ") + g.join(", ")
                : ", senza gite fuori: con questi giorni la città basta e avanza") + ".");
  } else {
    p.push("Con " + i.giorni + " giorni a disposizione e un ritmo " + RITMI[i.ritmo].nome +
      ", il giro che regge meglio è " + elenco + ": " + it.rotta.length +
      (it.rotta.length===1 ? " base" : " basi") + " in " + it.ggGiappone + " giorni pieni sul posto.");
  }

  p.push(st.nota);

  if (it.soloTokyo) {
    var costoGite = 0;
    (it.gambe || []).forEach(function (g) { costoGite += g.yen; });
    p.push(costoGite > 0
      ? ("Il Japan Rail Pass qui non c'entra: restando a Tokyo i treni sono solo quelli delle gite, " +
         arrotonda(eur(costoGite)) + " euro a persona in tutto, più il trasporto urbano. " +
         "Il pass costa da " + arrotonda(eur(D.pass[0].yen)) + " euro in su: non lo ammortizzi.")
      : ("Nessun treno a lunga percorrenza: solo metropolitana, che a Tokyo costa " +
         "sui " + arrotonda(eur(D.trasporto_locale_yen_giorno)) + " euro al giorno."));
  } else if (r.treni.usaPass) {
    p.push("Con questo itinerario il " + r.treni.pass.nome + " conviene: ti fa risparmiare circa " +
      arrotonda(eur(r.treni.risparmio)) + " euro a persona rispetto ai biglietti singoli. " +
      "Attivalo il giorno " + r.treni.passDal + " del viaggio, non appena atterri: è la finestra " +
      "in cui cadono i trasferimenti cari.");
  } else {
    p.push("Attenzione al Japan Rail Pass: con questo itinerario NON conviene. " +
      "Compri i biglietti singoli e risparmi circa " + arrotonda(eur(r.treni.risparmio)) +
      " euro a persona. Attenzione però: il prezzo del pass nel nostro catalogo è ancora una " +
      "stima, non una tariffa verificata, quindi questo è l'unico consiglio della pagina che " +
      "va ricontrollato sul sito ufficiale prima di deciderci qualcosa.");
  }

  var animeScelti = i.anime.map(function(a){ return serie(a) ? serie(a).nome : a; });
  if (animeScelti.length) {
    var tappeAnime = it.attivita.filter(function(l){ return l.anime && i.anime.indexOf(l.anime) !== -1; })
                                .map(function(l){ return l.nome; });
    if (tappeAnime.length)
      p.push("Sul fronte pellegrinaggio (" + animeScelti.join(", ") + ") l'itinerario tocca: " +
        tappeAnime.join("; ") + ".");
    else
      p.push("Le serie che hai scelto (" + animeScelti.join(", ") +
        ") hanno luoghi fuori da questa rotta: allunga di qualche giorno o cambia base per includerli.");
  }

  if (it.ggPersiInTreno > 1.4)
    p.push("Nota di realtà: fra un trasferimento e l'altro perdi circa " +
      it.ggPersiInTreno.toFixed(1) + " giornate in viaggio. Togliendo una tappa le recuperi.");

  var vf = liv.volo_fonte;
  if (vf) {
    var ore = Math.round((vf.min_and||0)/60);
    p.push("Il volo è un prezzo vero: " + arrotonda(vf.eur) + " euro a persona, " +
      (vf.compagnia ? vf.compagnia + ", " : "") + ore + " ore all'andata con " +
      (vf.scali === 0 ? "volo diretto" : vf.scali + (vf.scali===1?" scalo":" scali")) +
      ", letto su Google Flights per la partenza del " + vf.out.split("-").reverse().join("/") + ".");
    /* la trappola: risparmiare sul volo spesso non fa risparmiare, fa perdere ore */
    var eco = voloReale(i.partenza, i.stagione, "economico");
    var nor = voloReale(i.partenza, i.stagione, "normale");
    if (eco && nor) {
      var risparmio = nor.esatto - eco.esatto, oreInPiu = ((eco.min_and||0) - (nor.min_and||0))/60;
      var scaloOre = Math.floor((eco.scalo_peggio||0)/60);
      if (oreInPiu >= 2 && risparmio <= 1) {
        p.push("Su queste date cercare il volo più economico non serve: costa esattamente " +
          "quanto quello normale e dura " + oreInPiu.toFixed(0) + " ore in più, con uno scalo di " +
          scaloOre + " ore. Non ci perdi soldi, semplicemente non ne risparmi.");
      } else if (oreInPiu >= 2 && risparmio < 25) {
        p.push("Il volo più economico costa appena " + Math.round(risparmio) + " euro meno e dura " +
          oreInPiu.toFixed(0) + " ore in più, con uno scalo di " + scaloOre + " ore: " +
          "sono " + Math.round(risparmio/oreInPiu) + " euro l'ora di attesa.");
      } else if (oreInPiu >= 2) {
        p.push("Il volo più economico costa " + Math.round(risparmio) + " euro meno ma dura " +
          oreInPiu.toFixed(0) + " ore in più, con uno scalo di " + scaloOre + " ore: decidi tu se vale.");
      }
    }
  } else {
    p.push("Per questa combinazione di aeroporto e stagione Google non ha ancora i voli: " +
      "quella voce resta una stima del catalogo.");
  }

  /* fra economy e business ci sono migliaia di euro: se la premium economy
     esiste su questa rotta, va detta, perché è l'unica cosa che sta in mezzo. */
  var pre = voloReale(i.partenza, i.stagione, "premium");
  if (pre && vf && i.stile !== "comodo") {
    var inPiu = pre.eur - vf.eur;
    if (inPiu > 50)
      p.push("Se le " + Math.round((vf.min_and||0)/60) + " ore in economy ti spaventano, " +
        "il gradino di mezzo esiste: la premium economy costa " + arrotonda(pre.eur) +
        " euro, cioè " + arrotonda(inPiu) + " in più a persona" +
        (pre.scali === 0 ? ", ed è un volo diretto" : "") +
        ". La business, per confronto, ne chiede " +
        arrotonda((voloReale(i.partenza, i.stagione, "lusso") || {eur:0}).eur) + ".");
  }

  var af = liv.alloggio_fonte;
  if (af) {
    p.push("Anche l'alloggio è vero: " + af.eur + " euro a notte è la mediana di " + af.campione +
      " strutture che Google Hotels elenca " + aZona(liv.zona) + " in quella fascia e in quelle date" +
      " (si va da " + af.min + " a " + af.max + "; la più economica era " + af.esempio + ").");
  }

  p.push("Il livello \"" + liv.nome + "\" viene circa " + arrotonda(liv.perPersona) +
    " euro a persona, cioè " + arrotonda(liv.alGiorno) + " euro al giorno tutto compreso.");

  if (i.budgetMax) {
    var g = liv.gruppo;
    if (g <= i.budgetMax) p.push("Rientra nel budget che hai indicato (" + i.budgetMax + " euro), con " +
      arrotonda(i.budgetMax - g) + " euro di margine.");
    else p.push("Sfora il budget di " + arrotonda(g - i.budgetMax) +
      " euro. Guarda i compromessi qui sotto: la leva più efficace è di solito la stagione, non i giorni.");
  }
  return p;
}

/* ------------------------------------------------------------- EXPORT ---- */
return {
  pianifica: pianifica, compromessi: compromessi, prosa: prosa,
  citta: citta, luogo: luogo, stagione: stagione, serie: serie, partenza: partenza,
  tratta: tratta, eur: eur, arrotonda: arrotonda, RITMI: RITMI, STILI: STILI,
  zoneDisponibili: zoneDisponibili, nomeZona: nomeZona, aZona: aZona,
  voloReale: voloReale, alloggioReale: alloggioReale, cambio: cambio, GITE: GITE
};
})();
