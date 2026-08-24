/* =========================================================================
   IL PDF — un documento suo, non la stampa della pagina.

   Prima si faceva window.print(): usciva lo schermo schiacciato su A4, con le
   colonne a caso, le tabelle spezzate e i colori impastati. Qui invece si
   costruisce un DOCUMENTO: copertina, il numero grande, le voci, le giornate,
   le leve. Impaginato per la carta, in bianco e nero leggibile, con i salti
   pagina messi dove servono.

   Come funziona: si scrive in un iframe fuori schermo un HTML pensato SOLO per
   la stampa, e si stampa quello. Nessuna libreria, nessun megabyte di jsPDF:
   il motore PDF del browser fa un lavoro migliore, se gli si dà da impaginare
   un documento vero invece di una pagina web.
   ========================================================================= */
window.PDF = (function () {
"use strict";

var STILE = `
  @page { size: A4; margin: 16mm 15mm 18mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin:0; font:10.5pt/1.5 "Inter",-apple-system,Helvetica,Arial,sans-serif; color:#14181D; }
  h1,h2,h3 { margin:0; font-weight:700; letter-spacing:-.01em; }

  /* ---- copertina ---- */
  .cop { border-bottom:3px solid #B52D20; padding-bottom:10mm; margin-bottom:8mm; }
  .cop .occhiello { font-size:8pt; letter-spacing:.18em; text-transform:uppercase; color:#B52D20; font-weight:700; }
  .cop h1 { font-size:26pt; line-height:1.08; margin:3mm 0 2mm; }
  .cop .sotto { font-size:11pt; color:#4A5460; }
  .cop .quando { font-size:8.5pt; color:#79838F; margin-top:4mm; }

  /* ---- il numero, che è il motivo per cui uno stampa ---- */
  .cifrone { display:flex; align-items:baseline; gap:6mm; margin:0 0 3mm; }
  .cifrone .v { font-size:40pt; font-weight:800; line-height:1; letter-spacing:-.03em; }
  .cifrone .u { font-size:10pt; color:#4A5460; }
  .tre { display:flex; gap:4mm; margin:5mm 0 9mm; }
  .tre .f { flex:1; border:1pt solid #D7DCE2; border-radius:2mm; padding:4mm; }
  .tre .f.on { border:2pt solid #B52D20; background:#FCF4F3; }
  .tre .f .n { font-size:7.5pt; letter-spacing:.12em; text-transform:uppercase; color:#79838F; font-weight:700; }
  .tre .f .p { font-size:17pt; font-weight:700; margin-top:1.5mm; }
  .tre .f .g { font-size:8pt; color:#4A5460; margin-top:1mm; }

  h2 { font-size:13pt; margin:8mm 0 3mm; padding-bottom:2mm; border-bottom:1pt solid #D7DCE2; }
  h2:first-of-type { margin-top:0; }
  p { margin:0 0 2.5mm; }
  .nota { font-size:8.5pt; color:#4A5460; }

  table { width:100%; border-collapse:collapse; font-size:9pt; }
  th { text-align:left; font-size:7.5pt; letter-spacing:.1em; text-transform:uppercase;
       color:#79838F; border-bottom:1pt solid #14181D; padding:0 2mm 1.5mm 0; }
  td { padding:1.8mm 2mm 1.8mm 0; border-bottom:.5pt solid #E4E8EC; vertical-align:top; }
  td.n, th.n { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
  tr.tot td { border-top:1.5pt solid #14181D; border-bottom:none; font-weight:700; padding-top:2.5mm; }
  .marca { font-size:7pt; letter-spacing:.06em; text-transform:uppercase; border:.5pt solid currentColor;
           border-radius:1mm; padding:0 1mm; white-space:nowrap; }
  .marca.v { color:#1F6B44; }
  .marca.s { color:#79838F; }

  .giorni { column-count:2; column-gap:8mm; }
  .g { break-inside:avoid; margin-bottom:3mm; }
  .g .t { font-size:8pt; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#B52D20; }
  .g ul { margin:1mm 0 0; padding-left:4mm; font-size:9pt; }
  .g li { margin-bottom:.8mm; }
  .g .tr { font-size:8pt; color:#4A5460; font-style:italic; }

  .leve { font-size:9pt; }
  .leva { display:flex; justify-content:space-between; gap:4mm; padding:1.8mm 0; border-bottom:.5pt solid #E4E8EC; break-inside:avoid; }
  .leva .d { font-weight:700; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .giu { color:#1F6B44; } .su { color:#B52D20; }

  .mappa { float:right; margin:0 0 4mm 6mm; }
  .mappa img { width:86mm; height:auto; border:.5pt solid #D7DCE2; border-radius:2mm; }
  .fine { margin-top:8mm; padding-top:4mm; border-top:1pt solid #D7DCE2; font-size:8pt; color:#79838F; }
  .pagina2 { break-before:page; }
`;

function euro(n) { return Math.round(n).toLocaleString("it-IT") + " €"; }

/* Tutto quello che entra nel documento passa da qui. Nel preventivo finiscono
   nomi di alberghi e di compagnie RASCHIATI da Google: oggi ce ne sono tre con
   una & dentro, e basta un nome con un < per rompere la pagina o peggio.
   Il PDF costruisce HTML, quindi ripulisce come farebbe qualunque altra vista. */
function esc(t) {
  return String(t == null ? "" : t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* Costruisce il documento. Riceve tutto pronto da app.js: il PDF non ricalcola
   niente, altrimenti carta e schermo potrebbero dire numeri diversi. */
function componi(d) {
  var h = [];
  h.push('<div class="cop"><div class="occhiello">Tokyo Budget Lab · Giappone nel Mondo</div>' +
    "<h1>" + esc(d.titolo) + "</h1>" +
    '<div class="sotto">' + esc(d.sottotitolo) + "</div>" +
    '<div class="quando">' + esc(d.quando) + "</div></div>");

  h.push('<div class="cifrone"><div class="v">' + euro(d.perPersona) + '</div>' +
    '<div class="u">a persona · ' + euro(d.alGiorno) + " al giorno<br>" +
    "gruppo di " + d.persone + ": <b>" + euro(d.gruppo) + "</b></div></div>");

  h.push('<div class="tre">' + d.fasce.map(function (f) {
    return '<div class="f' + (f.scelta ? " on" : "") + '"><div class="n">' + esc(f.nome) + "</div>" +
      '<div class="p">' + euro(f.perPersona) + '</div><div class="g">gruppo ' + euro(f.gruppo) + "</div></div>";
  }).join("") + "</div>");

  h.push("<h2>Com'è fatto questo numero</h2><table><tr><th>Voce</th><th class=n>a persona</th>" +
    "<th class=n>gruppo</th><th>da dove viene</th></tr>" +
    d.voci.map(function (v) {
      return "<tr><td>" + esc(v.nome) + (v.reale ? ' <span class="marca v">reale</span>'
                                            : ' <span class="marca s">stima</span>') +
        "</td><td class=n>" + euro(v.pp) + "</td><td class=n>" + euro(v.gr) + "</td><td>" + esc(v.come) + "</td></tr>";
    }).join("") +
    '<tr class="tot"><td>Totale</td><td class=n>' + euro(d.perPersona) + "</td><td class=n>" +
    euro(d.gruppo) + "</td><td></td></tr></table>");

  h.push("<h2>Cosa sposta il prezzo</h2><div class=leve>" + d.leve.map(function (l) {
    return '<div class="leva"><span>' + esc(l.etichetta) + "</span>" +
      '<span class="d ' + (l.delta < 0 ? "giu" : "su") + '">' +
      (l.delta > 0 ? "+" : "−") + euro(Math.abs(l.delta)) + "</span></div>";
  }).join("") + "</div>");

  h.push('<div class="pagina2"></div><h2>Giorno per giorno</h2>');
  /* la mappa è un data: URI generato da noi; si controlla lo schema
     comunque, perché un src arbitrario è un buco classico */
  if (d.mappa && /^data:image\/(png|jpeg);base64,/.test(d.mappa))
    h.push('<div class="mappa"><img src="' + d.mappa + '" alt=""></div>');
  h.push('<div class="giorni">' + d.giorni.map(function (g) {
    return '<div class="g"><div class="t">' + esc(g.titolo) + "</div>" +
      (g.trasferimento ? '<div class="tr">' + esc(g.trasferimento) + "</div>" : "") +
      (g.cose.length ? "<ul>" + g.cose.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ul>" : "") +
      "</div>";
  }).join("") + "</div>");

  h.push('<div class="fine">' + esc(d.onesta) + "</div>");
  return h.join("");
}

/* La stampa in un iframe a parte: la pagina vera non viene toccata, e il PDF
   non eredita nessuna regola dello schermo. */
function stampa(d) {
  var vecchio = document.getElementById("pv-stampa");
  if (vecchio) vecchio.remove();
  var f = document.createElement("iframe");
  f.id = "pv-stampa";
  f.setAttribute("aria-hidden", "true");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(f);
  var doc = f.contentDocument;
  doc.open();
  doc.write('<!doctype html><html lang="it"><head><meta charset="utf-8">' +
    "<title>" + esc(d.titolo) + "</title>" +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap">' +
    "<style>" + STILE + "</style></head><body>" + componi(d) + "</body></html>");
  doc.close();
  /* si aspetta che i font e l'immagine della mappa siano davvero pronti,
     altrimenti la prima stampa esce con Times New Roman e senza mappa */
  var vai = function () {
    setTimeout(function () { f.contentWindow.focus(); f.contentWindow.print(); }, 350);
  };
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(vai); else f.onload = vai;
}

/* STILE esportato: serve all'anteprima di collaudo e a chi vorrà
   rigenerare il documento altrove. */
return { stampa: stampa, componi: componi, STILE: STILE };
})();
