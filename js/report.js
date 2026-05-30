// ================================================================
//  Report Trend — renderer dei risultati del Trend Analysis Agent
//  Legge data/trend_analysis.json (pubblicato dall'agente a ogni run)
// ================================================================

const DATA_URL = 'data/trend_analysis.json';

// ── helpers ─────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function arrow(d) { return d === 'up' ? '↑' : d === 'down' ? '↓' : '→'; }
function deltaCls(d) { return d === 'up' ? 'd-up' : d === 'down' ? 'd-down' : 'd-flat'; }
function badgeCat(c) {
  return { 'Sociale/Culturale': 'b-social', 'Estetica/Visiva': 'b-estetica',
           'Gaming/Retro': 'b-gaming', 'Cinema/J-Horror': 'b-horror' }[c] || 'b-social';
}
function urgCls(u) { return { Alta: 'b-urg-alta', Media: 'b-urg-media', Bassa: 'b-urg-bassa' }[u] || 'b-urg-media'; }
function radarCls(u) { return { Caldo: 'b-urg-alta', Tiepido: 'b-urg-media', Freddo: 'b-urg-bassa' }[u] || 'b-urg-media'; }
function gapCls(g) { return { Alto: 'gap-alto', Medio: 'gap-medio', Basso: 'gap-basso' }[g] || 'gap-basso'; }
function cleanKw(k) { return esc(String(k || '').replace(/\s*giappone OR japan\s*$/i, '').trim()); }

// ── demand bars ─────────────────────────────────────────────────
function demandCol(label, dotCls, fillCls, items) {
  const rows = (items || []).map(i => {
    const w = Math.min(i.volume || 0, 100);
    return `<div class="r-row">
      <span class="r-row-kw" title="${cleanKw(i.keyword)}">${cleanKw(i.keyword)}</span>
      <span class="r-row-bar"><span class="r-row-fill ${fillCls}" style="width:${w}%"></span></span>
      <span class="r-row-vol">${i.volume ?? 0}</span>
      <span class="r-row-delta ${deltaCls(i.delta)}">${arrow(i.delta)}</span>
    </div>`;
  }).join('') || '<div class="r-row"><span class="r-row-kw" style="color:var(--gray-400)">nessun dato</span></div>';
  return `<div class="r-demand-col">
    <div class="r-demand-hd"><span class="r-dot ${dotCls}"></span>${esc(label)}</div>${rows}
  </div>`;
}

// ── card: mercato IT ────────────────────────────────────────────
function score(val, lbl, delta) {
  return `<div class="r-score">
    <div class="r-score-val">${val ?? '—'}</div>
    <div class="r-score-lbl">${esc(lbl)}</div>
    <div class="r-score-delta ${deltaCls(delta)}">${arrow(delta)}</div>
  </div>`;
}
function linkList(items) {
  return (items || []).map(e =>
    `<a class="r-link" href="${esc(e.url || '#')}" target="_blank" rel="noopener">${esc(e.titolo || '')}</a>`
  ).join('');
}
function cardIT(t) {
  const atti = (t.struttura_atti || []).map(a => `<div class="r-atto">${esc(a)}</div>`).join('');
  const esEN = linkList(t.esempi_EN), esJP = linkList(t.esempi_JP);
  return `<div class="r-card">
    <div class="r-card-hd">
      <div class="r-card-titleblock">
        <div class="r-badges">
          <span class="r-badge ${badgeCat(t.category)}">${esc(t.category)}</span>
          <span class="r-badge ${urgCls(t.urgency)}">Urgenza ${esc(t.urgency)}</span>
          <span class="r-gap ${gapCls(t.gap_IT_EN)}">Gap IT-EN: ${esc(t.gap_IT_EN)}</span>
        </div>
        <div class="r-card-name">${esc(t.title)}</div>
        ${t.thumbnail_hook ? `<div class="r-hook">❝ ${esc(t.thumbnail_hook)} ❞</div>` : ''}
      </div>
      <div class="r-scores">
        ${score(t.coerenza, 'Coerenza', t.delta_coerenza)}
        ${score(t.saturazione_IT, 'Sat. IT', t.delta_sat_IT)}
        ${score(t.saturazione_EN, 'Sat. EN', 'flat')}
      </div>
    </div>

    <div class="r-grid2">
      <div class="r-cell"><div class="r-sublabel">Coverage attuale in italiano</div><div class="r-celltext">${esc(t.coverage_IT) || '—'}</div></div>
      <div class="r-cell"><div class="r-sublabel">Opportunità per il canale</div><div class="r-celltext hl">${esc(t.opportunita_IT) || '—'}</div></div>
    </div>

    <div class="r-context">
      <div class="r-ctx-row"><span class="r-dot dot-en" style="margin-top:4px"></span><span class="r-ctx-lbl">EN</span>
        <div><div class="r-ctx-text">${esc(t.angolo_EN) || '—'}</div>${esEN ? `<div style="margin-top:.3rem">${esEN}</div>` : ''}</div></div>
      <div class="r-ctx-row"><span class="r-dot dot-jp" style="margin-top:4px"></span><span class="r-ctx-lbl">JP</span>
        <div><div class="r-ctx-text">${esc(t.segnale_JP) || '—'}</div>${esJP ? `<div style="margin-top:.3rem">${esJP}</div>` : ''}</div></div>
    </div>

    <div class="r-foot-grid">
      <div><div class="r-foot-lbl">Formato consigliato</div><div class="r-foot-val">${esc(t.formato_consigliato) || '—'}${t.motivazione_formato ? ' — ' + esc(t.motivazione_formato) : ''}</div></div>
      <div><div class="r-foot-lbl">Tempistica</div><div class="r-foot-val">${esc(t.timing) || '—'}</div></div>
      <div><div class="r-foot-lbl">Angolatura</div><div class="r-foot-val">${esc(t.angolatura) || '—'}</div></div>
    </div>

    ${atti ? `<div class="r-atti"><div class="r-sublabel">Struttura narrativa</div>${atti}</div>` : ''}

    <div class="r-titles">
      <div><b>Video:</b> ${esc(t.video_title) || '—'}</div>
      <div><b>Podcast:</b> ${esc(t.podcast_title) || '—'}</div>
    </div>
  </div>`;
}

// ── card: radar EN ──────────────────────────────────────────────
function cardEN(t) {
  return `<div class="r-card">
    <div class="r-card-hd">
      <div class="r-card-titleblock">
        <div class="r-badges">
          <span class="r-badge ${badgeCat(t.category)}">${esc(t.category)}</span>
          <span class="r-badge ${radarCls(t.urgency_radar)}">Radar ${esc(t.urgency_radar)}</span>
          <span class="r-gap ${gapCls(t.gap_IT)}">Gap IT: ${esc(t.gap_IT)}</span>
        </div>
        <div class="r-card-name">${esc(t.title)}</div>
      </div>
      <div class="r-scores">
        ${score(t.volume_EN, 'Vol. EN', t.delta_EN)}
        ${score(t.volume_IT, 'Vol. IT', 'flat')}
      </div>
    </div>
    <div class="r-card-body">
      <strong>Perché monitorarlo:</strong> ${esc(t.perche_monitorarlo) || '—'}<br><br>
      <strong>Connessione col canale:</strong> ${esc(t.connessione_canale) || '—'}
    </div>
  </div>`;
}

// ── card: segnali JP ────────────────────────────────────────────
function cardJP(t) {
  const es = linkList(t.esempi_JP);
  return `<div class="r-card">
    <div class="r-card-hd">
      <div class="r-card-titleblock">
        <div class="r-badges">
          <span class="r-badge ${badgeCat(t.category)}">${esc(t.category)}</span>
          <span class="r-badge ${urgCls(t.rilevanza)}">Rilevanza ${esc(t.rilevanza)}</span>
        </div>
        <div class="r-card-name">${esc(t.title)}</div>
      </div>
      <div class="r-scores">${score(t.volume_JP, 'Vol. JP', t.delta_JP)}</div>
    </div>
    <div class="r-card-body">
      <strong>Segnale nativo:</strong> ${esc(t.segnale) || '—'}<br><br>
      <strong>Utilità per il canale:</strong> ${esc(t.utilita_canale) || '—'}
      ${es ? `<div style="margin-top:.5rem">${es}</div>` : ''}
    </div>
  </div>`;
}

// ── render principale ───────────────────────────────────────────
function render(data) {
  const demand = data.demand || {};
  const warnings = data.warnings || [];
  const trendsBlocked = !(demand.IT || []).length && !(demand.EN || []).length && !(demand.JP || []).length;

  let html = `<div class="r-hero">
    <div class="r-hero-label">Dipartimento Trend Analysis</div>
    <div class="r-hero-title">Report Trend — Mercato editoriale</div>
  </div>
  <div class="r-summary">${esc(data.summary) || 'Nessuna sintesi disponibile.'}</div>
  <div class="r-method">ℹ︎ <strong>Coerenza, Saturazione e Gap sono stime editoriali dell'AI</strong> (valutazione qualitativa, non misure). I volumi di <em>domanda</em> sono <strong>misurati</strong> dalla view-velocity dei video YouTube.</div>`;

  if (trendsBlocked) {
    html += `<div class="r-alert r-alert-strong">
      <div class="r-alert-title">⚠ Domanda non disponibile</div>
      <div class="r-alert-item">Nessun segnale di domanda raccolto in questo run. Il report si basa solo sull'analisi qualitativa.</div>
    </div>`;
  } else if (warnings.length) {
    html += `<div class="r-alert r-alert-warn">
      <div class="r-alert-title">Attenzione — qualità dati</div>
      ${warnings.map(w => `<div class="r-alert-item">⚠ ${esc(w)}</div>`).join('')}
    </div>`;
  }

  // Domanda
  html += `<div class="r-sec">
    <p class="r-sublabel">Domanda per query — view-velocity YouTube (0-100, misurata)</p>
    <div class="r-demand-grid">
      ${demandCol('Italia', 'dot-it', 'fill-it', demand.IT)}
      ${demandCol('Anglofono', 'dot-en', 'fill-en', demand.EN)}
      ${demandCol('Giappone', 'dot-jp', 'fill-jp', demand.JP)}
    </div>
  </div>`;

  // Mercato IT
  html += `<div class="r-sec">
    <div class="r-sec-head"><span class="r-dot dot-it"></span>
      <span class="r-sec-title">Mercato Italia — Top ${(data.trends_IT || []).length} trend</span>
      <span class="r-sec-sub">Priorità editoriale</span></div>
    ${(data.trends_IT || []).map(cardIT).join('') || '<p class="r-celltext">Nessun trend.</p>'}
  </div>`;

  // Radar EN
  html += `<div class="r-sec">
    <div class="r-sec-head"><span class="r-dot dot-en"></span>
      <span class="r-sec-title">Mercato Anglofono — ${(data.trends_EN || []).length} radar</span>
      <span class="r-sec-sub">Segnali in anticipo sull'Italia</span></div>
    ${(data.trends_EN || []).map(cardEN).join('') || '<p class="r-celltext">Nessun segnale.</p>'}
  </div>`;

  // Segnali JP
  html += `<div class="r-sec">
    <div class="r-sec-head"><span class="r-dot dot-jp"></span>
      <span class="r-sec-title">Mercato Giappone — ${(data.trends_JP || []).length} segnali nativi</span>
      <span class="r-sec-sub">Fenomeni di origine, non benchmark</span></div>
    ${(data.trends_JP || []).map(cardJP).join('') || '<p class="r-celltext">Nessun segnale.</p>'}
  </div>`;

  // Watchlist
  const watch = data.monitor_next_week || [];
  if (watch.length) {
    html += `<div class="r-sec">
      <p class="r-sublabel">Da monitorare la prossima settimana</p>
      <div class="r-watch">${watch.map(w =>
        `<div class="r-watch-item"><span class="r-watch-dot"></span>${esc(w)}</div>`).join('')}</div>
    </div>`;
  }

  document.getElementById('reportContent').innerHTML = html;
}

// ── load ────────────────────────────────────────────────────────
async function load(force = false) {
  const loading = document.getElementById('loadingState');
  const error = document.getElementById('errorState');
  const content = document.getElementById('reportContent');
  const icon = document.getElementById('btnRefresh');
  loading.classList.remove('hidden'); error.classList.add('hidden'); content.classList.add('hidden');
  icon.classList.add('spinning');
  try {
    const res = await fetch(DATA_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    document.getElementById('genAt').textContent = 'Generato il ' + (data.generated_at || '—');
    render(data);
    loading.classList.add('hidden'); content.classList.remove('hidden');
  } catch (e) {
    loading.classList.add('hidden'); error.classList.remove('hidden');
  }
  icon.classList.remove('spinning');
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  document.getElementById('btnRefresh').addEventListener('click', () => load(true));
});
