/* =========================================================================
   CONTATORE DEI PREVENTIVI — quanti ne sono stati fatti, in tutto.

   È l'unica cosa in tutto lo strumento che esce dal browser, ed è bene
   sapere esattamente cos'è: una richiesta a un contatore pubblico che
   aumenta di uno e restituisce il totale. Non manda le risposte, non manda
   il preventivo, non manda un identificativo: manda «+1». Sta scritto nella
   pagina della privacy.

   Se il servizio non risponde, il numero semplicemente non si vede: il
   preventivo funziona lo stesso, perché il conto è tutto nel browser.
   ========================================================================= */
window.PV_CONTA = (function () {
"use strict";
var CASA = "https://abacus.jasoncameron.dev";
var SPAZIO = "giapponenelmondo", CHIAVE = "preventivi-tokyo";
var segnato = false, valore = null;

/* Il numero si mostra solo quando dice qualcosa: «sei il preventivo numero 4»
   non è un'informazione, è un cartello di locale vuoto. Si continua a contare
   da subito, si fa vedere da SOGLIA in su. */
var SOGLIA = 100;

function scrivi(n) {
  valore = n;
  if (n < SOGLIA) return;
  var testo = n.toLocaleString("it-IT");
  var dentro = document.getElementById("conta-preventivi");
  if (dentro) {
    dentro.innerHTML = "Sei il preventivo numero <b>" + testo + "</b> fatto con questo strumento.";
    dentro.hidden = false;
  }
  var piede = document.getElementById("conta-piede");
  if (piede) piede.textContent = n === 1 ? "1 preventivo fatto" : testo + " preventivi fatti";
}

function chiedi(dove) {
  /* niente credenziali, niente cookie: una GET e basta */
  return fetch(CASA + "/" + dove + "/" + SPAZIO + "/" + CHIAVE, { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d && typeof d.value === "number") scrivi(d.value); })
    .catch(function () { /* il contatore è un di più: se non c'è, pazienza */ });
}

/* quanti ne sono stati fatti finora (senza aumentare il conto) */
function leggi() { return chiedi("get"); }

/* uno in più: si chiama SOLO quando un preventivo è stato davvero calcolato */
function segna() {
  if (segnato) return;
  segnato = true;
  if (!/(^|\.)giapponenelmondo\.com$/.test(location.hostname) || /\/prova\//.test(location.pathname))
    return leggi();
  return chiedi("hit");
}

/* L'IMBUTO. Per sapere dove la gente si ferma non serve sapere chi è: basta
   un contatore per tappa. Ogni tappa manda il suo «+1» una volta sola per
   visita, allo stesso servizio e nello stesso modo del contatore grande:
   nessuna risposta, nessun identificativo, nessun cookie. Le tappe sono
   l'arrivo, i passi del questionario, il risultato e i tre modi di salvarlo. */
var fatte = {};
function tappa(nome) {
  nome = String(nome).replace(/[^a-z0-9-]/gi, "").toLowerCase();
  if (!nome || fatte[nome]) return;
  fatte[nome] = true;
  /* le prove in locale e le copie di collaudo non sporcano il conto */
  if (!/(^|\.)giapponenelmondo\.com$/.test(location.hostname)) return;
  if (/\/prova\//.test(location.pathname)) return;
  try {
    fetch(CASA + "/hit/" + SPAZIO + "/tappa-" + nome, { cache: "no-store", keepalive: true })
      .catch(function () {});
  } catch (e) {}
}

function avvio() { leggi(); tappa("arrivo"); }
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", avvio);
else avvio();

return { segna: segna, leggi: leggi, tappa: tappa, valore: function () { return valore; } };
})();
