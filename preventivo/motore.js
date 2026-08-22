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
function eur(yen)      { return yen / D.cambio.jpy_per_eur; }
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
      return { min:t.min, yen:t.yen, jr:t.jr, mezzo:t.mezzo, stimata:false };
    }
  }
  var km = haversine(citta(a), citta(b));
  return {
    min: Math.round(35 + km/2.2),
    yen: Math.round((1300 + 21.5*km)/100)*100,
    jr: km < 1600,
    mezzo: "treno (tratta stimata su distanza)",
    stimata: true
  };
}

/* --------------------------------------------------- RITMO E STILE ------- */
var RITMI = {
  lento:  { gg_citta:2.8, ore_giorno:5.5, nome:"lento",  desc:"poche basi, tempo di stare fermi" },
  medio:  { gg_citta:2.1, ore_giorno:7.0, nome:"medio",  desc:"vedi molto senza correre" },
  veloce: { gg_citta:1.5, ore_giorno:9.0, nome:"veloce", desc:"tanti posti, valigia sempre in mano" }
};
var STILI = {
  essenziale:  { alloggio:"ostello",  quota_attivita:0.55, nome:"Essenziale" },
  equilibrato: { alloggio:"business", quota_attivita:1.00, nome:"Equilibrato" },
  comodo:      { alloggio:"medio",    quota_attivita:1.25, nome:"Senza pensieri" }
};

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
    scartate: scartate.slice(0,6), score: score, ore: oreCitta, base: base
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

  /* --- alloggio: notte per notte, città per città, col moltiplicatore stagione */
  var alloggio = 0, notti = 0, dettAlloggio = [];
  for (var i=0;i<itin.tappe.length;i++) {
    var c = citta(itin.tappe[i].citta);
    var tariffa = c.alloggio[stile.alloggio] || c.alloggio.medio || c.alloggio.alto;
    var n = itin.tappe[i].giorni;
    var sub = tariffa * st.hotel * n;
    alloggio += sub; notti += n;
    dettAlloggio.push({ citta:c.nome, notti:n, tariffa:Math.round(tariffa*st.hotel), sub:Math.round(sub) });
  }

  /* --- cibo: per giorno, col modificatore della città in cui sei */
  var cibo = 0;
  for (var g=0; g<itin.giorni.length; g++) cibo += D.cibo[stileKey].yen * citta(itin.giorni[g].citta).cibo_mod;

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

  /* --- volo (in euro, non in yen) */
  var volo = partenza(input.partenza).volo.media * st.volo;

  /* --- extra in euro */
  var e = D.extra;
  var extra = e.assicurazione_giorno * input.giorni + e.esim + e.souvenir[stileKey];

  var vociYen = {
    trasporti: treni.scelto + transfer,
    alloggio: alloggio,
    cibo: cibo,
    attivita: attivita
  };
  var perPersona = volo + extra
    + eur(vociYen.trasporti) + eur(vociYen.alloggio) + eur(vociYen.cibo) + eur(vociYen.attivita);
  var imprevisti = perPersona * e.imprevisti_perc;
  perPersona += imprevisti;

  var persone = input.adulti + input.bambini * 0.65;
  return {
    stile: stileKey, nome: stile.nome,
    voci: {
      volo: volo,
      trasporti: eur(vociYen.trasporti),
      alloggio: eur(vociYen.alloggio),
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
  return { input:input, itinerario:itin, treni:treni, livelli:livelli,
           stagione: stagione(input.stagione), attendibilita: contaStime(itin) };
}

/* Quante voci usate sono ancora stime: si dichiara a schermo. */
function contaStime(itin) {
  var tot=0, stime=0;
  for (var i=0;i<itin.attivita.length;i++){ tot++; if (itin.attivita[i].c === "S") stime++; }
  for (var j=0;j<itin.tappe.length;j++){ tot++; if (citta(itin.tappe[j].citta).c === "S") stime++; }
  var g = itin.gambe.concat(itin.ritorno? [itin.ritorno]:[]);
  for (var k=0;k<g.length;k++){ tot++; if (g[k].stimata) stime++; }
  tot += 2; stime += 2;   // volo e cambio valuta: sempre stime
  return { totale:tot, stime:stime, perc: Math.round(stime/tot*100) };
}

/* ============================================ MOTORE 3: I COMPROMESSI ===== */
/* Nessuna magia: si ri-esegue il preventivo con un input modificato
   e si mostra la differenza. È il pezzo che rende il servizio utile.        */
function compromessi(input, base) {
  var out = [], stileRif = input.stile;
  function delta(patch, etichetta, avvertenza) {
    var nuovo = {}; for (var k in input) nuovo[k] = input[k];
    for (var k2 in patch) nuovo[k2] = patch[k2];
    var r;
    try { r = pianifica(nuovo); } catch(e) { return; }
    var d = r.livelli[stileRif].gruppo - base.livelli[stileRif].gruppo;
    if (Math.abs(d) < 15) return;
    out.push({ etichetta: etichetta, delta: d, avvertenza: avvertenza || "", patch: patch });
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

  p.push("Con " + i.giorni + " giorni a disposizione e un ritmo " + RITMI[i.ritmo].nome +
    ", il giro che regge meglio è " + elenco + ": " + it.rotta.length +
    (it.rotta.length===1 ? " base" : " basi") + " in " + it.ggGiappone + " giorni pieni sul posto.");

  p.push(st.nota);

  if (r.treni.usaPass) {
    p.push("Con questo itinerario il " + r.treni.pass.nome + " conviene: ti fa risparmiare circa " +
      arrotonda(eur(r.treni.risparmio)) + " euro a persona rispetto ai biglietti singoli. " +
      "Attivalo il giorno " + r.treni.passDal + " del viaggio, non appena atterri: è la finestra " +
      "in cui cadono i trasferimenti cari.");
  } else {
    p.push("Attenzione al Japan Rail Pass: con questo itinerario NON conviene. " +
      "Compri i biglietti singoli e risparmi circa " + arrotonda(eur(r.treni.risparmio)) +
      " euro a persona. È il primo errore che fanno quasi tutti.");
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
  tratta: tratta, eur: eur, arrotonda: arrotonda, RITMI: RITMI, STILI: STILI
};
})();
