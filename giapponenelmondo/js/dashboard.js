// ================================================================
// FEEDS RSS
// ================================================================
const FEEDS = [
  { url: 'https://anchor.fm/s/ffef9fd4/podcast/rss', name: 'Giappone nel Mondo', category: 'japan', icon: '🎙' },
  { url: 'https://www3.nhk.or.jp/nhkworld/en/news/feeds/', name: 'NHK World', category: 'japan', icon: '📡' },
  { url: 'https://www.japantimes.co.jp/feed/', name: 'Japan Times', category: 'japan', icon: '🗾' },
  { url: 'https://feeds.feedburner.com/TrendHunter', name: 'Trend Hunter', category: 'trends', icon: '📈' },
  { url: 'https://rss.beehiiv.com/feeds/aiyAWnrHKq.xml', name: 'Cultural Trends', category: 'trends', icon: '🎌' },
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
  ['panel-feed', 'panel-trend-report', 'panel-task-monitor'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById('panel-' + show).classList.remove('hidden');
}

function showFeed(filter, btn) {
  currentPanel = 'feed';
  currentFilter = filter;
  if (btn) setActiveBtn(btn);
  showAllPanels('feed');
  document.getElementById('panelTitle').textContent = 'La tua rassegna stampa';
  if (allArticles.length) renderArticles(filter);
  else loadAllFeeds();
}

function showPanel(name, btn) {
  currentPanel = name;
  if (btn) setActiveBtn(btn);
  showAllPanels(name);
  if (name === 'trend-report') {
    document.getElementById('panelTitle').textContent = 'Trend Report';
    loadTrendReport();
  } else if (name === 'task-monitor') {
    document.getElementById('panelTitle').textContent = 'Task Monitor';
    loadTaskMonitor();
  }
}

function refreshCurrent() {
  if (currentPanel === 'feed') loadAllFeeds();
  else if (currentPanel === 'trend-report') loadTrendReport(true);
  else if (currentPanel === 'task-monitor') loadTaskMonitor(true);
}

// ================================================================
// DATE
// ================================================================
function setDate() {
  const el = document.getElementById('dashDate');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ================================================================
// FORMATTERS
// ================================================================
function formatN(n) {
  if (!n || n === 0) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toLocaleString('it-IT');
}

function formatDur(secs) {
  if (!secs) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

// ================================================================
// FEED RSS
// ================================================================
async function fetchFeed(feed) {
  const url = `${RSS_API}?rss_url=${encodeURIComponent(feed.url)}&count=8`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'ok' || !data.items?.length) return [];
    return data.items.map(item => ({ ...item, sourceName: feed.name, sourceIcon: feed.icon, category: feed.category }));
  } catch { return []; }
}

async function loadAllFeeds() {
  const loading = document.getElementById('loadingState');
  const error   = document.getElementById('errorState');
  const grid    = document.getElementById('feedGrid');
  const icon    = document.getElementById('refreshIcon');

  loading.classList.remove('hidden');
  error.classList.add('hidden');
  grid.classList.add('hidden');
  icon.classList.add('spinning');

  try {
    const results = await Promise.allSettled(FEEDS.map(fetchFeed));
    allArticles = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    if (!allArticles.length) throw new Error('no articles');
    renderArticles(currentFilter);
    loading.classList.add('hidden');
    grid.classList.remove('hidden');
  } catch {
    loading.classList.add('hidden');
    error.classList.remove('hidden');
  }
  icon.classList.remove('spinning');
}

function renderArticles(filter) {
  const grid = document.getElementById('feedGrid');
  const items = filter === 'all' ? allArticles : allArticles.filter(a => a.category === filter);
  if (!items.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;color:var(--gray-400);padding:24px 0;">Nessun articolo trovato.</p>';
    return;
  }
  grid.innerHTML = items.map(article => {
    const date = article.pubDate
      ? new Date(article.pubDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : '';
    const imgEl = article.thumbnail?.startsWith('http')
      ? `<img class="article-img" src="${article.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none'" />`
      : `<div class="article-img-placeholder">${article.sourceIcon}</div>`;
    const desc = article.description
      ? article.description.replace(/<[^>]*>/g, '').slice(0, 160) + '…' : '';
    return `
      <article class="article-card">
        ${imgEl}
        <div class="article-body">
          <div class="article-meta">
            <span class="article-source">${article.sourceName}</span>
            ${date ? `<span class="article-dot">·</span><span class="article-date">${date}</span>` : ''}
          </div>
          <h3 class="article-title">${article.title}</h3>
          ${desc ? `<p class="article-desc">${desc}</p>` : ''}
          <a href="${article.link}" target="_blank" rel="noopener noreferrer" class="article-link">Leggi →</a>
        </div>
      </article>`;
  }).join('');
}

// ================================================================
// TREND REPORT
// ================================================================
let trendReportCache = null;

async function loadTrendReport(force = false) {
  const loading = document.getElementById('trendLoading');
  const content = document.getElementById('trendContent');
  if (trendReportCache && !force) { renderTrendReport(trendReportCache); return; }

  loading.classList.remove('hidden');
  content.classList.add('hidden');
  if (trendChart) { trendChart.destroy(); trendChart = null; }

  try {
    const res = await fetch('data/trend_report.json?t=' + Date.now());
    if (!res.ok) throw new Error('not found');
    trendReportCache = await res.json();
    renderTrendReport(trendReportCache);
  } catch {
    loading.innerHTML = '<p style="color:var(--gray-400)">⚠️ Report non ancora disponibile. Verrà generato lunedì.</p>';
  }
}

const SECTION_LABELS = {
  emergenti:    { emoji: '🔥', label: 'Emergenti caldi',         color: '#f59e0b' },
  crescita:     { emoji: '📈', label: 'In crescita costante',    color: '#22c55e' },
  cross_source: { emoji: '🌊', label: 'Cross-source',            color: '#3b82f6' },
  affinita:     { emoji: '🎯', label: 'Alta affinità col canale',color: '#8b5cf6' },
  anomalie:     { emoji: '⚠️', label: 'Anomalie',                color: '#ef4444' },
  altri:        { emoji: '📌', label: 'Altri trend',             color: '#9ca3af' },
};

function getAllClusters(data) {
  const seen = new Set();
  const all = [];
  const order = ['emergenti', 'crescita', 'cross_source', 'affinita', 'anomalie', 'altri'];
  order.forEach(key => {
    (data.sections[key] || []).forEach(cl => {
      const id = (cl.keywords || []).join(',') || cl.label;
      if (!seen.has(id)) { seen.add(id); all.push({ ...cl, _section: key }); }
    });
  });
  return all.sort((a, b) => (b.score || 0) - (a.score || 0));
}

function renderChart(data) {
  const canvas = document.getElementById('clustersChart');
  if (!canvas || typeof Chart === 'undefined') return;
  if (trendChart) { trendChart.destroy(); trendChart = null; }

  const all = getAllClusters(data).slice(0, 10);
  if (!all.length) { canvas.closest('.chart-wrap').style.display = 'none'; return; }

  trendChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: all.map(c => (c.keywords || []).slice(0, 3).join(', ') || `Cluster ${c.label}`),
      datasets: [{
        data: all.map(c => c.score ? Math.round(c.score * 100) / 100 : 0),
        backgroundColor: all.map(c => (SECTION_LABELS[c._section] || SECTION_LABELS.altri).color + 'cc'),
        borderColor:     all.map(c => (SECTION_LABELS[c._section] || SECTION_LABELS.altri).color),
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` Score: ${ctx.raw}  ·  ${formatN(all[ctx.dataIndex].total_views)} views`
          }
        }
      },
      scales: {
        x: { min: 0, max: 1, grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 }, color: '#9ca3af' } },
        y: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#374151' } }
      }
    }
  });
}

function renderTrendReport(data) {
  const loading = document.getElementById('trendLoading');
  const content = document.getElementById('trendContent');
  loading.classList.add('hidden');

  const sections    = data.sections || {};
  const totalClusters = data.total_clusters || 0;
  const totalVideos = data.total_videos || 0;
  const generatedAt = data.generated_at || '—';
  const dateStart   = data.date_range_start || '';
  const dateEnd     = data.date_range_end || '';
  const dateRange   = dateStart && dateEnd ? `${dateStart} → ${dateEnd}` : '';

  let html = `
    <div class="report-summary">
      <div class="summary-stat"><span class="summary-num">${totalClusters}</span><span class="summary-lbl">cluster</span></div>
      <div class="summary-divider"></div>
      <div class="summary-stat"><span class="summary-num">${totalVideos}</span><span class="summary-lbl">video analizzati</span></div>
      ${dateRange ? `<div class="summary-divider"></div><div class="summary-stat"><span class="summary-num" style="font-size:0.82rem">${dateRange}</span><span class="summary-lbl">finestra temporale</span></div>` : ''}
      <div class="summary-divider"></div>
      <div class="summary-stat"><span class="summary-num" style="font-size:0.82rem">${generatedAt}</span><span class="summary-lbl">generato il</span></div>
    </div>
    <div class="chart-wrap"><canvas id="clustersChart"></canvas></div>`;

  const order = ['emergenti', 'crescita', 'cross_source', 'affinita', 'anomalie', 'altri'];
  order.forEach(key => {
    const clusters = sections[key] || [];
    if (!clusters.length) return;
    const { emoji, label } = SECTION_LABELS[key] || { emoji: '•', label: key };
    html += `<div class="report-section"><h2 class="report-section-title">${emoji} ${label}</h2>`;
    clusters.forEach(cl => { html += renderCluster(cl, key === 'affinita'); });
    html += '</div>';
  });

  content.innerHTML = html;
  content.classList.remove('hidden');
  renderChart(data);
}

function renderCluster(cl, showAffinity) {
  const kw     = (cl.keywords || []).join(', ') || '—';
  const score  = cl.score != null ? cl.score.toFixed(2) : '—';
  const pct    = cl.score != null ? Math.round(cl.score * 100) : 0;
  const mover  = cl.has_mover ? '<span class="tag tag-mover">⚡ mover</span>' : '';
  const langs  = (cl.languages || []).map(l => `<span class="tag">${l}</span>`).join('');
  const sources= (cl.sentinel_clusters || []).map(s => `<span class="tag">${s}</span>`).join('');
  const totalViews = cl.total_views ? formatN(cl.total_views) : null;

  const affLine = showAffinity && cl.affinity_best_tipo !== '—'
    ? `<div class="cluster-affinity">🎯 Affinità <strong>${cl.affinity_best_tipo}</strong>: ${cl.affinity_best_score}</div>` : '';

  const items = (cl.top_items || []).map(it => {
    const dur  = formatDur(it.duration_secs);
    const views = it.views ? `<span class="vm vm-views">👁 ${formatN(it.views)}</span>` : '';
    const durEl = dur ? `<span class="vm vm-dur">${dur}</span>` : '';
    const likes = it.likes ? `<span class="vm vm-likes">♥ ${formatN(it.likes)}</span>` : '';
    return `<a href="${it.url}" target="_blank" rel="noopener" class="cluster-item">
      <span class="cluster-item-source">${it.source}</span>
      <span class="cluster-item-title">${it.title}</span>
      <span class="cluster-item-metrics">${views}${likes}${durEl}</span>
    </a>`;
  }).join('');

  return `
    <div class="cluster-card">
      <div class="cluster-top">
        <div class="cluster-kw">${kw}</div>
        <div class="cluster-score-wrap">
          <span class="cluster-score-num">${score}</span>
        </div>
      </div>
      <div class="score-track"><div class="score-fill" style="width:${pct}%"></div></div>
      <div class="cluster-tags">${mover}${langs}${sources}</div>
      <div class="cluster-meta-row">
        <span class="cluster-meta-item">📹 ${cl.item_count || 0} video</span>
        ${totalViews ? `<span class="cluster-meta-item">👁 ${totalViews} views totali</span>` : ''}
        ${cl.first_seen ? `<span class="cluster-meta-item">📅 ${cl.first_seen} → ${cl.last_seen}</span>` : ''}
      </div>
      ${affLine}
      <div class="cluster-items">${items}</div>
    </div>`;
}

// ================================================================
// TASK MONITOR
// ================================================================
let taskStatusCache = null;

async function loadTaskMonitor(force = false) {
  const loading = document.getElementById('taskLoading');
  const content = document.getElementById('taskContent');
  if (taskStatusCache && !force) { renderTaskMonitor(taskStatusCache); return; }

  loading.classList.remove('hidden');
  content.classList.add('hidden');
  try {
    const res = await fetch('data/task_status.json?t=' + Date.now());
    if (!res.ok) throw new Error('not found');
    taskStatusCache = await res.json();
    renderTaskMonitor(taskStatusCache);
  } catch {
    loading.innerHTML = '<p style="color:var(--gray-400)">⚠️ Stato task non disponibile.</p>';
  }
}

const STATUS_CONFIG = {
  ok:           { dot: 'dot-green',  label: 'OK' },
  error:        { dot: 'dot-red',    label: 'Errore' },
  disabled:     { dot: 'dot-gray',   label: 'Disabilitato' },
  mai_eseguito: { dot: 'dot-yellow', label: 'Mai eseguito' },
};

function renderTaskMonitor(data) {
  const loading = document.getElementById('taskLoading');
  const content = document.getElementById('taskContent');
  loading.classList.add('hidden');

  const updated = data.last_updated
    ? new Date(data.last_updated).toLocaleString('it-IT') : '—';

  let rows = (data.tasks || []).map(task => {
    const cfg    = STATUS_CONFIG[task.status] || STATUS_CONFIG.mai_eseguito;
    const lastRun = task.last_run ? new Date(task.last_run).toLocaleString('it-IT') : '—';
    const metrics = Object.entries(task.metrics || {})
      .map(([k, v]) => `<span class="metric">${k}: <strong>${v}</strong></span>`)
      .join('');
    return `
      <div class="task-row">
        <div class="task-left">
          <span class="status-dot ${cfg.dot}"></span>
          <div>
            <div class="task-name">${task.name}</div>
            <div class="task-schedule">${task.schedule}</div>
          </div>
        </div>
        <div class="task-right">
          <div class="task-metrics">${metrics}</div>
          <div class="task-last-run">${lastRun}</div>
        </div>
      </div>`;
  }).join('');

  content.innerHTML = `
    <div class="monitor-header">
      <span class="report-meta">Aggiornato: ${updated}</span>
    </div>
    <div class="task-list">${rows}</div>`;
  content.classList.remove('hidden');
}

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  setDate();
  loadAllFeeds();
});
