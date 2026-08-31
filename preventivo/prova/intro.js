/* =========================================================================
   INTRO — la sequenza d'ingresso del vestito arcade. Saltabile sempre, e
   chi torna non la rivede (localStorage). Solo tema pixel/arcade.

   Il copione (rivisto il 31/08/2026 su indicazioni di Luca):
   LOADING → scena con Tokyo a tutto sfondo e l'aereo nel cielo → l'omino
   entra DA SINISTRA, con calma, e si ferma sotto il blocco ? → UN dialogo
   solo, stringato → INIZIA → l'omino salta, capocciata: il blocco sputa a
   sorpresa un elemento del Giappone (uno diverso ogni volta, dalle icone
   degli interessi) che si alza alla Mario → si entra nel questionario.
   ========================================================================= */
(function () {
"use strict";
var $ = function (s, r) { return (r || document).querySelector(s); };
/* nella demo a file unico le immagini vivono in window.PV_IMG (data URI) */
var im = function (n) { return (window.PV_IMG && window.PV_IMG[n]) || ("img/" + n); };

var DIALOGO =
  "Quanto può costare davvero\nil tuo viaggio in Giappone?\nOtto domande per portarti con\nconsapevolezza nel Sol Levante.";

/* Cosa può uscire dal blocco: l'elemento narrativo delle icone interessi.
   Fuori le astrazioni che non "escono" da un blocco (onsen, insolito,
   notturno, shopping): restano gli OGGETTI — la ciotola di ramen, Naruto,
   il Gundam, il tempio, il castello, la geisha, il Fuji, il gamepad... */
var SORPRESE = ["ramen", "castello", "torii", "daruma", "maneki", "mecha",
                "lanterna", "fuji", "geisha"];

var vivo = false, fase = "", timerScrivi = null, timeouts = [];

function dopo(ms, f) { timeouts.push(setTimeout(f, ms)); }
function pulisciTimer() { timeouts.forEach(clearTimeout); timeouts = []; if (timerScrivi) { clearInterval(timerScrivi); timerScrivi = null; } }

function ridotto() {
  return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function costruisci() {
  var el = document.createElement("div");
  el.id = "intro";
  el.innerHTML =
    '<div class="in-loading">LOADING<span class="in-punti"></span></div>' +
    '<div class="in-scena" hidden>' +
      '<img class="in-tokyo" src="' + im("arcade-tokyo.png") + '" alt="">' +
      '<img class="in-aereo" src="' + im("arcade-aereo.png") + '" alt="" width="96" height="40">' +
      '<img class="in-blocco" src="' + im("arcade-blocco.png") + '" alt="" width="64" height="64">' +
      '<img class="in-moneta" src="' + im("arcade-moneta1.png") + '" alt="" width="40" height="40" hidden>' +
      '<img class="in-sorpresa" src="" alt="" width="96" hidden>' +
      '<img class="in-omino" src="' + im("arcade-g-idle.png") + '" alt="" width="64">' +
      '<div class="in-suolo"></div>' +
    '</div>' +
    '<div class="in-dialogo" hidden><pre class="in-testo"></pre>' +
      '<button type="button" class="in-inizia" hidden>INIZIA ▸</button></div>' +
    '<button type="button" class="in-skip">salta ▸▸</button>';
  document.body.appendChild(el);
  return el;
}

function chiudi() {
  if (!vivo) return;
  vivo = false;
  pulisciTimer();
  try { localStorage.setItem("pv-intro-vista", "1"); } catch (e) {}
  var el = $("#intro");
  if (el) { el.classList.add("in-via"); setTimeout(function () { el.remove(); }, 200); }
  document.removeEventListener("keydown", suTasto, true);
}

/* ------------------------------------------------- il dialogo (uno) ----- */
function scrivi(testo, fine) {
  var box = $("#intro .in-testo");
  box.textContent = "";
  if (ridotto()) { box.textContent = testo; fine(); return; }
  /* i caratteri si contano dal TEMPO, non dai tick: se il browser rallenta
     i timer il testo non si trascina, recupera */
  var da = Date.now(), prima = 0;
  timerScrivi = setInterval(function () {
    var i = Math.min(testo.length, Math.round((Date.now() - da) / 25));
    if (i > prima) {
      box.textContent = testo.slice(0, i);
      if (window.SUONI) SUONI.fai("lettera");
      prima = i;
    }
    if (i >= testo.length) { clearInterval(timerScrivi); timerScrivi = null; fine(); }
  }, 25);
}

function mostraDialogo() {
  fase = "dialogo";
  $("#intro .in-dialogo").hidden = false;
  scrivi(DIALOGO, function () {
    var b = $("#intro .in-inizia");
    b.hidden = false;
    b.onclick = function (e) { e.stopPropagation(); finale(); };
  });
}

/* --------------------------- INIZIA: salto, capocciata e sorpresa ------- */
/* Il gran finale è legato al gesto: si preme INIZIA e l'omino colpisce il
   blocco, che sputa un pezzo di Giappone diverso ogni volta. */
function finale() {
  if (fase === "finale") return;
  fase = "finale";
  pulisciTimer();
  $("#intro .in-dialogo").hidden = true;
  var omino = $("#intro .in-omino"), blocco = $("#intro .in-blocco"),
      sorpresa = $("#intro .in-sorpresa");
  if (window.SUONI) SUONI.fai("ok");
  if (ridotto()) { chiudi(); return; }

  omino.src = im("arcade-g-salto.png");
  omino.classList.add("in-salto");

  dopo(180, function () {         /* la capocciata */
    omino.src = im("arcade-g-botta.png");
    blocco.src = im("arcade-blocco-colpo.png");
    blocco.classList.add("in-botta");
    if (window.SUONI) SUONI.fai("coin");
  });

  dopo(400, function () {         /* dal blocco si alza la sorpresa */
    blocco.src = im("arcade-blocco-vuoto.png");
    blocco.classList.remove("in-botta");
    omino.classList.remove("in-salto");
    omino.src = im("arcade-g-idle.png");
    var id = SORPRESE[Math.floor(Math.random() * SORPRESE.length)];
    sorpresa.src = im("arcade-obj-" + id + ".png");
    sorpresa.hidden = false;
    sorpresa.classList.add("in-sboccia");
    if (window.SUONI) SUONI.fai("fanfara");
  });

  dopo(1500, chiudi);             /* il tempo di vederla, e si entra */
}

/* ------------------------------------------------------------ i gesti --- */
function suGesto() {
  if (!vivo) return;
  if (fase === "scena" || fase === "loading") {   /* si salta l'attesa */
    pulisciTimer();
    $("#intro .in-loading").hidden = true;
    var sc = $("#intro .in-scena");
    sc.hidden = false;
    $("#intro .in-omino").classList.add("in-posato");
    mostraDialogo();
    return;
  }
  if (fase === "dialogo") {
    var testo = DIALOGO, box = $("#intro .in-testo");
    if (timerScrivi) {            /* sta scrivendo: completa */
      clearInterval(timerScrivi); timerScrivi = null;
      box.textContent = testo;
      var b = $("#intro .in-inizia");
      b.hidden = false;
      b.onclick = function (e) { e.stopPropagation(); finale(); };
    } else {
      finale();                   /* testo già completo: barra = INIZIA */
    }
  }
}
function suTasto(e) {
  if (!vivo) return;
  if (e.key === "Escape") { chiudi(); return; }
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); suGesto(); }
}

/* ------------------------------------------------------- la sequenza ---- */
function parte() {
  vivo = true;
  var el = costruisci();
  el.addEventListener("click", function (e) {
    if (e.target.classList.contains("in-skip")) { chiudi(); return; }
    suGesto();
  });
  document.addEventListener("keydown", suTasto, true);

  if (ridotto()) {                /* niente scatti: dritti al dialogo */
    fase = "scena";
    suGesto();
    return;
  }

  fase = "loading";
  var omino = $("#intro .in-omino"), scena = $("#intro .in-scena");

  dopo(400, function () {         /* via il loading, entra la scena */
    $("#intro .in-loading").hidden = true;
    scena.hidden = false;
    fase = "scena";
  });

  dopo(600, function () {         /* l'omino entra da sinistra, con calma */
    omino.classList.add("in-cammina");
    var f = 0, passi = setInterval(function () {
      f++;
      omino.src = im("arcade-g-passo" + (f % 2 + 1) + ".png");
    }, 160);
    timeouts.push(passi);         /* clearTimeout su un interval funziona */
    dopo(1450, function () { clearInterval(passi); omino.src = im("arcade-g-idle.png"); });
  });

  dopo(2250, mostraDialogo);      /* arrivato: la finestra */
}

/* ----------------------------------------------------------- innesco ---- */
function primaVolta() {
  try { return !localStorage.getItem("pv-intro-vista"); } catch (e) { return false; }
}
function temaArcade() { return document.body.getAttribute("data-tema") === "pixel"; }

function forse() { if (!vivo && temaArcade() && primaVolta()) parte(); }

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", function () { setTimeout(forse, 30); });
else setTimeout(forse, 30);

/* rivedi l'intro (link in fondo) e primo passaggio al tema arcade */
window.PV_INTRO = function () { if (!vivo) parte(); };
document.addEventListener("click", function (e) {
  if (e.target.closest && e.target.closest("#pv-tema"))
    setTimeout(forse, 80);        /* dopo che app.js ha cambiato il tema */
  if (e.target.id === "pv-rivedi") { e.preventDefault(); if (!vivo && temaArcade()) parte(); }
}, true);
})();
