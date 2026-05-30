# Giappone nel Mondo — Guida al deploy

## Prima di pubblicare: personalizza il sito

### 1. Spotify Podcast ID
Apri `index.html` e cerca `SPOTIFY_SHOW_ID`.
Trovalo nella URL del tuo show: `open.spotify.com/show/**QUESTO_ID**`

### 2. YouTube Channel ID
Apri `js/main.js` e cerca `YOUTUBE_CHANNEL_ID`.
Trovalo in YouTube Studio → Impostazioni → Canale → Informazioni avanzate.

### 3. Bio e testi
In `index.html`, nella sezione About, modifica il testo tra i commenti `<!-- ISTRUZIONI: modifica... -->`.

### 4. Link social
Sostituisci i `href="#"` nella sezione About con i tuoi link reali.

### 5. Feed RSS della dashboard
Apri `js/dashboard.js` e modifica l'array `FEEDS` con le fonti che preferisci.

---

## Deploy su GitHub Pages (gratuito, custom domain)

### Step 1 — Crea il repository
1. Vai su [github.com](https://github.com) e crea un account (se non ce l'hai)
2. Crea un nuovo repository pubblico, chiamalo `giapponenelmondo`

### Step 2 — Carica i file
1. Nella pagina del repository, clicca **"uploading an existing file"**
2. Trascina tutta la cartella `giapponenelmondo/` nella finestra
3. Clicca **"Commit changes"**

### Step 3 — Attiva GitHub Pages
1. Nel repository → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → **/root**
4. Clicca **Save**

### Step 4 — Configura il dominio
1. Sempre in Settings → Pages, inserisci `giapponenelmondo.com` nel campo **Custom domain**
2. Vai nel pannello del tuo registrar (dove hai comprato il dominio)
3. Aggiungi questi record DNS:

| Tipo | Nome | Valore |
|------|------|--------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | tuonomeutente.github.io |

4. Aspetta 10-30 minuti per la propagazione DNS

### Il sito sarà live su https://giapponenelmondo.com

---

## Aggiornare il sito in futuro

1. Modifica i file in locale
2. Vai su GitHub → repository → trova il file → clicca la matita per editarlo
3. Oppure usa **GitHub Desktop** (app gratuita) per aggiornare tutto con drag & drop
