// ================================================================
// FEEDS RSS
// ================================================================
const FEEDS = [
  { url: 'https://anchor.fm/s/ffef9fd4/podcast/rss', name: 'Giappone nel Mondo', category: 'japan', icon: '🎙' },
  { url: 'https://www3.nhk.or.jp/rss/news/cat0.xml', name: 'NHK (Giappone)', category: 'japan', icon: '📡' },
  { url: 'https://www.japantimes.co.jp/feed/', name: 'Japan Times', category: 'japan', icon: '🗾' },
  { url: 'https://feeds.feedburner.com/TrendHunter', name: 'Trend Hunter', category: 'trends', icon: '📈' },
  { url: 'https://soranews24.com/feed/', name: 'SoraNews24', category: 'trends', icon: '🎌' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', name: 'Ars Technica', category: 'tech', icon: '💻' },
  { url: 'https://www.wired.com/feed/rss', name: 'Wired', category: 'tech', icon: '⚡' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World', category: 'world', icon: '🌍' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NY Times World', category: 'world', icon: '🗞' }
];

const RSS_API = 'https://api.rss2json.com/v1/api.json';
let allArticles = [];
let currentFilter = 'all';
let currentPanel = 'feed';
let trendChart = null;

// ================================================================
// NAVIGATION
// ================================================================
function setActiveBtn(btn) {
  document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function showAllPanels(show) {
  ['panel-feed','panel-trend-report','panel-task-monitor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById('panel-' + show);
  if (target) target.classList.remove('hidden');
}
function showFeed(filter, btn) {
  currentPanel = 'feed'; currentFilter = filter;
  if (btn) setActiveBtn(btn);
  showAllPanels('feed');
  document.getElementById('panelTitle').textContent = 'La tua rassegna stampa';
  if (allArticles.length) renderArticles(filter); else loadAllFeeds();
}
function showPanel(name, btn) {
  currentPanel = name;
  if (btn) setActiveBtn(btn);
  showAllPanels(name);
  if (name === 'trend-report') {
    document.getElementById('panelTitle').textContent = 'Cluster YouTube — Trend Discovery';
    loadTrendReport();
  } else if (name === 'task-monitor') {
    document.getElementById('panelTitle').textContent = 'Stato pipeline';
    loadTaskMonitor();
  }
}
function refreshCurrent() {
  if (currentPanel === 'feed') loadAllFeeds();
  else if (currentPanel === 'trend-report') loadTrendReport(true);
  else if (currentPanel === 'task-monitor') loadTaskMonitor(true);
}

// ================================================================
// DATE & FORMATTERS
// ================================================================
function setDate() {
  const el = document.getElementById('dashDate');
  if (el) el.textContent = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}
function formatN(n) {
  if (!n) return '—';
  if (n >= 1000000) return (n/1000000).toFixed(1).replace('.0','') + 'M';
  if (n >= 1000)    return (n/1000).toFixed(0) + 'K';
  return n.toLocaleString('it-IT');
}
function formatDur(s) {
  if (!s) return '';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  if (h) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}
function pct(v) { return Math.round((v||0)*100); }

// ================================================================
// FEED RSS
// ================================================================
async function fetchFeed(feed) {
  try {
    // NB: il free tier di rss2json NON accetta più `count` (richiede API key) → niente count, taglio lato client.
    const res  = await fetch(`${RSS_API}?rss_url=${encodeURIComponent(feed.url)}`);
    const data = await res.json();
    if (data.status !== 'ok' || !data.items?.length) return [];
    return data.items.slice(0, 8).map(item => ({ ...item, sourceName: feed.name, sourceIcon: feed.icon, category: feed.category }));
  } catch { return []; }
}
async function loadAllFeeds() {
  const loading = document.getElementById('loadingState');
  const error   = document.getElementById('errorState');
  const grid    = document.getElementById('feedGrid');
  const icon    = document.getElementById('refreshIcon');
  loading.classList.remove('hidden'); error.classList.add('hidden');
  grid.classList.add('hidden'); icon.classList.add('spinning');
  try {
    const results = await Promise.allSettled(FEEDS.map(fetchFeed));
    allArticles = results.filter(r => r.status==='fulfilled').flatMap(r => r.value)
      .sort((a,b) => new Date(b.pubDate)-new Date(a.pubDate));
    if (!allArticles.length) throw new Error('no articles');
    renderArticles(currentFilter);
    loading.classList.add('hidden'); grid.classList.remove('hidden');
  } catch { loading.classList.add('hidden'); error.classList.remove('hidden'); }
  icon.classList.remove('spinning');
}
function renderArticles(filter) {
  const grid  = document.getElementById('feedGrid');
  const items = filter === 'all' ? allArticles : allArticles.filter(a => a.category === filter);
  if (!items.length) { grid.innerHTML = '<p style="grid-column:1/-1;color:var(--gray-400);padding:24px 0;">Nessun articolo trovato.</p>'; return; }
  grid.innerHTML = items.map(a => {
    const date  = a.pubDate ? new Date(a.pubDate).toLocaleDateString('it-IT',{day:'numeric',month:'short'}) : '';
    const imgEl = a.thumbnail?.startsWith('http')
      ? `<img class="article-img" src="${a.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none'" />`
      : `<div class="article-img-placeholder">${a.sourceIcon}</div>`;
    const desc  = a.description ? a.description.replace(/<[^>]*>/g,'').slice(0,160)+'…' : '';
    return `<article class="article-card">${imgEl}<div class="article-body">
      <div class="article-meta"><span class="article-source">${a.sourceName}</span>${date?`<span class="article-dot">·</span><span class="article-date">${date}</span>`:''}</div>
      <h3 class="article-title">${a.title}</h3>
      ${desc?`<p class="article-desc">${desc}</p>`:''}
      <a href="${a.link}" target="_blank" rel="noopener noreferrer" class="article-link">Leggi →</a>
    </div></article>`;
  }).join('');
}

// ================================================================
// TREND REPORT
// ================================================================
let trendReportCache = null;

const SECTION_META = {
  emergenti:    { emoji:'🔥', label:'Emergenti caldi',           color:'#f59e0b' },
  crescita:     { emoji:'📈', label:'In crescita costante',      color:'#22c55e' },
  cross_source: { emoji:'🌊', label:'Cross-source',              color:'#3b82f6' },
  affinita:     { emoji:'🎯', label:'Alta affinità col canale',  color:'#8b5cf6' },
  anomalie:     { emoji:'⚠️', label:'Anomalie',                  color:'#ef4444' },
  altri:        { emoji:'📌', label:'Altri trend',               color:'#9ca3af' },
};
const LANG_META = {
  it: { flag:'🇮🇹', label:'Italiano' },
  en: { flag:'🇬🇧', label:'Inglese' },
  ja: { flag:'🇯🇵', label:'Giapponese' },
};

async function loadTrendReport(force=false) {
  const loading = document.getElementById('trendLoading');
  const content = document.getElementById('trendContent');
  if (trendReportCache && !force) { renderTrendReport(trendReportCache); return; }
  loading.classList.remove('hidden'); content.classList.add('hidden');
  if (trendChart) { trendChart.destroy(); trendChart = null; }
  try {
    const res = await fetch('data/trend_report.json?t='+Date.now());
    if (!res.ok) throw new Error('not found');
    trendReportCache = await res.json();
    renderTrendReport(trendReportCache);
  } catch {
    loading.innerHTML = '<p style="color:var(--gray-400)">⚠️ Report non ancora disponibile. Verrà generato lunedì.</p>';
  }
}

function getAllClusters(data) {
  const seen = new Set(), all = [];
  ['emergenti','crescita','cross_source','affinita','anomalie','altri'].forEach(key => {
    (data.sections[key]||[]).forEach(cl => {
      const id = (cl.keywords||[]).join(',') || cl.label;
      if (!seen.has(id)) { seen.add(id); all.push({...cl, _section:key}); }
    });
  });
  return all.sort((a,b) => (b.score||0)-(a.score||0));
}

function renderChart(data) {
  const canvas = document.getElementById('clustersChart');
  if (!canvas || typeof Chart==='undefined') return;
  if (trendChart) { trendChart.destroy(); trendChart=null; }
  const all = getAllClusters(data).slice(0,10);
  if (!all.length) { canvas.closest('.chart-wrap').style.display='none'; return; }
  trendChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: all.map(c => (c.keywords||[]).slice(0,3).join(', ') || `Cluster ${c.label}`),
      datasets: [{
        data: all.map(c => c.score ? Math.round(c.score*100)/100 : 0),
        backgroundColor: all.map(c => (SECTION_META[c._section]||SECTION_META.altri).color+'cc'),
        borderColor:     all.map(c => (SECTION_META[c._section]||SECTION_META.altri).color),
        borderWidth:1, borderRadius:4,
      }]
    },
    options: {
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins: {
        legend: { display:false },
        tooltip: { callbacks: { label: ctx => ` Score: ${ctx.raw}  ·  ${formatN(all[ctx.dataIndex].total_views)} views` } }
      },
      scales: {
        x: { min:0, max:1, grid:{color:'#f3f4f6'}, ticks:{font:{size:11},color:'#9ca3af'} },
        y: { grid:{display:false}, ticks:{font:{size:11},color:'#374151'} }
      }
    }
  });
}

function renderTrendReport(data) {
  const loading = document.getElementById('trendLoading');
  const content = document.getElementById('trendContent');
  loading.classList.add('hidden');

  const totalClusters = data.total_clusters || 0;
  const totalVideos   = data.total_videos   || 0;
  const generatedAt   = data.generated_at   || '—';
  const dateStart     = data.date_range_start || '';
  const dateEnd       = data.date_range_end   || '';
  const dateRange     = dateStart ? `${dateStart} → ${dateEnd}` : '';

  // Summary KPI bar
  let html = `<div class="report-summary">
    <div class="summary-stat"><span class="summary-num">${totalClusters}</span><span class="summary-lbl">Cluster</span></div>
    <div class="summary-divider"></div>
    <div class="summary-stat"><span class="summary-num">${totalVideos}</span><span class="summary-lbl">Video analizzati</span></div>
    ${dateRange ? `<div class="summary-divider"></div><div class="summary-stat"><span class="summary-num" style="font-size:.8rem">${dateRange}</span><span class="summary-lbl">Finestra</span></div>` : ''}
    <div class="summary-divider"></div>
    <div class="summary-stat"><span class="summary-num" style="font-size:.8rem">${generatedAt}</span><span class="summary-lbl">Generato il</span></div>
  </div>
  <div class="chart-wrap"><canvas id="clustersChart"></canvas></div>`;

  const order = ['emergenti','crescita','cross_source','affinita','anomalie','altri'];
  order.forEach(key => {
    const clusters = (data.sections||{})[key]||[];
    if (!clusters.length) return;
    const {emoji,label} = SECTION_META[key]||{emoji:'•',label:key};
    html += `<div class="report-section"><h2 class="report-section-title">${emoji} ${label}</h2>`;
    clusters.forEach(cl => { html += renderCluster(cl, key==='affinita'); });
    html += '</div>';
  });

  content.innerHTML = html;
  content.classList.remove('hidden');
  renderChart(data);
}

function renderCluster(cl, showAffinity) {
  const kw    = (cl.keywords||[]).join(', ') || '—';
  const score = cl.score != null ? cl.score.toFixed(2) : '—';
  const bar   = cl.score != null ? Math.round(cl.score*100) : 0;
  const mover = cl.has_mover ? '<span class="tag tag-mover">⚡ mover</span>' : '';
  const catTags = (cl.sentinel_clusters||[]).map(s=>`<span class="tag">${s}</span>`).join('');

  // Metriche
  const vel  = cl.velocity  != null ? Math.round(cl.velocity *100)+'%' : '—';
  const nov  = cl.novelty   != null ? (cl.novelty>=1?'Nuovo':'Ricorrente') : '—';
  const aff  = cl.affinity_best_score ? (cl.affinity_best_score*100).toFixed(0)+'%' : '—';
  const vws  = formatN(cl.total_views);

  const affLine = showAffinity && cl.affinity_best_tipo !== '—'
    ? `<div class="cluster-affinity">🎯 Affinità <strong>${cl.affinity_best_tipo}</strong>: ${cl.affinity_best_score}</div>` : '';

  // Sezioni per lingua
  const itemsByLang = cl.items_by_lang || {};
  let langSections = '';
  ['it','en','ja'].forEach(lang => {
    const items = itemsByLang[lang];
    if (!items || !items.length) return;
    const {flag, label} = LANG_META[lang] || {flag:'', label:lang.toUpperCase()};
    const rows = items.map(it => {
      const dur   = formatDur(it.duration_secs);
      const views = it.views ? `<span class="vm vm-views">👁 ${formatN(it.views)}</span>` : '';
      const durEl = dur ? `<span class="vm vm-dur">${dur}</span>` : '';
      return `<a href="${it.url}" target="_blank" rel="noopener" class="cluster-item">
        <span class="cluster-item-source">${it.source}</span>
        <span class="cluster-item-title">${it.title}</span>
        <span class="cluster-item-metrics">${views}${durEl}</span>
      </a>`;
    }).join('');
    langSections += `<div class="lang-section">
      <div class="lang-header"><span>${flag}</span><span>${label}</span><span class="lang-count">${items.length} video</span></div>
      ${rows}
    </div>`;
  });

  // Fallback: se non c'è items_by_lang usa top_items
  if (!langSections && cl.top_items?.length) {
    const rows = cl.top_items.map(it => {
      const dur = formatDur(it.duration_secs);
      return `<a href="${it.url}" target="_blank" rel="noopener" class="cluster-item">
        <span class="cluster-item-source">${it.source}</span>
        <span class="cluster-item-title">${it.title}</span>
        <span class="cluster-item-metrics">${it.views?`<span class="vm vm-views">👁 ${formatN(it.views)}</span>`:''}${dur?`<span class="vm vm-dur">${dur}</span>`:''}</span>
      </a>`;
    }).join('');
    langSections = `<div class="lang-section">${rows}</div>`;
  }

  return `<div class="cluster-card">
    <div class="cluster-top">
      <div class="cluster-kw">${kw}</div>
      <div class="cluster-score-badge">${score}</div>
    </div>
    <div class="score-track"><div class="score-fill" style="width:${bar}%"></div></div>

    <div class="cluster-tags">${mover}${catTags}</div>

    <div class="cluster-metrics">
      <div class="cm"><span class="cm-val">${vws}</span><span class="cm-lbl">Views tot.</span></div>
      <div class="cm"><span class="cm-val">${cl.item_count||0}</span><span class="cm-lbl">Video</span></div>
      <div class="cm"><span class="cm-val">${vel}</span><span class="cm-lbl">Velocità</span></div>
      <div class="cm"><span class="cm-val">${nov}</span><span class="cm-lbl">Novità</span></div>
      <div class="cm"><span class="cm-val">${aff}</span><span class="cm-lbl">Affinità</span></div>
      ${cl.first_seen ? `<div class="cm"><span class="cm-val" style="font-size:.75rem">${cl.first_seen}</span><span class="cm-lbl">Prima vista</span></div>` : ''}
    </div>

    ${affLine}
    ${langSections}
  </div>`;
}

// ================================================================
// TASK MONITOR
// ================================================================
let taskStatusCache = null;

async function loadTaskMonitor(force=false) {
  const loading = document.getElementById('taskLoading');
  const content = document.getElementById('taskContent');
  if (taskStatusCache && !force) { renderTaskMonitor(taskStatusCache); return; }
  loading.classList.remove('hidden'); content.classList.add('hidden');
  try {
    const res = await fetch('data/task_status.json?t='+Date.now());
    if (!res.ok) throw new Error('not found');
    taskStatusCache = await res.json();
    renderTaskMonitor(taskStatusCache);
  } catch { loading.innerHTML = '<p style="color:var(--gray-400)">⚠️ Stato task non disponibile.</p>'; }
}

const STATUS_CONFIG = {
  ok:           { dot:'dot-green',  label:'OK' },
  error:        { dot:'dot-red',    label:'Errore' },
  disabled:     { dot:'dot-gray',   label:'Disabilitato' },
  mai_eseguito: { dot:'dot-yellow', label:'Mai eseguito' },
};

function renderTaskMonitor(data) {
  const loading = document.getElementById('taskLoading');
  const content = document.getElementById('taskContent');
  loading.classList.add('hidden');
  const updated = data.last_updated ? new Date(data.last_updated).toLocaleString('it-IT') : '—';
  const rows = (data.tasks||[]).map(task => {
    const cfg     = STATUS_CONFIG[task.status]||STATUS_CONFIG.mai_eseguito;
    const lastRun = task.last_run ? new Date(task.last_run).toLocaleString('it-IT') : '—';
    const metrics = Object.entries(task.metrics||{})
      .map(([k,v]) => `<span class="metric">${k}: <strong>${v}</strong></span>`).join('');
    return `<div class="task-row">
      <div class="task-left">
        <span class="status-dot ${cfg.dot}"></span>
        <div><div class="task-name">${task.name}</div><div class="task-schedule">${task.schedule}</div></div>
      </div>
      <div class="task-right">
        <div class="task-metrics">${metrics}</div>
        <div class="task-last-run">${lastRun}</div>
      </div>
    </div>`;
  }).join('');
  content.innerHTML = `<div class="monitor-header"><span class="report-meta">Aggiornato: ${updated}</span></div><div class="task-list">${rows}</div>`;
  content.classList.remove('hidden');
}

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  setDate();
  // Deep-link via hash: dashboard.html#cluster / #pipeline (usato dal link nell'email)
  const h = (location.hash || '').replace('#', '');
  if (h === 'cluster') {
    showPanel('trend-report', document.querySelector('[data-panel="trend-report"]'));
  } else if (h === 'pipeline') {
    showPanel('task-monitor', document.querySelector('[data-panel="task-monitor"]'));
  } else {
    loadAllFeeds();
  }
});
