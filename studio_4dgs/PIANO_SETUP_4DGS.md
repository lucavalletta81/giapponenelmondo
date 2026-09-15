# Piano setup camere — cattura 4D Gaussian Splatting (danza, studio)

Data: 15 settembre 2026. Base: dossier "Ricerca 4D Gaussian Splatting" (Drive, 21/08), report progetti Kolbi 4DGS / MetalGauss (PSNR baseline 12,86), test fallito con 7 GoPro, dossier ricalibrato su 4C4D (4 camere), letteratura di settembre 2026 (in fondo).

Cosa NON ho trovato: le misure dello studio e un documento chiamato "Xfield Video Refinement Dance". Il modello Blender usa quindi misure ASSUNTE (6 × 7 m, soffitto 2,8 m) e sono tutte parametri in `build_studio.py`: cambia i numeri, rilancia, e la pianta si rigenera.

---

## 1. Diagnosi in una riga

Il test da 7 camere non è fallito per "poche camere": è fallito per **sincronizzazione** (GoPro senza genlock, allineamento audio ≈ ±½ frame ≈ 17 ms a 30 fps → errore di 4–13 cm sugli arti veloci) e per **pose/calibrazione** deboli (fondale e pavimento senza texture, fisheye trattate come pinhole). 4C4D (CVPR 2026) ricostruisce la danza con **4** action cam: il numero non è il problema, la qualità dei dati sì.

---

## 2. Cosa abbiamo, cosa manca, cosa serve assolutamente

### Abbiamo già (basta)
- Camere: GoPro (HERO13 appena arrivata + HERO11 Mini, una in RMA), Fujifilm X con 50 mm (75 eq) e 50-140 (70-200 eq), Sony A6500, Sony A7S, Nikon con ottiche manuali (50, 90…), Insta360 Luna Ultra (tele 70 mm eq, sensore 1/1,3"), Hasselblad per le foto.
- Luci Godox, softbox, stativi (dalla lista attrezzatura). Mac M5 Pro 48 GB per SfM/matting/post.
- **Altre ottiche non servono.** La lente giusta è quella che tiene la ballerina in campo con margine: vedi tabella §4.

### Manca e serve ASSOLUTAMENTE (senza questo il training non converge)
1. **Sync sub-frame**: un evento luminoso di 1 ms visto da tutte le camere all'inizio e alla fine di ogni take. Un **flash fotografico** (Godox, ce l'hai) sparato a mano verso il soffitto: sui sensori rolling shutter il flash "taglia" il frame a metà e permette di stimare l'offset con precisione di ~1 ms (sub-frame). Aggiungi il **Timecode Sync di GoPro** (QR in Quik, HERO12+/HERO13; Labs QR sulle 11 Mini) per l'allineamento grossolano. Precisione dichiarata <50 ms: non basta da sola, serve il flash.
2. **Frame rate alto**: tutte le camere a **60 fps minimo**, chi può a **120** (GoPro 4K/120 o 2,7K/120; A6500 1080p120; A7S 1080p60). Mezzo frame a 120 fps = 4 ms = 2 cm a 5 m/s; a 30 fps = 8 cm. Poi si campiona a 30 o 60 fps scegliendo il frame più vicino per camera.
3. **Otturatore ≥ 1/500 s** (meglio 1/1000) su tutte, esposizione e bilanciamento **manuali e bloccati**, stessa temperatura colore, niente auto-ISO.
4. **Luce**: per 1/500 a f/2,8 ISO 800 servono ~1.200 lux sul volume; a ISO 1600 ~600 lux. Obiettivo: **≥ 1.000 lux uniformi** su tutto il cilindro d'azione, luce **piatta e diffusa** (4 softbox/pannelli agli angoli, alti, + rimbalzo). LED **flicker-free** (alimentazione DC o PWM > 20 kHz): a 1/500 la luce a 50 Hz sfarfalla e rompe la costanza fotometrica tra camere. Niente stroboscopi, niente neon.
5. **Calibrazione separata dalla danza**: fai una **"passata di calibrazione"** con tutte le camere già bloccate: (a) 60 s con una **tavola ChArUco A1** (stampata su forex) mossa lentamente per tutto il volume, inclinandola; (b) 30 s di scena statica con **oggetti texturizzati** dentro il volume (sedie con coperte a fantasia, scatole, un manichino). Da qui COLMAP/MASt3R ricava intrinseci + estrinseci di **tutte** le camere. Poi togli tutto e balli. **Le pose non cambiano** finché non tocchi i cavalletti. Ripeti la passata a fine sessione (verifica drift).
6. **Pavimento con texture non ripetitiva**: tappeto 3 × 3 m con **4 AprilTag** agli angoli (scala metrica + orientamento) e strisce di **nastro nero di lunghezza casuale** (pattern casuale: i pattern ripetuti, tipo scacchiera intera, confondono il feature matching). In alternativa un tappeto danza stampato con foto/texture irregolare.
7. **Cavalletti + sabbia** per 11 camere: nessuno tocca niente tra calibrazione e take. Alimentazione continua (USB-C sulle GoPro, dummy battery sulle mirrorless): le GoPro spente per batteria perdono il timecode.
8. **Maschere**: fondale bianco/grigio uniforme + matting (SAM 2 / Magic Mask in Resolve, già in pipeline). Senza maschere lo sfondo diventa geometria.

### Bello ma non indispensabile
- Due camere in più dietro (arco 360°): oggi con 11 camere restiamo su un **arco frontale di ~180°**; il retro si ricostruisce solo con prior umani (HiReFF/GauHuman). Se la ballerina gira su sé stessa, la schiena la vedi comunque per parte del take.
- Registratore esterno per la A7S in 4K (interna solo 1080p).
- Un esposimetro/luxmetro (o app) per verificare i 1.000 lux.

### Non serve
- Genlock hardware (i tuoi corpi non lo supportano; il flash + 120 fps lo sostituisce entro ~1 ms).
- Le 360 (X3/X6) per il training: fisheye stitchate, niente pinhole. Utili al massimo come riferimento di set.
- Marker sul fondale: **non devi traccare il fondale**. Le pose le dà la passata di calibrazione; il fondale va mascherato, non ricostruito.

---

## 3. Geometria del setup (vedi `out/pianta.svg`, `out/iso.png`, `out/cam_*.png`)

Principio: **due anelli**.
- **Anello vicino, grandangolari (GoPro, Linear ~86° H)** a 2,6 m dal centro: sono le *ancore*. Vedono tutto il volume, il pavimento coi marker e le altre camere; agganciano tanti punti e fissano la geometria. Arco frontale 180°, **passo 36°** (5 camere: −72°, −36°, 0°, +36°, +72°), altezze alternate 1,15 m / 2,35 m così l'anello copre anche l'asse verticale. Sesta GoPro **quasi zenitale** (2,65 m, tilt −51°) per la testa, le spalle e il pavimento.
- **Anello lontano, tele (dettaglio)** a 4,3–4,4 m: ogni tele sta **a ridosso di una grandangolare** (baseline corta): l'immagine tele è di fatto un crop dell'immagine wide, quindi il matching wide↔tele funziona (SIFT tollera ~2-3× di scala). È questo che fa "entrare" la definizione nel modello.
  - **Volto**: A7S 50 mm e Nikon 50 mm a ±35°, altezza 1,60 m, in bolla. Campo 3,2 × 2,1 m a 4,4 m: la ballerina può muoversi su tutto il cerchio Ø 2 m senza uscire, testa+busto sempre dentro. **Non stringere di più**: col 90 mm il campo scende a 1,8 m e la perdi al primo passo. Il 90 lo usi solo se la coreografia è "sul posto" (Ø ≤ 1,2 m).
  - **Piedi**: Fuji e A6500 con **35 mm** (52 eq) a ±18°, altezza 0,55 m, tilt −3°. Campo 2,9 × 1,9 m: i piedi restano nel terzo inferiore del frame ovunque lei si sposti. Col Fuji 50 (campo 2,2 m) va bene solo se resta entro Ø 1,6 m.
  - **Luna Ultra** tele 70 eq frontale a 1,70 m: terza camera volto (opzionale). Se ti serve sulla Hasselblad, togli la riga: il layout regge.

Numeri completi per camera (posizione, altezza, tilt, FOV, larghezza campo) in `out/cameras.csv`.

Regole di posizionamento sul campo:
- Tutte le camere guardano il **centro del volume**, non la ballerina: la ballerina si muove, il volume no.
- Nessuna camera nel campo di un'altra grandangolare? Impossibile e non necessario: l'importante è che nessuna tele abbia una wide **davanti** (le wide vicine sono più basse/alte delle tele, per questo le altezze sono sfalsate).
- Riprendi sempre **un po' di pavimento con marker** in ogni camera, anche nelle tele volto (basta il bordo inferiore del frame).

---

## 4. Impostazioni per camera (da verificare sui corpi reali)

| Camera | Ruolo | Ottica | Modo consigliato | Nota |
|---|---|---|---|---|
| GoPro HERO13 | wide ancora | Linear (no SuperView, no HyperSmooth) | 4K/120 o 2,7K/120, 1/480, ISO max 800-1600 fisso, WB 5600 K, colore Flat | HyperSmooth OFF: cambia l'intrinseco frame per frame |
| GoPro HERO11 Mini | wide ancora | Linear | 4K/60 o 2,7K/120 | Labs QR per timecode |
| Sony A7S | volto | 50 mm | 1080p60 (interna), S-Log off, 1/500 | 4K solo con registratore esterno |
| Nikon | volto | 50 mm manuale | 4K/30 o 1080p60, 1/500 | verificare readout rolling shutter |
| Fujifilm X | piedi | 35 mm (o 50 se Ø azione ≤ 1,6 m) | 4K/60 se il corpo lo fa, 1/500 | fuoco manuale bloccato |
| Sony A6500 | piedi | 35 mm | 1080p120 o 4K/30, 1/500 | 4K/30 ha rolling shutter lento (~30 ms): preferire 1080p120 |
| Insta360 Luna Ultra | volto centrale (opz.) | tele 70 eq | 4K/60, I-Log off, gimbal bloccato | modello fisheye NO: è rettilinea |

Su tutte: fuoco manuale sul centro del volume, diaframma f/4–f/5,6 dove possibile (profondità di campo su tutto il cilindro), stabilizzazione OFF, profilo colore standard (niente log: il matting e il color match ne soffrono), stessa WB.

Modello camera in COLMAP: `OPENCV` per le mirrorless, `OPENCV_FISHEYE` per le GoPro se registri in Wide; in **Linear** la GoPro raddrizza in camera e puoi usare `OPENCV`. Per l'inizializzazione con poche viste 4C4D consiglia **MASt3R** al posto di COLMAP (nuvola più densa).

---

## 5. Procedura di ripresa (checklist)

1. Misura lo studio, aggiorna `STUDIO`/`SUBJECT` in `build_studio.py`, rigenera pianta e piazza le camere con metro e livella secondo `cameras.csv`.
2. Tappeto marker + AprilTag + nastro. Fondale liscio, senza pieghe, senza ombre portate (luci alte, morbide).
3. Luci accese 20 min prima (stabilità colore). Misura ≥ 1.000 lux al centro, ai bordi del cilindro, a terra e a 2 m d'altezza.
4. Esposizione manuale identica; scatta un **color checker** in ogni camera (color match in post: era il passo mancante nel report del 14/09).
5. Timecode QR su tutte le GoPro. Rec su tutte. **Flash 1** (tutte le camere lo vedono).
6. Passata calibrazione: ChArUco 60 s + scena statica texturizzata 30 s.
7. Take di danza (coreografia contenuta nel cerchio Ø 2 m; segna il cerchio a terra col nastro). **Flash 2** a fine take. Più take corti (≤ 30 s) sono meglio di uno lungo: il drift del clock delle GoPro cresce col tempo.
8. Ripeti la calibrazione a fine sessione. Nessuno tocca i cavalletti fino ad allora.
9. Post: taglia sui flash → allinea a 1 ms → estrai frame a 30/60 fps → matting (SAM 2 / Magic Mask) → SfM su calibrazione → training (4C4D / Spacetime Gaussians su cloud CUDA, o MetalGauss per test) → confronto PSNR con la baseline 12,86.

Criterio di successo del prossimo test: PSNR delle viste tenute fuori (hold-out) > 25 dB e nessun arto doppio nei frame veloci. Se fallisce di nuovo, guarda prima il sync (riproietta i marker del pavimento tra camere a coppie: errore atteso < 1 px), poi le maschere.

---

## 6. Letteratura consultata (settembre 2026)

- 4C4D: 4 Camera 4D Gaussian Splatting (CVPR 2026) — danza con 4 action cam, COLMAP pre-ripresa + 8 immagini extra per stabilizzare le pose, MASt3R per l'inizializzazione: https://github.com/yangzf-1023/4C4D · https://junshengzhou.github.io/4C4D/
- Detail Enhanced Gaussian Splatting for Large-Scale Volumetric Capture (rig ~10 camere, correzione colore per posa): https://arxiv.org/html/2511.21697
- A Fast Volumetric Capture and Reconstruction Pipeline for Dynamic Point Clouds and Gaussian Splats (SIGGRAPH CVMP 2025): https://arxiv.org/html/2512.15719
- Gaussian Splatting on the Move: blur e rolling shutter (perché servono 1/500 e readout veloce): https://arxiv.org/abs/2403.13327
- Multi-camera calibration, ChArUco vs AprilTag (ChArUco per gli intrinseci, AprilTag per estrinseci/scala): https://www.mathworks.com/help/vision/ug/prepare-camera-and-capture-images-for-multi-camera-calibration.html · https://github.com/mprib/caliscope
- Marker proiettati/oggetti texturizzati quando COLMAP fallisce su superfici uniformi: https://arxiv.org/html/2501.16221v1 · https://arxiv.org/pdf/1909.01207
- GoPro Timecode Sync (<50 ms, drift dopo 60-90 min) e Labs QR/LTC: https://community.gopro.com/s/article/HERO12-Black-Timecode-Sync · https://gopro.github.io/labs/control/precisiontime/ · https://gopro.github.io/labs/control/ltc/
- Guide di cattura (luce piatta, 1/500–1/1000, no riflessi): https://docs.reflct.app/capturing_gaussian_splats · https://cglounge.studio/journal/gaussian-splatting-for-vfx
- Insta360 Luna Ultra (20 mm eq principale, tele 70 mm eq): https://www.newsshooter.com/2026/06/10/insta360-luna-ultra/
- Il tuo dossier: "Ricerca 4D Gaussian Splatting" su Drive (tabella errori di sync per velocità, modelli camera COLMAP, pipeline Apple Silicon).
