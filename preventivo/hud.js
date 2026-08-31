/* =========================================================================
   HUD — la barra di gioco in alto, solo nel tema arcade (data-tema="pixel").
   Il pezzo che conta: il COSTO VIVO. Ad ogni risposta si rifà il preventivo
   col motore vero e il contatore scatta verso il numero nuovo. Il margine ±
   non è un effetto grafico: è attendibilita.perc_importo del motore, la
   quota dell'importo che non viene da una fonte verificata.
   Si aggancia ad app.js senza toccarne la logica: window.PV_HOOK espone
   stato e motore, e il resto è delega di eventi.
   ========================================================================= */
(function () {
"use strict";
var $ = function (s, r) { return (r || document).querySelector(s); };
var im = function (n) { return (window.PV_IMG && window.PV_IMG[n]) || ("img/" + n); };
var mostrato = -1;         /* l'ultimo valore disegnato, per lo scatto */
var timerScatto = null, timerCalcolo = null;

function attivo() { return document.body.getAttribute("data-tema") === "pixel"; }

function monta() {
  if ($("#hud")) return;
  var el = document.createElement("div");
  el.id = "hud";
  el.innerHTML =
    '<span class="hud-mondo" id="hud-mondo">MONDO 1-1</span>' +
    '<span class="hud-costo"><img src="' + im("arcade-moneta1.png") + '" alt="" width="20" height="20">' +
      '<b id="hud-cifra">–</b><i class="hud-parziale" id="hud-parziale">conto parziale</i>' +
      '<span class="hud-margine"><i id="hud-piu">± …</i><u id="hud-barra"><b id="hud-barra-fill"></b></u></span>' +
    '</span>' +
    '<button type="button" id="hud-audio" aria-label="Suoni on/off">' +
      (window.SUONI && SUONI.acceso() ? "♪ ON" : "♪ OFF") + "</button>";
  var main = $(".pv-main");
  main.insertBefore(el, main.firstChild);
  $("#hud-audio").onclick = function () {
    this.textContent = SUONI.toggle() ? "♪ ON" : "♪ OFF";
  };
}

/* il numero scatta a step secchi, non scorre: 8 scatti in ~350 ms */
function scatta(da, a) {
  if (timerScatto) clearInterval(timerScatto);
  var passi = 8, k = 0;
  var cifra = $("#hud-cifra");
  timerScatto = setInterval(function () {
    k++;
    var v = k >= passi ? a : Math.round(da + (a - da) * k / passi);
    cifra.textContent = Math.round(v).toLocaleString("it-IT") + " €";
    if (window.SUONI) SUONI.fai("tick");
    if (k >= passi) { clearInterval(timerScatto); timerScatto = null; }
  }, 45);
  /* il lampo giallo sulla sola cifra, steps(1) via classe */
  cifra.classList.remove("lampo"); void cifra.offsetWidth; cifra.classList.add("lampo");
}

/* Il contatore parte da ZERO e si guadagna strada facendo: ogni passo del
   questionario SBLOCCA le voci che quel passo determina, e la somma cresce
   fino a coincidere col totale del risultato (somma voci = perPersona, è
   verificato). Niente numeri inventati: sono le voci vere del motore,
   servite man mano che l'utente dà i dati per calcolarle. */
var SBLOCCHI = {
  interessi: [], rami: ["attivita"], chi: [],
  quando: ["volo"], ritmo: ["alloggio", "cibo", "trasporti"],
  giastato: [], spostamenti: [], stile: ["extra", "imprevisti"]
};

function aggiorna() {
  if (!attivo() || !window.PV_HOOK) return;
  monta();
  var H = window.PV_HOOK;
  var r;
  try { r = H.pianifica(); } catch (e) { return; }
  var liv = r.livelli[H.stato().stile];
  var p = H.passo();

  var v, quota = 1;
  if (p.risultato) {
    v = liv.perPersona;
  } else {
    var chiavi = [];
    for (var k = 0; k <= Math.min(p.raggiunto, p.ids.length - 1); k++)
      chiavi = chiavi.concat(SBLOCCHI[p.ids[k]] || []);
    v = chiavi.reduce(function (a, c) { return a + (liv.voci[c] || 0); }, 0);
    quota = liv.perPersona ? v / liv.perPersona : 0;
  }

  /* il margine onesto: la quota non verificata dell'importo, mai sotto il 15%
     dichiarato in pagina — applicata alla parte già in tabella */
  var perc = Math.max(15, r.attendibilita.perc_importo || 15);
  var piu = Math.round(v * perc / 100 / 10) * 10;
  $("#hud-piu").textContent = v > 0 ? "±" + piu.toLocaleString("it-IT") + " €" : "si parte da qui";
  $("#hud-barra-fill").style.width = (v > 0 ? Math.min(100, perc) : 0) + "%";
  if (mostrato < 0) {
    $("#hud-cifra").textContent = Math.round(v).toLocaleString("it-IT") + " €";
  } else if (Math.round(v) !== Math.round(mostrato)) {
    if (v > mostrato) monete(Math.min(4, 1 + Math.round(quota * 3)));
    scatta(mostrato, v);
  }
  mostrato = v;
  /* MONDO x-y: x fisso 1, y = passo corrente */
  $("#hud-mondo").textContent = p.risultato ? "COURSE CLEAR" : "MONDO 1-" + (p.n + 1);
  /* finché si risponde, quello NON è il prezzo del viaggio: è quanto se ne
     conosce finora. Dirlo evita che qualcuno legga 2.700 alla terza domanda
     e pensi che il viaggio costi 2.700. */
  var par = $("#hud-parziale");
  if (par) par.hidden = !!p.risultato;
}

/* le monetine che saltano su dal contatore quando la cifra cresce */
function monete(n) {
  var casa = $("#hud .hud-costo");
  if (!casa) return;
  for (var i = 0; i < n; i++) (function (i) {
    setTimeout(function () {
      var m = document.createElement("img");
      m.src = im("arcade-moneta" + (1 + i % 2) + ".png");
      m.className = "hud-moneta-vola";
      m.style.left = (8 + Math.random() * 40) + "px";
      m.width = 18; m.height = 18; m.alt = "";
      casa.appendChild(m);
      setTimeout(function () { m.remove(); }, 650);
    }, i * 90);
  })(i);
}

/* si ricalcola dopo ogni gesto sul questionario, con un respiro di 180 ms */
function pianificaAggiornamento() {
  if (timerCalcolo) clearTimeout(timerCalcolo);
  timerCalcolo = setTimeout(aggiorna, 180);
}
["click", "change", "input"].forEach(function (ev) {
  document.addEventListener(ev, function (e) {
    if (e.target.closest && (e.target.closest("#wizard") || e.target.closest("#risultato") ||
        e.target.closest("#pv-tema"))) pianificaAggiornamento();
  }, true);
});

/* =========================== IL CONTEGGIO DI FINE LIVELLO ================ */
/* Chiamato da app.js quando si apre il risultato: le voci scorrono una per
   una col loro blip e il totale sale. Saltabile con un clic. */
window.PV_FINE_LIVELLO = function (r, stile) {
  if (!attivo()) return;
  var liv = r.livelli[stile];
  var ordine = [["volo", "VOLO"], ["alloggio", "ALLOGGIO"], ["cibo", "CIBO"],
                ["extra", "EXTRA"], ["attivita", "INGRESSI"], ["imprevisti", "IMPREVISTI"],
                ["trasporti", "TRASPORTI"]];
  var vel = document.createElement("div");
  vel.id = "fine-livello";
  vel.innerHTML = '<div class="fl-box"><div class="fl-titolo">COURSE CLEAR!</div>' +
    '<div class="fl-voci"></div>' +
    '<div class="fl-tot">TOTALE <b id="fl-tot">0 €</b> <span>a persona</span></div>' +
    '<div class="fl-skip">clic per saltare</div></div>';
  document.body.appendChild(vel);
  if (window.SUONI) SUONI.fai("fanfara");
  var box = vel.querySelector(".fl-voci");
  var tot = 0, i = 0, vivo = true;
  function chiudi() {
    if (!vivo) return; vivo = false;
    vel.classList.add("via");
    setTimeout(function () { vel.remove(); }, 250);
  }
  vel.onclick = chiudi;
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape" || e.key === " ") { chiudi(); document.removeEventListener("keydown", esc); }
  });
  (function voce() {
    if (!vivo) return;
    if (i >= ordine.length) { setTimeout(chiudi, 1400); return; }
    var k = ordine[i][0], v = Math.round(liv.voci[k] || 0);
    tot += v;
    var riga = document.createElement("div");
    riga.innerHTML = "<span>" + ordine[i][1] + "</span><b>" +
      v.toLocaleString("it-IT") + " €</b>";
    box.appendChild(riga);
    $("#fl-tot").textContent = tot.toLocaleString("it-IT") + " €";
    if (window.SUONI) SUONI.fai("coin");
    i++;
    setTimeout(voce, 260);
  })();
};

/* ============================== TASTIERA ================================= */
/* Frecce nella griglia degli interessi (e in ogni .carte), barra = click.
   È il cursore che scatta: il salto secco È l'effetto, via :focus-visible. */
document.addEventListener("keydown", function (e) {
  var el = document.activeElement;
  if (!el || !el.classList || !el.classList.contains("carta")) return;
  var griglia = el.parentElement;
  var carte = Array.prototype.slice.call(griglia.querySelectorAll(".carta"));
  var i = carte.indexOf(el);
  if (i < 0) return;
  var percRiga = Math.max(1, Math.round(griglia.offsetWidth / el.offsetWidth));
  var vai = -1;
  if (e.key === "ArrowRight") vai = i + 1;
  else if (e.key === "ArrowLeft") vai = i - 1;
  else if (e.key === "ArrowDown") vai = i + percRiga;
  else if (e.key === "ArrowUp") vai = i - percRiga;
  else if (e.key === " " || e.key === "Enter") { e.preventDefault(); el.click(); if (window.SUONI) SUONI.fai("ok"); return; }
  else return;
  if (vai >= 0 && vai < carte.length) {
    e.preventDefault();
    carte[vai].setAttribute("tabindex", "0");
    carte[vai].focus();
    if (window.SUONI) SUONI.fai("blip");
  }
});

/* i blip sui click delle carte e dei bottoni, solo in tema arcade */
document.addEventListener("click", function (e) {
  if (!attivo() || !window.SUONI) return;
  if (e.target.closest && e.target.closest(".carta")) SUONI.fai("ok");
  else if (e.target.closest && e.target.closest("button")) SUONI.fai("blip");
}, true);

/* primo disegno (dopo che app.js ha montato tutto) */
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", function () { setTimeout(aggiorna, 50); });
else setTimeout(aggiorna, 50);

window.PV_HUD_AGGIORNA = aggiorna;
})();
