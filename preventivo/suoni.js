/* =========================================================================
   SUONI — sintesi WebAudio, onda quadra, stile 8 bit. Nessun file audio.
   Muto all'accensione (i browser bloccano comunque l'autoplay): si accende
   con l'interruttore in HUD, e la scelta resta in localStorage.
   ========================================================================= */
window.SUONI = (function () {
"use strict";
/* Acceso di default (31/08/2026, scelta di Luca): resta spento solo per chi
   lo ha spento. I browser sbloccano l'audio al primo gesto: il contesto si
   apre lì (listener in fondo), da quel momento tutto suona. */
var ctx = null, acceso = true;
try { acceso = localStorage.getItem("pv-audio") !== "off"; } catch (e) {}

function contesto() {
  if (!ctx) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/* una nota quadra: frequenza, durata, volume, ritardo dall'adesso */
function nota(freq, dur, vol, dopo) {
  var c = contesto(); if (!c) return;
  var t = c.currentTime + (dopo || 0);
  var o = c.createOscillator(), g = c.createGain();
  o.type = "square"; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur);
}

var S = {
  /* la monetina: due note veloci, come l'originale */
  coin:  function () { nota(988, 0.08, 0.12); nota(1319, 0.30, 0.12, 0.08); },
  /* il blip di selezione: una nota corta e basta */
  blip:  function () { nota(523, 0.05, 0.08); },
  /* conferma: due note che salgono */
  ok:    function () { nota(659, 0.07, 0.10); nota(880, 0.12, 0.10, 0.07); },
  /* errore: due note che scendono, sorde */
  err:   function () { nota(196, 0.10, 0.12); nota(147, 0.18, 0.12, 0.10); },
  /* il ticchettio del contatore che sale */
  tick:  function () { nota(1047 + Math.random() * 200, 0.03, 0.05); },
  /* fanfara di fine livello: arpeggio maggiore */
  fanfara: function () {
    [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) {
      nota(f, i === 5 ? 0.5 : 0.12, 0.10, i * 0.11);
    });
  },
  /* il testo che si scrive nel dialogo */
  lettera: function () { nota(2093, 0.015, 0.03); }
};

function fai(nome) { if (acceso && S[nome]) S[nome](); }

/* il primo gesto qualunque sblocca l'audio del browser */
["pointerdown", "keydown"].forEach(function (ev) {
  document.addEventListener(ev, function una() {
    document.removeEventListener(ev, una, true);
    if (acceso) contesto();
  }, true);
});

return {
  fai: fai,
  acceso: function () { return acceso; },
  toggle: function () {
    acceso = !acceso;
    try { localStorage.setItem("pv-audio", acceso ? "on" : "off"); } catch (e) {}
    if (acceso) { contesto(); fai("coin"); }
    return acceso;
  }
};
})();
