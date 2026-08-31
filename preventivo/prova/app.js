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
/* Il tema di casa è l'arcade (31/08/2026): chi ha già scelto Flat lo tiene. */
var TEMA = "pixel";
try { TEMA = localStorage.getItem("pv-tema") === "piatto" ? "piatto" : "pixel"; } catch (e) {}
function img(nome) {
  var n = (TEMA === "pixel" ? "px-" : "") + nome;
  return (window.PV_IMG && window.PV_IMG[n]) || ("img/" + n);
}
/* i disegni del vestito arcade sono già pixel art: niente prefisso px- */
function pix(nome) {
  return (window.PV_IMG && window.PV_IMG[nome]) || ("img/" + nome);
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
/* il rincaro del weekend, detto con le cifre misurate e non con un aggettivo */
function spiegaWeekend(liv) {
  var w = window.PREZZI && window.PREZZI.alloggi_weekend;
  if (!w || !liv.weekend || liv.weekend <= 1.001) return "";
  return ", più il rincaro di venerdì e sabato (misurato: ×" +
    String(w.venerdi).replace(".", ",") + " e ×" + String(w.sabato).replace(".", ",") +
    ", una notte su sette ciascuno, +" + Math.round((liv.weekend - 1) * 100) + "% sul soggiorno)";
}
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
    /* i limiti min/max dell'input valgono solo per le freccette: un numero
       DIGITATO li scavalca, e "99 bambini" produceva un gruppo di 100 persone.
       Si blocca qui, e il campo viene riscritto col valore corretto. */
    S.adulti  = Math.min(10, Math.max(1, Math.round(+$("#adulti").value)  || 1));
    S.bambini = Math.min(8,  Math.max(0, Math.round(+$("#bambini").value) || 0));
    $("#adulti").value = S.adulti; $("#bambini").value = S.bambini;
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
  /* il conteggio di fine livello del tema arcade (hud.js); solo la prima
     apertura, non a ogni manopola toccata nel risultato */
  if (window.PV_FINE_LIVELLO && !calcolaEMostra.gia) {
    calcolaEMostra.gia = true;
    window.PV_FINE_LIVELLO(r, S.stile);
  }
  /* un preventivo in più nel conto pubblico: solo il primo di questa visita,
     e solo quando il numero è stato davvero calcolato */
  if (window.PV_CONTA) window.PV_CONTA.segna();
}

function disegna(r, comp) {
  var h = [];
  var liv = r.livelli[S.stile];
  var persone = S.adulti + S.bambini;

  h.push(avvisoEta());
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
  var percMargine = Math.max(15, r.attendibilita.perc_importo || 15);
  var euroMargine = M.arrotonda(liv.perPersona * percMargine / 100, 10);
  h.push('<p class="nota">Clicca una colonna per cambiare il livello di riferimento. ' +
    "Il numero è un intervallo travestito da cifra: <b>± " + percMargine + "%</b>, cioè circa " +
    eu(euroMargine) + " a persona. Non è un margine di cortesia: è esattamente la quota di " +
    "questo preventivo che <b>non</b> viene da un prezzo verificato alla fonte — la trovi " +
    "spiegata in fondo, voce per voce. Se scende quella, scende il margine.</p>");
  h.push('<p class="conta-preventivi" id="conta-preventivi" hidden></p>');

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
         " — rilevato il " + (vf.letto || "").split("-").reverse().join("/") +
         ". Google non dichiara il bagaglio in stiva: sulle tariffe più basse di solito " +
         "NON è incluso, e non è in questo totale")
      : ("stima: andata/ritorno da " + M.partenza(S.partenza).nome +
         ", tariffa media × moltiplicatore di stagione (" + r.stagione.volo + "×)"),
    trasporti: "biglietti del giro + trasporto urbano " + yen(D.trasporto_locale_yen_giorno) + "/giorno + transfer aeroporto",
    alloggio: !liv.alloggio_fonte
      ? (liv.notti + " notti, stima: tariffa per città × " + r.stagione.hotel + "× di stagione")
      : liv.alloggio_fonte.auto
        ? ("prezzo reale Google Hotels: " + liv.alloggio_fonte.eur + " € a notte × " + liv.notti +
           " notti × " + (liv.camere || 1) + (liv.camere > 1 ? " camere" : " camera") +
           ", diviso fra chi ci dorme" + spiegaWeekend(liv) +
           " — mediana delle " + liv.alloggio_fonte.zone + " zone di Tokyo in questa fascia, " +
           "su " + liv.alloggio_fonte.strutture + " strutture (da " + liv.alloggio_fonte.economica.nome +
           " a " + liv.alloggio_fonte.economica.eur + " € fino a " + liv.alloggio_fonte.cara.nome +
           " a " + liv.alloggio_fonte.cara.eur + " €), rilevato il " +
           liv.alloggio_fonte.letto.split("-").reverse().join("/"))
        : ("prezzo reale Google Hotels: " + liv.alloggio_fonte.eur + " € a notte × " + liv.notti +
           " notti × " + (liv.camere || 1) + (liv.camere > 1 ? " camere" : " camera") +
           " " + esc(M.aZona(liv.zona)) + " — mediana di " + liv.alloggio_fonte.campione +
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
  /* Il pellegrinaggio anime è l'angolo più bello del servizio ed è anche
     quello che può fare danno: se nel giro ci sono luoghi di una serie, si
     dice come ci si sta. */
  var pellegrinaggi = [];
  (r.itinerario.giorni || []).forEach(function (g) {
    (g.luoghi || []).forEach(function (l) { if (l.anime) pellegrinaggi.push(l.nome); });
    if (g.gita) (g.gita.luoghi || []).forEach(function (l) { if (l.anime) pellegrinaggi.push(l.nome); });
  });
  if (pellegrinaggi.length) {
    h.push('<p class="nota"><b>Sui luoghi delle serie.</b> Nel tuo giro ce ne sono ' +
      pellegrinaggi.length + ". Sono tutti posti pubblici — stazioni, scalinate, strade, " +
      "musei: in questo catalogo non entrano case private né indirizzi di persone. " +
      "Quando ci arrivi, ricordati che per chi ci abita è solo il quartiere sotto casa: " +
      "voce bassa, niente riprese dentro i cortili, e la fila la fanno anche i pellegrini.</p>");
  }

  h.push('<p class="nota"><b>Due cose che questo totale non contiene.</b> ' +
    "Il <b>bagaglio in stiva</b>: la fonte dei voli non dice se la tariffa lo include, " +
    "e sulle tariffe più basse di solito non c'è — se ti serve, aggiungi quanto chiede " +
    "la tua compagnia (di norma fra i 60 e i 100 € a tratta). E la <b>disponibilità</b>: " +
    "il prezzo è quello che si vedeva alla data della rilevazione, non una camera o un " +
    "posto prenotato.</p>");

  /* dettagli apribili */
  h.push("<details><summary>Notte per notte</summary><div class=\"tabella-wrap\"><table><tr><th>Città</th><th class=num>notti</th><th class=num>camere</th><th class=num>a notte</th><th class=num>totale</th></tr>" +
    liv.dettAlloggio.map(function (a) {
      /* due sorgenti, due unità: il prezzo VERO di Google Hotels arriva già in
         euro (tariffaEur), quello di catalogo in yen. Prima si convertiva tutto
         come se fosse yen, e la riga del prezzo vero finiva a schermo come NaN. */
      var notte  = a.tariffaEur != null ? a.tariffaEur : M.eur(a.tariffa);
      var totale = a.subEur     != null ? a.subEur     : M.eur(a.sub);
      return "<tr><td>" + esc(a.citta) + "</td><td class=num>" + a.notti + "</td><td class=num>" +
        (a.camere || 1) + "</td><td class=num>" +
        eu(notte) + "</td><td class=num>" + eu(totale) + "</td></tr>";
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

  h.push("<details><summary>Ogni biglietto del giro</summary><div class=\"tabella-wrap\"><table><tr><th>Tratta</th><th>Mezzo</th><th class=num>min</th><th class=num>costo</th><th>prezzo</th><th>JR Pass</th></tr>" +
    r.treni.biglietti.map(function (b) {
      /* la stessa distinzione che vale per gli ingressi vale per i treni: una
         tariffa letta alla fonte lo dice, una stimata anche. */
      var prov = b.stimata ? '<span class="tag">stimata</span>'
               : b.verificata ? '<span class="tag ok">verificata</span>'
               : '<span class="tag">stima</span>';
      return "<tr><td>" + esc(M.citta(b.da).nome + " → " + M.citta(b.a).nome) + "</td><td>" + esc(b.mezzo) +
        "</td><td class=num>" + b.min +
        "</td><td class=num>" + eu(M.eur(b.yen)) + "</td><td>" + prov +
        "</td><td>" + (b.jr ? "coperta" : "no") + "</td></tr>";
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
    "ma solo la finestra in cui cadono i trasferimenti cari. Il prezzo è quello ufficiale del JR Group " +
    "(" + esc(DATI.pass[0].fonte) + ", letto il " + DATI.pass[0].verificato.split("-").reverse().join("/") + "): " +
    "dal 1° ottobre 2026 il pass da 7 giorni costa " + DATI.pass[0].yen.toLocaleString("it") + " yen, " +
    "prima ne costava " + DATI.pass[0].prima.toLocaleString("it") + ". Qui si usa il prezzo nuovo, " +
    "perché è quello che pagherai. Anche le tariffe dei treni sono verificate una per una.</p></div>");

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
      "la metropolitana urbana, i voli dentro il Giappone e i due traghetti, " +
      "quanto si spende per mangiare, " +
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
/* La mappa di Tokyo e dintorni: GEOGRAFIA VERA. Lo sfondo è un'immagine
   OpenStreetMap del Kanto scaricata una volta (grafica/scarica_mappa.py) e
   salvata nel repo: a runtime non si chiama nessun servizio. Le tessere OSM
   sono in Web Mercator, quindi anche i punti qui sopra usano Mercator — con
   la proiezione piatta Nikko finirebbe nel posto sbagliato di ~15 km. */
var MAPPA_BBOX = { lon0: 138.45, lon1: 140.40, lat0: 34.90, lat1: 37.10, w: 710, h: 990 };

function mercY(lat) {
  var r = lat * Math.PI / 180;
  return Math.log(Math.tan(Math.PI / 4 + r / 2));
}

function mappaVera(r) {
  var B = MAPPA_BBOX;
  var gite = (r.itinerario.gite || []).map(function (g) { return g.citta; });
  function px(c) { return (c.lon - B.lon0) / (B.lon1 - B.lon0) * B.w; }
  function py(c) { return (mercY(B.lat1) - mercY(c.lat)) / (mercY(B.lat1) - mercY(B.lat0)) * B.h; }

  var base = M.citta("tokyo");
  var titolo = "Tokyo e le gite in giornata: " +
    (gite.length ? gite.map(function (g) { return M.citta(g).nome; }).join(", ") : "nessuna");
  var s = ['<figure class="mappa-vera">',
    '<img src="img/mappa-kanto.webp" alt="" width="' + B.w + '" height="' + B.h + '">',
    '<svg class="sopra" viewBox="0 0 ' + B.w + " " + B.h + '" xmlns="http://www.w3.org/2000/svg" ' +
      'role="img" aria-label="' + esc(titolo) + '">',
    /* un velo chiaro smorza i colori della carta: i punti devono vincere */
    '<rect x="0" y="0" width="' + B.w + '" height="' + B.h + '" class="velo"/>'];

  /* le mete vicine NON scelte: puntini di orientamento, col nome */
  M.GITE.forEach(function (id) {
    if (gite.indexOf(id) !== -1) return;
    var c = M.citta(id), x = px(c), y = py(c);
    s.push('<circle class="pt" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4"/>');
    s.push('<text class="sfondo" x="' + (x + 8).toFixed(1) + '" y="' + (y + 4).toFixed(1) + '">' + esc(c.nome) + "</text>");
  });

  /* i raggi dalle gite alla base */
  gite.forEach(function (g) {
    var c = M.citta(g);
    s.push('<line class="rotta" stroke-width="2.5" stroke-dasharray="7 5" x1="' + px(base).toFixed(1) +
      '" y1="' + py(base).toFixed(1) + '" x2="' + px(c).toFixed(1) + '" y2="' + py(c).toFixed(1) + '"/>');
  });

  /* la base e le gite, con l'etichetta che schiva le altre */
  var messe = [];
  ["tokyo"].concat(gite).forEach(function (id) {
    var c = M.citta(id), x = px(c), y = py(c), eBase = id === "tokyo";
    s.push('<circle class="tappa' + (eBase ? " base" : "") + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) +
      '" r="' + (eBase ? 11 : 7) + '"/>');
    var destra = x < B.w * 0.55;
    var tx = destra ? x + 15 : x - 15, ty = y + 6, giri = 0;
    while (giri < 12 && messe.some(function (m) {
      return Math.abs(m.y - ty) < 22 && Math.abs(m.x - tx) < 230;
    })) { ty += 22; giri++; }
    messe.push({ x: tx, y: ty });
    s.push('<text class="eti' + (eBase ? " base" : "") + '" x="' + tx.toFixed(1) + '" y="' + ty.toFixed(1) + '"' +
      (destra ? "" : ' text-anchor="end"') + ">" +
      esc(eBase ? c.nome + " — la base" : c.nome + " — gita in giornata") + "</text>");
  });

  s.push("</svg>");
  s.push('<figcaption>Sfondo cartografico © OpenStreetMap contributors</figcaption>');
  s.push("</figure>");
  return s.join("");
}

/* ======================================================= LA MAPPA GIOCO ==
   La mappa-mondo alla Super Mario / Pokémon: il fondo è disegnato a tessere
   (grafica/mappa_gioco.py), i punti d'interesse ci stanno sopra come icone
   (grafica/prepara_icone_mappa.py). La geografia è EVOCATA, non misurata:
   per i chilometri veri c'è la mappa reale, a un clic di distanza.
   Le coordinate sono in tessere e vanno tenute uguali a COORD nel py. */
var MG = { w: 640, h: 416, tile: 16 };
var MG_COORD = {
  tokyo: [24, 14], nikko: [22, 3], chichibu: [11, 9],
  fuji: [3, 15], hakone: [10, 21], kamakura: [21, 18]
};
function mgXY(id) {
  var c = MG_COORD[id] || [20, 13];
  return { x: (c[0] + 0.5) * MG.tile, y: (c[1] + 0.5) * MG.tile };
}
/* il distintivo appeso all'icona: dice PERCHÉ quella meta è nel giro, e lo
   dice leggendo i luoghi che il motore ci ha davvero messo dentro */
function mgDistintivo(g) {
  var L = g.luoghi || [];
  function primo(f) { return L.filter(f)[0]; }
  var a = primo(function (l) { return l.anime; });
  if (a) return { f: "arcade-map-anime.png", t: a.nome };
  var o = primo(function (l) { return (l.tag || []).indexOf("onsen") !== -1; });
  if (o) return { f: "arcade-map-onsen.png", t: o.nome };
  var h = primo(function (l) { return (l.tag || []).indexOf("hiking") !== -1; });
  if (h) return { f: "arcade-map-tenda.png", t: h.nome };
  return null;
}
/* sulla mappa il nome deve stare in una targhetta: quello del catalogo a
   volte è una frase */
var MG_NOME = { fuji: "Fuji", kamakura: "Kamakura", chichibu: "Chichibu",
                hakone: "Hakone", nikko: "Nikko", tokyo: "Tokyo" };
function mgNodo(id, opt) {
  var p = mgXY(id), c = M.citta(id);
  var nome = MG_NOME[id] || c.nome;
  var s = ['<div class="mg-nodo' + (opt.on ? " on" : "") + (opt.base ? " base" : "") +
    '" style="left:' + (p.x / MG.w * 100).toFixed(2) + '%;top:' + (p.y / MG.h * 100).toFixed(2) + '%">'];
  s.push('<span class="mg-ico"><img class="mg-base" src="' + pix("arcade-map-" + id + ".png") + '" alt="">');
  if (opt.distintivo)
    s.push('<img class="mg-badge" src="' + pix(opt.distintivo.f) + '" alt="" title="' +
      esc(opt.distintivo.t) + '">');
  s.push("</span>");
  s.push('<b class="mg-eti">' + esc(nome) +
    (opt.sotto ? '<span>' + esc(opt.sotto) + "</span>" : "") + "</b>");
  s.push("</div>");
  return s.join("");
}
function mgVia(a, b) {
  var p1 = mgXY(a), p2 = mgXY(b);
  var dx = p2.x - p1.x, dy = p2.y - p1.y;
  var n = Math.max(3, Math.round(Math.sqrt(dx * dx + dy * dy) / 26)), s = [];
  for (var i = 1; i < n; i++) {
    var k = i / n;
    s.push('<circle cx="' + (p1.x + dx * k).toFixed(1) + '" cy="' + (p1.y + dy * k).toFixed(1) + '" r="4.5"/>');
  }
  return s.join("");
}
function mappaGioco(r) {
  var gite = r.itinerario.gite || [];
  var scelte = gite.map(function (g) { return g.citta; });
  var s = ['<figure class="mappa-gioco">',
    '<div class="mg-quadro" style="aspect-ratio:' + MG.w + "/" + MG.h + '">',
    '<img class="mg-terra" src="' + pix("arcade-mappa.png") + '" alt="La mappa del Kanto">',
    '<svg class="mg-vie" viewBox="0 0 ' + MG.w + " " + MG.h + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'];
  scelte.forEach(function (id) { s.push(mgVia("tokyo", id)); });
  s.push("</svg>");

  /* le mete non scelte restano sulla mappa, spente: si vede cosa c'è intorno */
  M.GITE.forEach(function (id) {
    if (scelte.indexOf(id) !== -1) return;
    s.push(mgNodo(id, { on: false }));
  });
  gite.forEach(function (g) {
    s.push(mgNodo(g.citta, {
      on: true, distintivo: mgDistintivo(g),
      sotto: g.tratta && g.tratta.min ? g.tratta.min + " min" : ""
    }));
  });
  s.push(mgNodo("tokyo", { on: true, base: true, sotto: "la base" }));
  s.push("</div>");
  s.push('<figcaption>Le mete del tuo giro sono accese, le altre restano spente. ' +
    "Mappa disegnata: le distanze non sono in scala.</figcaption>");
  s.push("</figure>");
  return s.join("");
}

/* Due carte per la stessa gita: quella di gioco e quella vera. Stanno
   entrambe nel documento e il bottone scambia quale si vede — così il PDF
   trova sempre la carta reale, qualunque cosa ci sia a schermo. */
var MAPPA_STILE = null;   /* scelta manuale; null = segue il tema */
function stileMappa() { return MAPPA_STILE || (TEMA === "pixel" ? "gioco" : "reale"); }
/* ogni icona prende la sua larghezza vera in percentuale della mappa: le
   proporzioni restano giuste a ogni dimensione dello schermo */
function mgMisura() {
  $$("#risultato .mg-ico img.mg-base").forEach(function (im) {
    var metti = function () {
      /* la misura va sul NODO: è lui il riquadro in percentuale sulla mappa.
         L'etichetta esce dai suoi bordi e resta centrata, ed è quello che
         vogliamo — se la larghezza la desse il testo, l'icona ballerebbe. */
      if (im.naturalWidth)
        im.closest(".mg-nodo").style.width = (im.naturalWidth / MG.w * 100) + "%";
    };
    if (im.complete) metti(); else im.addEventListener("load", metti, { once: true });
  });
}
function applicaMappa() {
  var g = $("#risultato .mappa-gioco"), v = $("#risultato .mappa-vera"), bt = $("#mappa-stile");
  if (!g || !v) return;
  var gioco = stileMappa() === "gioco";
  g.hidden = !gioco;
  v.hidden = gioco;
  if (bt) bt.textContent = gioco ? "vedi la mappa reale \u25b8" : "vedi la mappa di gioco \u25b8";
}
function mappa(r) {
  var W = 900, H = 540, PAD = 56;
  var soloTk = !!r.itinerario.soloTokyo;
  if (soloTk) return '<div class="mappa-doppia">' + mappaGioco(r) + mappaVera(r) +
    '<p class="mappa-scambia"><button type="button" id="mappa-stile" class="mappa-stile"></button></p></div>';
  var gite = soloTk ? (r.itinerario.gite || []).map(function (g) { return g.citta; }) : [];
  var ids = soloTk ? ["tokyo"].concat(gite) : r.itinerario.rotta;
  var rotta = ids.map(function (id) { return M.citta(id); });
  var latM = rotta.reduce(function (a, c) { return a + c.lat; }, 0) / rotta.length;
  var kx = Math.cos(latM * Math.PI / 180);
  function PX(c) { return c.lon * kx; }
  function PY(c) { return -c.lat; }

  var xs = rotta.map(PX), ys = rotta.map(PY);
  var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
  var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
  var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  var sx = Math.max(x1 - x0, soloTk ? 2.2 : 1.4), sy = Math.max(y1 - y0, soloTk ? 1.6 : 1.1);
  var scala = Math.min((W - PAD * 2 - 150) / sx, (H - PAD * 2) / sy);
  function px(c) { return W / 2 + (PX(c) - cx) * scala - 60; }
  function py(c) { return H / 2 + (PY(c) - cy) * scala; }

  var titolo = soloTk
    ? "Tokyo e le gite in giornata: " + (gite.length ? gite.map(function (g) { return M.citta(g).nome; }).join(", ") : "nessuna")
    : "Percorso: " + rotta.map(function (c) { return c.nome; }).join(", ");
  var s = ['<svg class="mappa" viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg" ' +
           'role="img" aria-label="' + esc(titolo) + '">'];

  /* le altre città, come sfondo: danno la scala del giro */
  D.citta.forEach(function (c) {
    if (ids.indexOf(c.id) !== -1) return;
    var x = px(c), y = py(c);
    if (x < 4 || x > W - 4 || y < 4 || y > H - 4) return;
    s.push('<circle class="pt" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3"/>');
    /* nella mappa di Tokyo le vicine hanno il nome, anche se non si va: è l'orientamento */
    if (soloTk) s.push('<text class="sfondo" x="' + (x + 7).toFixed(1) + '" y="' + (y + 4).toFixed(1) +
      '" font-size="11">' + esc(c.nome) + "</text>");
  });

  var base = M.citta("tokyo");
  if (soloTk) {
    /* un raggio tratteggiato da Tokyo a ogni gita */
    gite.forEach(function (g) {
      var c = M.citta(g);
      s.push('<line class="rotta" stroke-width="1.8" stroke-dasharray="6 4" x1="' + px(base).toFixed(1) +
        '" y1="' + py(base).toFixed(1) + '" x2="' + px(c).toFixed(1) + '" y2="' + py(c).toFixed(1) + '"/>');
    });
  } else {
    var giro = rotta.concat([M.citta(r.itinerario.base)]);
    s.push('<polyline class="rotta" fill="none" stroke-width="1.8" stroke-dasharray="6 4" points="' +
      giro.map(function (c) { return px(c).toFixed(1) + "," + py(c).toFixed(1); }).join(" ") + '"/>');
  }

  /* etichette: si spostano in giù finché non si pestano i piedi */
  var messe = [];
  rotta.forEach(function (c, i) {
    var x = px(c), y = py(c);
    var eBase = soloTk && c.id === "tokyo";
    s.push('<circle class="tappa' + (eBase ? " base" : "") + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) +
      '" r="' + (eBase ? 9 : 6) + '"/>');
    var destra = x < W * 0.6;
    var tx = destra ? x + 13 : x - 13, ty = y + 5, giri = 0;
    while (giri < 14 && messe.some(function (m) {
      return Math.abs(m.y - ty) < 17 && Math.abs(m.x - tx) < 210;
    })) { ty += 17; giri++; }
    messe.push({ x: tx, y: ty });
    if (ty - y > 8) s.push('<line class="guida" x1="' + x.toFixed(1) + '" y1="' + (y + 6).toFixed(1) +
      '" x2="' + tx.toFixed(1) + '" y2="' + (ty - 4).toFixed(1) + '"/>');
    var eti = soloTk
      ? (eBase ? c.nome + " — la base" : c.nome + " — gita in giornata")
      : (i + 1) + ". " + c.nome;
    s.push('<text x="' + tx.toFixed(1) + '" y="' + ty.toFixed(1) + '" font-size="15"' +
      (eBase ? ' font-weight="600"' : "") + (destra ? "" : ' text-anchor="end"') + ">" + esc(eti) + "</text>");
  });
  s.push("</svg>");
  return s.join("");
}

/* ------------------------------------------------- QUANTO È VECCHIO ------
   Il rischio numero uno del progetto non è che il raccoglitore si rompa: è che
   si rompa in silenzio e il listino invecchi senza che nessuno se ne accorga.
   La pagina lo dice da sola, e oltre una certa età smette di presentare i
   prezzi come freschi. Soglie: 3 giorni tranquillo, 7 avviso, 21 scaduto. */
function etaListino() {
  var P = window.PREZZI;
  if (!P || !P.generato) return { giorni: null, stato: "ignoto" };
  var g = new Date(P.generato);
  if (isNaN(g)) return { giorni: null, stato: "ignoto" };
  var giorni = Math.floor((Date.now() - g.getTime()) / 86400000);
  return {
    giorni: giorni, data: P.generato.slice(0, 10).split("-").reverse().join("/"),
    stato: giorni <= 3 ? "fresco" : giorni <= 7 ? "attenzione" : giorni <= 21 ? "vecchio" : "scaduto"
  };
}

function avvisoEta() {
  var e = etaListino();
  if (e.stato === "fresco") return "";
  var testo = e.stato === "ignoto"
    ? "Il listino non dice quando è stato rilevato: trattalo come non aggiornato."
    : e.stato === "attenzione"
      ? "I prezzi hanno " + e.giorni + " giorni (rilevati il " + e.data + "). Sui voli in " +
        "una settimana si muove parecchio: prendili come ordine di grandezza."
      : e.stato === "vecchio"
        ? "Attenzione: i prezzi sono di " + e.giorni + " giorni fa (" + e.data + "). " +
          "Non sono più affidabili come cifra, solo come proporzione fra le voci."
        : "Questi prezzi hanno più di tre settimane (" + e.data + ") e non sono " +
          "aggiornati. Il preventivo qui sotto vale come struttura del costo, non come cifra.";
  return '<div class="avviso-eta ' + e.stato + '"><b>' +
    (e.stato === "attenzione" ? "Prezzi non freschissimi" : "Prezzi non aggiornati") +
    "</b> " + esc(testo) + "</div>";
}

/* ------------------------------------------------------------ IL PDF ----- */
/* Il PDF non ricalcola niente: prende gli stessi numeri che sono a schermo.
   Se ricalcolasse, carta e schermo potrebbero dire cose diverse, ed è il
   genere di incoerenza che distrugge la fiducia in un preventivo. */
function datiPdf(r) {
  var liv = r.livelli[S.stile];
  var persone = S.adulti + S.bambini;
  var st = r.stagione;
  var vf = liv.volo_fonte, af = liv.alloggio_fonte;
  var q = S.adulti + S.bambini * 0.65;

  var voci = [
    { nome: "Volo intercontinentale", pp: liv.voci.volo, gr: liv.voci.volo * q, reale: !!vf,
      come: vf ? "Google Flights, " + M.partenza(S.partenza).nome + " → Tokyo, partenza " +
            vf.out.split("-").reverse().join("/") + (vf.compagnia ? ", " + vf.compagnia : "")
          : "stima del catalogo" },
    { nome: "Alloggio", pp: liv.voci.alloggio, gr: liv.voci.alloggio * q, reale: !!af,
      come: af ? (af.auto ? "Google Hotels, mediana delle " + af.zone + " zone di Tokyo, " +
                            af.eur + " € × " + liv.notti + " notti"
                          : "Google Hotels, " + M.nomeZona(liv.zona) + ", " + af.eur + " € × " + liv.notti + " notti")
               : "stima del catalogo" },
    { nome: "Trasporti in Giappone", pp: liv.voci.trasporti, gr: liv.voci.trasporti * q, reale: false,
      come: "gite in giornata, metropolitana e transfer: stima" },
    { nome: "Mangiare", pp: liv.voci.cibo, gr: liv.voci.cibo * q, reale: false,
      come: D.cibo[M.STILI[S.stile].cibo].desc },
    { nome: "Ingressi ed esperienze", pp: liv.voci.attivita, gr: liv.voci.attivita * q,
      reale: (liv.attIncluse || []).some(function (a) { return a.c === "V"; }),
      come: (liv.attIncluse || []).filter(function (a) { return a.c === "V"; }).length +
            " prezzi verificati su fonte ufficiale, il resto stimato" },
    { nome: "Extra", pp: liv.voci.extra, gr: liv.voci.extra * q, reale: false,
      come: "assicurazione, eSIM, souvenir" },
    { nome: "Imprevisti", pp: liv.voci.imprevisti, gr: liv.voci.imprevisti * q, reale: false,
      come: "5% di margine" }
  ];

  var giorni = [{ titolo: "Giorno 1", trasferimento: "", cose: ["Volo, arrivo a Tokyo, transfer e crollo."] }];
  r.itinerario.giorni.forEach(function (g) {
    giorni.push({
      titolo: "Giorno " + (g.n + 1) + " · " + M.citta(g.citta).nome,
      trasferimento: g.trasferimento
        ? "Da Tokyo: " + g.trasferimento.mezzo + ", " + g.trasferimento.min + " min andata e ritorno" : "",
      cose: g.luoghi.map(function (l) {
        return l.nome + (l.yen ? " · " + Math.round(M.eur(l.yen)) + " €" : " · gratis");
      })
    });
  });

  return {
    titolo: "Tokyo, " + S.giorni + " giorni",
    sottotitolo: st.nome + " · " + persone + (persone === 1 ? " persona" : " persone") +
                 " · partenza da " + M.partenza(S.partenza).nome + " · fascia " + liv.nome.toLowerCase(),
    quando: "Preventivo generato il " + new Date().toLocaleDateString("it-IT") +
            (window.PREZZI && window.PREZZI.generato
              ? " · prezzi rilevati il " + window.PREZZI.generato.slice(0,10).split("-").reverse().join("/") : "") +
            " · non è un preventivo commerciale, è una stima",
    perPersona: liv.perPersona, alGiorno: liv.alGiorno, gruppo: liv.gruppo, persone: persone,
    fasce: ["essenziale","equilibrato","comodo"].map(function (k) {
      return { nome: r.livelli[k].nome, perPersona: r.livelli[k].perPersona,
               gruppo: r.livelli[k].gruppo, scelta: k === S.stile };
    }),
    voci: voci, giorni: giorni,
    leve: COMP.slice(0, 8).map(function (c) { return { etichetta: c.etichetta, delta: c.delta }; }),
    mappa: null,
    onesta: (function () { var e = etaListino();
        return e.stato === "fresco" ? "" :
          "ATTENZIONE: i prezzi di questo documento sono stati rilevati il " + e.data +
          ", " + e.giorni + " giorni fa. "; })() +
      r.attendibilita.stime + " voci su " + r.attendibilita.totale + " sono stime; contando gli euro, " +
      "la quota che arriva da stime è il " + r.attendibilita.perc_importo + "%. Volo, alloggio e cambio " +
      "sono prezzi veri letti da Google Flights, Google Hotels e BCE. Nessuna disponibilità è stata " +
      "verificata: se l'albergo è pieno, questo documento non lo sa."
  };
}

/* la mappa nel PDF: l'immagine di sfondo più l'SVG dei punti, fusi in un solo
   PNG con un canvas. Un <img> e un <svg> sovrapposti in stampa si sfasano. */
function mappaPerPdf(cb) {
  var fig = $("#risultato .mappa-vera");
  if (!fig) { cb(null); return; }
  var img = fig.querySelector("img"), svg = fig.querySelector("svg");
  if (!img || !svg) { cb(null); return; }
  /* Se si preme Stampa prima che la cartina sia scaricata, naturalWidth è 0 e
     il PDF uscirebbe senza mappa. Si aspetta il caricamento, con un tetto:
     meglio un PDF senza mappa che un pulsante che non risponde più. */
  if (!img.complete || !img.naturalWidth) {
    var fatto = false;
    var poi = function () { if (fatto) return; fatto = true; mappaPerPdf(cb); };
    var rinuncia = function () { if (fatto) return; fatto = true; cb(null); };
    img.addEventListener("load", poi, { once: true });
    img.addEventListener("error", rinuncia, { once: true });
    setTimeout(rinuncia, 4000);
    return;
  }
  try {
    var K = 2;                       /* doppia risoluzione: a 86 mm servono ~420 dpi */
    var c = document.createElement("canvas");
    /* nel PDF va SEMPRE la carta reale: l'immagine di .mappa-vera è quella,
       anche quando a schermo si sta guardando la mappa di gioco */
    c.width = img.naturalWidth * K; c.height = img.naturalHeight * K;
    var x = c.getContext("2d");
    x.drawImage(img, 0, 0, c.width, c.height);
    /* Un SVG serializzato NON porta con sé il CSS del documento, e uno <style>
       incollato dentro non basta a farlo rasterizzare in modo affidabile.
       L'unica via che regge sempre: scrivere i colori come ATTRIBUTI su ogni
       nodo, che è quello che il rasterizzatore capisce senza cascata. */
    var clone = svg.cloneNode(true);
    var PENNA = {
      /* sulla carta il velo va quasi tolto e i caratteri vanno cresciuti:
         l'immagine finisce a 86 mm, un terzo della larghezza che ha a schermo */
      velo:   { fill: "#ffffff", "fill-opacity": ".08" },
      pt:     { fill: "#666677", "fill-opacity": ".85" },
      rotta:  { stroke: "#B52D20", fill: "none" },
      tappa:  { fill: "#B52D20", stroke: "#ffffff", "stroke-width": "3.5" },
      base:   { fill: "#0F1A24", stroke: "#B52D20", "stroke-width": "4" },
      sfondo: { fill: "#3B4450", "font-size": "22", "font-weight": "500",
                stroke: "#ffffff", "stroke-width": "5", "paint-order": "stroke" },
      eti:    { fill: "#14181D", "font-size": "27", "font-weight": "700",
                stroke: "#ffffff", "stroke-width": "7", "paint-order": "stroke" }
    };
    Array.prototype.forEach.call(clone.querySelectorAll("*"), function (n) {
      var cl = (n.getAttribute("class") || "").split(/\s+/);
      cl.forEach(function (c) {
        if (!PENNA[c]) return;
        for (var k in PENNA[c]) n.setAttribute(k, PENNA[c][k]);
      });
      if (n.tagName === "text") {
        n.setAttribute("font-family", "Inter, Helvetica, Arial, sans-serif");
        n.setAttribute("stroke-linejoin", "round");
      }
    });
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", img.naturalWidth * K);
    clone.setAttribute("height", img.naturalHeight * K);
    var s2 = new XMLSerializer().serializeToString(clone);
    var v = new Image();
    v.onload = function () {
      x.drawImage(v, 0, 0, c.width, c.height);
      /* JPEG e non PNG: una cartina è un'immagine fotografica, e in PNG
         pesava 7 MB — un PDF così è ingestibile. In JPEG all'86% sta sotto
         il mezzo mega e a occhio non si distingue. */
      try { cb(c.toDataURL("image/jpeg", 0.86)); } catch (e) { cb(null); }
    };
    v.onerror = function () { cb(null); };
    v.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s2);
  } catch (e) { cb(null); }
}

function creaPdf(soloDati) {
  var r = M.pianifica(perMotore());
  var d = datiPdf(r);
  return new Promise(function (ok) {
    mappaPerPdf(function (png) {
      d.mappa = png;
      if (!soloDati) window.PDF.stampa(d);
      ok(d);
    });
  });
}
/* aggancio per collaudare l'impaginazione del PDF senza aprire la stampa */
window.PV_PDF_PROVA = function () { return creaPdf(true); };

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
  mgMisura();
  applicaMappa();
  var bms = $("#mappa-stile");
  if (bms) bms.onclick = function () {
    MAPPA_STILE = stileMappa() === "gioco" ? "reale" : "gioco";
    applicaMappa();
  };
  $("#stampa").onclick = function () { creaPdf(); };
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

/* L'aggancio per il vestito arcade (hud.js/intro.js): stato e motore in sola
   lettura, senza aprire la chiusura. */
window.PV_HOOK = {
  stato: function () { return S; },
  pianifica: function () { return M.pianifica(perMotore()); },
  passo: function () {
    return { n: passo, tot: passiAttivi().length, risultato: !$("#risultato").hidden,
             raggiunto: raggiunto, ids: passiAttivi().map(function (p) { return p.id; }) };
  }
};

avvia();
})();
