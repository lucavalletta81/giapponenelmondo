/* =========================================================================
   APP — solo interfaccia. Tutta la logica sta in motore.js.
   ========================================================================= */
(function () {
"use strict";
var D = window.DATI, M = window.MOTORE;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

/* --------------------------------------------------------------- STATO --- */
var S = {
  partenza: "fco", stagione: "ott", giorni: 14, ritmo: "medio", stile: "equilibrato",
  adulti: 2, bambini: 0, interessi: [], anime: [], giaVisti: [], primaVolta: true,
  voliInterni: "si", budgetMax: 0, ancoraggio: "tokyo", jrPass: "auto",
  soloTokyo: true, zona: "shinjuku"
};
var passo = 1, PASSI = 8;
var COMP = [];        // i compromessi disegnati ora: serve ad agganciare i click

/* ------------------------------------------------------------ FORMATTO --- */
function eu(n) { return Math.round(n).toLocaleString("it-IT") + " €"; }
function eu0(n) { return M.arrotonda(n, 10).toLocaleString("it-IT") + " €"; }
function yen(n) { return Math.round(n).toLocaleString("it-IT") + " ¥"; }
function esc(t) { return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

/* ============================================== COSTRUZIONE QUESTIONARIO = */
function riempiPartenze() {
  $("#partenza").innerHTML = D.partenze.map(function (p) {
    return '<option value="' + p.id + '">' + esc(p.nome) + "</option>";
  }).join("");
  $("#partenza").value = S.partenza;
}

function riempiStagioni() {
  $("#stagioni").innerHTML = D.stagioni.map(function (s) {
    return '<div class="carta' + (s.id === S.stagione ? " on" : "") + '" data-id="' + s.id + '">' +
      "<b>" + esc(s.nome) + "</b><span>" + esc(s.nota) + "</span></div>";
  }).join("");
  $$("#stagioni .carta").forEach(function (c) {
    c.onclick = function () {
      S.stagione = c.dataset.id;
      $$("#stagioni .carta").forEach(function (x) { x.classList.remove("on"); });
      c.classList.add("on");
    };
  });
}

function riempiInteressi() {
  $("#interessi").innerHTML = D.interessi.map(function (i) {
    return '<div class="carta" data-id="' + i.id + '"><b>' + esc(i.nome) + "</b><span>" + esc(i.desc) + "</span></div>";
  }).join("");
  $$("#interessi .carta").forEach(function (c) {
    c.onclick = function () {
      var id = c.dataset.id, k = S.interessi.indexOf(id);
      if (k === -1) S.interessi.push(id); else S.interessi.splice(k, 1);
      c.classList.toggle("on");
    };
  });
}

function riempiSerie() {
  $("#serie").innerHTML = D.anime.map(function (a) {
    var dove = a.luoghi.map(function (l) { return M.citta(M.luogo(l).citta).nome; });
    var uniq = dove.filter(function (v, i) { return dove.indexOf(v) === i; });
    return '<div class="carta" data-id="' + a.id + '"><b>' + esc(a.nome) + "</b><span>" + esc(uniq.join(", ")) + "</span></div>";
  }).join("");
  $$("#serie .carta").forEach(function (c) {
    c.onclick = function () {
      var id = c.dataset.id, k = S.anime.indexOf(id);
      if (k === -1) S.anime.push(id); else S.anime.splice(k, 1);
      c.classList.toggle("on");
    };
  });
}

/* Le zone col loro prezzo VERO: si sceglie guardando quanto costa. */
function riempiZone() {
  var zone = M.zoneDisponibili();
  if (!zone.length) { $("#zone").innerHTML = '<p class="nota">Listino zone non caricato.</p>'; return; }
  var fascia = M.STILI[S.stile].alloggio;
  var righe = zone.map(function (z) {
    var a = M.alloggioReale(z.id, fascia, S.stagione);
    return { z: z, a: a };
  }).filter(function (r) { return r.a; });
  righe.sort(function (x, y) { return x.a.eur - y.a.eur; });
  if (!righe.length) { $("#zone").innerHTML = '<p class="nota">Per queste date non ho ancora prezzi di zona.</p>'; return; }
  if (!righe.some(function (r) { return r.z.id === S.zona; })) S.zona = righe[0].z.id;
  $("#zone").innerHTML = righe.map(function (r) {
    return '<div class="carta' + (r.z.id === S.zona ? " on" : "") + '" data-id="' + r.z.id + '">' +
      "<b>" + esc(r.z.nome) + " · " + r.a.eur + " €/notte</b><span>" + esc(r.z.nota) + "</span>" +
      '<span class="piccolo">da ' + r.a.min + " a " + r.a.max + " € su " + r.a.campione + " strutture</span></div>";
  }).join("");
  $$("#zone .carta").forEach(function (c) {
    c.onclick = function () {
      S.zona = c.dataset.id;
      $$("#zone .carta").forEach(function (x) { x.classList.remove("on"); });
      c.classList.add("on");
    };
  });
}

function riempiGiaVisti() {
  var lista = D.citta.filter(function (c) { return c.iconica || c.hub; });
  $("#giavisti").innerHTML = lista.map(function (c) {
    return '<div class="carta" data-id="' + c.id + '">' + esc(c.nome) + "</div>";
  }).join("");
  $$("#giavisti .carta").forEach(function (c) {
    c.onclick = function () {
      var id = c.dataset.id, k = S.giaVisti.indexOf(id);
      if (k === -1) S.giaVisti.push(id); else S.giaVisti.splice(k, 1);
      c.classList.toggle("on");
    };
  });
}

/* ================================================== NAVIGAZIONE PASSI ==== */
function mostraPasso(n) {
  passo = n;
  $$(".passo").forEach(function (s) { s.hidden = +s.dataset.n !== n; });
  $("#indietro").disabled = (n === 1);
  $("#avanti").textContent = (n === PASSI) ? "Calcola il preventivo" : "Avanti";
  $("#barra-testo").textContent = "Passo " + n + " di " + PASSI;
  $("#barra-fill").style.width = (n / PASSI * 100) + "%";
  if (n === 6) preparaRamo();
  if (n === 8) riempiZone();
  window.scrollTo(0, 0);
}

/* Il passo 6 esiste solo in funzione di quello che hai risposto prima:
   è questo che dà la sensazione del colloquio invece che del modulo. */
function preparaRamo() {
  $("#ramo-anime").hidden = S.interessi.indexOf("anime") === -1;
  $("#ramo-hiking").hidden = S.interessi.indexOf("hiking") === -1;
}

function leggiPasso(n) {
  if (n === 1) {
    S.partenza = $("#partenza").value;
    S.adulti = Math.max(1, +$("#adulti").value || 1);
    S.bambini = Math.max(0, +$("#bambini").value || 0);
  }
  if (n === 3) {
    S.giorni = +$("#giorni").value;
    S.ritmo = $$('input[name=ritmo]').filter(function (r) { return r.checked; })[0].value;
  }
  if (n === 4) {
    S.primaVolta = $$('input[name=pv]').filter(function (r) { return r.checked; })[0].value === "si";
    if (S.primaVolta) S.giaVisti = [];
  }
  if (n === 5) {
    if (S.interessi.length < 2) { $("#err-interessi").hidden = false; return false; }
    $("#err-interessi").hidden = true;
  }
  if (n === 6) {
    S.voliInterni = $$('input[name=voli]').filter(function (r) { return r.checked; })[0].value;
    S.budgetMax = +$("#budget").value || 0;
    if (S.interessi.indexOf("hiking") !== -1 && $("#fuji-si").checked && S.interessi.indexOf("insolito") === -1)
      S.interessi.push("insolito");
  }
  if (n === 7) S.stile = $$('input[name=stile]').filter(function (r) { return r.checked; })[0].value;
  return true;
}

/* ========================================================= RISULTATO ===== */
function calcolaEMostra() {
  var r = M.pianifica(S);
  var comp = M.compromessi(S, r);
  $("#wizard").hidden = true;
  $("#risultato").hidden = false;
  COMP = comp;
  $("#risultato").innerHTML = disegna(r, comp);
  agganciaRisultato();
  window.scrollTo(0, 0);
}

function disegna(r, comp) {
  var h = [];
  var liv = r.livelli[S.stile];
  var persone = S.adulti + S.bambini;

  h.push("<h2>Il tuo viaggio, in numeri</h2>");

  /* --- i tre livelli ---------------------------------------------------- */
  h.push('<div class="colonne">');
  ["essenziale", "equilibrato", "comodo"].forEach(function (k) {
    var l = r.livelli[k];
    h.push('<div class="prezzo' + (k === S.stile ? " on" : "") + '" data-stile="' + k + '">' +
      "<div>" + esc(l.nome) + '</div><div class="cifra">' + eu0(l.perPersona) + "</div>" +
      '<div class="piccolo">a persona · ' + eu0(l.alGiorno) + " al giorno</div>" +
      '<div class="piccolo">gruppo di ' + persone + ": <b>" + eu0(l.gruppo) + "</b></div></div>");
  });
  h.push("</div>");
  h.push('<p class="nota">Clicca una colonna per cambiare il livello di riferimento. ' +
    "Il numero è un intervallo travestito da cifra: consideralo ±15%.</p>");

  /* --- la prosa --------------------------------------------------------- */
  h.push('<div class="box">');
  M.prosa(r).forEach(function (p) { h.push("<p>" + esc(p) + "</p>"); });
  h.push("</div>");

  /* --- manopole live ---------------------------------------------------- */
  h.push('<div class="manopole"><b>Prova a cambiare qualcosa</b>' +
    '<div class="riga">' +
    '<label>Giorni: <output id="m-giorni-out">' + S.giorni + "</output>" +
      '<input type="range" id="m-giorni" min="5" max="30" value="' + S.giorni + '"></label>' +
    "<label>Stagione<select id=\"m-stagione\">" + D.stagioni.map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === S.stagione ? " selected" : "") + ">" + esc(s.nome) + "</option>";
    }).join("") + "</select></label>" +
    "<label>Ritmo<select id=\"m-ritmo\">" + ["lento", "medio", "veloce"].map(function (x) {
      return '<option value="' + x + '"' + (x === S.ritmo ? " selected" : "") + ">" + x + "</option>";
    }).join("") + "</select></label>" +
    "<label>Voli interni<select id=\"m-voli\">" +
      '<option value="si"' + (S.voliInterni === "si" ? " selected" : "") + ">sì</option>" +
      '<option value="no"' + (S.voliInterni === "no" ? " selected" : "") + ">no, solo treno</option>" +
    "</select></label></div></div>");

  /* --- dettaglio della spesa -------------------------------------------- */
  h.push("<h2>Da cosa è fatto questo numero</h2>");
  h.push("<div class=\"tabella-wrap\"><table><tr><th>Voce</th><th class=num>a persona</th><th class=num>gruppo</th><th>come è calcolata</th></tr>");
  var vf = liv.volo_fonte;
  var spiega = {
    volo: vf
      ? ("prezzo reale Google Flights, " + M.partenza(S.partenza).nome + " → Tokyo, partenza " +
         vf.out.split("-").reverse().join("/") + (vf.compagnia ? ", " + vf.compagnia : "") +
         ", " + Math.round((vf.min_and || 0) / 60) + "h all'andata, " +
         (vf.scali === 0 ? "diretto" : vf.scali + (vf.scali === 1 ? " scalo" : " scali")) +
         (vf.scalo_peggio > 240 ? " (il più lungo di " + Math.floor(vf.scalo_peggio / 60) + "h)" : "") +
         ", classe " + (vf.classe || "").toLowerCase().replace("_", " ") +
         " — rilevato il " + (vf.letto || "").split("-").reverse().join("/"))
      : ("stima: andata/ritorno da " + M.partenza(S.partenza).nome +
         ", tariffa media × moltiplicatore di stagione (" + r.stagione.volo + "×)"),
    trasporti: "biglietti del giro + trasporto urbano " + yen(D.trasporto_locale_yen_giorno) + "/giorno + transfer aeroporto",
    alloggio: liv.alloggio_fonte
      ? ("prezzo reale Google Hotels: " + liv.alloggio_fonte.eur + " € a notte × " + liv.notti +
         " notti " + esc(M.aZona(liv.zona)) + " — mediana di " + liv.alloggio_fonte.campione +
         " strutture (da " + liv.alloggio_fonte.min + " a " + liv.alloggio_fonte.max + " €), " +
         "rilevato il " + liv.alloggio_fonte.letto.split("-").reverse().join("/"))
      : (liv.notti + " notti, stima: tariffa per città × " + r.stagione.hotel + "× di stagione"),
    cibo: D.cibo[S.stile].desc,
    attivita: liv.attIncluse.length + " ingressi ed esperienze a pagamento",
    extra: "assicurazione, eSIM, souvenir",
    imprevisti: "5% di margine: c'è sempre qualcosa"
  };
  [["volo", "Volo intercontinentale" + (vf ? ' <span class="tag">reale</span>' : ' <span class="tag">stima</span>')],
   ["trasporti", "Trasporti in Giappone"],
   ["alloggio", "Alloggio" + (liv.alloggio_fonte ? ' <span class="tag">reale</span>' : ' <span class="tag">stima</span>')],
   ["cibo", "Mangiare"], ["attivita", "Ingressi ed esperienze"], ["extra", "Extra"], ["imprevisti", "Imprevisti"]
  ].forEach(function (v) {
    h.push("<tr><td>" + v[1] + '</td><td class=num>' + eu(liv.voci[v[0]]) + "</td><td class=num>" +
      eu(liv.voci[v[0]] * (S.adulti + S.bambini * 0.65)) + "</td><td>" + esc(spiega[v[0]]) + "</td></tr>");
  });
  h.push('<tr class=tot><td>Totale</td><td class=num>' + eu(liv.perPersona) + "</td><td class=num>" +
    eu(liv.gruppo) + "</td><td></td></tr></table></div>");

  /* dettagli apribili */
  h.push("<details><summary>Notte per notte</summary><div class=\"tabella-wrap\"><table><tr><th>Città</th><th class=num>notti</th><th class=num>a notte</th><th class=num>totale</th></tr>" +
    liv.dettAlloggio.map(function (a) {
      return "<tr><td>" + esc(a.citta) + "</td><td class=num>" + a.notti + "</td><td class=num>" +
        eu(M.eur(a.tariffa)) + "</td><td class=num>" + eu(M.eur(a.sub)) + "</td></tr>";
    }).join("") + "</table></div></details>");

  h.push("<details><summary>Ogni biglietto del giro</summary><div class=\"tabella-wrap\"><table><tr><th>Tratta</th><th>Mezzo</th><th class=num>min</th><th class=num>costo</th><th>JR Pass</th></tr>" +
    r.treni.biglietti.map(function (b) {
      return "<tr><td>" + esc(M.citta(b.da).nome + " → " + M.citta(b.a).nome) + "</td><td>" + esc(b.mezzo) +
        (b.stimata ? ' <span class="tag">stimata</span>' : "") + "</td><td class=num>" + b.min +
        "</td><td class=num>" + eu(M.eur(b.yen)) + "</td><td>" + (b.jr ? "coperta" : "no") + "</td></tr>";
    }).join("") + "</table></div></details>");

  h.push("<details><summary>Cosa è incluso negli ingressi</summary><ul>" +
    (liv.attIncluse.length ? liv.attIncluse.map(function (a) {
      return "<li>" + esc(a.nome) + " — " + eu(M.eur(a.yen)) + "</li>";
    }).join("") : "<li>Solo cose gratuite: a questo livello si punta su quello che non si paga.</li>") + "</ul></details>");

  /* --- il pass ---------------------------------------------------------- */
  h.push('<div class="box attenzione"><h3>Japan Rail Pass: conviene o no</h3>');
  h.push("<p>Biglietti singoli per tutto il giro: <b>" + eu(M.eur(r.treni.senzaPass)) + "</b> a persona" +
    (r.treni.conPass !== null ? " — con " + esc(r.treni.pass.nome) + ": <b>" + eu(M.eur(r.treni.conPass)) + "</b>" : "") + ".</p>");
  h.push("<p><b>" + (r.treni.usaPass
    ? "Conviene il pass: risparmi " + eu(M.eur(r.treni.risparmio)) + " a persona. Attivalo il giorno " + r.treni.passDal + "."
    : "Non conviene il pass: coi biglietti singoli risparmi " + eu(M.eur(r.treni.risparmio)) + " a persona.") + "</b></p>");
  h.push('<p class="nota">Il conto tiene conto che il pass non deve coprire tutto il viaggio, ' +
    "ma solo la finestra in cui cadono i trasferimenti cari. Il prezzo del pass nel dataset è marcato come stima: " +
    "va riverificato sul sito ufficiale prima di dare questo consiglio a qualcuno.</p></div>");

  /* --- itinerario ------------------------------------------------------- */
  h.push("<h2>L'itinerario che ne esce</h2>");
  h.push("<p>" + esc(r.itinerario.rotta.map(function (c) { return M.citta(c).nome; }).join(" → ")) +
    " → " + esc(M.citta(r.itinerario.base).nome) + " (rientro)</p>");
  h.push(mappa(r));
  h.push('<div class="giorni">');
  h.push('<div class="giorno"><span class="n">Giorno 1</span> — volo, arrivo a ' +
    esc(M.citta(r.itinerario.base).nome) + ", transfer e crollo.</div>");
  r.itinerario.giorni.forEach(function (g) {
    h.push('<div class="giorno"><span class="n">Giorno ' + (g.n + 1) + "</span> — " + esc(M.citta(g.citta).nome));
    if (g.trasferimento) h.push('<div class="trasf">Trasferimento da ' + esc(M.citta(g.trasferimento.da).nome) +
      ": " + esc(g.trasferimento.mezzo) + ", " + g.trasferimento.min + " minuti, " + eu(M.eur(g.trasferimento.yen)) + "</div>");
    if (g.luoghi.length) {
      h.push("<ul>" + g.luoghi.map(function (l) {
        return "<li>" + esc(l.nome) + " <span class=piccolo>(" + l.ore + "h" +
          (l.yen ? ", " + eu(M.eur(l.yen)) : ", gratis") + ")</span>" +
          (l.nota ? ' <span class="nota">' + esc(l.nota) + "</span>" : "") + "</li>";
      }).join("") + "</ul>");
    } else {
      h.push('<div class="trasf">Giornata libera: a questo punto il dataset non ha altro da proporti qui. ' +
        "Segnale che potresti accorciare la tappa.</div>");
    }
    h.push("</div>");
  });
  h.push("</div>");

  /* --- compromessi ------------------------------------------------------ */
  h.push('<h2 id="compromessi-t">Le leve: cosa cambia il prezzo, e di quanto</h2>');
  h.push('<p class="nota">Ogni riga è il preventivo rifatto da capo con quella modifica. ' +
    "Cliccala per applicarla davvero.</p>");
  h.push('<div id="compromessi">');
  comp.forEach(function (c, i) {
    h.push('<div class="compromesso' + (c.soloInfo ? " info" : "") + '" data-i="' + i + '"><span>' + esc(c.etichetta) +
      (c.avvertenza ? '<br><span class="nota">' + esc(c.avvertenza) + "</span>" : "") + "</span>" +
      '<span class="d ' + (c.delta < 0 ? "giu" : "su") + '">' + (c.delta > 0 ? "+" : "−") +
      eu0(Math.abs(c.delta)) + "</span></div>");
  });
  h.push("</div>");

  /* --- onestà ----------------------------------------------------------- */
  h.push('<div class="box"><h3>Da dove vengono questi prezzi</h3>' +
    "<p><b>" + r.attendibilita.stime + " voci su " + r.attendibilita.totale + " (" +
    r.attendibilita.perc + "%) di questo preventivo sono stime</b>, non tariffe controllate su fonte ufficiale.</p>" +
    "<p><b>Prezzi veri, letti da un sistema di prenotazione:</b> " +
      [vf ? "il volo (Google Flights, tariffa esatta " + vf.esatto + " €, arrotondata ai 25)" : null,
       liv.alloggio_fonte ? "l'alloggio (Google Hotels, mediana di " + liv.alloggio_fonte.campione +
         " strutture " + esc(M.aZona(liv.zona)) + ", arrotondata ai 5)" : null,
       r.cambio && r.cambio.vero ? "il cambio euro/yen (1 € = " + r.cambio.v + " ¥, BCE del " +
         r.cambio.data.split("-").reverse().join("/") + ")" : null
      ].filter(Boolean).join("; ") + ".</p>" +
    "<p><b>Ancora stime scritte a mano:</b> " +
      (liv.alloggio_fonte ? "" : "l'alloggio (per questa zona e questa fascia Google non aveva " +
        "abbastanza strutture, quindi vale il catalogo); ") +
      "treni e metropolitana, ingressi ed esperienze, quanto si spende per mangiare, " +
      "assicurazione e souvenir. Nessuna disponibilità viene interrogata: se l'albergo è pieno, " +
      "questo non lo sa.</p>" +
    "<p>Quello che non è né vero né stimato ma <b>calcolato</b> è il ragionamento: come si " +
    "riempiono le giornate, quali gite reggono il viaggio, la somma delle voci, e di quanto " +
    "si sposta il totale quando cambi una risposta. Quello vale a prescindere dai prezzi.</p>" +
    "<p>" + (r.cambio && r.cambio.vero
      ? ("Cambio usato: 1 € = " + r.cambio.v + " ¥, quotazione BCE del " +
         r.cambio.data.split("-").reverse().join("/") + ".")
      : ("Cambio usato: 1 € = " + r.cambio.v + " ¥, valore di ripiego: il servizio della BCE " +
         "non ha risposto.")) +
    (window.PREZZI && window.PREZZI.generato
      ? " Listino prezzi rigenerato il " + window.PREZZI.generato.slice(0,10).split("-").reverse().join("/") + "."
      : "") + "</p>" +
    '<p class="nota">Questo contatore dice quello che il servizio non sa. Scende solo verificando ' +
    "le voci una per una, non nascondendolo.</p></div>");

  h.push('<div id="comandi"><button id="stampa">Stampa / salva in PDF</button>' +
    '<button id="modifica">Cambia le risposte</button>' +
    '<button id="ricomincia">Ricomincia da zero</button></div>');
  return h.join("");
}

/* ---------------------------------------------------------- MAPPINA ------ */
/* Non è una mappa vera: è una proiezione equirettangolare corretta in
   longitudine, inquadrata sul giro invece che su tutto il Giappone. Serve a
   far vedere la forma del percorso e a smascherare gli itinerari a zig-zag. */
function mappa(r) {
  var W = 900, H = 540, PAD = 56;
  var rotta = r.itinerario.rotta.map(function (id) { return M.citta(id); });
  var latM = rotta.reduce(function (a, c) { return a + c.lat; }, 0) / rotta.length;
  var kx = Math.cos(latM * Math.PI / 180);
  function PX(c) { return c.lon * kx; }
  function PY(c) { return -c.lat; }

  var xs = rotta.map(PX), ys = rotta.map(PY);
  var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
  var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
  var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  var sx = Math.max(x1 - x0, 1.4), sy = Math.max(y1 - y0, 1.1);
  var scala = Math.min((W - PAD * 2 - 150) / sx, (H - PAD * 2) / sy);
  function px(c) { return W / 2 + (PX(c) - cx) * scala - 60; }
  function py(c) { return H / 2 + (PY(c) - cy) * scala; }

  var s = ['<svg class="mappa" viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg" ' +
           'role="img" aria-label="Percorso: ' + esc(rotta.map(function (c) { return c.nome; }).join(", ")) + '">'];

  /* le altre città, come sfondo: danno la scala del giro */
  D.citta.forEach(function (c) {
    var x = px(c), y = py(c);
    if (x < 4 || x > W - 4 || y < 4 || y > H - 4) return;
    s.push('<circle class="pt" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3"/>');
  });

  var giro = rotta.concat([M.citta(r.itinerario.base)]);
  s.push('<polyline class="rotta" fill="none" stroke-width="1.8" stroke-dasharray="6 4" points="' +
    giro.map(function (c) { return px(c).toFixed(1) + "," + py(c).toFixed(1); }).join(" ") + '"/>');

  /* etichette: si spostano in giù finché non si pestano i piedi */
  var messe = [];
  rotta.forEach(function (c, i) {
    var x = px(c), y = py(c);
    s.push('<circle class="tappa" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6"/>');
    var destra = x < W * 0.6;
    var tx = destra ? x + 12 : x - 12, ty = y + 5, giri = 0;
    while (giri < 14 && messe.some(function (m) {
      return Math.abs(m.y - ty) < 17 && Math.abs(m.x - tx) < 210;
    })) { ty += 17; giri++; }
    messe.push({ x: tx, y: ty });
    if (ty - y > 8) s.push('<line class="guida" x1="' + x.toFixed(1) + '" y1="' + (y + 6).toFixed(1) +
      '" x2="' + tx.toFixed(1) + '" y2="' + (ty - 4).toFixed(1) + '"/>');
    s.push('<text x="' + tx.toFixed(1) + '" y="' + ty.toFixed(1) + '" font-size="15"' +
      (destra ? "" : ' text-anchor="end"') + ">" + (i + 1) + ". " + esc(c.nome) + "</text>");
  });
  s.push("</svg>");
  return s.join("");
}

/* ------------------------------------------------------- EVENTI OUTPUT --- */
function agganciaRisultato() {
  $$("#risultato .prezzo").forEach(function (p) {
    p.onclick = function () { S.stile = p.dataset.stile; calcolaEMostra(); };
  });
  var mg = $("#m-giorni");
  if (mg) {
    mg.oninput = function () { $("#m-giorni-out").textContent = mg.value; };
    mg.onchange = function () { S.giorni = +mg.value; calcolaEMostra(); };
  }
  ["m-stagione:stagione", "m-ritmo:ritmo", "m-voli:voliInterni"].forEach(function (par) {
    var p = par.split(":"), el = $("#" + p[0]);
    if (el) el.onchange = function () { S[p[1]] = el.value; calcolaEMostra(); };
  });
  $$("#risultato .compromesso").forEach(function (el) {
    el.onclick = function () {
      var c = COMP[+el.dataset.i];
      if (!c || c.soloInfo) return;
      for (var k in c.patch) S[k] = c.patch[k];
      calcolaEMostra();
    };
  });
  $("#stampa").onclick = function () { window.print(); };
  $("#modifica").onclick = function () {
    $("#risultato").hidden = true; $("#wizard").hidden = false; mostraPasso(1);
  };
  $("#ricomincia").onclick = function () { location.reload(); };
}

/* ------------------------------------------------------------- AVVIO ----- */
function avvia() {
  riempiPartenze(); riempiStagioni(); riempiInteressi(); riempiSerie(); riempiGiaVisti();

  $("#giorni").oninput = function () { $("#giorni-out").textContent = this.value; };
  $$('input[name=pv]').forEach(function (r) {
    r.onchange = function () { $("#giavisti-box").hidden = ($$('input[name=pv]')[0].checked); };
  });

  $("#avanti").onclick = function () {
    if (!leggiPasso(passo)) return;
    if (passo === PASSI) { calcolaEMostra(); return; }
    mostraPasso(passo + 1);
  };
  $("#indietro").onclick = function () { if (passo > 1) mostraPasso(passo - 1); };

  mostraPasso(1);
}
avvia();
})();
