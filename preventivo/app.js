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
  soloTokyo: true, zona: null, rami: [],
  confronto: null          /* la stagione affiancata nel confronto del risultato */
};

/* Il motore vuole un solo elenco di tag: interessi grossi + rami fini.
   Li teniamo separati nello stato perché il questionario li chiede in due
   momenti diversi, e li uniamo solo quando si calcola. */
function perMotore() {
  var m = {}; for (var k in S) m[k] = S[k];
  m.interessi = S.interessi.concat(S.rami);
  return m;
}
/* I passi, nell'ordine in cui si fanno. Gli interessi vengono per primi
   perché sono il cuore del servizio: decidono l'itinerario, non le date.
   "spostamenti" esiste solo quando il giro tocca più città: a Tokyo e nelle
   gite in giornata non si vola, e una domanda che non cambia niente non si fa. */
var PASSI = [
  { id: "interessi",   breve: "Cosa ti interessa davvero" },
  { id: "rami",        breve: "Precisiamo" },
  { id: "chi",         breve: "Chi parte, e da dove" },
  { id: "quando",      breve: "Quando andare" },
  { id: "ritmo",       breve: "Quanto a lungo, e che ritmo" },
  { id: "giastato",    breve: "Ci sei già stato in Giappone?" },
  { id: "spostamenti", breve: "Spostamenti dentro il Giappone", soloMulti: true },
  { id: "stile",       breve: "Che tipo di viaggiatore sei" }
];
function passiAttivi() {
  return PASSI.filter(function (p) { return !p.soloMulti || S.soloTokyo === false; });
}
var passo = 0;            // indice dentro passiAttivi()
var raggiunto = 0;        // il passo più avanti che l'utente ha visto: quelli prima sono cliccabili
var COMP = [];        // i compromessi disegnati ora: serve ad agganciare i click

/* le immagini: in locale e nel sito stanno in img/, nel file unico della demo
   build_demo.py le inietta in window.PV_IMG come data URI. Nel tema pixel
   ogni nome prende il prefisso px- (stessi nomi, altro disegno). */
var TEMA = "piatto";
try { TEMA = localStorage.getItem("pv-tema") === "pixel" ? "pixel" : "piatto"; } catch (e) {}
function img(nome) {
  var n = (TEMA === "pixel" ? "px-" : "") + nome;
  return (window.PV_IMG && window.PV_IMG[n]) || ("img/" + n);
}

/* L'interruttore in alto a destra: due vestiti per la stessa pagina. Cambia
   l'attributo data-tema (tema-pixel.css fa il resto) e scambia le immagini. */
function applicaTema(t) {
  TEMA = t === "pixel" ? "pixel" : "piatto";
  try { localStorage.setItem("pv-tema", TEMA); } catch (e) {}
  var lay = $(".pv-layout");
  if (lay) lay.setAttribute("data-tema", TEMA);
  document.body.setAttribute("data-tema", TEMA);
  $$("img[data-img]").forEach(function (im) { im.src = img(im.dataset.img); });
  $$("#pv-tema span").forEach(function (sp) { sp.classList.toggle("on", sp.dataset.tema === TEMA); });
}

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
    var n = M.ramiDisponibili(i.id, S.soloTokyo).length;
    return '<div class="carta conAiuto" data-id="' + i.id + '" tabindex="0" role="button" ' +
      'aria-pressed="false" title="' + esc(i.dettaglio || i.desc) + '">' +
      '<img class="ico" src="' + img("int-" + i.id + ".webp") + '" data-img="int-' + i.id + '.webp" alt="" width="128" height="128" loading="lazy">' +
      "<b>" + esc(i.nome) + "</b>" +
      "<span>" + esc(i.desc) + "</span>" +
      (n ? '<span class="conta">' + n + " domande in più al passo dopo</span>" : "") +
      '<span class="aiuto">' + esc(i.dettaglio || i.desc) + "</span></div>";
  }).join("");
  $$("#interessi .carta").forEach(function (c) {
    c.onclick = function () {
      var id = c.dataset.id, k = S.interessi.indexOf(id);
      if (k === -1) S.interessi.push(id); else S.interessi.splice(k, 1);
      c.classList.toggle("on");
      c.setAttribute("aria-pressed", c.classList.contains("on") ? "true" : "false");
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
  var lista = passiAttivi();
  passo = Math.max(0, Math.min(n, lista.length - 1));
  if (passo > raggiunto) raggiunto = passo;
  var corrente = lista[passo].id;
  $$(".passo").forEach(function (s) { s.hidden = s.dataset.id !== corrente; });
  lista.forEach(function (p, k) {
    var sez = $('.passo[data-id="' + p.id + '"] h2 .n');
    if (sez) sez.textContent = (k + 1) + ".";
  });
  $("#indietro").disabled = (passo === 0);
  $("#avanti").innerHTML = (passo === lista.length - 1)
    ? "Calcola il preventivo <span aria-hidden=\"true\">→</span>"
    : "Avanti <span aria-hidden=\"true\">→</span>";
  $("#barra-testo").textContent = "Passo " + (passo + 1) + " di " + lista.length;
  $("#barra-fill").style.width = ((passo + 1) / lista.length * 100) + "%";
  if (corrente === "rami") preparaRamo();
  disegnaSpalla(corrente);
  window.scrollTo(0, 0);
}

/* la spalla a sinistra: l'elenco dei passi, con quello corrente acceso e
   quelli già visti cliccabili. L'ultima voce è il risultato. */
function disegnaSpalla(corrente) {
  var ol = $("#pv-passi");
  if (!ol) return;
  var lista = passiAttivi();
  var h = lista.map(function (p, k) {
    var cls = p.id === corrente ? "on" : (k <= raggiunto ? "fatto" : "");
    return '<li class="' + cls + '" data-k="' + k + '"' + (cls === "fatto" ? ' tabindex="0" role="button"' : "") + ">" +
      '<span class="pallino">' + (k + 1) + '</span><span class="testo">' + esc(p.breve) + "</span></li>";
  });
  h.push('<li class="risultato' + (corrente === "risultato" ? " on" : "") + '">' +
    '<span class="pallino">' + (lista.length + 1) + '</span><span class="testo">Il risultato e il tuo budget</span></li>');
  ol.innerHTML = h.join("");
  $$("#pv-passi li.fatto").forEach(function (li) {
    var vai = function () {
      if (!$("#risultato").hidden) { $("#risultato").hidden = true; $("#wizard").hidden = false; }
      mostraPasso(+li.dataset.k);
    };
    li.onclick = vai;
    li.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); vai(); } };
  });
}

/* Il passo 6 esiste solo in funzione di quello che hai risposto prima:
   è questo che dà la sensazione del colloquio invece che del modulo.
   Un blocco per ogni interesse scelto, e dentro solo i rami che a Tokyo
   hanno davvero dei luoghi: una scelta che non cambia niente non si offre. */
function preparaRamo() {
  var h = [];
  S.interessi.forEach(function (id) {
    var i = M.interesse(id);
    if (!i) return;
    if (id === "anime") {                       /* l'anime ha il suo mazzo di serie */
      h.push('<div class="ramo"><h3>' + esc(i.nome) + "</h3>" +
        '<p class="nota">Quali serie vuoi vedere dal vivo. Il pellegrinaggio (聖地巡礼, ' +
        "<i>seichi junrei</i>) cambia la rotta: alcuni luoghi sono lontani dai giri classici.</p>" +
        '<div class="carte fitte" data-serie="1">' + D.anime.map(function (a) {
          var dove = a.luoghi.map(function (l) { return M.citta(M.luogo(l).citta).nome; });
          var uniq = dove.filter(function (v, k) { return dove.indexOf(v) === k; });
          return '<div class="carta' + (S.anime.indexOf(a.id) !== -1 ? " on" : "") +
            '" data-serie-id="' + a.id + '"><b>' + esc(a.nome) + "</b><span>" +
            esc(uniq.join(", ")) + "</span></div>";
        }).join("") + "</div></div>");
      return;
    }
    var rami = M.ramiDisponibili(id, S.soloTokyo);
    if (!rami.length) return;
    h.push('<div class="ramo"><h3>' + esc(i.nome) + "</h3>" +
      (i.dettaglio ? '<p class="nota">' + esc(i.dettaglio) + "</p>" : "") +
      '<div class="carte fitte">' + rami.map(function (r) {
        return '<div class="carta' + (S.rami.indexOf(r.id) !== -1 ? " on" : "") +
          '" data-ramo="' + r.id + '"><b>' + esc(r.nome) + "</b><span>" + esc(r.desc) + "</span>" +
          '<span class="conta">' + r.quanti + (r.quanti === 1 ? " luogo" : " luoghi") + "</span></div>";
      }).join("") + "</div></div>");
  });
  $("#rami").innerHTML = h.join("") ||
    '<p class="nota">Per quello che hai scelto non ci sono altre domande: si va avanti.</p>';

  $$("#rami .carta[data-ramo]").forEach(function (c) {
    c.onclick = function () {
      var id = c.dataset.ramo, k = S.rami.indexOf(id);
      if (k === -1) S.rami.push(id); else S.rami.splice(k, 1);
      c.classList.toggle("on");
    };
  });
  $$("#rami .carta[data-serie-id]").forEach(function (c) {
    c.onclick = function () {
      var id = c.dataset.serieId, k = S.anime.indexOf(id);
      if (k === -1) S.anime.push(id); else S.anime.splice(k, 1);
      c.classList.toggle("on");
    };
  });
}

function leggiPasso(id) {
  if (id === "chi") {
    S.partenza = $("#partenza").value;
    S.adulti = Math.max(1, +$("#adulti").value || 1);
    S.bambini = Math.max(0, +$("#bambini").value || 0);
  }
  if (id === "ritmo") {
    S.giorni = +$("#giorni").value;
    S.ritmo = $$('input[name=ritmo]').filter(function (r) { return r.checked; })[0].value;
  }
  if (id === "giastato") {
    S.primaVolta = $$('input[name=pv]').filter(function (r) { return r.checked; })[0].value === "si";
    if (S.primaVolta) S.giaVisti = [];
  }
  if (id === "interessi") {
    if (S.interessi.length < 2) { $("#err-interessi").hidden = false; return false; }
    $("#err-interessi").hidden = true;
  }
  if (id === "rami") {
    /* i rami spariti perché l'interesse è stato deselezionato non devono restare */
    S.rami = S.rami.filter(function (t) {
      return S.interessi.some(function (i) {
        return M.ramiDisponibili(i, S.soloTokyo).some(function (r) { return r.id === t; });
      });
    });
  }
  if (id === "spostamenti") {
    S.voliInterni = $$('input[name=voli]').filter(function (r) { return r.checked; })[0].value;
  }
  if (id === "stile") S.stile = $$('input[name=stile]').filter(function (r) { return r.checked; })[0].value;
  return true;
}

/* ========================================================= RISULTATO ===== */
function calcolaEMostra() {
  var input = perMotore();
  var r = M.pianifica(input);
  var comp = M.compromessi(input, r);
  $("#wizard").hidden = true;
  $("#risultato").hidden = false;
  COMP = comp;
  $("#risultato").innerHTML = disegna(r, comp);
  agganciaRisultato();
  disegnaSpalla("risultato");
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

  /* --- confronto fra stagioni ------------------------------------------- */
  /* Come la pagina "confronta" di Apple: due colonne, le stesse righe, e si
     vede subito dove sta la differenza. La stagione è la leva più grossa,
     quindi si confronta quella; di default l'alternativa più economica. */
  h.push(confronto(r));

  /* il tetto di spesa resta, ma in una riga discreta sotto il confronto */
  h.push('<div class="manopole"><div class="riga">' +
    '<label>Tetto di spesa per il gruppo, in euro<input type="number" id="m-budget" min="0" step="100" value="' +
      (S.budgetMax || "") + '" placeholder="nessuno"></label>' +
    (S.soloTokyo === false
      ? "<label>Voli interni<select id=\"m-voli\">" +
        '<option value="si"' + (S.voliInterni === "si" ? " selected" : "") + ">sì</option>" +
        '<option value="no"' + (S.voliInterni === "no" ? " selected" : "") + ">no, solo treno</option>" +
        "</select></label>"
      : "") +
    "</div></div>");

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
    alloggio: !liv.alloggio_fonte
      ? (liv.notti + " notti, stima: tariffa per città × " + r.stagione.hotel + "× di stagione")
      : liv.alloggio_fonte.auto
        ? ("prezzo reale Google Hotels: " + liv.alloggio_fonte.eur + " € a notte × " + liv.notti +
           " notti — mediana delle " + liv.alloggio_fonte.zone + " zone di Tokyo in questa fascia, " +
           "su " + liv.alloggio_fonte.strutture + " strutture (da " + liv.alloggio_fonte.economica.nome +
           " a " + liv.alloggio_fonte.economica.eur + " € fino a " + liv.alloggio_fonte.cara.nome +
           " a " + liv.alloggio_fonte.cara.eur + " €), rilevato il " +
           liv.alloggio_fonte.letto.split("-").reverse().join("/"))
        : ("prezzo reale Google Hotels: " + liv.alloggio_fonte.eur + " € a notte × " + liv.notti +
           " notti " + esc(M.aZona(liv.zona)) + " — mediana di " + liv.alloggio_fonte.campione +
           " strutture (da " + liv.alloggio_fonte.min + " a " + liv.alloggio_fonte.max + " €), " +
           "rilevato il " + liv.alloggio_fonte.letto.split("-").reverse().join("/")),
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

  if (liv.alloggio_fonte && liv.alloggio_fonte.auto) {
    h.push('<details><summary>Quanto costa la notte, zona per zona</summary>' +
      '<p class="nota">Fascia ' + esc(M.STILI[S.stile].alloggio) + ", " + esc(r.stagione.nome) +
      ". Il preventivo usa la mediana; cliccando una leva più sotto ti sposti su una zona precisa.</p>" +
      '<div class="tabella-wrap"><table><tr><th>Zona</th><th class=num>€/notte</th>' +
      "<th class=num>su " + liv.notti + " notti</th><th class=num>strutture</th><th>com'è</th></tr>" +
      liv.alloggio_fonte.elenco.map(function (z) {
        var zz = M.zoneDisponibili().filter(function (x) { return x.id === z.zona; })[0] || {};
        return "<tr><td>" + esc(z.nome) + "</td><td class=num>" + z.eur + " €</td><td class=num>" +
          eu(z.eur * liv.notti) + "</td><td class=num>" + z.campione + "</td><td>" +
          esc(zz.nota || "") + "</td></tr>";
      }).join("") + "</table></div></details>");
  }

  h.push("<details><summary>Ogni biglietto del giro</summary><div class=\"tabella-wrap\"><table><tr><th>Tratta</th><th>Mezzo</th><th class=num>min</th><th class=num>costo</th><th>JR Pass</th></tr>" +
    r.treni.biglietti.map(function (b) {
      return "<tr><td>" + esc(M.citta(b.da).nome + " → " + M.citta(b.a).nome) + "</td><td>" + esc(b.mezzo) +
        (b.stimata ? ' <span class="tag">stimata</span>' : "") + "</td><td class=num>" + b.min +
        "</td><td class=num>" + eu(M.eur(b.yen)) + "</td><td>" + (b.jr ? "coperta" : "no") + "</td></tr>";
    }).join("") + "</table></div></details>");

  h.push('<details><summary>Cosa è incluso negli ingressi, e da dove viene ogni prezzo</summary>' +
    '<div class="tabella-wrap"><table><tr><th>Voce</th><th class=num>costo</th><th>prezzo</th><th>fonte</th></tr>' +
    (liv.attIncluse.length ? liv.attIncluse.map(function (a) {
      var stato = a.c === "V" ? '<span class="tag ok">verificato</span>'
                : a.tipo === "spesa" ? '<span class="tag">spesa tipica</span>'
                : '<span class="tag">stima</span>';
      var fonte = a.c === "V" ? esc(a.fonte || "") + (a.verificato ? " · " + a.verificato.split("-").reverse().join("/") : "")
                : a.fascia_prezzo ? esc(a.fascia_prezzo)
                : a.tipo === "spesa" ? "non esiste un listino: è quanto si spende"
                : "scritto a mano nel catalogo";
      return "<tr><td>" + esc(a.nome) + "</td><td class=num>" + eu(M.eur(a.yen)) +
             "</td><td>" + stato + "</td><td>" + fonte + "</td></tr>";
    }).join("") : '<tr><td colspan="4">Solo cose gratuite: a questo livello si punta su quello che non si paga.</td></tr>') +
    "</table></div></details>");

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
    r.attendibilita.perc + "%) sono stime</b>, non tariffe controllate su fonte ufficiale" +
    (r.attendibilita.spese ? ", più " + r.attendibilita.spese + " voci che sono <b>spese tipiche</b> " +
      "(un ramen, una serata fuori): quelle un listino ufficiale non ce l'hanno, quindi restano " +
      "stime per sempre e le teniamo contate a parte" : "") + ". " +
    (r.attendibilita.perc_importo !== null
      ? ("Ma le voci non pesano uguale: contando gli <b>euro</b>, la quota che arriva da stime è il <b>" +
         r.attendibilita.perc_importo + "%</b> del totale (" +
         Math.round(r.attendibilita.euro_veri) + " € su " + Math.round(r.attendibilita.euro_tot) +
         " vengono da un prezzo verificato). È questo il numero che conta: verificare i souvenir " +
         "non vale quanto verificare il volo.")
      : "") + "</p>" +
    '<p class="nota">La formula, così puoi rifare il conto: la percentuale sulle voci conta una voce ' +
    "per ogni ingresso, ogni tratta, ogni città toccata, più volo, alloggio e cambio, e considera " +
    "verificata solo quella che porta una marca esplicita. La percentuale sull'importo è " +
    "1 meno la somma delle voci verificate diviso il totale a persona.</p>" +
    "<p><b>Prezzi veri, letti da un sistema di prenotazione:</b> " +
      [vf ? "il volo (Google Flights, tariffa esatta " + vf.esatto + " €, arrotondata ai 25)" : null,
       liv.alloggio_fonte ? ("l'alloggio (Google Hotels, " +
         (liv.alloggio_fonte.auto
           ? "mediana delle " + liv.alloggio_fonte.zone + " zone di Tokyo su " +
             liv.alloggio_fonte.strutture + " strutture"
           : "mediana di " + liv.alloggio_fonte.campione + " strutture " + esc(M.aZona(liv.zona))) +
         ", arrotondata ai 5)") : null,
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

/* ---------------------------------------------------------- CONFRONTO ---- */
function confronto(r) {
  var input = perMotore();
  /* se non è stata scelta, l'alternativa è la stagione che costa meno */
  if (!S.confronto || S.confronto === S.stagione) {
    var meglio = null;
    D.stagioni.forEach(function (s) {
      if (s.id === S.stagione) return;
      var i2 = perMotore(); i2.stagione = s.id;
      var tot = M.pianifica(i2).livelli[S.stile].perPersona;
      if (!meglio || tot < meglio.tot) meglio = { id: s.id, tot: tot };
    });
    S.confronto = meglio ? meglio.id : S.stagione;
  }
  var i2 = perMotore(); i2.stagione = S.confronto;
  var r2 = M.pianifica(i2);
  var A = r.livelli[S.stile], B = r2.livelli[S.stile];
  var sA = r.stagione, sB = r2.stagione;
  var persone = S.adulti + S.bambini;

  function cella(v, altro, fmt, menoEmeglio) {
    var cls = "";
    if (typeof v === "number" && typeof altro === "number" && v !== altro) {
      cls = (menoEmeglio !== false ? v < altro : v > altro) ? " meglio" : "";
    }
    return '<div class="c' + cls + '">' + fmt(v) + "</div>";
  }
  function riga(nome, a, b, fmt, menoEmeglio) {
    return '<div class="r"><div class="l">' + nome + "</div>" +
      cella(a, b, fmt, menoEmeglio) + cella(b, a, fmt, menoEmeglio) + "</div>";
  }
  var delta = B.perPersona - A.perPersona;
  var h = [];
  h.push('<div class="confronto"><b>Confronta con un\'altra stagione</b>' +
    '<p class="nota">Stesso viaggio, stesse risposte, cambia solo quando parti. Le due colonne ' +
    "sono due preventivi rifatti da capo: evidenziato in verde quello che costa meno.</p>");
  h.push('<div class="griglia">');
  /* testa: la stagione scelta e quella da confrontare */
  h.push('<div class="r testa"><div class="l"></div>' +
    '<div class="c"><span class="eti">La tua scelta</span><span class="nome">' + esc(sA.nome) + "</span></div>" +
    '<div class="c"><span class="eti">Confronta con</span><select id="c-stagione">' +
      D.stagioni.filter(function (s) { return s.id !== S.stagione; }).map(function (s) {
        return '<option value="' + s.id + '"' + (s.id === S.confronto ? " selected" : "") + ">" + esc(s.nome) + "</option>";
      }).join("") + "</select></div></div>");
  /* il numero grosso */
  h.push('<div class="r grande"><div class="l">A persona, livello ' + esc(A.nome) + "</div>" +
    cella(A.perPersona, B.perPersona, eu0) + cella(B.perPersona, A.perPersona, eu0) + "</div>");
  h.push(riga("Gruppo di " + persone, A.gruppo, B.gruppo, eu0));
  h.push(riga("Al giorno, a persona", A.alGiorno, B.alGiorno, eu0));
  h.push('<div class="r sep"><div class="l">Le voci che cambiano</div><div class="c"></div><div class="c"></div></div>');
  h.push(riga("Volo", A.voci.volo, B.voci.volo, eu));
  h.push(riga("Alloggio, " + A.notti + " notti", A.voci.alloggio, B.voci.alloggio, eu));
  h.push(riga("Tutto il resto", A.perPersona - A.voci.volo - A.voci.alloggio,
    B.perPersona - B.voci.volo - B.voci.alloggio, eu));
  h.push('<div class="r sep"><div class="l">Gli altri livelli</div><div class="c"></div><div class="c"></div></div>');
  ["essenziale", "equilibrato", "comodo"].forEach(function (k) {
    if (k === S.stile) return;
    h.push(riga(r.livelli[k].nome + ", a persona", r.livelli[k].perPersona, r2.livelli[k].perPersona, eu0));
  });
  h.push('<div class="r sep"><div class="l">Com\'è</div><div class="c"></div><div class="c"></div></div>');
  h.push('<div class="r testo"><div class="l">Clima e affollamento</div>' +
    '<div class="c">' + esc(sA.nota || "") + "</div><div class=\"c\">" + esc(sB.nota || "") + "</div></div>");
  h.push('<div class="r testo"><div class="l">Il volo è</div>' +
    '<div class="c">' + (A.volo_fonte ? "un prezzo vero (Google Flights)" : "una stima") + "</div>" +
    '<div class="c">' + (B.volo_fonte ? "un prezzo vero (Google Flights)" : "una stima") + "</div></div>");
  h.push("</div>");   /* griglia */
  h.push('<div class="esito"><span class="d ' + (delta < 0 ? "giu" : delta > 0 ? "su" : "") + '">' +
    (delta === 0 ? "Costa uguale" : (delta < 0 ? "−" : "+") + eu0(Math.abs(delta)) + " a persona" +
      (delta < 0 ? " partendo " : " partendo ") + "a " + esc(sB.nome).toLowerCase()) + "</span>" +
    '<button type="button" id="c-applica">Passa a ' + esc(sB.nome) + " →</button></div>");
  h.push("</div>");
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
  var mb = $("#m-budget");
  if (mb) mb.onchange = function () { S.budgetMax = +mb.value || 0; calcolaEMostra(); };
  var mv = $("#m-voli");
  if (mv) mv.onchange = function () { S.voliInterni = mv.value; calcolaEMostra(); };
  var cs = $("#c-stagione");
  if (cs) cs.onchange = function () { S.confronto = cs.value; calcolaEMostra(); };
  var ca = $("#c-applica");
  if (ca) ca.onclick = function () {
    /* si passa alla stagione affiancata; quella di prima resta nel confronto */
    var prima = S.stagione; S.stagione = S.confronto; S.confronto = prima; calcolaEMostra();
  };
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
    $("#risultato").hidden = true; $("#wizard").hidden = false; mostraPasso(0);
  };
  $("#ricomincia").onclick = function () { location.reload(); };
}

/* ------------------------------------------------------------- AVVIO ----- */
function avvia() {
  riempiPartenze(); riempiStagioni(); riempiInteressi(); riempiGiaVisti();

  $("#giorni").oninput = function () { $("#giorni-out").textContent = this.value; };
  $$('input[name=pv]').forEach(function (r) {
    r.onchange = function () { $("#giavisti-box").hidden = ($$('input[name=pv]')[0].checked); };
  });

  $("#avanti").onclick = function () {
    var lista = passiAttivi();
    if (!leggiPasso(lista[passo].id)) return;
    if (passo === lista.length - 1) { calcolaEMostra(); return; }
    mostraPasso(passo + 1);
  };
  $("#indietro").onclick = function () { if (passo > 0) mostraPasso(passo - 1); };

  applicaTema(TEMA);
  var bt = $("#pv-tema");
  if (bt) bt.onclick = function () { applicaTema(TEMA === "pixel" ? "piatto" : "pixel"); };

  /* la data dei prezzi nella spalla: è la fotografia del listino, non oggi */
  var dp = $("#pv-data-prezzi");
  if (dp && window.PREZZI && window.PREZZI.generato) {
    dp.textContent = "Prezzi rilevati il " + window.PREZZI.generato.slice(0, 10).split("-").reverse().join("/") + ".";
  }

  mostraPasso(0);
}
avvia();
})();
