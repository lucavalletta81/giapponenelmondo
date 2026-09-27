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
/* I numeri col punto delle migliaia, sempre: toLocaleString in italiano non
   lo mette sotto le cinque cifre, e «2300 €» accanto a «16.860 €» stona. */
function num(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function eu(n) { return num(n) + " €"; }
/* il rincaro del weekend, detto con le cifre misurate e non con un aggettivo */
function spiegaWeekend(liv) {
  var w = window.PREZZI && window.PREZZI.alloggi_weekend;
  if (!w || !liv.weekend || liv.weekend <= 1.001) return "";
  var n = liv.weekend_notti || {};
  var quante = n.vero
    ? (n.ven + (n.ven === 1 ? " venerdì" : " venerdì") + " e " + n.sab +
       (n.sab === 1 ? " sabato" : " sabati") + " veri del tuo soggiorno")
    : "una notte su sette ciascuno, perché su queste date il volo è stimato e non sappiamo i giorni esatti";
  return ", più il rincaro di venerdì e sabato (misurato: ×" +
    String(w.venerdi).replace(".", ",") + " e ×" + String(w.sabato).replace(".", ",") +
    ", applicato a " + quante + ": +" + Math.round((liv.weekend - 1) * 100) + "% sul soggiorno)";
}
function eu0(n) { return num(M.arrotonda(n, 10)) + " €"; }
function yen(n) { return num(n) + " ¥"; }
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
    c.setAttribute("tabindex", "0"); c.setAttribute("role", "button");
    c.onclick = function () {
      S.stagione = c.dataset.id;
      $$("#stagioni .carta").forEach(function (x) { x.classList.remove("on"); });
      c.classList.add("on");
      cielo();
      manekiSullaStagione();
    };
  });
}

/* Il cielo della stagione: la striscia in alto prende il colore del periodo
   scelto. È la leva più grossa del preventivo, e così si vede. */
var CIELI = { mar: "primavera", apr1: "primavera", gw: "primavera", mag: "primavera",
              lug: "estate", obon: "estate", ago: "estate",
              set: "autunno", ott: "autunno", nov: "autunno",
              dic: "inverno", cap: "inverno", gen: "inverno", feb: "inverno" };
function cielo() { document.body.setAttribute("data-cielo", CIELI[S.stagione] || ""); }

/* IL MANEKI. Compare quando una scelta pesa, dice una riga e se ne va. Mai due
   volte la stessa cosa, mai più di tre volte in una visita: è un avviso, non
   una compagnia. Quello che dice viene dai prezzi veri, non da una frase fatta. */
var MANEKI = { detti: {}, quanti: 0, timer: null };
function maneki(chiave, testo) {
  if (MANEKI.detti[chiave] || MANEKI.quanti >= 3) return;
  MANEKI.detti[chiave] = true; MANEKI.quanti++;
  var el = $("#maneki");
  if (!el) {
    el = document.createElement("div");
    el.id = "maneki"; el.setAttribute("role", "status");
    el.innerHTML = '<img src="' + pix("arcade-obj-maneki.png") + '" alt="" width="44" height="44"><p></p>' +
      '<button type="button" aria-label="Chiudi">×</button>';
    document.body.appendChild(el);
    el.querySelector("button").onclick = function () { el.hidden = true; };
  }
  el.querySelector("p").textContent = testo;
  el.hidden = false;
  if (MANEKI.timer) clearTimeout(MANEKI.timer);
  MANEKI.timer = setTimeout(function () { el.hidden = true; }, 9000);
}
function manekiSullaStagione() {
  var P = window.PREZZI, voli = P && P.voli && P.voli[S.partenza];
  if (!voli) return;
  var qui = voli[S.stagione] && voli[S.stagione].normale, meno = null;
  if (!qui) return;
  D.stagioni.forEach(function (st) {
    var v = voli[st.id] && voli[st.id].normale;
    if (v && (!meno || v.eur < meno.eur)) meno = { eur: v.eur, nome: st.nome };
  });
  if (!meno || qui.eur - meno.eur < 250) return;
  maneki("stagione-" + S.stagione, "In questo periodo il volo costa " + num(qui.eur - meno.eur) +
    " € in più che a " + meno.nome.toLowerCase() + ". A persona.");
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
    c.setAttribute("tabindex", "0"); c.setAttribute("role", "button");
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
  statoAvviso();
  window.scrollTo(0, 0);
  /* l'imbuto: un «+1» per tappa, senza niente che identifichi chi passa */
  if (window.PV_CONTA) window.PV_CONTA.tappa("passo-" + corrente);
}

/* L'avviso lungo si legge una volta, al primo passo e dove c'è spazio. Poi si
   chiude in una riga: resta a un tocco di distanza, ma non sta più davanti
   alle domande e al numero. */
function statoAvviso() {
  var a = $("#pv-avviso");
  if (!a) return;
  var risultato = !$("#risultato").hidden;
  a.open = !schermoStretto() && !risultato && passo === 0;
  a.hidden = risultato;          /* nel risultato il suo testo vive in FONTI */
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
/* Le serie da pellegrinaggio, divise in due mazzi quando il giro è solo
   Tokyo: quelle raggiungibili e quelle che in questa prima versione restano
   fuori. Mostrarle tutte come scegliibili significherebbe promettere
   Takayama o Fukuoka dentro un preventivo che tocca solo Tokyo. */
function serieAmazzo() {
  var vicine = [];
  if (S.soloTokyo) vicine = ["tokyo"].concat(M.GITE);
  var qui = [], lontane = [];
  D.anime.forEach(function (a) {
    var citta = a.luoghi.map(function (l) { return M.luogo(l).citta; });
    var uniq = citta.filter(function (v, k) { return citta.indexOf(v) === k; });
    var nomi = uniq.map(function (c) { return M.citta(c).nome; }).join(", ");
    var raggiungibile = !S.soloTokyo || uniq.some(function (c) { return vicine.indexOf(c) !== -1; });
    (raggiungibile ? qui : lontane).push(
      '<div class="carta' + (raggiungibile ? "" : " fuori") +
      (S.anime.indexOf(a.id) !== -1 && raggiungibile ? " on" : "") + '"' +
      (raggiungibile ? ' data-serie-id="' + a.id + '"' : ' aria-disabled="true"') +
      "><b>" + esc(a.nome) + "</b><span>" + esc(nomi) + "</span></div>");
  });
  var h = '<div class="carte fitte" data-serie="1">' + qui.join("") + "</div>";
  if (lontane.length)
    h += '<p class="nota">Queste altre serie stanno fuori dalla portata di un giro su Tokyo, ' +
      "e in questa prima versione non entrano nel preventivo: le lascio qui perché tu sappia " +
      "dove sono, non perché tu le possa scegliere.</p>" +
      '<div class="carte fitte spente">' + lontane.join("") + "</div>";
  return h;
}

function preparaRamo() {
  var h = [];
  S.interessi.forEach(function (id) {
    var i = M.interesse(id);
    if (!i) return;
    if (id === "anime") {                       /* l'anime ha il suo mazzo di serie */
      h.push('<div class="ramo"><h3>' + esc(i.nome) + "</h3>" +
        '<p class="nota">Quali serie vuoi vedere dal vivo. Il pellegrinaggio (聖地巡礼, ' +
        "<i>seichi junrei</i>) cambia la rotta: alcuni luoghi sono lontani dai giri classici.</p>" +
        serieAmazzo() + "</div>");
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

  $$("#rami .carta[data-ramo], #rami .carta[data-serie-id]").forEach(function (c) {
    c.setAttribute("tabindex", "0"); c.setAttribute("role", "button");
  });
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
  cielo();
  var primaVolta = $("#risultato").innerHTML === "";
  $("#risultato").innerHTML = disegna(r, comp);
  agganciaRisultato();
  disegnaSpalla("risultato");
  statoAvviso();
  if (primaVolta) window.scrollTo(0, 0);
  if (window.PV_CONTA) window.PV_CONTA.tappa("risultato");
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

/* Il risultato dal 28/09/2026 è una SCHERMATA DI STATO: in cima le tre fasce,
   la data dei prezzi e la quota verificata — tutto dentro la prima schermata
   di un telefono — e sotto le sezioni che si aprono. Niente è stato tolto
   rispetto alla pagina lunga di prima: è cambiata la profondità a cui sta.
   Ogni sezione chiusa mostra la sua cifra chiave, così la densità resta anche
   senza aprire niente. */
var APERTE = null;        /* quali sezioni sono aperte; null = non ancora deciso */
var SEZIONI = [["leve", "Leve"], ["breve", "In breve"], ["stagioni", "Stagioni"], ["voci", "Voci"],
               ["pass", "Pass"], ["giorni", "Giorni"], ["fonti", "Fonti"]];

function schermoStretto() { return window.innerWidth < 861; }
function ricordaAperte() {
  if (APERTE === null) {
    APERTE = {};
    /* su telefono si parte con le sole leve aperte; su schermo grande lo
       spazio c'è, e si apre tutto come nella pagina di prima */
    SEZIONI.forEach(function (s) { APERTE[s[0]] = schermoStretto() ? s[0] === "leve" : true; });
    return;
  }
  $$("#risultato details.sez").forEach(function (d) { APERTE[d.id.replace("sez-", "")] = d.open; });
}
function sez(id, titolo, chiave, corpo) {
  return '<details class="sez" id="sez-' + id + '"' + (APERTE[id] ? " open" : "") + ">" +
    '<summary><span class="sez-t">' + titolo + '</span><span class="sez-k">' + chiave +
    "</span></summary>" + '<div class="sez-c">' + corpo + "</div></details>";
}
/* una tabella che su telefono si impila: ogni cella porta la sua etichetta */
function tab(teste, righe, vuota) {
  return '<div class="tabella-wrap"><table class="impila"><tr>' +
    teste.map(function (t) { return "<th" + (t.num ? " class=num" : "") + ">" + t.t + "</th>"; }).join("") +
    "</tr>" + (righe.length ? righe.map(function (r) {
      return "<tr>" + r.map(function (c, k) {
        return "<td" + (teste[k].num ? " class=num" : "") + ' data-l="' + esc(teste[k].t) + '">' + c + "</td>";
      }).join("") + "</tr>";
    }).join("") : '<tr><td colspan="' + teste.length + '">' + (vuota || "") + "</td></tr>") +
    "</table></div>";
}
/* il quadratino verificato / stima / misto: disegnato, non un carattere */
function q(stato) { return '<i class="q ' + stato + '" aria-hidden="true"></i>'; }

function disegna(r, comp) {
  ricordaAperte();
  var h = [];
  var liv = r.livelli[S.stile];
  var persone = S.adulti + S.bambini;
  var eta = etaListino(r);
  var vecchio = eta.stato === "vecchio" || eta.stato === "scaduto" || eta.stato === "ignoto";
  var circa = vecchio ? "~" : "";
  var percMargine = Math.max(15, r.attendibilita.perc_importo || 15);
  var euroMargine = M.arrotonda(liv.perPersona * percMargine / 100, 10);
  var gite = (r.itinerario.gite || []).map(function (g) { return M.citta(g.citta).nome; });

  /* ================================================= LA TESTA: IL NUMERO == */
  h.push('<div class="ris-testa' + (vecchio ? " vecchio" : "") + '">');
  h.push('<p class="ris-listino ' + eta.stato + '">' + q(vecchio ? "no" : "ok") + "<span>" +
    (eta.stato === "ignoto" ? "prezzi senza data: trattali come non aggiornati"
      : vecchio ? "prezzi del " + eta.data + ", " + eta.giorni + " giorni fa: valgono come " +
                  "struttura del costo, non come cifra"
      : "prezzi letti il " + eta.data + (eta.giorni > 3 ? ", " + eta.giorni + " giorni fa" : "")) +
    '</span><a href="#sez-fonti" data-vai="fonti">dettagli</a></p>');
  h.push('<p class="ris-ctx"><b>' + esc(M.citta(r.itinerario.base).nome) + " · " + S.giorni +
    " giorni · " + esc(r.stagione.nome) + "</b><br>" + persone +
    (persone === 1 ? " persona" : " persone") + " da " + esc(M.partenza(S.partenza).nome) +
    (gite.length ? " · gite: " + esc(gite.join(", ")) : "") + "</p>");

  h.push('<div class="colonne slot">');
  ["essenziale", "equilibrato", "comodo"].forEach(function (k) {
    var l = r.livelli[k], on = k === S.stile;
    h.push('<div class="prezzo' + (on ? " on" : "") + '" data-stile="' + k + '" role="button" tabindex="0"' +
      ' aria-pressed="' + (on ? "true" : "false") + '">' +
      '<div class="slot-riga"><span class="slot-nome">' + esc(l.nome) + '</span><span class="cifra">' +
      circa + eu0(l.perPersona) + "</span></div>" +
      '<div class="piccolo">a persona · ' + eu0(l.alGiorno) + " al giorno · " +
      (persone === 1 ? "da solo" : "in " + persone) + ": <b>" + eu0(l.gruppo) + "</b></div>" +
      (on ? '<div class="slot-margine">± ' + eu0(euroMargine) + " di parte stimata</div>" +
            '<div class="barra-vs" role="img" aria-label="' + (100 - percMargine) + " per cento da prezzi verificati, " +
            percMargine + ' per cento da stime"><b style="width:' + (100 - percMargine) + '%"></b><u></u></div>' +
            '<div class="barra-leg"><span>' + q("ok") + (100 - percMargine) + "% verificato</span><span>" +
            q("no") + percMargine + "% stima</span></div>"
          : "") + "</div>");
  });
  h.push("</div>");
  h.push('<p class="conta-preventivi" id="conta-preventivi" hidden></p>');
  h.push("</div>");

  /* l'indice: porta alla sezione e la apre */
  h.push('<nav class="ris-indice" aria-label="Le sezioni del risultato">' +
    SEZIONI.map(function (s) {
      return '<a href="#sez-' + s[0] + '" data-vai="' + s[0] + '">' + s[1] + "</a>";
    }).join("") + "</nav>");

  /* ============================================================= LEVE ===== */
  var leve = [];
  leve.push('<p class="nota">Ogni riga è il preventivo rifatto da capo con quella modifica: ' +
    "la cifra è per tutto il gruppo. Toccala per applicarla davvero.</p>");
  leve.push('<div id="compromessi">');
  var forte = null;
  comp.forEach(function (c, i) {
    if (!c.soloInfo && (!forte || Math.abs(c.delta) > Math.abs(forte.delta)) && c.delta < 0) forte = c;
    leve.push('<div class="compromesso' + (c.soloInfo ? " info" : "") + '" data-i="' + i + '"' +
      (c.soloInfo ? "" : ' role="button" tabindex="0"') + "><span>" + esc(c.etichetta) +
      (c.avvertenza ? '<br><span class="nota">' + esc(c.avvertenza) + "</span>" : "") + "</span>" +
      '<span class="d ' + (c.delta < 0 ? "giu" : "su") + '">' + (c.delta > 0 ? "+" : "-") +
      eu0(Math.abs(c.delta)) + "</span></div>");
  });
  leve.push("</div>");
  leve.push('<div class="manopole"><div class="riga">' +
    '<label>Tetto di spesa per il gruppo, in euro<input type="number" id="m-budget" min="0" step="100" ' +
      'inputmode="numeric" value="' + (S.budgetMax || "") + '" placeholder="nessuno"></label>' +
    (S.soloTokyo === false
      ? "<label>Voli interni<select id=\"m-voli\">" +
        '<option value="si"' + (S.voliInterni === "si" ? " selected" : "") + ">sì</option>" +
        '<option value="no"' + (S.voliInterni === "no" ? " selected" : "") + ">no, solo treno</option>" +
        "</select></label>"
      : "") + "</div></div>");
  h.push(sez("leve", "Leve", forte ? "la più forte: -" + eu0(Math.abs(forte.delta)) : "cosa sposta il prezzo",
    leve.join("")));

  /* ========================================================= IN BREVE ===== */
  var prosa = M.prosa(r);
  h.push(sez("breve", "In breve", liv.notti + " notti" +
      (gite.length ? ", " + gite.length + (gite.length === 1 ? " gita" : " gite") : "") +
      ", volo " + eu(liv.voci.volo),
    '<div class="prosa">' + prosa.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") +
    '<p class="nota">Il numero è un intervallo travestito da cifra: <b>± ' + percMargine +
    "%</b>, cioè circa " + eu0(euroMargine) + " a persona. Non è un margine di cortesia: è la quota " +
    "di questo preventivo che <b>non</b> viene da un prezzo verificato alla fonte. Se scende quella, " +
    "scende il margine.</p></div>"));

  /* ========================================================= STAGIONI ===== */
  var cf = confronto(r);
  h.push(sez("stagioni", "Stagioni", cf.chiave, cf.html));

  /* ============================================================= VOCI ===== */
  var vf = liv.volo_fonte, af = liv.alloggio_fonte, ts = liv.tassa;
  var quota = S.adulti + S.bambini * 0.65;
  var tassaTesto = !ts ? ""
    : ts.yen_notte > 0
      ? ". Dentro c'è la tassa di soggiorno di Tokyo: " + yen(ts.yen_notte) + " a persona a notte" +
        (ts.regola === "nuova" ? " (il 3% in vigore dal 1° aprile 2027)" : "") +
        ", fonte " + ts.fonte + ", letta il " + ts.verificato.split("-").reverse().join("/")
      : ". Nessuna tassa di soggiorno: a questo prezzo a testa Tokyo non la chiede (fonte " + ts.fonte + ")";
  var spiega = {
    volo: vf
      ? ("Google Flights, " + M.partenza(S.partenza).nome + " → Tokyo, partenza " +
         vf.out.split("-").reverse().join("/") + (vf.compagnia ? ", " + vf.compagnia : "") +
         ", " + Math.round((vf.min_and || 0) / 60) + " ore all'andata, " +
         (vf.scali === 0 ? "diretto" : vf.scali + (vf.scali === 1 ? " scalo" : " scali")) +
         (vf.scalo_peggio > 240 ? " (il più lungo di " + Math.floor(vf.scalo_peggio / 60) + " ore)" : "") +
         ", classe " + (vf.classe || "").toLowerCase().replace("_", " ") +
         ". Letto il " + (vf.letto || "").split("-").reverse().join("/") +
         ". Il bagaglio in stiva non è in questo totale")
      : ("stima: andata e ritorno da " + M.partenza(S.partenza).nome +
         ", tariffa media × moltiplicatore di stagione (" + r.stagione.volo + "×)"),
    trasporti: "biglietti delle gite, trasporto urbano " + yen(D.trasporto_locale_yen_giorno) +
      " al giorno e transfer dall'aeroporto",
    alloggio: !af
      ? (liv.notti + " notti, stima: tariffa per città × " + r.stagione.hotel + "× di stagione")
      : af.auto
        ? ("Google Hotels: " + af.eur + " € a notte × " + liv.notti + " notti × " + (liv.camere || 1) +
           (liv.camere > 1 ? " camere" : " camera") + ", diviso fra chi ci dorme" + spiegaWeekend(liv) +
           ". È la mediana delle " + af.zone + " zone di Tokyo in questa fascia, su " + af.strutture +
           " strutture (da " + af.economica.nome + " a " + af.economica.eur + " € fino a " +
           af.cara.nome + " a " + af.cara.eur + " €). Letto il " +
           af.letto.split("-").reverse().join("/") +
           (af.indietro ? " (" + af.indietro + (af.indietro === 1 ? " zona ha" : " zone hanno") +
             " ancora il prezzo del giro prima)" : "") + tassaTesto)
        : ("Google Hotels: " + af.eur + " € a notte × " + liv.notti + " notti × " + (liv.camere || 1) +
           (liv.camere > 1 ? " camere" : " camera") + " " + M.aZona(liv.zona) + spiegaWeekend(liv) +
           ". Mediana di " + af.campione + " strutture (da " + af.min + " a " + af.max + " €). Letto il " +
           af.letto.split("-").reverse().join("/") + tassaTesto),
    cibo: D.cibo[M.STILI[S.stile].cibo].desc,
    attivita: liv.attIncluse.length + " ingressi ed esperienze a pagamento: la fonte di ognuno è qui sotto",
    extra: "assicurazione, eSIM, souvenir",
    imprevisti: "5% di margine: c'è sempre qualcosa"
  };
  var attVere = liv.attIncluse.filter(function (a) { return a.c === "V"; }).length;
  var stato = {
    volo: vf ? "ok" : "no", alloggio: af ? "ok" : "no",
    trasporti: r.treni.biglietti.length ? "mezzo" : "no",
    cibo: "no", extra: "no", imprevisti: "no",
    attivita: !liv.attIncluse.length ? "no" : attVere === liv.attIncluse.length ? "ok" : attVere ? "mezzo" : "no"
  };
  var voci = ['<div class="voci">'];
  [["volo", "Volo"], ["alloggio", "Alloggio, " + liv.notti + " notti"], ["cibo", "Mangiare"],
   ["extra", "Extra"], ["attivita", "Ingressi ed esperienze"], ["trasporti", "Trasporti in Giappone"],
   ["imprevisti", "Imprevisti"]
  ].forEach(function (v) {
    var stima = stato[v[0]] === "no";
    voci.push('<div class="voce">' + q(stato[v[0]]) + '<span class="voce-n">' + v[1] +
      '</span><span class="voce-c">' + (stima ? "~" : "") + eu(liv.voci[v[0]]) + "</span>" +
      '<span class="voce-s">' + esc(spiega[v[0]]) + ". Per il gruppo: " +
      eu(liv.voci[v[0]] * quota) + ".</span></div>");
  });
  voci.push('<div class="voce tot"><i class="q vuoto" aria-hidden="true"></i><span class="voce-n">Totale a persona</span>' +
    '<span class="voce-c">' + circa + eu0(liv.perPersona) + '</span><span class="voce-s">Per il gruppo: ' +
    eu0(liv.gruppo) + ". Le singole voci sono al singolo euro, il totale è arrotondato alla decina.</span></div>");
  voci.push("</div>");
  voci.push('<p class="legenda">' + q("ok") + "prezzo letto alla fonte " + q("mezzo") +
    "in parte verificato " + q("no") + "stima, col segno ~ davanti</p>");

  voci.push('<p class="nota"><b>Tre cose che questo totale non contiene.</b> ' +
    "Il <b>bagaglio in stiva</b>: la fonte dei voli non dice se la tariffa lo include, " +
    "e sulle tariffe più basse di solito non c'è (di norma fra i 60 e i 100 € a tratta). " +
    "La <b>commissione della tua carta</b> sul cambio, fra l'1,5 e il 3% di quello che paghi in yen: " +
    "dipende dalla carta, quindi non sta nel conto. E la <b>disponibilità</b>: " +
    "il prezzo è quello che si vedeva alla data della rilevazione, non una camera o un " +
    "posto prenotato.</p>");

  voci.push("<details><summary>Notte per notte</summary>" +
    tab([{ t: "Dove" }, { t: "notti", num: 1 }, { t: "camere", num: 1 }, { t: "a notte", num: 1 }, { t: "totale", num: 1 }],
      liv.dettAlloggio.map(function (a) {
        /* due sorgenti, due unità: il prezzo VERO di Google Hotels arriva già in
           euro (tariffaEur), quello di catalogo in yen. */
        var notte  = a.tariffaEur != null ? a.tariffaEur : M.eur(a.tariffa);
        var totale = a.subEur     != null ? a.subEur     : M.eur(a.sub);
        return [esc(a.citta), a.notti, a.camere || 1, eu(notte), eu(totale)];
      })) + "</details>");

  if (af && af.auto) {
    voci.push("<details><summary>La notte, zona per zona</summary>" +
      '<p class="nota">Fascia ' + esc(M.STILI[S.stile].alloggio) + ", " + esc(r.stagione.nome) +
      ". Il preventivo usa la mediana; con una leva ti sposti su una zona precisa.</p>" +
      tab([{ t: "Zona" }, { t: "€ a notte", num: 1 }, { t: "su " + liv.notti + " notti", num: 1 },
           { t: "strutture", num: 1 }, { t: "com'è" }],
        af.elenco.map(function (z) {
          var zz = M.zoneDisponibili().filter(function (x) { return x.id === z.zona; })[0] || {};
          return [esc(z.nome), z.eur + " €", eu(z.eur * liv.notti), z.campione, esc(zz.nota || "")];
        })) + "</details>");
  }

  voci.push("<details><summary>Ogni ingresso, con la sua fonte</summary>" +
    tab([{ t: "Voce" }, { t: "costo", num: 1 }, { t: "prezzo" }, { t: "fonte" }],
      liv.attIncluse.map(function (a) {
        var st = a.c === "V" ? '<span class="tag ok">verificato</span>'
               : a.tipo === "spesa" ? '<span class="tag">spesa tipica</span>'
               : '<span class="tag">stima</span>';
        var fonte = a.c === "V" ? esc(a.fonte || "") + (a.verificato ? " · " + a.verificato.split("-").reverse().join("/") : "")
                  : a.fascia_prezzo ? esc(a.fascia_prezzo)
                  : a.tipo === "spesa" ? "non esiste un listino: è quanto si spende"
                  : "scritto a mano nel catalogo";
        return [esc(a.nome), eu(M.eur(a.yen)), st, fonte];
      }), "Solo cose gratuite: a questo livello si punta su quello che non si paga.") + "</details>");

  var quotaVera = Math.round(r.attendibilita.euro_veri / (r.attendibilita.euro_tot || 1) * 100);
  h.push(sez("voci", "Voci", "7 voci · " + quotaVera + "% verificato", voci.join("")));

  /* ============================================================= PASS ===== */
  var pass = [];
  pass.push("<p>Biglietti singoli per tutto il giro: <b>" + eu(M.eur(r.treni.senzaPass)) + "</b> a persona" +
    (r.treni.conPass !== null ? ". Con " + esc(r.treni.pass.nome) + ": <b>" + eu(M.eur(r.treni.conPass)) + "</b>" : "") + ".</p>");
  pass.push("<p><b>" + (r.treni.usaPass
    ? "Conviene il pass: risparmi " + eu(M.eur(r.treni.risparmio)) + " a persona. Attivalo il giorno " + r.treni.passDal + "."
    : "Non conviene il pass: coi biglietti singoli risparmi " + eu(M.eur(r.treni.risparmio)) + " a persona.") + "</b></p>");
  pass.push('<p class="nota">Il pass non deve coprire tutto il viaggio, solo la finestra in cui cadono ' +
    "i trasferimenti cari. Il prezzo è quello ufficiale del JR Group (" + esc(DATI.pass[0].fonte) +
    ", letto il " + DATI.pass[0].verificato.split("-").reverse().join("/") + "): il pass da 7 giorni costa " +
    num(DATI.pass[0].yen) + " yen" +
    (DATI.pass[0].prima ? ", in vigore dal 1° ottobre 2026 (prima " +
      num(DATI.pass[0].prima) + ")" : "") +
    ". Le tariffe dei treni sono lette una per una.</p>");
  pass.push("<details><summary>Ogni biglietto del giro</summary>" +
    tab([{ t: "Tratta" }, { t: "Mezzo" }, { t: "minuti", num: 1 }, { t: "costo", num: 1 }, { t: "prezzo" }, { t: "JR Pass" }],
      r.treni.biglietti.map(function (b) {
        var prov = b.stimata ? '<span class="tag">stimata</span>'
                 : b.verificata ? '<span class="tag ok">verificata</span>'
                 : '<span class="tag">stima</span>';
        return [esc(M.citta(b.da).nome + " → " + M.citta(b.a).nome), esc(b.mezzo), b.min,
                eu(M.eur(b.yen)), prov, b.jr ? "coperta" : "no"];
      }), "In questo giro non ci sono biglietti da comprare.") + "</details>");
  h.push(sez("pass", "Pass", (r.treni.usaPass ? "conviene: risparmi " : "non conviene: perdi ") +
    eu(M.eur(r.treni.risparmio)), '<div class="prosa">' + pass.join("") + "</div>"));

  /* =========================================================== GIORNI ===== */
  var gg = [];
  gg.push('<p class="nota">' + esc(r.itinerario.rotta.map(function (c) { return M.citta(c).nome; }).join(" → ")) +
    " → " + esc(M.citta(r.itinerario.base).nome) + " (rientro)</p>");
  gg.push(mappa(r));
  var pellegrinaggi = 0;
  gg.push('<div class="giorni">');
  gg.push('<div class="giorno"><span class="n">Giorno 1</span> <b>volo e arrivo</b>' +
    '<div class="trasf">Arrivo a ' + esc(M.citta(r.itinerario.base).nome) + ", transfer e crollo.</div></div>");
  r.itinerario.giorni.forEach(function (g) {
    gg.push('<div class="giorno"><span class="n">Giorno ' + (g.n + 1) + "</span> <b>" + esc(M.citta(g.citta).nome) + "</b>");
    if (g.trasferimento) gg.push('<div class="trasf">Da ' + esc(M.citta(g.trasferimento.da).nome) +
      ": " + esc(g.trasferimento.mezzo) + ", " + g.trasferimento.min + " minuti, " + eu(M.eur(g.trasferimento.yen)) + "</div>");
    if (g.luoghi.length) {
      gg.push("<ul>" + g.luoghi.map(function (l) {
        if (l.anime) pellegrinaggi++;
        return "<li" + (l.anime ? ' class="serie"' : "") + ">" + esc(l.nome) +
          ' <span class="piccolo">' + l.ore + " h · " + (l.yen ? eu(M.eur(l.yen)) : "gratis") + "</span>" +
          (l.nota ? ' <span class="nota">' + esc(l.nota) + "</span>" : "") + "</li>";
      }).join("") + "</ul>");
    } else {
      gg.push('<div class="trasf">Giornata libera: a questo punto il catalogo non ha altro da proporti qui. ' +
        "Segnale che potresti accorciare la tappa.</div>");
    }
    gg.push("</div>");
  });
  gg.push("</div>");
  if (pellegrinaggi) {
    gg.push('<p class="nota"><b>Sui luoghi delle serie.</b> Nel tuo giro ce ne sono ' + pellegrinaggi +
      ", segnati col televisore. Sono tutti posti pubblici: stazioni, scalinate, strade, " +
      "musei. In questo catalogo non entrano case private né indirizzi di persone. " +
      "Quando ci arrivi, ricordati che per chi ci abita è solo il quartiere sotto casa: " +
      "voce bassa, niente riprese dentro i cortili, e la fila la fanno anche i pellegrini.</p>");
  }
  h.push(sez("giorni", "Giorni", S.giorni + " giorni" +
    (gite.length ? " · " + gite.length + (gite.length === 1 ? " gita" : " gite") : "") +
    (pellegrinaggi ? " · " + pellegrinaggi + " luoghi delle serie" : ""), gg.join("")));

  /* ============================================================ FONTI ===== */
  var ft = [];
  if (vecchio || eta.stato === "attenzione") ft.push(avvisoEta(r));
  ft.push("<p><b>" + r.attendibilita.stime + " voci su " + r.attendibilita.totale + " (" +
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
      : "") + "</p>");
  ft.push('<p class="nota">La formula, così puoi rifare il conto: la percentuale sulle voci conta una voce ' +
    "per ogni ingresso, ogni tratta, ogni città toccata, più volo, alloggio e cambio, e considera " +
    "verificata solo quella che porta una marca esplicita. La percentuale sull'importo è " +
    "1 meno la somma delle voci verificate diviso il totale a persona.</p>");
  ft.push("<p><b>Prezzi veri, letti alla fonte:</b> " +
    [vf ? "il volo (Google Flights, tariffa esatta " + vf.esatto + " €, arrotondata ai 25, letta il " +
          (vf.letto || "").split("-").reverse().join("/") + ")" : null,
     af ? ("l'alloggio (Google Hotels, " +
       (af.auto ? "mediana delle " + af.zone + " zone di Tokyo su " + af.strutture + " strutture"
                : "mediana di " + af.campione + " strutture " + esc(M.aZona(liv.zona))) +
       ", arrotondata ai 5, letta il " + af.letto.split("-").reverse().join("/") + ")") : null,
     ts ? "la tassa di soggiorno (" + esc(ts.fonte) + ", letta il " +
          ts.verificato.split("-").reverse().join("/") + ")" : null,
     "i biglietti dei treni e il Japan Rail Pass (Yahoo! Transit e JR Group, letti il " +
       DATI.pass[0].verificato.split("-").reverse().join("/") + ")",
     r.cambio && r.cambio.vero ? "il cambio (1 € = " + r.cambio.v + " ¥, tasso di riferimento BCE del " +
       r.cambio.data.split("-").reverse().join("/") + ")" : null
    ].filter(Boolean).join("; ") + ".</p>");
  ft.push("<p><b>Stime scritte a mano:</b> " +
    (af ? "" : "l'alloggio (per questa zona e questa fascia Google non aveva " +
      "abbastanza strutture, quindi vale il catalogo); ") +
    "la metropolitana urbana, i voli dentro il Giappone e i due traghetti, " +
    "quanto si spende per mangiare, assicurazione e souvenir. Nessuna disponibilità viene " +
    "interrogata: se l'albergo è pieno, questo non lo sa.</p>");
  ft.push("<p>Quello che non è né vero né stimato ma <b>calcolato</b> è il ragionamento: come si " +
    "riempiono le giornate, quali gite reggono il viaggio, la somma delle voci, e di quanto " +
    "si sposta il totale quando cambi una risposta. Quello vale a prescindere dai prezzi.</p>");
  if (!(r.cambio && r.cambio.vero))
    ft.push("<p>Cambio usato: 1 € = " + r.cambio.v + " ¥, valore di ripiego: il servizio della BCE " +
      "non ha risposto.</p>");
  ft.push('<p class="nota"><b>Prima versione: solo Tokyo.</b> Le altre città arrivano quando ogni ' +
    "prezzo avrà almeno tre letture in giorni diversi. Usalo per farti un'idea e per capire quali " +
    "leve spostano il costo, non per prenotare.</p>");
  ft.push('<p class="nota">Un prezzo non ti torna? <a class="link" href="/#about">Scrivici dai contatti del sito</a> ' +
    'incollando il link di questo preventivo (lo trovi in «Salva»): così rifacciamo lo stesso conto.</p>');
  h.push(sez("fonti", "Fonti", r.attendibilita.perc_importo + "% dell'importo è stima",
    '<div class="prosa">' + ft.join("") + "</div>"));

  /* ========================================================== COMANDI ===== */
  h.push('<div id="salva-menu" class="salva-menu" hidden>' +
    '<button type="button" id="s-card">Immagine da condividere</button>' +
    '<button type="button" id="s-link">Copia il link del preventivo</button>' +
    '<button type="button" id="stampa">Stampa o salva in PDF</button>' +
    '<p class="nota" id="s-esito" role="status"></p></div>');
  h.push('<div id="comandi" class="comandi-ris"><button id="salva" type="button" aria-expanded="false" ' +
    'aria-controls="salva-menu">Salva</button>' +
    '<button id="modifica" type="button">Cambia</button>' +
    '<button id="ricomincia" type="button">Da capo</button></div>');
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
  h.push('<div class="confronto">' +
    '<p class="nota">Stesso viaggio, stesse risposte, cambia solo quando parti. Le due colonne ' +
    "sono due preventivi rifatti da capo: evidenziato quello che costa meno.</p>");
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
    (delta === 0 ? "Costa uguale" : (delta < 0 ? "-" : "+") + eu0(Math.abs(delta)) + " a persona" +
      (delta < 0 ? " partendo " : " partendo ") + "a " + esc(sB.nome).toLowerCase()) + "</span>" +
    '<button type="button" id="c-applica">Passa a ' + esc(sB.nome) + "</button></div>");
  h.push("</div>");
  return { html: h.join(""),
           chiave: delta === 0 ? "a " + esc(sB.nome).toLowerCase() + " costa uguale"
                 : "a " + esc(sB.nome).toLowerCase() + " " + (delta < 0 ? "-" : "+") +
                   eu0(Math.abs(delta)) + " a persona" };
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
   prezzi come freschi. Soglie dal 28/09/2026, col rinfresco settimanale:
   8 giorni tranquillo, 15 avviso, 28 scaduto. */
/* la data che si scrive a schermo: la lettura più vecchia fra voli e alloggi */
function dataLettura() {
  var P = window.PREZZI;
  if (!P) return "";
  var q = P.generato || "";
  if (P.letto) {
    var l = [P.letto.voli, P.letto.alloggi].filter(Boolean).sort();
    if (l.length) q = l[0];
  }
  return q.slice(0, 10).split("-").reverse().join("/");
}

/* Con un risultato in mano (r) l'età è quella dei DUE PREZZI USATI in quel
   preventivo — il volo e l'alloggio della fascia scelta — non quella media
   del listino: un giro di raccolta può rileggere una cella e non un'altra, e
   chi guarda un preventivo deve sapere l'età dei suoi numeri. */
function etaListino(r) {
  var P = window.PREZZI;
  if (!P || !P.generato) return { giorni: null, stato: "ignoto" };
  /* conta la LETTURA più vecchia fra le fonti, non il giorno dell'esportazione */
  var quando = P.generato;
  if (P.letto) {
    var l = [P.letto.voli, P.letto.alloggi].filter(Boolean).sort();
    if (l.length) quando = l[0];
  }
  if (r && r.livelli && r.livelli[S.stile]) {
    var lv = r.livelli[S.stile];
    var usati = [lv.volo_fonte && lv.volo_fonte.letto, lv.alloggio_fonte && lv.alloggio_fonte.letto]
      .filter(Boolean).sort();
    if (usati.length) quando = usati[0];
  }
  P = { generato: quando };
  var g = new Date(P.generato);
  if (isNaN(g)) return { giorni: null, stato: "ignoto" };
  var giorni = Math.floor((Date.now() - g.getTime()) / 86400000);
  return {
    giorni: giorni, data: P.generato.slice(0, 10).split("-").reverse().join("/"),
    /* il rinfresco è settimanale (domenica notte): fino a 8 giorni è la norma,
       fino a 15 è saltato un giro, oltre ne sono saltati due */
    stato: giorni <= 8 ? "fresco" : giorni <= 15 ? "attenzione" : giorni <= 28 ? "vecchio" : "scaduto"
  };
}

function avvisoEta(r) {
  var e = etaListino(r);
  if (e.stato === "fresco") return "";
  var testo = e.stato === "ignoto"
    ? "Il listino non dice quando è stato rilevato: trattalo come non aggiornato."
    : e.stato === "attenzione"
      ? "I prezzi hanno " + e.giorni + " giorni (letti il " + e.data + "): è saltato un giro " +
        "di aggiornamento. Sui voli in due settimane si muove parecchio: prendili come ordine di grandezza."
      : e.stato === "vecchio"
        ? "Attenzione: i prezzi sono di " + e.giorni + " giorni fa (" + e.data + "). " +
          "Non sono più affidabili come cifra, solo come proporzione fra le voci."
        : "Questi prezzi hanno più di quattro settimane (" + e.data + ") e non sono " +
          "aggiornati. Il preventivo vale come struttura del costo, non come cifra.";
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
              ? " · prezzi letti il " + dataLettura() : "") +
            " · non è un preventivo commerciale, è una stima",
    perPersona: liv.perPersona, alGiorno: liv.alGiorno, gruppo: liv.gruppo, persone: persone,
    fasce: ["essenziale","equilibrato","comodo"].map(function (k) {
      return { nome: r.livelli[k].nome, perPersona: r.livelli[k].perPersona,
               gruppo: r.livelli[k].gruppo, scelta: k === S.stile };
    }),
    voci: voci, giorni: giorni,
    leve: COMP.slice(0, 8).map(function (c) { return { etichetta: c.etichetta, delta: c.delta }; }),
    mappa: null,
    onesta: (function () { var e = etaListino(r);
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
/* un elemento con role=button deve rispondere anche a Invio e alla barra */
function comeBottone(el, fai) {
  el.onclick = fai;
  el.onkeydown = function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fai(); }
  };
}
/* porta a una sezione e la apre. Niente scrollIntoView: dentro il sito c'è
   una barra fissa in alto, e il titolo finirebbe sotto. */
function vaiASezione(id) {
  var d = $("#sez-" + id);
  if (!d) return;
  d.open = true;
  var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h"), 10) || 0;
  var ind = $("#risultato .ris-indice");
  var sopra = navH + (ind && getComputedStyle(ind).position === "sticky" ? ind.offsetHeight : 0) + 10;
  window.scrollTo(0, d.getBoundingClientRect().top + window.pageYOffset - sopra);
}
function datiCard(r) {
  var liv = r.livelli[S.stile], e = etaListino(r);
  var perc = Math.max(15, r.attendibilita.perc_importo || 15);
  var persone = S.adulti + S.bambini;
  var nomi = S.interessi.map(function (i) { var x = M.interesse(i); return x ? x.nome.toLowerCase() : ""; })
              .filter(Boolean);
  return {
    titolo: M.citta(r.itinerario.base).nome + " · " + S.giorni + " giorni · " + r.stagione.nome,
    sotto: persone + (persone === 1 ? " persona" : " persone") + " da " + M.partenza(S.partenza).nome +
           (nomi.length ? " · " + nomi.slice(0, 4).join(", ") : ""),
    fasce: ["essenziale", "equilibrato", "comodo"].map(function (k) {
      return { nome: r.livelli[k].nome, cifra: eu0(r.livelli[k].perPersona), scelta: k === S.stile };
    }),
    margine: eu0(M.arrotonda(liv.perPersona * perc / 100, 10)),
    percVero: 100 - perc,
    data: e.data || dataLettura(),
    vecchio: e.stato === "vecchio" || e.stato === "scaduto" || e.stato === "ignoto",
    indirizzo: location.host + location.pathname.replace(/index\.html$/, "")
  };
}

function agganciaRisultato() {
  $$("#risultato .prezzo").forEach(function (p) {
    comeBottone(p, function () { S.stile = p.dataset.stile; calcolaEMostra(); });
  });
  $$("#risultato [data-vai]").forEach(function (a) {
    a.onclick = function (e) { e.preventDefault(); vaiASezione(a.dataset.vai); };
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
    var prima = S.stagione; S.stagione = S.confronto; S.confronto = prima;
    calcolaEMostra(); window.scrollTo(0, 0);
  };
  $$("#risultato .compromesso").forEach(function (el) {
    var c = COMP[+el.dataset.i];
    if (!c || c.soloInfo) return;
    comeBottone(el, function () {
      for (var k in c.patch) S[k] = c.patch[k];
      calcolaEMostra();
      /* la leva sta in basso, il numero che ha spostato sta in alto: lo si va a vedere */
      window.scrollTo(0, 0);
    });
  });
  mgMisura();
  applicaMappa();
  var bms = $("#mappa-stile");
  if (bms) bms.onclick = function () {
    MAPPA_STILE = stileMappa() === "gioco" ? "reale" : "gioco";
    applicaMappa();
  };

  /* --- salva: immagine, link, PDF -------------------------------------- */
  var menu = $("#salva-menu"), bs = $("#salva"), esito = $("#s-esito");
  bs.onclick = function () {
    menu.hidden = !menu.hidden;
    bs.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
    if (!menu.hidden && schermoStretto() === false)
      window.scrollTo(0, menu.getBoundingClientRect().top + window.pageYOffset - 120);
  };
  $("#s-link").onclick = function () {
    var l = window.PV_CONDIVIDI.link(S);
    try { history.replaceState(null, "", "#g=" + window.PV_CONDIVIDI.codice(S)); } catch (e) {}
    window.PV_CONDIVIDI.copia(l).then(function (ok) {
      esito.textContent = ok ? "Link copiato. Chi lo apre rifà questo conto coi prezzi del giorno."
                             : "Non sono riuscito a copiarlo: è nella barra dell'indirizzo, copialo da lì.";
    });
    if (window.PV_CONTA) window.PV_CONTA.tappa("link");
  };
  $("#s-card").onclick = function () {
    esito.textContent = "Preparo l'immagine…";
    var r = M.pianifica(perMotore());
    window.PV_CONDIVIDI.immagine(datiCard(r)).then(function (blob) {
      return window.PV_CONDIVIDI.consegna(blob, "Il mio Giapponemetro: quanto costa davvero il viaggio.",
                                          window.PV_CONDIVIDI.link(S));
    }).then(function (come) {
      esito.textContent = come === "scaricata" ? "Immagine scaricata."
                        : come === "condivisa" ? "Fatto." : "";
    }, function () { esito.textContent = "L'immagine non è riuscita: prova col link o col PDF."; });
    if (window.PV_CONTA) window.PV_CONTA.tappa("card");
  };
  $("#stampa").onclick = function () { creaPdf(); if (window.PV_CONTA) window.PV_CONTA.tappa("pdf"); };
  $("#modifica").onclick = function () {
    $("#risultato").hidden = true; $("#wizard").hidden = false; mostraPasso(0);
  };
  $("#ricomincia").onclick = function () {
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    location.reload();
  };
}

/* La stagione proposta all'apertura: la prima partenza utile che abbia un volo
   letto di recente. Prima era «ottobre» fisso: a fine settembre voleva dire
   aprire il questionario su un prezzo di cinque settimane prima, perché le
   partenze a meno di 45 giorni non si rileggono (sarebbe un last-minute). */
function stagioneIniziale() {
  var P = window.PREZZI, voli = P && P.voli && P.voli[S.partenza];
  if (!voli) return S.stagione;
  var oggi = Date.now(), meglio = null;
  D.stagioni.forEach(function (st) {
    var v = voli[st.id] && voli[st.id].normale;
    if (!v || !v.out || !v.letto) return;
    var parte = new Date(v.out + "T00:00:00").getTime(), letto = new Date(v.letto + "T00:00:00").getTime();
    if ((oggi - letto) / 86400000 > 15) return;          /* letto da poco */
    if ((parte - oggi) / 86400000 < 60) return;           /* c'è il tempo di organizzarsi */
    if (!meglio || parte < meglio.parte) meglio = { id: st.id, parte: parte };
  });
  return meglio ? meglio.id : S.stagione;
}

/* ------------------------------------------------------------- AVVIO ----- */
function avvia() {
  S.stagione = stagioneIniziale();
  cielo();
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
    dp.textContent = "Prezzi rilevati il " + dataLettura() + ".";
  }

  /* «il livello già iniziato»: un link con le risposte dentro apre subito
     sul risultato. Serve a chi riceve un preventivo e a chi arriva da un
     video che ne porta uno già impostato. */
  var daLink = window.PV_CONDIVIDI && window.PV_CONDIVIDI.leggi();
  if (daLink) {
    for (var k in daLink) S[k] = daLink[k];
    sincronizzaCampi();
    raggiunto = passiAttivi().length - 1;
    passo = raggiunto;
    if (window.PV_CONTA) window.PV_CONTA.tappa("da-link");
    calcolaEMostra();
    return;
  }
  mostraPasso(0);
}

/* riporta lo stato dentro i campi del questionario: serve quando lo stato
   arriva da un link e non dalle dita */
function sincronizzaCampi() {
  $("#partenza").value = S.partenza;
  $("#adulti").value = S.adulti; $("#bambini").value = S.bambini;
  $("#giorni").value = S.giorni; $("#giorni-out").textContent = S.giorni;
  $$("input[name=ritmo]").forEach(function (r) { r.checked = r.value === S.ritmo; });
  $$("input[name=stile]").forEach(function (r) { r.checked = r.value === S.stile; });
  $$("input[name=pv]").forEach(function (r) { r.checked = (r.value === "si") === S.primaVolta; });
  $("#giavisti-box").hidden = S.primaVolta;
  $$("#stagioni .carta").forEach(function (c) { c.classList.toggle("on", c.dataset.id === S.stagione); });
  $$("#interessi .carta").forEach(function (c) {
    var on = S.interessi.indexOf(c.dataset.id) !== -1;
    c.classList.toggle("on", on); c.setAttribute("aria-pressed", on ? "true" : "false");
  });
  $$("#giavisti .carta").forEach(function (c) {
    c.classList.toggle("on", S.giaVisti.indexOf(c.dataset.id) !== -1);
  });
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
