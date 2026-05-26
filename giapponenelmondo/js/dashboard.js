// ===== FEED RSS =====
// Aggiungi o rimuovi fonti qui. Ogni feed ha: url, name, category, icon
const FEEDS = [
  // --- IL MIO PODCAST ---
  {
    url: 'https://anchor.fm/s/ffef9fd4/podcast/rss',
    name: 'Giappone nel Mondo',
    category: 'japan',
    icon: '🎙'
  },
  // --- GIAPPONE ---
  {
    url: 'https://www3.nhk.or.jp/nhkworld/en/news/feeds/',
    name: 'NHK World',
    category: 'japan',
    icon: '📡'
  },
  {
    url: 'https://www.japantimes.co.jp/feed/',
    name: 'Japan Times',
    category: 'japan',
    icon: '🗾'
  },
  // --- TREND & CULTURA ---
  {
    url: 'https://feeds.feedburner.com/TrendHunter',
    name: 'Trend Hunter',
    category: 'trends',
    icon: '📈'
  },
  {
    url: 'https://rss.beehiiv.com/feeds/aiyAWnrHKq.xml', // esempio Beehiiv
    name: 'Cultural Trends',
    category: 'trends',
    icon: '🎌'
  },
  // --- TECNOLOGIA ---
  {
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    name: 'Ars Technica',
    category: 'tech',
    icon: '💻'
  },
  {
    url: 'https://www.wired.com/feed/rss',
    name: 'Wired',
    category: 'tech',
    icon: '⚡'
  },
  // --- MONDO ---
  {
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    name: 'BBC World',
    category: 'world',
    icon: '🌍'
  },
  {
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    name: 'NY Times World',
    category: 'world',
    icon: '🗞'
  }
];

const RSS_API = 'https://api.rss2json.com/v1/api.json';
let allArticles = [];
let currentFilter = 'all';

// ===== DATA =====
function setDate() {
  const el = document.getElementById('dashDate');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ===== FETCH SINGLE FEED =====
async function fetchFeed(feed) {
  const url = `${RSS_API}?rss_url=${encodeURIComponent(feed.url)}&count=8`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'ok' || !data.items?.length) return [];
    return data.items.map(item => ({
      ...item,
      sourceName: feed.name,
      sourceIcon: feed.icon,
      category: feed.category
    }));
  } catch {
    return [];
  }
}

// ===== LOAD ALL =====
async function loadAllFeeds() {
  const loading = document.getElementById('loadingState');
  const error = document.getElementById('errorState');
  const grid = document.getElementById('feedGrid');
  const icon = document.getElementById('refreshIcon');

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

// ===== RENDER =====
function renderArticles(filter) {
  const grid = document.getElementById('feedGrid');
  const items = filter === 'all'
    ? allArticles
    : allArticles.filter(a => a.category === filter);

  if (!items.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;color:var(--gray-400);padding:24px 0;">Nessun articolo trovato per questa categoria.</p>';
    return;
  }

  grid.innerHTML = items.map(article => {
    const date = article.pubDate
      ? new Date(article.pubDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
      : '';

    const imgEl = article.thumbnail && article.thumbnail.startsWith('http')
      ? `<img class="article-img" src="${article.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none'" />`
      : `<div class="article-img-placeholder">${article.sourceIcon}</div>`;

    const desc = article.description
      ? article.description.replace(/<[^>]*>/g, '').slice(0, 160) + '…'
      : '';

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
      </article>
    `;
  }).join('');
}

// ===== FILTER =====
function showFeed(filter) {
  currentFilter = filter;

  document.querySelectorAll('.sidebar-item').forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');

  if (allArticles.length) {
    renderArticles(filter);
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setDate();
  loadAllFeeds();
});
