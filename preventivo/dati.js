/* =========================================================================
   DATI — sorgente unica del preventivo.
   Questo è il file che Simone può aggiornare SENZA toccare il codice.

   Ogni prezzo ha un campo di attendibilità:
     c:"V"  = verificato su fonte ufficiale (data in .d)
     c:"S"  = stima ragionevole, DA VERIFICARE prima di andare in pubblico
   L'interfaccia mostra a schermo quante voci sono ancora stime.

   Valuta base: YEN. La conversione avviene a runtime col cambio in .cambio.
   ========================================================================= */

window.DATI = {

meta: {
  versione: "0.1-simulazione",
  aggiornato: "2026-08-21",
  nota: "Dataset seme di simulazione. I prezzi marcati S sono stime da verificare su fonte ufficiale."
},

/* 1 EUR = X JPY. In produzione: refresh giornaliero da api gratuita (frankfurter.app). */
cambio: { jpy_per_eur: 165, c:"S", d:"2026-08-21" },

/* ---------------------------------------------------------------- PARTENZE */
partenze: [
  { id:"fco", nome:"Roma Fiumicino",   volo:{ bassa:620, media:790, alta:1080 }, c:"S" },
  { id:"mxp", nome:"Milano Malpensa",  volo:{ bassa:590, media:760, alta:1040 }, c:"S" },
  { id:"bgy", nome:"Bergamo / low cost + scalo", volo:{ bassa:520, media:690, alta:950 }, c:"S" },
  { id:"nap", nome:"Napoli",           volo:{ bassa:680, media:860, alta:1150 }, c:"S" },
  { id:"alt", nome:"Altro aeroporto europeo", volo:{ bassa:600, media:780, alta:1060 }, c:"S" }
],

/* --------------------------------------------------------------- STAGIONI
   moltiplicatori separati per volo e alloggio: si comportano diversamente.
   affollamento 1-5 serve alla prosa e agli avvisi.                          */
stagioni: [
  { id:"gen",  nome:"Gennaio (dopo il 7)",      mese:1,  volo:0.82, hotel:0.85, affoll:2, tag:["neve"],            nota:"Il periodo più economico dell'anno. Freddo secco a Tokyo, neve al nord." },
  { id:"feb",  nome:"Febbraio",                 mese:2,  volo:0.85, hotel:0.88, affoll:2, tag:["neve"],            nota:"Ancora bassa stagione. Snow Festival a Sapporo (prezzi locali alti)." },
  { id:"mar",  nome:"Marzo",                    mese:3,  volo:1.05, hotel:1.10, affoll:4, tag:["sakura"],          nota:"Fine marzo entra nella fioritura: i prezzi salgono di settimana in settimana." },
  { id:"apr1", nome:"Aprile 1-25 (sakura)",     mese:4,  volo:1.30, hotel:1.35, affoll:5, tag:["sakura"],          nota:"Picco assoluto. Alberghi da prenotare 6+ mesi prima." },
  { id:"gw",   nome:"26 apr - 6 mag (Golden Week)", mese:4, volo:1.50, hotel:1.55, affoll:5, tag:[],               nota:"Golden Week: mezzo Giappone è in viaggio. Da evitare se puoi." },
  { id:"mag",  nome:"Metà maggio - giugno",     mese:5,  volo:0.95, hotel:0.98, affoll:2, tag:["natura"],          nota:"Il miglior rapporto qualità/prezzo dell'anno. Da metà giugno arriva la stagione delle piogge." },
  { id:"lug",  nome:"Luglio",                   mese:7,  volo:1.20, hotel:1.15, affoll:4, tag:["mare","matsuri"],  nota:"Caldo umido pesante. Stagione dei matsuri e dei fuochi d'artificio." },
  { id:"obon", nome:"10-18 agosto (Obon)",      mese:8,  volo:1.40, hotel:1.45, affoll:5, tag:["matsuri"],         nota:"Obon: treni e hotel pieni, i giapponesi tornano a casa." },
  { id:"ago",  nome:"Agosto (fuori Obon)",      mese:8,  volo:1.28, hotel:1.20, affoll:4, tag:["mare","matsuri"],  nota:"Caldo estremo in città. Ottimo per Hokkaido e montagna." },
  { id:"set",  nome:"Settembre",                mese:9,  volo:1.00, hotel:1.00, affoll:3, tag:[],                  nota:"Ancora caldo, rischio tifoni, ma prezzi normali." },
  { id:"ott",  nome:"Ottobre",                  mese:10, volo:1.08, hotel:1.08, affoll:3, tag:["foliage"],         nota:"Clima perfetto. Il foliage inizia dal nord." },
  { id:"nov",  nome:"Novembre (foliage)",       mese:11, volo:1.22, hotel:1.28, affoll:5, tag:["foliage"],         nota:"Kyoto a novembre è la seconda alta stagione dopo la sakura." },
  { id:"dic",  nome:"Dicembre (fino al 24)",    mese:12, volo:0.90, hotel:0.92, affoll:2, tag:["illuminazioni"],   nota:"Sottovalutato: freddo ma limpido, illuminazioni ovunque, poca gente." },
  { id:"cap",  nome:"25 dic - 5 gen (Capodanno)", mese:12, volo:1.45, hotel:1.40, affoll:5, tag:[],                nota:"Capodanno: molti musei e ristoranti chiusi 1-3 gennaio." }
],

/* ------------------------------------------------------------------- PASS */
pass: [
  { id:"jr7",  nome:"Japan Rail Pass 7 giorni",  giorni:7,  yen:50000,  c:"S", d:"2023-10" },
  { id:"jr14", nome:"Japan Rail Pass 14 giorni", giorni:14, yen:80000,  c:"S", d:"2023-10" },
  { id:"jr21", nome:"Japan Rail Pass 21 giorni", giorni:21, yen:100000, c:"S", d:"2023-10" }
],

/* ------------------------------------------------------ CIBO E TRASPORTO LOCALE
   yen a persona al giorno.                                                     */
cibo: {
  essenziale: { yen:2900, desc:"konbini a colazione, gyudon o ramen a pranzo, izakaya economica la sera" },
  equilibrato:{ yen:5800, desc:"colazione al bar, pranzo in trattoria, cena in ristorante normale, un dolce" },
  comodo:     { yen:12000, desc:"colazione in hotel, pranzo scelto, una cena importante ogni 2-3 giorni" }
},
trasporto_locale_yen_giorno: 850,
transfer_aeroporto_yen: 3400,

/* ------------------------------------------------------------------ EXTRA
   in EURO a persona, per l'intero viaggio.                                  */
extra: {
  assicurazione_giorno: 3.2,
  esim: 22,
  visto: 0,
  souvenir: { essenziale:90, equilibrato:260, comodo:700 },
  imprevisti_perc: 0.05
},

/* ------------------------------------------------------------------ CITTA */
citta: [
  { id:"tokyo", iconica:true,     nome:"Tokyo",         lat:35.68, lon:139.76, hub:true,  aeroporto:true,
    alloggio:{ostello:4000,business:7000,medio:12000,alto:24000}, cibo_mod:1.10, c:"S" },
  { id:"kyoto", iconica:true,     nome:"Kyoto",         lat:35.01, lon:135.77, hub:true,
    alloggio:{ostello:4200,business:7500,medio:13000,alto:28000}, cibo_mod:1.05, c:"S" },
  { id:"osaka", iconica:true,     nome:"Osaka",         lat:34.69, lon:135.50, hub:true,  aeroporto:true,
    alloggio:{ostello:3400,business:6200,medio:10500,alto:21000}, cibo_mod:1.00, c:"S" },
  { id:"nara", iconica:true,      nome:"Nara",          lat:34.69, lon:135.80,
    alloggio:{ostello:3200,business:6000,medio:10000,alto:20000}, cibo_mod:0.95, c:"S" },
  { id:"hakone",    nome:"Hakone",        lat:35.23, lon:139.02,
    alloggio:{ostello:4500,business:8500,medio:16000,alto:38000}, cibo_mod:1.10, c:"S" },
  { id:"kamakura",  nome:"Kamakura",      lat:35.32, lon:139.55,
    alloggio:{ostello:3800,business:7000,medio:12000,alto:24000}, cibo_mod:1.00, c:"S" },
  { id:"nikko",     nome:"Nikko",         lat:36.75, lon:139.60,
    alloggio:{ostello:3500,business:6500,medio:12000,alto:26000}, cibo_mod:0.95, c:"S" },
  { id:"kanazawa",  nome:"Kanazawa",      lat:36.56, lon:136.66,
    alloggio:{ostello:3400,business:6500,medio:11000,alto:24000}, cibo_mod:1.00, c:"S" },
  { id:"takayama",  nome:"Takayama",      lat:36.14, lon:137.25,
    alloggio:{ostello:3600,business:7000,medio:13000,alto:30000}, cibo_mod:1.00, c:"S" },
  { id:"shirakawa", nome:"Shirakawa-go",  lat:36.26, lon:136.90,
    alloggio:{ostello:0,business:0,medio:16000,alto:26000}, cibo_mod:1.05, c:"S" },
  { id:"matsumoto", nome:"Matsumoto",     lat:36.24, lon:137.97,
    alloggio:{ostello:3200,business:6000,medio:10000,alto:20000}, cibo_mod:0.95, c:"S" },
  { id:"fuji",      nome:"Kawaguchiko (Fuji)", lat:35.50, lon:138.75,
    alloggio:{ostello:4000,business:8000,medio:15000,alto:34000}, cibo_mod:1.05, c:"S" },
  { id:"nagoya",    nome:"Nagoya",        lat:35.17, lon:136.88, hub:true,
    alloggio:{ostello:3200,business:6000,medio:10000,alto:20000}, cibo_mod:0.95, c:"S" },
  { id:"hiroshima", iconica:true, nome:"Hiroshima",     lat:34.39, lon:132.46, hub:true,
    alloggio:{ostello:3200,business:6000,medio:10500,alto:21000}, cibo_mod:0.95, c:"S" },
  { id:"himeji",    nome:"Himeji",        lat:34.83, lon:134.69,
    alloggio:{ostello:3000,business:5800,medio:9500,alto:18000}, cibo_mod:0.90, c:"S" },
  { id:"okayama",   nome:"Okayama",       lat:34.66, lon:133.92,
    alloggio:{ostello:3000,business:5800,medio:9500,alto:19000}, cibo_mod:0.90, c:"S" },
  { id:"naoshima",  nome:"Naoshima",      lat:34.46, lon:133.99,
    alloggio:{ostello:4500,business:0,medio:15000,alto:34000}, cibo_mod:1.10, c:"S" },
  { id:"koyasan",   nome:"Koyasan",       lat:34.21, lon:135.58,
    alloggio:{ostello:0,business:0,medio:14000,alto:26000}, cibo_mod:1.00, c:"S" },
  { id:"fukuoka",   nome:"Fukuoka",       lat:33.59, lon:130.40, hub:true, aeroporto:true,
    alloggio:{ostello:3000,business:5800,medio:10000,alto:20000}, cibo_mod:0.95, c:"S" },
  { id:"nagasaki",  nome:"Nagasaki",      lat:32.75, lon:129.87,
    alloggio:{ostello:3000,business:5800,medio:10000,alto:20000}, cibo_mod:0.95, c:"S" },
  { id:"beppu",     nome:"Beppu / Yufuin",lat:33.28, lon:131.49,
    alloggio:{ostello:3200,business:6500,medio:13000,alto:30000}, cibo_mod:0.95, c:"S" },
  { id:"sapporo",   nome:"Sapporo",       lat:43.06, lon:141.35, hub:true, aeroporto:true,
    alloggio:{ostello:3200,business:6200,medio:11000,alto:22000}, cibo_mod:1.00, c:"S" },
  { id:"sendai",    nome:"Sendai",        lat:38.27, lon:140.87, hub:true,
    alloggio:{ostello:3000,business:5800,medio:9800,alto:19000}, cibo_mod:0.95, c:"S" },
  { id:"naha",      nome:"Naha (Okinawa)",lat:26.21, lon:127.68, aeroporto:true,
    alloggio:{ostello:3200,business:6500,medio:12000,alto:28000}, cibo_mod:0.95, c:"S" },
  { id:"chichibu",  nome:"Chichibu",      lat:35.99, lon:139.08,
    alloggio:{ostello:3200,business:6000,medio:10000,alto:20000}, cibo_mod:0.90, c:"S" },
  { id:"tottori",   nome:"Tottori",       lat:35.50, lon:134.24,
    alloggio:{ostello:3000,business:5800,medio:9500,alto:18000}, cibo_mod:0.90, c:"S" }
],

/* ------------------------------------------------------------------ TRATTE
   Bidirezionali. min = minuti porta a porta stazione-stazione.
   jr = coperta dal Japan Rail Pass.
   Se una coppia non è in tabella il motore stima su distanza (marcata "stimata").
   NOTA: il pass ordinario non copre i Nozomi/Mizuho; qui è semplificato
   assumendo l'uso di Hikari/Sakura (stessi percorsi, 20-30 min in più).       */
tratte: [
  { a:"tokyo", b:"kyoto",      min:165, yen:13900, jr:true,  mezzo:"Shinkansen Hikari", c:"S" },
  { a:"tokyo", b:"osaka",      min:180, yen:14600, jr:true,  mezzo:"Shinkansen Hikari", c:"S" },
  { a:"tokyo", b:"nagoya",     min:105, yen:11300, jr:true,  mezzo:"Shinkansen", c:"S" },
  { a:"tokyo", b:"hiroshima",  min:260, yen:19800, jr:true,  mezzo:"Shinkansen", c:"S" },
  { a:"tokyo", b:"fukuoka",    min:320, yen:23400, jr:true,  mezzo:"Shinkansen", c:"S" },
  { a:"tokyo", b:"sendai",     min:95,  yen:11200, jr:true,  mezzo:"Shinkansen", c:"S" },
  { a:"tokyo", b:"kanazawa",   min:155, yen:14400, jr:true,  mezzo:"Shinkansen", c:"S" },
  { a:"tokyo", b:"matsumoto",  min:165, yen:6900,  jr:true,  mezzo:"Ltd Express Azusa", c:"S" },
  { a:"tokyo", b:"hakone",     min:95,  yen:2400,  jr:false, mezzo:"Odakyu Romancecar", c:"S" },
  { a:"tokyo", b:"kamakura",   min:60,  yen:950,   jr:true,  mezzo:"JR Yokosuka", c:"S" },
  { a:"tokyo", b:"nikko",      min:120, yen:2900,  jr:false, mezzo:"Tobu Spacia", c:"S" },
  { a:"tokyo", b:"fuji",       min:130, yen:2100,  jr:false, mezzo:"bus da Shinjuku", c:"S" },
  { a:"tokyo", b:"chichibu",   min:100, yen:1600,  jr:false, mezzo:"Seibu Red Arrow", c:"S" },
  { a:"tokyo", b:"sapporo",    min:230, yen:16000, jr:false, mezzo:"volo interno", c:"S" },
  { a:"tokyo", b:"naha",       min:240, yen:18000, jr:false, mezzo:"volo interno", c:"S" },
  { a:"kyoto", b:"osaka",      min:30,  yen:580,   jr:true,  mezzo:"JR Special Rapid", c:"S" },
  { a:"kyoto", b:"nara",       min:45,  yen:720,   jr:true,  mezzo:"JR Nara Line", c:"S" },
  { a:"kyoto", b:"hiroshima",  min:105, yen:11400, jr:true,  mezzo:"Shinkansen", c:"S" },
  { a:"kyoto", b:"kanazawa",   min:130, yen:7000,  jr:true,  mezzo:"Ltd Express Thunderbird", c:"S" },
  { a:"kyoto", b:"tottori",    min:170, yen:8500,  jr:true,  mezzo:"Ltd Express Super Hakuto", c:"S" },
  { a:"osaka", b:"nara",       min:45,  yen:810,   jr:true,  mezzo:"JR Yamatoji", c:"S" },
  { a:"osaka", b:"himeji",     min:45,  yen:3400,  jr:true,  mezzo:"Shinkansen", c:"S" },
  { a:"osaka", b:"hiroshima",  min:95,  yen:10600, jr:true,  mezzo:"Shinkansen", c:"S" },
  { a:"osaka", b:"fukuoka",    min:155, yen:16000, jr:true,  mezzo:"Shinkansen", c:"S" },
  { a:"osaka", b:"koyasan",    min:110, yen:2100,  jr:false, mezzo:"Nankai + funicolare", c:"S" },
  { a:"osaka", b:"naha",       min:220, yen:16000, jr:false, mezzo:"volo interno", c:"S" },
  { a:"himeji",b:"okayama",    min:25,  yen:3400,  jr:true,  mezzo:"Shinkansen", c:"S" },
  { a:"okayama",b:"naoshima",  min:75,  yen:1900,  jr:false, mezzo:"JR + traghetto", c:"S" },
  { a:"okayama",b:"hiroshima", min:40,  yen:6000,  jr:true,  mezzo:"Shinkansen", c:"S" },
  { a:"hiroshima",b:"fukuoka", min:65,  yen:9000,  jr:true,  mezzo:"Shinkansen", c:"S" },
  { a:"fukuoka",b:"nagasaki",  min:95,  yen:5100,  jr:true,  mezzo:"Kamome + Shinkansen", c:"S" },
  { a:"fukuoka",b:"beppu",     min:130, yen:6000,  jr:true,  mezzo:"Ltd Express Sonic", c:"S" },
  { a:"nagoya", b:"takayama",  min:145, yen:6200,  jr:true,  mezzo:"Ltd Express Hida", c:"S" },
  { a:"nagoya", b:"kyoto",     min:40,  yen:5900,  jr:true,  mezzo:"Shinkansen", c:"S" },
  { a:"nagoya", b:"matsumoto", min:125, yen:6500,  jr:true,  mezzo:"Ltd Express Shinano", c:"S" },
  { a:"kanazawa",b:"takayama", min:145, yen:4300,  jr:false, mezzo:"bus Nohi", c:"S" },
  { a:"kanazawa",b:"shirakawa",min:80,  yen:2200,  jr:false, mezzo:"bus", c:"S" },
  { a:"takayama",b:"shirakawa",min:55,  yen:2600,  jr:false, mezzo:"bus Nohi", c:"S" },
  { a:"sendai", b:"sapporo",   min:250, yen:24000, jr:true,  mezzo:"Shinkansen + Ltd Express", c:"S" },
  { a:"matsumoto",b:"kanazawa",min:190, yen:9000,  jr:false, mezzo:"bus + treno", c:"S" }
],

/* ------------------------------------------------------------------ LUOGHI
   ore  = durata tipica della visita
   yen  = biglietto/spesa a persona (0 = gratis)
   solo = mesi in cui ESISTE (vuoto = sempre)
   top  = mesi in cui dà il meglio (bonus di punteggio)
   anime= id serie in .anime                                                  */
luoghi: [
  /* --- TOKYO ------------------------------------------------------------ */
  { id:"shibuya",    citta:"tokyo", nome:"Incrocio di Shibuya e Hachiko", tag:["gratis","notturno","panorama"], ore:1.5, yen:0, nota:"Da vedere due volte: di giorno e alle 21." },
  { id:"sensoji",    citta:"tokyo", nome:"Senso-ji e Nakamise ad Asakusa", tag:["templi","tradizione","gratis"], ore:2.5, yen:0 },
  { id:"akihabara",  citta:"tokyo", nome:"Akihabara: elettronica, gachapon, maid cafe", tag:["anime","retrogaming","shopping"], ore:4, yen:2000 },
  { id:"nakano",     citta:"tokyo", nome:"Nakano Broadway (usato da collezionisti)", tag:["anime","retrogaming","shopping","insolito"], ore:3, yen:0 },
  { id:"superpotato",citta:"tokyo", nome:"Super Potato, tempio del retrogaming", tag:["retrogaming","anime","shopping"], ore:1.5, yen:1500 },
  { id:"teamlab",    citta:"tokyo", nome:"teamLab (arte digitale immersiva)", tag:["arte","musei","insolito"], ore:3, yen:3800, c:"S" },
  { id:"skytree",    citta:"tokyo", nome:"Tokyo Skytree", tag:["panorama","kids"], ore:2, yen:2100, c:"S" },
  { id:"meiji",      citta:"tokyo", nome:"Meiji Jingu e Harajuku", tag:["templi","natura","gratis","shopping"], ore:3, yen:0 },
  { id:"ghiblimus",  citta:"tokyo", nome:"Museo Ghibli a Mitaka", tag:["anime","musei","kids"], ore:3, yen:1000, anime:"ghibli", nota:"Biglietti a estrazione, si comprano il 10 del mese precedente.", c:"S" },
  { id:"goldengai",  citta:"tokyo", nome:"Golden Gai e Omoide Yokocho di notte", tag:["notturno","cibo","insolito"], ore:3, yen:4000 },
  { id:"tsukiji",    citta:"tokyo", nome:"Mercato esterno di Tsukiji", tag:["cibo","tradizione"], ore:2.5, yen:2500 },
  { id:"toyosu",     citta:"tokyo", nome:"Asta del tonno a Toyosu (alba)", tag:["cibo","insolito"], ore:3, yen:0, nota:"Sveglia alle 4. Ne vale la pena una volta nella vita." },
  { id:"yanaka",     citta:"tokyo", nome:"Yanaka: la Tokyo di prima della guerra", tag:["tradizione","gratis","insolito"], ore:3, yen:0 },
  { id:"shimokita",  citta:"tokyo", nome:"Shimokitazawa: vintage e caffè", tag:["shopping","gratis","insolito"], ore:3, yen:0 },
  { id:"suga",       citta:"tokyo", nome:"Scalinata di Suga Jinja (Your Name)", tag:["anime","gratis"], ore:1, yen:0, anime:"kiminonawa" },
  { id:"shibuyajjk", citta:"tokyo", nome:"Shibuya di Jujutsu Kaisen", tag:["anime","gratis","notturno"], ore:1.5, yen:0, anime:"jjk" },
  { id:"azabu",      citta:"tokyo", nome:"Azabu-Juban di Sailor Moon", tag:["anime","gratis"], ore:1.5, yen:0, anime:"sailormoon" },
  { id:"doraemon",   citta:"tokyo", nome:"Museo Fujiko F. Fujio (Doraemon), Kawasaki", tag:["anime","musei","kids"], ore:3, yen:1000, anime:"doraemon", c:"S" },
  { id:"ueno",       citta:"tokyo", nome:"Parco di Ueno e Museo Nazionale", tag:["musei","storia","sakura"], ore:3.5, yen:1000, top:[3,4], c:"S" },
  { id:"sumo",       citta:"tokyo", nome:"Torneo di sumo al Ryogoku Kokugikan", tag:["tradizione","insolito"], ore:4, yen:4500, solo:[1,5,9], c:"S" },

  /* --- KYOTO ------------------------------------------------------------ */
  { id:"fushimi",    citta:"kyoto", nome:"Fushimi Inari all'alba", tag:["templi","hiking","gratis","panorama"], ore:3, yen:0, nota:"Alle 6:30 è vuoto. Alle 10 è una fila." },
  { id:"kinkakuji",  citta:"kyoto", nome:"Kinkaku-ji, il padiglione d'oro", tag:["templi","storia"], ore:1.5, yen:500, c:"S" },
  { id:"arashiyama", citta:"kyoto", nome:"Bambuseto di Arashiyama e Tenryu-ji", tag:["natura","templi","foliage"], ore:4, yen:800, top:[11], c:"S" },
  { id:"gion",       citta:"kyoto", nome:"Gion e Pontocho la sera", tag:["tradizione","notturno","gratis"], ore:2.5, yen:0 },
  { id:"kiyomizu",   citta:"kyoto", nome:"Kiyomizu-dera e Higashiyama", tag:["templi","panorama","foliage","sakura"], ore:3.5, yen:400, top:[4,11], c:"S" },
  { id:"nishiki",    citta:"kyoto", nome:"Mercato di Nishiki", tag:["cibo","tradizione"], ore:2, yen:2500 },
  { id:"tea",        citta:"kyoto", nome:"Cerimonia del tè con maestro", tag:["tradizione","insolito"], ore:2, yen:4500, c:"S" },
  { id:"kimono",     citta:"kyoto", nome:"Noleggio kimono per la giornata", tag:["tradizione","shopping","kids"], ore:1, yen:5000, c:"S" },
  { id:"toei",       citta:"kyoto", nome:"Toei Kyoto Studio Park (set dei samurai)", tag:["anime","kids","storia"], ore:4, yen:2400, anime:"kenshin", c:"S" },
  { id:"philosopher",citta:"kyoto", nome:"Sentiero della filosofia", tag:["natura","gratis","sakura","foliage"], ore:2, yen:0, top:[4,11] },

  /* --- OSAKA ------------------------------------------------------------ */
  { id:"dotonbori",  citta:"osaka", nome:"Dotonbori e il Glico Man", tag:["notturno","cibo","gratis"], ore:3, yen:2500 },
  { id:"osakajo",    citta:"osaka", nome:"Castello di Osaka", tag:["storia","sakura"], ore:2.5, yen:600, top:[4], c:"S" },
  { id:"kuromon",    citta:"osaka", nome:"Mercato Kuromon", tag:["cibo"], ore:2, yen:3000 },
  { id:"shinsekai",  citta:"osaka", nome:"Shinsekai e kushikatsu", tag:["cibo","insolito","notturno"], ore:3, yen:3000 },
  { id:"usj",        citta:"osaka", nome:"Universal Studios Japan (Nintendo World)", tag:["kids","anime","parchi"], ore:10, yen:9400, c:"S" },
  { id:"dendentown", citta:"osaka", nome:"Den-Den Town, l'Akihabara di Osaka", tag:["anime","retrogaming","shopping"], ore:3, yen:1500 },

  /* --- NARA / KOYASAN --------------------------------------------------- */
  { id:"todaiji",    citta:"nara",  nome:"Todai-ji e il Grande Buddha", tag:["templi","storia"], ore:2.5, yen:800, c:"S" },
  { id:"naradeer",   citta:"nara",  nome:"Parco dei cervi di Nara", tag:["natura","gratis","kids"], ore:2, yen:200 },
  { id:"okunoin",    citta:"koyasan",nome:"Okunoin di notte, il cimitero nella foresta", tag:["templi","insolito","natura","gratis"], ore:2.5, yen:0 },
  { id:"shukubo",    citta:"koyasan",nome:"Notte in tempio con cena shojin e cerimonia all'alba", tag:["tradizione","templi","insolito"], ore:3, yen:0, nota:"Il costo è nell'alloggio, non nell'attività." },

  /* --- HAKONE / FUJI ---------------------------------------------------- */
  { id:"owakudani",  citta:"hakone",nome:"Owakudani e la funivia sulle solfatare", tag:["natura","panorama"], ore:3, yen:2500, c:"S" },
  { id:"hakoneopen", citta:"hakone",nome:"Hakone Open Air Museum", tag:["arte","musei","natura"], ore:2.5, yen:1600, c:"S" },
  { id:"onsenhakone",citta:"hakone",nome:"Onsen con vista (day use)", tag:["onsen","natura"], ore:2.5, yen:2000, c:"S" },
  { id:"eva",        citta:"hakone",nome:"Hakone = Tokyo-3: i luoghi di Evangelion", tag:["anime","gratis","panorama"], ore:3, yen:0, anime:"eva" },
  { id:"ashi",       citta:"hakone",nome:"Lago Ashi e il torii sull'acqua", tag:["panorama","natura"], ore:2, yen:1200, c:"S" },
  { id:"chureito",   citta:"fuji",  nome:"Pagoda Chureito col Fuji dietro", tag:["panorama","sakura","gratis"], ore:2, yen:0, top:[4,11] },
  { id:"kawaguchi",  citta:"fuji",  nome:"Giro del lago Kawaguchi in bici", tag:["natura","panorama"], ore:4, yen:1500 },
  { id:"yurucamp",   citta:"fuji",  nome:"I campeggi di Yuru Camp", tag:["anime","natura","hiking"], ore:4, yen:1000, anime:"yurucamp" },
  { id:"fujisan",    citta:"fuji",  nome:"Salita al monte Fuji (notte in rifugio)", tag:["hiking","natura","insolito"], ore:14, yen:12000, solo:[7,8,9], c:"S" },

  /* --- CENTRO: KANAZAWA, TAKAYAMA, ALPI --------------------------------- */
  { id:"kenrokuen",  citta:"kanazawa",nome:"Giardino Kenroku-en", tag:["natura","tradizione","foliage","neve"], ore:2, yen:320, top:[11,1], c:"S" },
  { id:"chaya",      citta:"kanazawa",nome:"Quartiere delle geisha Higashi Chaya", tag:["tradizione","gratis"], ore:2, yen:0 },
  { id:"museo21",    citta:"kanazawa",nome:"21st Century Museum of Contemporary Art", tag:["arte","musei"], ore:2.5, yen:450, c:"S" },
  { id:"omicho",     citta:"kanazawa",nome:"Mercato Omicho: granchio e ricci", tag:["cibo"], ore:1.5, yen:3500 },
  { id:"takayamaold",citta:"takayama",nome:"Sanmachi, la città vecchia di Takayama", tag:["tradizione","gratis","cibo"], ore:3, yen:0 },
  { id:"hidabeef",   citta:"takayama",nome:"Manzo di Hida alla griglia", tag:["cibo"], ore:1.5, yen:5000, c:"S" },
  { id:"hyouka",     citta:"takayama",nome:"I luoghi di Hyouka a Takayama", tag:["anime","gratis"], ore:2, yen:0, anime:"hyouka" },
  { id:"hidafuru",   citta:"takayama",nome:"Hida-Furukawa: la stazione di Your Name", tag:["anime","gratis","tradizione"], ore:3, yen:600, anime:"kiminonawa" },
  { id:"gassho",     citta:"shirakawa",nome:"Villaggio gassho-zukuri di Shirakawa-go", tag:["tradizione","natura","neve","foliage"], ore:4, yen:600, top:[1,2,11], c:"S" },
  { id:"matsucastle",citta:"matsumoto",nome:"Castello di Matsumoto (originale, non ricostruito)", tag:["storia","panorama"], ore:2, yen:700, c:"S" },

  /* --- OVEST: HIROSHIMA, HIMEJI, SETO ----------------------------------- */
  { id:"peacepark",  citta:"hiroshima",nome:"Memoriale della Pace e museo", tag:["storia","musei"], ore:3, yen:200, c:"S" },
  { id:"miyajima",   citta:"hiroshima",nome:"Miyajima e il torii nell'acqua", tag:["templi","natura","panorama","foliage"], ore:5, yen:800, top:[11], c:"S" },
  { id:"okonomi",    citta:"hiroshima",nome:"Okonomiyaki stile Hiroshima", tag:["cibo"], ore:1.5, yen:1500 },
  { id:"himejijo",   citta:"himeji", nome:"Castello di Himeji", tag:["storia","panorama","sakura"], ore:3, yen:1000, top:[4], c:"S" },
  { id:"korakuen",   citta:"okayama",nome:"Giardino Korakuen", tag:["natura","tradizione"], ore:2, yen:500, c:"S" },
  { id:"chichu",     citta:"naoshima",nome:"Chichu Art Museum e la zucca di Kusama", tag:["arte","musei","mare","insolito"], ore:5, yen:2100, c:"S" },

  /* --- KYUSHU ----------------------------------------------------------- */
  { id:"yatai",      citta:"fukuoka",nome:"Yatai: cena nei chioschi lungo il fiume", tag:["cibo","notturno","insolito"], ore:2.5, yen:3500 },
  { id:"dazaifu",    citta:"fukuoka",nome:"Dazaifu e il santuario Kamado (Demon Slayer)", tag:["anime","templi","natura"], ore:4, yen:500, anime:"kimetsu" },
  { id:"gunkanjima", citta:"nagasaki",nome:"Gunkanjima, l'isola-nave abbandonata", tag:["insolito","storia","mare"], ore:4, yen:4500, c:"S" },
  { id:"glover",     citta:"nagasaki",nome:"Glover Garden e la Nagasaki europea", tag:["storia","panorama"], ore:3, yen:620, c:"S" },
  { id:"jigoku",     citta:"beppu", nome:"Gli otto inferni di Beppu", tag:["onsen","natura","insolito"], ore:3, yen:2200, c:"S" },
  { id:"sunabath",   citta:"beppu", nome:"Bagno di sabbia vulcanica", tag:["onsen","insolito"], ore:1.5, yen:1500, c:"S" },

  /* --- NORD ------------------------------------------------------------- */
  { id:"snowfest",   citta:"sapporo",nome:"Snow Festival di Sapporo", tag:["neve","insolito"], ore:4, yen:0, solo:[2] },
  { id:"otaru",      citta:"sapporo",nome:"Otaru: canale, vetrerie, sushi", tag:["tradizione","cibo","neve"], ore:5, yen:2500 },
  { id:"niseko",     citta:"sapporo",nome:"Sci a Niseko (giornaliero)", tag:["neve","hiking"], ore:8, yen:9000, solo:[12,1,2,3], c:"S" },
  { id:"furano",     citta:"sapporo",nome:"Campi di lavanda di Furano", tag:["natura","panorama"], ore:6, yen:1500, solo:[7,8] },
  { id:"matsushima", citta:"sendai",nome:"Baia di Matsushima in barca", tag:["mare","natura","panorama"], ore:4, yen:1800, c:"S" },
  { id:"haikyuu",    citta:"sendai",nome:"I luoghi di Haikyuu in Miyagi", tag:["anime","gratis"], ore:3, yen:0, anime:"haikyuu" },
  { id:"gyutan",     citta:"sendai",nome:"Gyutan, lingua di manzo alla griglia", tag:["cibo"], ore:1.5, yen:2200 },

  /* --- ALTRO ------------------------------------------------------------ */
  { id:"ghiblipark", citta:"nagoya",nome:"Ghibli Park a Nagakute", tag:["anime","kids","parchi"], ore:6, yen:3500, anime:"ghibli", c:"S" },
  { id:"toyotamus",  citta:"nagoya",nome:"Museo Toyota dell'industria e della tecnica", tag:["musei","insolito","kids"], ore:3, yen:1000, c:"S" },
  { id:"anohana",    citta:"chichibu",nome:"I luoghi di Anohana a Chichibu", tag:["anime","gratis","natura"], ore:4, yen:0, anime:"anohana" },
  { id:"shibazakura",citta:"chichibu",nome:"Tappeto di shibazakura a Hitsujiyama", tag:["natura","sakura","panorama"], ore:2, yen:300, solo:[4,5], c:"S" },
  { id:"dune",       citta:"tottori",nome:"Dune di sabbia di Tottori", tag:["natura","insolito","panorama","gratis"], ore:3, yen:0 },
  { id:"conan",      citta:"tottori",nome:"Detective Conan: il paese di Gosho Aoyama", tag:["anime","musei"], ore:3, yen:700, anime:"conan", c:"S" },
  { id:"daibutsu",   citta:"kamakura",nome:"Grande Buddha di Kamakura", tag:["templi","storia"], ore:1.5, yen:300, c:"S" },
  { id:"slamdunk",   citta:"kamakura",nome:"Il passaggio a livello di Slam Dunk", tag:["anime","mare","gratis"], ore:2, yen:0, anime:"slamdunk" },
  { id:"toshogu",    citta:"nikko", nome:"Toshogu e i cedri di Nikko", tag:["templi","storia","natura","foliage"], ore:4, yen:1600, top:[10,11], c:"S" },
  { id:"shuri",      citta:"naha",  nome:"Castello di Shuri e Okinawa antica", tag:["storia","mare"], ore:3, yen:400, c:"S" },
  { id:"churaumi",   citta:"naha",  nome:"Acquario Churaumi", tag:["mare","kids","musei"], ore:4, yen:2200, c:"S" }
],

/* ------------------------------------------------------------------- ANIME
   Il layer che nessun altro calcolatore ha: seichi junrei.                    */
anime: [
  { id:"kiminonawa", nome:"Your Name (Kimi no Na wa)",       luoghi:["suga","hidafuru"] },
  { id:"eva",        nome:"Neon Genesis Evangelion",         luoghi:["eva"] },
  { id:"slamdunk",   nome:"Slam Dunk",                       luoghi:["slamdunk"] },
  { id:"ghibli",     nome:"Studio Ghibli",                   luoghi:["ghiblimus","ghiblipark"] },
  { id:"jjk",        nome:"Jujutsu Kaisen",                  luoghi:["shibuyajjk"] },
  { id:"kimetsu",    nome:"Demon Slayer (Kimetsu no Yaiba)", luoghi:["dazaifu"] },
  { id:"haikyuu",    nome:"Haikyuu!!",                       luoghi:["haikyuu"] },
  { id:"anohana",    nome:"Anohana",                         luoghi:["anohana"] },
  { id:"hyouka",     nome:"Hyouka",                          luoghi:["hyouka"] },
  { id:"yurucamp",   nome:"Yuru Camp",                       luoghi:["yurucamp"] },
  { id:"conan",      nome:"Detective Conan",                 luoghi:["conan"] },
  { id:"sailormoon", nome:"Sailor Moon",                     luoghi:["azabu"] },
  { id:"doraemon",   nome:"Doraemon / Fujiko F. Fujio",      luoghi:["doraemon"] },
  { id:"kenshin",    nome:"Rurouni Kenshin",                 luoghi:["toei"] }
],

/* ---------------------------------------------------------------- INTERESSI
   Il "mazzo di carte". peso = quanto pesa nel punteggio.                      */
interessi: [
  { id:"anime",       nome:"Anime e manga",            desc:"pellegrinaggi nei luoghi delle serie, Akiba, musei" },
  { id:"templi",      nome:"Templi e santuari",        desc:"il Giappone che ti aspetti dalle foto" },
  { id:"cibo",        nome:"Mangiare",                 desc:"mercati, izakaya, street food, una cena seria" },
  { id:"storia",      nome:"Storia e castelli",        desc:"samurai, guerra, periodo Edo" },
  { id:"natura",      nome:"Natura e paesaggi",        desc:"montagne, laghi, giardini, mare" },
  { id:"onsen",       nome:"Onsen e terme",            desc:"bagni caldi, ryokan, relax" },
  { id:"hiking",      nome:"Camminate e trekking",     desc:"sentieri, salite, giornate a piedi" },
  { id:"arte",        nome:"Arte e design",            desc:"musei contemporanei, architettura, isole d'arte" },
  { id:"retrogaming", nome:"Videogiochi e retrogaming",desc:"sale giochi, usato, Nintendo" },
  { id:"shopping",    nome:"Shopping e vintage",       desc:"usato, cartoleria, quartieri di moda" },
  { id:"notturno",    nome:"Notte e vita locale",      desc:"vicoli, bar minuscoli, karaoke" },
  { id:"tradizione",  nome:"Tradizione viva",          desc:"geisha, cerimonia del tè, artigiani, kimono" },
  { id:"neve",        nome:"Neve e inverno",           desc:"sci, festival della neve, onsen nella neve" },
  { id:"mare",        nome:"Mare e isole",             desc:"Okinawa, mare interno, traghetti" },
  { id:"musei",       nome:"Musei",                    desc:"dall'archeologia alla tecnica" },
  { id:"insolito",    nome:"Cose strane",              desc:"posti che nessuno mette in itinerario" },
  { id:"panorama",    nome:"Panorami e foto",          desc:"punti alti, skyline, il Fuji" },
  { id:"kids",        nome:"Adatto ai bambini",        desc:"parchi, acquari, cose che non annoiano" }
]

};
