# Kolbi20 — strumenti estratti dal video RadianceFields (news settimanale Gaussian Splatting)

**Fonte:** <https://youtu.be/D79F5vnEboM> — notiziario settimanale di RadianceFields.com (9:24, fine settembre 2026).
**Come è stato letto:** YouTube è bloccato dal container, quindi il video è stato analizzato scena per scena con Higgsfield `video_analysis` (trascrizione audio + descrizione visiva). I nomi propri sono stati verificati su radiancefields.com/GitHub dove possibile; quelli **non verificati** sono segnati con ⚠️.
**Contesto Kolbi20** (dal report settimanale del 20/09): Gaussian Splatting con rig da 14 camere calibrate con COLMAP (errore 0.4–0.9 px), training R3 con varianti denso/default, prossimo passo = validare le metriche di densificazione e iterare il rig; obiettivo fotorealismo tipo Hasselblad; metrica oggettiva = gemello digitale sintetico.

---

## 🟢 Priorità alta: da provare subito su Kolbi20

### 1. Spirula Studio: trainer 3DGS open source e cross-vendor
- **Cos'è:** trainer Gaussian Splatting gratuito (GPL-3.0) in un unico binario: foto/video → splat → mesh texturizzata. Gira via Vulkan su **NVIDIA, AMD, Intel e Apple GPU** (quindi anche sul Mac). Non richiede Python/PyTorch né un'installazione separata di COLMAP. Dichiara 10M gaussiane full-SH in 8 GB di VRAM. Supporto nativo a fisheye e 360°.
- **Cosa dice il video:** ha un **solo preset** che dovrebbe combinare il meglio di MCMC, IGS+, la strategia di MrNeRF e ADC, invece di far scegliere fra tante strategie. Le ricostruzioni **densificano molto in fretta**: con un budget di training alto lo si raggiunge presto nel loop.
- **Update v2026.9.24 (24/09):** editor per splat, ricostruzioni sparse e mesh; export di render immagine/video; **server MCP "per workflow agentici"**.
- **Perché per Kolbi20:**
  - benchmark diretto contro il training R3 (denso/default): stesso dataset COLMAP, stessa metrica del gemello sintetico;
  - l'osservazione sulla densificazione rapida tocca proprio il punto aperto "validare le metriche di densificazione": conviene loggare il numero di gaussiane per step;
  - con il **server MCP** Claude Code può lanciare training, leggere i risultati e iterare in automatico sulle varianti del rig.
- **Link:** [GitHub harry7557558/spirula-studio](https://github.com/harry7557558/spirula-studio) · [scheda RadianceFields](https://radiancefields.com/platforms/spirula-studio) · [articolo v2026.9.24](https://radiancefields.com/spirula-studio-v2026.9.24-adds-editing-and-an-mcp-server)

### 2. COLMAP nel browser (Rafael Spring)
- **Cos'è:** porting del flusso sparse di COLMAP in un'app locale nel browser, accelerata WebGPU, con output COLMAP standard. Vista 3D live con strisce di immagini, frusta delle camere, **overlay SIFT e view graph**, strumenti di crop, tuning degli M-estimator, iterazioni di allineamento extra, export parziale e reimport.
- **Cosa dice il video:** in due settimane il consumo di memoria è sceso di oltre 5 volte.
- **Perché per Kolbi20:** è il modo più rapido per **diagnosticare visivamente la calibrazione del rig a 14 camere**: si vede quale camera ha pochi match nel view graph e dove si concentrano i punti SIFT. Utile quando si itera la posizione delle camere.
- **Da affiancare:** COLMAP 4.1.0 (bundle adjustment su GPU "Caspar" e ricostruzione 360 nativa).
- **Link:** [Digital Production: COLMAP Moves Into the Browser](https://digitalproduction.com/2026/09/21/colmap-moves-into-the-browser/) · [COLMAP 4.1.0](https://radiancefields.com/colmap-4.1.0-ships-caspar-gpu-bundle-adjustment-and-native-360-reconstruction)

### 3. Rig 4DGS con 12 iPhone in genlock (app Blackmagic Camera)
- **Cosa dice il video:** un rig 4DGS da **12 iPhone sincronizzati in genlock tramite l'app Blackmagic Camera ("Pro")**, con buoni risultati su due persone che fanno kickboxing all'aperto. L'azienda si chiama "Anvisino" ⚠️ (nome da trascrizione, non verificato).
- **Perché per Kolbi20:** è il riferimento più vicino a un rig multi-camera su un soggetto in movimento (danza). Due idee da prendere:
  - **sincronizzazione genlock via app** su telefoni: alternativa a basso costo per aggiungere viste al rig o per passare dal frame congelato al 4D;
  - la disposizione in cerchio dei treppiedi vista nel video, da confrontare con la geometria attuale dei 14 punti camera.
- **Riferimento sport:** Arcturus Sports (finish line 4DGS agli Athlos di Londra). Il video dice che l'adozione 4DGS partirà dallo sport.

### 4. 3DGUT (3D Gaussian Unscented Transform)
- **Cos'è:** variante di rendering/training che gestisce bene camere con distorsione forte (fisheye, 360, rolling shutter). La trascrizione dice "Unbounded", ma il nome corretto è *Unscented*.
- **Avvertenza dal video:** le ricostruzioni fisheye/360 addestrate con GUT **non si aprono ancora nativamente in SuperSplat**.
- **Perché per Kolbi20:** serve solo se nel rig entrano lenti grandangolari o fisheye; con ottiche rettilinee resta il 3DGS standard.

---

## 🟡 Priorità media: per la resa finale e il fotorealismo

### 5. Deckard Render / Deckard Slate
- **Cos'è:** Deckard Render è un plugin Unity per renderizzare video da una scena, con un controllo molto spinto della **simulazione della camera** (movimento e camera shake realistici). Il video annuncia **Deckard Slate**, porting in app standalone, "in arrivo".
- **Perché per Kolbi20:** va nella direzione "sembra girato con una camera vera". È utile per i render video degli splat da pubblicare (reel IG danza). Da tenere d'occhio fino all'uscita di Slate.
- **Link:** [Deckard Render (free tier)](https://radiancefields.com/deckard-render-adds-free-tier)

### 6. SuperSplat (PlayCanvas): editor/viewer web + relighting
- **Cosa dice il video:** un membro del team PlayCanvas (Donovan) ha inserito **point light** in una cattura di Studio Duckbill, cambiando completamente l'atmosfera della scena (dal giorno alla notte con luci rosa e blu). Il tutorial SuperSplat di RadianceFields esce questa settimana.
- **Perché per Kolbi20:** pulizia dei floater, crop, pubblicazione web; il relighting permette più look dallo stesso splat, per esempio varianti "palco" per la serie danza.
- **Limite:** niente import nativo degli splat 3DGUT fisheye (vedi punto 4).

### 7. LichtFeld Studio (MrNeRF / Janusch)
- **Novità:** preview della 0.5.4 con **galleria e libreria progetti** (organizzazione delle catture in un solo posto). Janusch ha mostrato un **port per Mac** (data non annunciata).
- **Perché per Kolbi20:** trainer di riferimento per confrontare le strategie di densificazione (la "MrNeRF strategy" è una delle quattro che Spirula dice di combinare). La libreria progetti aiuta a tenere in ordine le varianti R1/R2/R3. Il port Mac eviterebbe di passare per una macchina NVIDIA.
- **Link:** [scheda LichtFeld Studio](https://radiancefields.com/platforms/lichtfeld-studio)

### 8. Houdini 22 (SideFX): supporto Gaussian splat
- **Cosa dice il video:** all'evento Equinox di Toronto SideFX ha mostrato splat in Houdini 22 e una roadmap con altre funzioni in arrivo; gli splat sono presentati come una priorità del team.
- **Perché per Kolbi20:** pipeline professionale per comporre, illuminare e renderizzare gli splat insieme a geometria classica. Da valutare solo se la fase di resa si sposta su un DCC.

---

## ⚪ Priorità bassa: cattura alternativa, scala, riferimenti

| Strumento | Cosa dice il video | Rilevanza per Kolbi20 |
|---|---|---|
| **Insta360 spatial capture** (X4 Air / X5 / X6) | Da oggi disponibile anche negli USA. 4 ricostruzioni cloud al mese, **niente export PLY** (esistono tool di terze parti). È basato su **KIRI Engine** (collaborazione ufficiale). | Bassa: cattura ambienti, non un rig da studio. Utile per scenografie o location. |
| **Singola camera 360 + asta selfie** | Secondo il presentatore basta una 360 per ottimi splat (esempio: biblioteca in Corea con una X5). | Per catturare gli ambienti in cui inserire la ballerina. |
| **Splatara / SplataraScan** (Meta Quest) | Cattura splat dal Quest; il backend desktop è stato rifatto su Spirula. | Bassa. |
| **Cloud trainer "ANNX Studio"** ⚠️ | Era un trainer locale, ora ha anche una versione cloud; il piano gratuito non esporta PLY. | Bassa, nome non verificato. |
| **LOD in Unreal Engine** (articolo del technical director di Magnopus, "Gaussian splats part 3: There's always a bigger scene") | Da circa 16M a circa **268M splat** in Unreal usando il level of detail. | Solo se Kolbi20 finisce in scene molto grandi o in Unreal. |
| **RadianceFields.com** | Notizie quotidiane e schede di tutte le piattaforme. | Fonte da monitorare (anche via RSS nella dashboard). |

**Non sono strumenti (solo notizie):** annunci di lavoro di Netflix e Fox Sports, spot Adidas × Amazon realizzato in splat da Harry Nelder (candidato ai Bolt Award), ologrammi di Meta Connect (billboard 2D), riflessioni di Bilawal Sidhu sul "4D".

---

## Prossime azioni proposte

1. **Installare Spirula Studio sul Mac** e addestrare sullo stesso dataset COLMAP di R3. Confrontare con la metrica del gemello sintetico e loggare il numero di gaussiane nel tempo, per verificare la densificazione rapida.
2. **Aprire l'attuale ricostruzione a 14 camere in COLMAP nel browser**: controllare il view graph e le camere con pochi match prima della prossima iterazione del rig.
3. **Collegare il server MCP di Spirula a Claude Code** per automatizzare le varianti di training (sweep denso/default).
4. **Valutare il genlock via app Blackmagic Camera** se il rig si allarga o passa al 4D.
5. Tenere d'occhio **Deckard Slate** e il **port Mac di LichtFeld** (entrambi "in arrivo").
