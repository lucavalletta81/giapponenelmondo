/* =========================================================================
   MASCOTTE — Super Luca resta in pagina (solo tema arcade, schermi larghi).
   Vive sul bordo basso della finestra e NON sta mai fermo nello stesso
   posto: a ogni cambio passo CAMMINA verso un punto diverso (frame di
   passo alternati, si gira nella direzione giusta), poi si mette a fare
   qualcosa — mangia il ramen, morde un dango, saluta, torna con le buste —
   e ogni attività è animata a due frame, non una statua.
   Un click lo fa cambiare subito. Nessuna logica di gioco: è compagnia.
   ========================================================================= */
(function () {
"use strict";
var im = function (n) { return (window.PV_IMG && window.PV_IMG[n]) || ("img/" + n); };

/* le occupazioni: coppie di frame che si alternano */
var ATTIVITA = [
  ["arcade-g-idle.png",   "arcade-g-saluta1.png"],
  ["arcade-g-ramen.png",  "arcade-g-ramen2.png"],
  ["arcade-g-dango.png",  "arcade-g-dango2.png"],
  ["arcade-g-saluta1.png","arcade-g-saluta2.png"],
  ["arcade-g-buste.png",  "arcade-g-idle.png"]
];
/* dove può piazzarsi (percento della larghezza finestra) */
var SPOT = [6, 22, 40, 58, 76, 90];

var el = null, spot = 0, attivita = -1, frame = 0;
var timerFrame = null, timerPasso = null, timerCambio = null, ultimoN = -1;

function attivo() { return document.body.getAttribute("data-tema") === "pixel"; }
function pulisci() { [timerFrame, timerPasso, timerCambio].forEach(clearInterval); timerFrame = timerPasso = timerCambio = null; }

/* ------------------------------------------------ l'attività sul posto --- */
function faiQualcosa() {
  pulisci();
  var k;
  do { k = Math.floor(Math.random() * ATTIVITA.length); } while (k === attivita);
  attivita = k;
  frame = 0;
  el.style.transform = "";                 /* torna girato a destra */
  timerFrame = setInterval(function () {
    frame = 1 - frame;
    el.src = im(ATTIVITA[attivita][frame]);
  }, 480);
  el.src = im(ATTIVITA[attivita][0]);
  /* dopo un po' cambia idea da solo */
  timerCambio = setInterval(function () { cammina(); }, 9000 + Math.random() * 8000);
}

/* --------------------------------------------- la camminata fra gli spot - */
function cammina() {
  pulisci();
  var nuovo;
  do { nuovo = Math.floor(Math.random() * SPOT.length); } while (nuovo === spot);
  var da = SPOT[spot], a = SPOT[nuovo];
  spot = nuovo;
  var versoSinistra = a < da;
  el.style.transform = versoSinistra ? "scaleX(-1)" : "";
  var durata = Math.abs(a - da) * 55;      /* ~55 ms per punto percentuale */
  el.style.transition = "left " + durata + "ms linear";
  el.style.left = a + "%";
  var f = 0;
  timerPasso = setInterval(function () {
    f = 1 - f;
    el.src = im("arcade-g-passo" + (f + 1) + ".png");
  }, 160);
  setTimeout(function () {
    if (timerPasso) { clearInterval(timerPasso); timerPasso = null; }
    faiQualcosa();
  }, durata + 30);
}

/* --------------------------------------------------------------- avvio --- */
function monta() {
  if (el) return;
  el = document.createElement("img");
  el.id = "mascotte";
  el.width = 48;
  el.alt = "";
  el.title = "clic per fargli cambiare idea";
  el.style.left = SPOT[0] + "%";
  el.src = im("arcade-g-idle.png");
  el.onclick = function () { cammina(); if (window.SUONI) SUONI.fai("blip"); };
  document.body.appendChild(el);
  faiQualcosa();

  /* al cambio passo del questionario si sposta: posti diversi, pagine diverse */
  setInterval(function () {
    if (!attivo() || !window.PV_HOOK) return;
    var p = window.PV_HOOK.passo();
    var n = p.risultato ? 99 : p.n;
    if (ultimoN !== -1 && n !== ultimoN) cammina();
    ultimoN = n;
  }, 700);
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", function () { setTimeout(monta, 60); });
else setTimeout(monta, 60);
})();
