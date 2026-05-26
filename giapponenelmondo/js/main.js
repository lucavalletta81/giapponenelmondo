// ===== CONFIGURAZIONE =====
// Sostituisci con il tuo Channel ID YouTube
// Trovalo su: youtube.com → Impostazioni → Canale → Informazioni avanzate
const YOUTUBE_CHANNEL_ID = 'UCiVT7kU5ZLDy-rEDX6ZhxCQ';

// Se hai una YouTube Data API Key (gratuita), decommentala per caricare i video automaticamente
// Ottienila su: console.developers.google.com
// const YOUTUBE_API_KEY = 'LA_TUA_API_KEY';

// ===== MENU MOBILE =====
function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('open');
}

// Chiudi il menu cliccando fuori
document.addEventListener('click', (e) => {
  const menu = document.getElementById('mobileMenu');
  const hamburger = document.querySelector('.hamburger');
  if (menu.classList.contains('open') && !menu.contains(e.target) && !hamburger.contains(e.target)) {
    menu.classList.remove('open');
  }
});

// ===== YOUTUBE LATEST VIDEOS (via RSS, no API key needed) =====
async function loadYouTubeVideos() {
  if (YOUTUBE_CHANNEL_ID === 'YOUTUBE_CHANNEL_ID') return; // non configurato

  const grid = document.getElementById('videoGrid');
  const rssFeedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeedUrl)}&count=6`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status !== 'ok' || !data.items?.length) return;

    grid.innerHTML = '';

    data.items.forEach(video => {
      const videoId = video.link.split('v=')[1];
      const thumb = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      const date = new Date(video.pubDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

      const card = document.createElement('a');
      card.href = video.link;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.className = 'video-card';
      card.innerHTML = `
        <img class="video-thumb" src="${thumb}" alt="${video.title}" loading="lazy" />
        <div class="video-info">
          <h3>${video.title}</h3>
          <p>${date}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (e) {
    // Silenzioso: il placeholder già mostra le istruzioni
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadYouTubeVideos();
});
