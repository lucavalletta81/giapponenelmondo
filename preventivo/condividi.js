/* =========================================================================
   CONDIVIDI — il link che riapre lo stesso preventivo, e l'immagine da
   mandare in giro (28/09/2026).

   Due regole, cablate qui e non affidate al buon senso:
   1. Il link porta le RISPOSTE, non i prezzi. Chi lo apre fra un mese rifà il
      conto col listino di quel giorno: un numero vecchio non gira mai
      spacciato per nuovo.
   2. L'immagine non mostra mai una fascia sola. Sempre tre cifre, il margine,
      la data dei prezzi. Un numero secco è esattamente quello che il servizio
      dice di non voler dare.

   Niente server: il link è un frammento dell'indirizzo (#g=...), che il
   browser non manda a nessuno. L'immagine la disegna un canvas.
   ========================================================================= */
window.PV_CONDIVIDI = (function () {
"use strict";

/* le chiavi corte del link: solo quello che il questionario chiede */
var CAMPI = [["p", "partenza"], ["s", "stagione"], ["g", "giorni"], ["r", "ritmo"], ["t", "stile"],
             ["a", "adulti"], ["b", "bambini"], ["i", "interessi"], ["n", "anime"],
             ["v", "giaVisti"], ["f", "primaVolta"], ["z", "zona"], ["m", "rami"]];
var VERSIONE = 1;

function b64(s) {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function da64(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return decodeURIComponent(escape(atob(s)));
}

function codice(S) {
  var o = { k: VERSIONE };
  CAMPI.forEach(function (c) { o[c[0]] = S[c[1]]; });
  return b64(JSON.stringify(o));
}
function link(S) {
  return location.origin + location.pathname + "#g=" + codice(S);
}

/* Legge il frammento. Tutto quello che arriva da fuori viene ristretto ai
   valori che il catalogo conosce: un link scritto a mano non deve poter
   mettere nello stato niente che il questionario non avrebbe accettato. */
function leggi() {
  var m = /[#&]g=([A-Za-z0-9_-]+)/.exec(location.hash || "");
  if (!m) return null;
  var o;
  try { o = JSON.parse(da64(m[1])); } catch (e) { return null; }
  if (!o || typeof o !== "object") return null;
  var D = window.DATI, out = {};
  function uno(v, lista) { return lista.indexOf(v) !== -1 ? v : null; }
  function tanti(v, lista) {
    return Array.isArray(v) ? v.filter(function (x) { return lista.indexOf(x) !== -1; }) : [];
  }
  function intero(v, min, max, def) {
    v = Math.round(+v);
    return isNaN(v) ? def : Math.min(max, Math.max(min, v));
  }
  var ids = function (arr) { return arr.map(function (x) { return x.id; }); };
  var rami = [];
  D.interessi.forEach(function (i) { (i.rami || []).forEach(function (r) { rami.push(r.id); }); });

  out.partenza = uno(o.p, ids(D.partenze)) || "fco";
  out.stagione = uno(o.s, ids(D.stagioni)) || "ott";
  out.giorni = intero(o.g, 5, 30, 14);
  out.ritmo = uno(o.r, ["lento", "medio", "veloce"]) || "medio";
  out.stile = uno(o.t, ["essenziale", "equilibrato", "comodo"]) || "equilibrato";
  out.adulti = intero(o.a, 1, 10, 2);
  out.bambini = intero(o.b, 0, 8, 0);
  out.interessi = tanti(o.i, ids(D.interessi));
  out.anime = tanti(o.n, ids(D.anime));
  out.giaVisti = tanti(o.v, ids(D.citta));
  out.primaVolta = o.f !== false;
  out.zona = uno(o.z, ids(window.MOTORE.zoneDisponibili())) || null;
  out.rami = tanti(o.m, rami);
  if (out.interessi.length < 2) return null;      /* la regola del passo 1 vale anche qui */
  return out;
}

/* ------------------------------------------------------ l'immagine ------ */
var INK = "#1E2A47", FONDO = "#FBEFD2", CARTA = "#FFF9E8", ROSSO = "#E0392B",
    GIALLO = "#F7C948", SCELTA = "#FDE3B0", MUTO = "#3B4563";

function aCapo(x, testo, largo) {
  var parole = testo.split(" "), righe = [], riga = "";
  parole.forEach(function (p) {
    var prova = riga ? riga + " " + p : p;
    if (x.measureText(prova).width > largo && riga) { righe.push(riga); riga = p; }
    else riga = prova;
  });
  if (riga) righe.push(riga);
  return righe;
}

function scatola(x, px, py, w, h, fondo, bordo, tratteggio) {
  x.fillStyle = INK; x.fillRect(px + 10, py + 10, w, h);           /* l'ombra dura */
  x.fillStyle = fondo; x.fillRect(px, py, w, h);
  x.lineWidth = 8; x.strokeStyle = bordo;
  x.setLineDash(tratteggio ? [22, 14] : []);
  x.strokeRect(px + 4, py + 4, w - 8, h - 8);
  x.setLineDash([]);
}

/* d = { titolo, sotto, fasce:[{nome,cifra,scelta}], margine, percVero, data, vecchio, indirizzo } */
function disegna(d) {
  var W = 1080, H = 1350, M = 64;
  var c = document.createElement("canvas");
  c.width = W; c.height = H;
  var x = c.getContext("2d");
  var PX = "'Press Start 2P', monospace", TX = "'Zen Maru Gothic', 'Inter', sans-serif";

  x.fillStyle = FONDO; x.fillRect(0, 0, W, H);
  x.strokeStyle = "rgba(30,42,71,.06)"; x.lineWidth = 2;
  for (var g = 0; g <= W; g += 24) { x.beginPath(); x.moveTo(g, 0); x.lineTo(g, H); x.stroke(); }
  for (var g2 = 0; g2 <= H; g2 += 24) { x.beginPath(); x.moveTo(0, g2); x.lineTo(W, g2); x.stroke(); }
  x.lineWidth = 12; x.strokeStyle = INK; x.strokeRect(6, 6, W - 12, H - 12);

  x.textBaseline = "top";
  x.fillStyle = ROSSO; x.font = "40px " + PX; x.fillText("GIAPPONEMETRO", M, 70);
  x.fillStyle = INK; x.font = "700 46px " + TX; x.fillText(d.titolo, M, 150);
  x.fillStyle = MUTO; x.font = "500 32px " + TX;
  var yy = 214;
  aCapo(x, d.sotto, W - M * 2).slice(0, 2).forEach(function (r) { x.fillText(r, M, yy); yy += 44; });

  var y = 330;
  d.fasce.forEach(function (f) {
    var alto = f.scelta ? 250 : 150;
    scatola(x, M, y, W - M * 2, alto, f.scelta ? SCELTA : CARTA, f.scelta ? ROSSO : INK, d.vecchio);
    x.fillStyle = INK; x.font = "24px " + PX; x.textAlign = "left";
    x.fillText(f.nome.toUpperCase(), M + 36, y + 62);
    x.font = (f.scelta ? "58px " : "42px ") + PX; x.textAlign = "right";
    x.fillText((d.vecchio ? "~" : "") + f.cifra, W - M - 36, y + (f.scelta ? 40 : 52));
    x.textAlign = "left";
    if (f.scelta) {
      x.font = "24px " + PX; x.fillStyle = INK;
      x.fillText("± " + d.margine + " a persona", M + 36, y + 132);
      var bx = M + 36, by = y + 182, bw = W - M * 2 - 72, bh = 30;
      x.fillStyle = CARTA; x.fillRect(bx, by, bw, bh);
      x.fillStyle = INK; x.fillRect(bx, by, bw * d.percVero / 100, bh);
      x.fillStyle = GIALLO;
      for (var k = bx + bw * d.percVero / 100; k < bx + bw; k += 24) x.fillRect(k + 8, by, 10, bh);
      x.lineWidth = 5; x.strokeStyle = INK; x.strokeRect(bx, by, bw, bh);
    }
    y += alto + 34;
  });

  x.fillStyle = INK; x.font = "700 32px " + TX;
  x.fillText(d.vecchio ? "prezzi non aggiornati: vale come struttura del costo"
                       : d.percVero + "% da prezzi verificati · " + (100 - d.percVero) + "% stima", M, y + 6);
  x.fillStyle = MUTO; x.font = "500 30px " + TX;
  x.fillText("a persona · prezzi letti il " + d.data, M, y + 58);

  x.fillStyle = INK; x.fillRect(0, H - 150, W, 150);
  x.fillStyle = CARTA; x.font = "700 34px " + TX;
  x.fillText("I prezzi cambiano: rifai il conto.", M, H - 120);
  x.fillStyle = GIALLO; x.font = "22px " + PX;
  x.fillText(d.indirizzo, M, H - 62);
  return c;
}

function immagine(d) {
  var pronti = (document.fonts && document.fonts.load)
    ? Promise.all([document.fonts.load("40px 'Press Start 2P'"),
                   document.fonts.load("700 40px 'Zen Maru Gothic'"),
                   document.fonts.load("500 40px 'Zen Maru Gothic'")]).catch(function () {})
    : Promise.resolve();
  return pronti.then(function () {
    var c = disegna(d);
    return new Promise(function (ok) { c.toBlob(function (b) { ok(b); }, "image/png"); });
  });
}

/* prova la condivisione di sistema (telefono); se non c'è, scarica il file */
function consegna(blob, testo, url) {
  var nome = "giapponemetro.png";
  var file;
  try { file = new File([blob], nome, { type: "image/png" }); } catch (e) { file = null; }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    return navigator.share({ files: [file], text: testo, url: url })
      .then(function () { return "condivisa"; })
      .catch(function (e) { return e && e.name === "AbortError" ? "annullata" : scarica(blob, nome); });
  }
  return Promise.resolve(scarica(blob, nome));
}
function scarica(blob, nome) {
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  return "scaricata";
}

function copia(testo) {
  if (navigator.clipboard && navigator.clipboard.writeText)
    return navigator.clipboard.writeText(testo).then(function () { return true; },
                                                    function () { return copiaVecchia(testo); });
  return Promise.resolve(copiaVecchia(testo));
}
function copiaVecchia(testo) {
  var t = document.createElement("textarea");
  t.value = testo; t.setAttribute("readonly", "");
  t.style.position = "fixed"; t.style.opacity = "0";
  document.body.appendChild(t); t.select();
  var ok = false;
  try { ok = document.execCommand("copy"); } catch (e) {}
  t.remove();
  return ok;
}

return { codice: codice, link: link, leggi: leggi, immagine: immagine,
         consegna: consegna, copia: copia, disegna: disegna };
})();
