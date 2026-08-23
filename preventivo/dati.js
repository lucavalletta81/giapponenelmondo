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
  { id:"nov",  nome:"Novembre (foliage)",       mese:11, volo:1.22, hotel:1.28, affoll:5, tag:["foliage"],         nota:"Il foliage: dopo la sakura è il secondo periodo più richiesto dell'anno." },
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
  { id:"ramen",      citta:"tokyo", nome:"Il giro dei ramen: la fila alle undici davanti a un bancone", tag:["cibo","cibo_ramen","insolito"], ore:1.5, yen:1400, nota:"I posti migliori hanno il distributore di biglietti all'ingresso e dieci sgabelli." },
  { id:"kissaten",   citta:"tokyo", nome:"Kissaten a Jinbocho: caffè, fumo e librerie", tag:["cibo","cibo_dolci","tradizione","ins_quartieri"], ore:2, yen:1500 },
  { id:"kaiseki",    citta:"tokyo", nome:"Una cena kaiseki", tag:["cibo","cibo_alta","tradizione"], ore:3, yen:18000, nota:"Si prenota settimane prima e spesso serve che lo faccia l'hotel.", c:"S" },
  { id:"kokyo",      citta:"tokyo", nome:"Palazzo Imperiale e i resti del castello di Edo", tag:["storia","storia_castelli","storia_edo","nat_giardini","gratis"], ore:2.5, yen:0 },
  { id:"nezu",       citta:"tokyo", nome:"Museo Nezu e il suo giardino", tag:["arte","arte_classica","museo_arte","nat_giardini","templi_giardino"], ore:2.5, yen:1500, c:"S" },
  { id:"takao",      citta:"tokyo", nome:"Monte Takao: la montagna dentro Tokyo", tag:["hiking","hike_medio","natura","nat_montagna","templi_nascosti","pano_fuji"], ore:6, yen:1000 },
  { id:"karaokebox", citta:"tokyo", nome:"Karaoke in stanza privata fino a tardi", tag:["notturno","notte_karaoke","kids"], ore:2.5, yen:2500 },
  { id:"teatokyo",   citta:"tokyo", nome:"Cerimonia del tè con un maestro", tag:["tradizione","trad_te","insolito"], ore:2, yen:4500, c:"S" },
  { id:"kimonotokyo",citta:"tokyo", nome:"Kimono per la giornata ad Asakusa", tag:["tradizione","trad_kimono","shopping","kids"], ore:1, yen:4500, c:"S" },
  { id:"itoya",      citta:"tokyo", nome:"Itoya a Ginza: nove piani di sola cartoleria", tag:["shopping","shop_carta","insolito"], ore:1.5, yen:2000 },
  { id:"kappabashi", citta:"tokyo", nome:"Kappabashi: la via dei coltelli e delle stoviglie", tag:["shopping","shop_artigiano","trad_artigiani","cibo"], ore:2, yen:0 },
  { id:"omotesando", citta:"tokyo", nome:"Architettura a Omotesando, a piedi", tag:["arte","arte_archi","shop_moda","gratis","panorama"], ore:2, yen:0 },
  { id:"miraikan",   citta:"tokyo", nome:"Miraikan: robot, spazio, cose da premere", tag:["musei","museo_tecnica","kids","kids_interattivo"], ore:3, yen:630, c:"S" },
  { id:"parassiti",  citta:"tokyo", nome:"Museo dei parassiti a Meguro", tag:["musei","museo_strano","insolito","gratis"], ore:1, yen:0, nota:"Gratuito, minuscolo, e c'è la tenia di otto metri." },
  { id:"kabukiza",   citta:"tokyo", nome:"Kabuki-za: un atto solo, dal loggione", tag:["tradizione","trad_spettacolo","storia"], ore:2, yen:2000, nota:"Il biglietto per un atto si compra il giorno stesso e costa un decimo.", c:"S" },
  { id:"puroland",   citta:"tokyo", nome:"Sanrio Puroland", tag:["kids","kids_parchi","anime","action"], ore:6, yen:4000, c:"S" },
  { id:"sumida",     citta:"tokyo", nome:"Acquario Sumida, sotto la Skytree", tag:["kids","kids_animali","musei","mare"], ore:2.5, yen:2500, c:"S" },
  { id:"uenozoo",    citta:"tokyo", nome:"Zoo di Ueno", tag:["kids","kids_animali","natura"], ore:3, yen:600, c:"S" },
  { id:"radiokaikan",citta:"tokyo", nome:"Radio Kaikan ad Akihabara: dieci piani di figure", tag:["action","anime","shopping","fig_nuovo","fig_kit"], ore:2.5, yen:0, nota:"Kotobukiya, Volks e i negozi di garage kit tutti nello stesso palazzo." },
  { id:"gashapon",   citta:"tokyo", nome:"Gashapon no Depato a Ikebukuro (migliaia di macchinette)", tag:["action","anime","insolito","fig_gasha","kids"], ore:1.5, yen:2000, nota:"Porta monete da 100 yen: le macchinette non danno resto." },
  { id:"otomeroad",  citta:"tokyo", nome:"Otome Road a Ikebukuro", tag:["action","anime","shopping","fig_usato"], ore:2.5, yen:0, nota:"L'Akihabara del pubblico femminile: doujinshi, goods, cafè." },
  { id:"volks",      citta:"tokyo", nome:"Volks Hobby Tengoku: garage kit e modellismo", tag:["action","fig_kit","insolito","shopping"], ore:2, yen:0 },
  { id:"pokecenter", citta:"tokyo", nome:"Pokémon Center e Nintendo Tokyo a Shibuya", tag:["action","retrogaming","kids","shopping","fig_nuovo","game_nintendo"], ore:1.5, yen:3000 },
  { id:"shibuya",    citta:"tokyo", nome:"Incrocio di Shibuya e Hachiko", tag:["gratis","notturno","panorama","notte_luci","pano_notte","shop_moda"], ore:1.5, yen:0, nota:"Da vedere due volte: di giorno e alle 21." },
  { id:"sensoji",    citta:"tokyo", nome:"Senso-ji e Nakamise ad Asakusa", tag:["templi","tradizione","gratis","templi_top","trad_artigiani"], ore:2.5, yen:0 },
  { id:"akihabara",  citta:"tokyo", nome:"Akihabara: elettronica, gachapon, maid cafe", tag:["anime","retrogaming","shopping","action","fig_nuovo","fig_usato","game_arcade"], ore:4, yen:2000 },
  { id:"nakano",     citta:"tokyo", nome:"Nakano Broadway (usato da collezionisti)", tag:["anime","retrogaming","shopping","insolito","action","fig_usato","game_usato"], ore:3, yen:0 },
  { id:"superpotato",citta:"tokyo", nome:"Super Potato, tempio del retrogaming", tag:["retrogaming","anime","shopping","game_usato","game_arcade"], ore:1.5, yen:1500 },
  { id:"teamlab",    citta:"tokyo", nome:"teamLab (arte digitale immersiva)", tag:["arte","musei","insolito","arte_contemp","kids_interattivo","museo_arte"], ore:3, yen:3800, c:"S" },
  { id:"skytree",    citta:"tokyo", nome:"Tokyo Skytree", tag:["panorama","kids","pano_alto","pano_notte","kids_interattivo"], ore:2, yen:2100, c:"S" },
  { id:"meiji",      citta:"tokyo", nome:"Meiji Jingu e Harajuku", tag:["templi","natura","gratis","shopping","templi_top","nat_giardini"], ore:3, yen:0 },
  { id:"ghiblimus",  citta:"tokyo", nome:"Museo Ghibli a Mitaka", tag:["anime","musei","kids","museo_anime","kids_interattivo"], ore:3, yen:1000, anime:"ghibli", nota:"Biglietti a estrazione, si comprano il 10 del mese precedente.", c:"S" },
  { id:"goldengai",  citta:"tokyo", nome:"Golden Gai e Omoide Yokocho di notte", tag:["notturno","cibo","insolito","notte_vicoli","notte_bar","cibo_izakaya"], ore:3, yen:4000 },
  { id:"tsukiji",    citta:"tokyo", nome:"Mercato esterno di Tsukiji", tag:["cibo","tradizione","cibo_street","cibo_sushi","shop_artigiano"], ore:2.5, yen:2500 },
  { id:"toyosu",     citta:"tokyo", nome:"Asta del tonno a Toyosu (alba)", tag:["cibo","insolito","cibo_sushi","ins_esperienze"], ore:3, yen:0, nota:"Sveglia alle 4. Ne vale la pena una volta nella vita." },
  { id:"yanaka",     citta:"tokyo", nome:"Yanaka: la Tokyo di prima della guerra", tag:["tradizione","gratis","insolito","ins_quartieri","trad_artigiani","templi_nascosti"], ore:3, yen:0 },
  { id:"shimokita",  citta:"tokyo", nome:"Shimokitazawa: vintage e caffè", tag:["shopping","gratis","insolito","shop_vintage","ins_quartieri","shop_moda"], ore:3, yen:0 },
  { id:"suga",       citta:"tokyo", nome:"Scalinata di Suga Jinja (Your Name)", tag:["anime","gratis"], ore:1, yen:0, anime:"kiminonawa" },
  { id:"shibuyajjk", citta:"tokyo", nome:"Shibuya di Jujutsu Kaisen", tag:["anime","gratis","notturno"], ore:1.5, yen:0, anime:"jjk" },
  { id:"azabu",      citta:"tokyo", nome:"Azabu-Juban di Sailor Moon", tag:["anime","gratis"], ore:1.5, yen:0, anime:"sailormoon" },
  { id:"doraemon",   citta:"tokyo", nome:"Museo Fujiko F. Fujio (Doraemon), Kawasaki", tag:["anime","musei","kids","museo_anime","kids_interattivo"], ore:3, yen:1000, anime:"doraemon", c:"S" },
  { id:"ueno",       citta:"tokyo", nome:"Parco di Ueno e Museo Nazionale", tag:["musei","storia","sakura","museo_storia","museo_arte","nat_fiori"], ore:3.5, yen:1000, top:[3,4], c:"S" },
  { id:"sumo",       citta:"tokyo", nome:"Torneo di sumo al Ryogoku Kokugikan", tag:["tradizione","insolito","trad_spettacolo","ins_esperienze"], ore:4, yen:4500, solo:[1,5,9], c:"S" },

  /* --- KYOTO ------------------------------------------------------------ */
  { id:"fushimi",    citta:"kyoto", nome:"Fushimi Inari all'alba", tag:["templi","hiking","gratis","panorama","templi_top","hike_facile"], ore:3, yen:0, nota:"Alle 6:30 è vuoto. Alle 10 è una fila." },
  { id:"kinkakuji",  citta:"kyoto", nome:"Kinkaku-ji, il padiglione d'oro", tag:["templi","storia","templi_top","templi_giardino"], ore:1.5, yen:500, c:"S" },
  { id:"arashiyama", citta:"kyoto", nome:"Bambuseto di Arashiyama e Tenryu-ji", tag:["natura","templi","foliage","nat_giardini","templi_giardino"], ore:4, yen:800, top:[11], c:"S" },
  { id:"gion",       citta:"kyoto", nome:"Gion e Pontocho la sera", tag:["tradizione","notturno","gratis","trad_artigiani","notte_vicoli"], ore:2.5, yen:0 },
  { id:"kiyomizu",   citta:"kyoto", nome:"Kiyomizu-dera e Higashiyama", tag:["templi","panorama","foliage","sakura","templi_top"], ore:3.5, yen:400, top:[4,11], c:"S" },
  { id:"nishiki",    citta:"kyoto", nome:"Mercato di Nishiki", tag:["cibo","tradizione","cibo_street"], ore:2, yen:2500 },
  { id:"tea",        citta:"kyoto", nome:"Cerimonia del tè con maestro", tag:["tradizione","insolito","trad_te"], ore:2, yen:4500, c:"S" },
  { id:"kimono",     citta:"kyoto", nome:"Noleggio kimono per la giornata", tag:["tradizione","shopping","kids","trad_kimono"], ore:1, yen:5000, c:"S" },
  { id:"toei",       citta:"kyoto", nome:"Toei Kyoto Studio Park (set dei samurai)", tag:["anime","kids","storia","storia_edo"], ore:4, yen:2400, anime:"kenshin", c:"S" },
  { id:"philosopher",citta:"kyoto", nome:"Sentiero della filosofia", tag:["natura","gratis","sakura","foliage","nat_fiori"], ore:2, yen:0, top:[4,11] },

  /* --- OSAKA ------------------------------------------------------------ */
  { id:"dotonbori",  citta:"osaka", nome:"Dotonbori e il Glico Man", tag:["notturno","cibo","gratis","cibo_street","notte_luci"], ore:3, yen:2500 },
  { id:"osakajo",    citta:"osaka", nome:"Castello di Osaka", tag:["storia","sakura","storia_castelli"], ore:2.5, yen:600, top:[4], c:"S" },
  { id:"kuromon",    citta:"osaka", nome:"Mercato Kuromon", tag:["cibo","cibo_street"], ore:2, yen:3000 },
  { id:"shinsekai",  citta:"osaka", nome:"Shinsekai e kushikatsu", tag:["cibo","insolito","notturno"], ore:3, yen:3000 },
  { id:"usj",        citta:"osaka", nome:"Universal Studios Japan (Nintendo World)", tag:["kids","anime","parchi","kids_parchi","game_nintendo"], ore:10, yen:9400, c:"S" },
  { id:"dendentown", citta:"osaka", nome:"Den-Den Town, l'Akihabara di Osaka", tag:["anime","retrogaming","shopping","action","fig_usato","game_arcade"], ore:3, yen:1500 },

  /* --- NARA / KOYASAN --------------------------------------------------- */
  { id:"todaiji",    citta:"nara",  nome:"Todai-ji e il Grande Buddha", tag:["templi","storia","templi_top"], ore:2.5, yen:800, c:"S" },
  { id:"naradeer",   citta:"nara",  nome:"Parco dei cervi di Nara", tag:["natura","gratis","kids","kids_animali"], ore:2, yen:200 },
  { id:"okunoin",    citta:"koyasan",nome:"Okunoin di notte, il cimitero nella foresta", tag:["templi","insolito","natura","gratis","templi_nascosti"], ore:2.5, yen:0 },
  { id:"shukubo",    citta:"koyasan",nome:"Notte in tempio con cena shojin e cerimonia all'alba", tag:["tradizione","templi","insolito","onsen_ryokan","trad_te"], ore:3, yen:0, nota:"Il costo è nell'alloggio, non nell'attività." },

  /* --- HAKONE / FUJI ---------------------------------------------------- */
  { id:"owakudani",  citta:"hakone",nome:"Owakudani e la funivia sulle solfatare", tag:["natura","panorama","nat_montagna","pano_alto"], ore:3, yen:2500, c:"S" },
  { id:"hakoneopen", citta:"hakone",nome:"Hakone Open Air Museum", tag:["arte","musei","natura","arte_contemp","museo_arte"], ore:2.5, yen:1600, c:"S" },
  { id:"onsenhakone",citta:"hakone",nome:"Onsen con vista (day use)", tag:["onsen","natura","onsen_day","onsen_tattoo"], ore:2.5, yen:2000, c:"S" },
  { id:"eva",        citta:"hakone",nome:"Hakone = Tokyo-3: i luoghi di Evangelion", tag:["anime","gratis","panorama"], ore:3, yen:0, anime:"eva" },
  { id:"ashi",       citta:"hakone",nome:"Lago Ashi e il torii sull'acqua", tag:["panorama","natura","nat_montagna","pano_fuji"], ore:2, yen:1200, c:"S" },
  { id:"chureito",   citta:"fuji",  nome:"Pagoda Chureito col Fuji dietro", tag:["panorama","sakura","gratis","pano_fuji","nat_fiori"], ore:2, yen:0, top:[4,11] },
  { id:"kawaguchi",  citta:"fuji",  nome:"Giro del lago Kawaguchi in bici", tag:["natura","panorama","nat_montagna","pano_fuji","hike_facile"], ore:4, yen:1500 },
  { id:"yurucamp",   citta:"fuji",  nome:"I campeggi di Yuru Camp", tag:["anime","natura","hiking","hike_facile","nat_montagna"], ore:4, yen:1000, anime:"yurucamp" },
  { id:"fujisan",    citta:"fuji",  nome:"Salita al monte Fuji (notte in rifugio)", tag:["hiking","natura","insolito","hike_duro","pano_alto"], ore:14, yen:12000, solo:[7,8,9], c:"S" },

  /* --- CENTRO: KANAZAWA, TAKAYAMA, ALPI --------------------------------- */
  { id:"kenrokuen",  citta:"kanazawa",nome:"Giardino Kenroku-en", tag:["natura","tradizione","foliage","neve","nat_giardini"], ore:2, yen:320, top:[11,1], c:"S" },
  { id:"chaya",      citta:"kanazawa",nome:"Quartiere delle geisha Higashi Chaya", tag:["tradizione","gratis","trad_artigiani"], ore:2, yen:0 },
  { id:"museo21",    citta:"kanazawa",nome:"21st Century Museum of Contemporary Art", tag:["arte","musei","arte_contemp","museo_arte"], ore:2.5, yen:450, c:"S" },
  { id:"omicho",     citta:"kanazawa",nome:"Mercato Omicho: granchio e ricci", tag:["cibo"], ore:1.5, yen:3500 },
  { id:"takayamaold",citta:"takayama",nome:"Sanmachi, la città vecchia di Takayama", tag:["tradizione","gratis","cibo"], ore:3, yen:0 },
  { id:"hidabeef",   citta:"takayama",nome:"Manzo di Hida alla griglia", tag:["cibo","cibo_alta"], ore:1.5, yen:5000, c:"S" },
  { id:"hyouka",     citta:"takayama",nome:"I luoghi di Hyouka a Takayama", tag:["anime","gratis"], ore:2, yen:0, anime:"hyouka" },
  { id:"hidafuru",   citta:"takayama",nome:"Hida-Furukawa: la stazione di Your Name", tag:["anime","gratis","tradizione"], ore:3, yen:600, anime:"kiminonawa" },
  { id:"gassho",     citta:"shirakawa",nome:"Villaggio gassho-zukuri di Shirakawa-go", tag:["tradizione","natura","neve","foliage","neve_paesaggi","trad_artigiani"], ore:4, yen:600, top:[1,2,11], c:"S" },
  { id:"matsucastle",citta:"matsumoto",nome:"Castello di Matsumoto (originale, non ricostruito)", tag:["storia","panorama","storia_castelli"], ore:2, yen:700, c:"S" },

  /* --- OVEST: HIROSHIMA, HIMEJI, SETO ----------------------------------- */
  { id:"peacepark",  citta:"hiroshima",nome:"Memoriale della Pace e museo", tag:["storia","musei","storia_guerra"], ore:3, yen:200, c:"S" },
  { id:"miyajima",   citta:"hiroshima",nome:"Miyajima e il torii nell'acqua", tag:["templi","natura","panorama","foliage","mare_isole","templi_top"], ore:5, yen:800, top:[11], c:"S" },
  { id:"okonomi",    citta:"hiroshima",nome:"Okonomiyaki stile Hiroshima", tag:["cibo","cibo_street"], ore:1.5, yen:1500 },
  { id:"himejijo",   citta:"himeji", nome:"Castello di Himeji", tag:["storia","panorama","sakura","storia_castelli"], ore:3, yen:1000, top:[4], c:"S" },
  { id:"korakuen",   citta:"okayama",nome:"Giardino Korakuen", tag:["natura","tradizione","nat_giardini"], ore:2, yen:500, c:"S" },
  { id:"chichu",     citta:"naoshima",nome:"Chichu Art Museum e la zucca di Kusama", tag:["arte","musei","mare","insolito","mare_isole","arte_contemp","museo_arte"], ore:5, yen:2100, c:"S" },

  /* --- KYUSHU ----------------------------------------------------------- */
  { id:"yatai",      citta:"fukuoka",nome:"Yatai: cena nei chioschi lungo il fiume", tag:["cibo","notturno","insolito","cibo_street","notte_vicoli"], ore:2.5, yen:3500 },
  { id:"dazaifu",    citta:"fukuoka",nome:"Dazaifu e il santuario Kamado (Demon Slayer)", tag:["anime","templi","natura"], ore:4, yen:500, anime:"kimetsu" },
  { id:"gunkanjima", citta:"nagasaki",nome:"Gunkanjima, l'isola-nave abbandonata", tag:["insolito","storia","mare","ins_abbandono","storia_guerra"], ore:4, yen:4500, c:"S" },
  { id:"glover",     citta:"nagasaki",nome:"Glover Garden e la Nagasaki europea", tag:["storia","panorama","storia_guerra"], ore:3, yen:620, c:"S" },
  { id:"jigoku",     citta:"beppu", nome:"Gli otto inferni di Beppu", tag:["onsen","natura","insolito","neve_onsen","onsen_day"], ore:3, yen:2200, c:"S" },
  { id:"sunabath",   citta:"beppu", nome:"Bagno di sabbia vulcanica", tag:["onsen","insolito","onsen_day"], ore:1.5, yen:1500, c:"S" },

  /* --- NORD ------------------------------------------------------------- */
  { id:"snowfest",   citta:"sapporo",nome:"Snow Festival di Sapporo", tag:["neve","insolito","neve_paesaggi"], ore:4, yen:0, solo:[2] },
  { id:"otaru",      citta:"sapporo",nome:"Otaru: canale, vetrerie, sushi", tag:["tradizione","cibo","neve","neve_paesaggi"], ore:5, yen:2500 },
  { id:"niseko",     citta:"sapporo",nome:"Sci a Niseko (giornaliero)", tag:["neve","hiking","neve_sci"], ore:8, yen:9000, solo:[12,1,2,3], c:"S" },
  { id:"furano",     citta:"sapporo",nome:"Campi di lavanda di Furano", tag:["natura","panorama","nat_fiori"], ore:6, yen:1500, solo:[7,8] },
  { id:"matsushima", citta:"sendai",nome:"Baia di Matsushima in barca", tag:["mare","natura","panorama","mare_costa","mare_isole"], ore:4, yen:1800, c:"S" },
  { id:"haikyuu",    citta:"sendai",nome:"I luoghi di Haikyuu in Miyagi", tag:["anime","gratis"], ore:3, yen:0, anime:"haikyuu" },
  { id:"gyutan",     citta:"sendai",nome:"Gyutan, lingua di manzo alla griglia", tag:["cibo","cibo_alta"], ore:1.5, yen:2200 },

  /* --- ALTRO ------------------------------------------------------------ */
  { id:"ghiblipark", citta:"nagoya",nome:"Ghibli Park a Nagakute", tag:["anime","kids","parchi"], ore:6, yen:3500, anime:"ghibli", c:"S" },
  { id:"toyotamus",  citta:"nagoya",nome:"Museo Toyota dell'industria e della tecnica", tag:["musei","insolito","kids","museo_tecnica"], ore:3, yen:1000, c:"S" },
  { id:"anohana",    citta:"chichibu",nome:"I luoghi di Anohana a Chichibu", tag:["anime","gratis","natura","ins_quartieri","nat_montagna"], ore:4, yen:0, anime:"anohana" },
  { id:"shibazakura",citta:"chichibu",nome:"Tappeto di shibazakura a Hitsujiyama", tag:["natura","sakura","panorama","nat_fiori","pano_alto"], ore:2, yen:300, solo:[4,5], c:"S" },
  { id:"dune",       citta:"tottori",nome:"Dune di sabbia di Tottori", tag:["natura","insolito","panorama","gratis","nat_montagna"], ore:3, yen:0 },
  { id:"conan",      citta:"tottori",nome:"Detective Conan: il paese di Gosho Aoyama", tag:["anime","musei"], ore:3, yen:700, anime:"conan", c:"S" },
  { id:"daibutsu",   citta:"kamakura",nome:"Grande Buddha di Kamakura", tag:["templi","storia","templi_top","storia_edo"], ore:1.5, yen:300, c:"S" },
  { id:"slamdunk",   citta:"kamakura",nome:"Il passaggio a livello di Slam Dunk", tag:["anime","mare","gratis","mare_costa","pano_notte"], ore:2, yen:0, anime:"slamdunk" },
  { id:"toshogu",    citta:"nikko", nome:"Toshogu e i cedri di Nikko", tag:["templi","storia","natura","foliage","templi_top","storia_edo","nat_giardini"], ore:4, yen:1600, top:[10,11], c:"S" },
  { id:"shuri",      citta:"naha",  nome:"Castello di Shuri e Okinawa antica", tag:["storia","mare","mare_spiagge"], ore:3, yen:400, c:"S" },
  { id:"churaumi",   citta:"naha",  nome:"Acquario Churaumi", tag:["mare","kids","musei","mare_spiagge","kids_animali"], ore:4, yen:2200, c:"S" }
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
   Il "mazzo di carte". Ogni interesse ha:
     desc      la riga sotto il titolo, sempre visibile
     dettaglio il testo lungo che compare passandoci sopra col mouse
     rami      le domande di secondo livello: è lì che le specifiche si affinano.
   Ogni ramo porta dei TAG FINI. Un luogo che ha il tag fine batte uno che ha
   solo il tag generico, perché i tag in comune si sommano nel punteggio.       */
interessi: [
  { id:"anime", nome:"Anime e manga", desc:"pellegrinaggi nei luoghi delle serie, Akiba, musei",
    dettaglio:"Il seichi junrei: andare nel punto esatto dove è ambientata una scena. Al passo dopo scegli le serie, e quelle spostano davvero l'itinerario — non sono un'etichetta.",
    rami:[] },
  { id:"action", nome:"Action figure e collezionismo", desc:"scatole, vetrine, gashapon, garage kit",
    dettaglio:"Da Radio Kaikan ai dieci piani di Nakano Broadway. Cambia molto se cerchi il pezzo nuovo in scatola, l'usato raro, o le macchinette delle capsule.",
    rami:[
      { id:"fig_nuovo", nome:"Nuovo e negozi ufficiali", desc:"Kotobukiya, Pokémon Center, scatole intonse" },
      { id:"fig_usato", nome:"Usato e pezzi rari", desc:"Mandarake, Surugaya, vetrine di collezionisti" },
      { id:"fig_gasha", nome:"Gashapon e capsule", desc:"macchinette a monete, roba che non esce dal Giappone" },
      { id:"fig_kit",   nome:"Garage kit e modellismo", desc:"resina da montare e dipingere, Volks" } ] },
  { id:"templi", nome:"Templi e santuari", desc:"il Giappone che ti aspetti dalle foto",
    dettaglio:"Ce ne sono migliaia e non si assomigliano. I grandi si vedono in mezz'ora ma con la folla; i piccoli fuori mano si trovano vuoti anche a mezzogiorno.",
    rami:[
      { id:"templi_top",      nome:"I grandi, quelli famosi", desc:"quelli che riconosci dalle foto" },
      { id:"templi_nascosti", nome:"Piccoli e fuori mano", desc:"nessuna fila, nessun pullman" },
      { id:"templi_giardino", nome:"Giardini di tempio", desc:"il tempio è la cornice, il giardino è il motivo" } ] },
  { id:"cibo", nome:"Mangiare", desc:"mercati, izakaya, street food, una cena seria",
    dettaglio:"È la voce su cui si spende senza accorgersene. Dire cosa cerchi cambia sia l'itinerario sia il preventivo: una cena kaiseki costa quanto tre giorni di konbini.",
    rami:[
      { id:"cibo_street",  nome:"Street food e mercati", desc:"in piedi, con le mani, a poco" },
      { id:"cibo_ramen",   nome:"Ramen, gyoza, katsu", desc:"il pranzo da dieci euro che ricordi per anni" },
      { id:"cibo_sushi",   nome:"Sushi e pesce", desc:"dal bancone del mercato al conto serio" },
      { id:"cibo_izakaya", nome:"Izakaya la sera", desc:"piattini, birra, rumore" },
      { id:"cibo_alta",    nome:"Una cena importante", desc:"kaiseki o stella: una volta, ma fatta bene" },
      { id:"cibo_dolci",   nome:"Dolci e caffè", desc:"kissaten, parfait, wagashi" } ] },
  { id:"storia", nome:"Storia e castelli", desc:"samurai, guerra, periodo Edo",
    dettaglio:"Tre storie diverse che quasi non si toccano: il Giappone dei samurai, quello che si è aperto all'occidente, e quello del Novecento.",
    rami:[
      { id:"storia_edo",      nome:"Samurai e periodo Edo", desc:"castelli, quartieri, spade" },
      { id:"storia_guerra",   nome:"Novecento e guerra", desc:"memoriali, musei, luoghi difficili" },
      { id:"storia_castelli", nome:"Castelli", desc:"quelli originali, non le ricostruzioni" } ] },
  { id:"natura", nome:"Natura e paesaggi", desc:"montagne, laghi, giardini, mare",
    dettaglio:"In Giappone la natura è quasi sempre composta: anche il bosco è progettato. Scegliere fra giardino e montagna cambia completamente le giornate.",
    rami:[
      { id:"nat_giardini", nome:"Giardini curati", desc:"secoli di potatura, panchine, silenzio" },
      { id:"nat_montagna", nome:"Montagna e laghi", desc:"aria, distanze, autobus" },
      { id:"nat_fiori",    nome:"Fiori di stagione", desc:"sakura, glicini, shibazakura, foliage" } ] },
  { id:"onsen", nome:"Onsen e terme", desc:"bagni caldi, ryokan, relax",
    dettaglio:"Nudi, divisi per sesso, e in molti posti con i tatuaggi non ti fanno entrare. Se hai tatuaggi dillo qui sotto: cambia dove ti mando.",
    rami:[
      { id:"onsen_day",    nome:"Bagno in giornata", desc:"entri, ti lavi, esci: dieci euro" },
      { id:"onsen_ryokan", nome:"Notte in ryokan", desc:"cena kaiseki, futon, bagno privato" },
      { id:"onsen_tattoo", nome:"Ho tatuaggi", desc:"solo posti che li accettano o con vasca privata" } ] },
  { id:"hiking", nome:"Camminate e trekking", desc:"sentieri, salite, giornate a piedi",
    dettaglio:"Da un'ora di passeggiata piana alla notte in rifugio sul Fuji. Dirlo evita di ritrovarti una salita di sei ore in mezzo alle vacanze.",
    rami:[
      { id:"hike_facile", nome:"Passeggiata facile", desc:"un'ora o due, scarpe normali" },
      { id:"hike_medio",  nome:"Mezza giornata", desc:"dislivello vero, si suda" },
      { id:"hike_duro",   nome:"Salita seria", desc:"giornata intera o notte in rifugio" } ] },
  { id:"arte", nome:"Arte e design", desc:"musei contemporanei, architettura, isole d'arte",
    dettaglio:"Il Giappone contemporaneo è uno dei posti più forti al mondo per installazioni e architettura, e quasi nessuno ci va per quello.",
    rami:[
      { id:"arte_contemp",  nome:"Contemporanea e installazioni", desc:"teamLab, biennali, isole d'arte" },
      { id:"arte_archi",    nome:"Architettura", desc:"Ando, Kuma, i grattacieli e le case piccole" },
      { id:"arte_classica", nome:"Arte classica giapponese", desc:"stampe, paraventi, ceramica" } ] },
  { id:"retrogaming", nome:"Videogiochi e retrogaming", desc:"sale giochi, usato, Nintendo",
    dettaglio:"Le sale giochi sono ancora vive e rumorose, e l'usato costa una frazione di quanto costa in Europa.",
    rami:[
      { id:"game_arcade",   nome:"Sale giochi", desc:"cinque piani, gettoni, gru" },
      { id:"game_usato",    nome:"Usato e collezionismo", desc:"cartucce, console, Super Potato" },
      { id:"game_nintendo", nome:"Nintendo e parchi", desc:"store ufficiali, Nintendo World" } ] },
  { id:"shopping", nome:"Shopping e vintage", desc:"usato, cartoleria, quartieri di moda",
    dettaglio:"Il vintage giapponese è tenuto meglio del nuovo altrove, e la cartoleria è una categoria di souvenir che nessuno si aspetta.",
    rami:[
      { id:"shop_vintage",  nome:"Vintage e usato", desc:"Shimokita, Koenji, americana anni 70" },
      { id:"shop_carta",    nome:"Cartoleria e carta", desc:"penne, quaderni, washi" },
      { id:"shop_moda",     nome:"Moda e strada", desc:"Harajuku, Ginza, i marchi che non arrivano qui" },
      { id:"shop_artigiano",nome:"Coltelli e artigianato", desc:"acciaio, ceramica, cose che durano" } ] },
  { id:"notturno", nome:"Notte e vita locale", desc:"vicoli, bar minuscoli, karaoke",
    dettaglio:"Di notte il Giappone cambia mestiere. I vicoli con i banconi da sei posti sono la cosa più difficile da trovare da soli.",
    rami:[
      { id:"notte_vicoli",  nome:"Vicoli e izakaya", desc:"Golden Gai, Omoide Yokocho, sei sgabelli" },
      { id:"notte_karaoke", nome:"Karaoke", desc:"stanza privata, fino alle cinque" },
      { id:"notte_bar",     nome:"Bar e cocktail", desc:"whisky, ghiaccio scolpito, silenzio" },
      { id:"notte_luci",    nome:"La città illuminata", desc:"incroci, insegne, camminare e basta" } ] },
  { id:"tradizione", nome:"Tradizione viva", desc:"geisha, cerimonia del tè, artigiani, kimono",
    dettaglio:"Non il museo della tradizione: la tradizione ancora praticata da qualcuno che ci lavora.",
    rami:[
      { id:"trad_te",         nome:"Cerimonia del tè", desc:"seduti, lenti, con un maestro" },
      { id:"trad_kimono",     nome:"Vestirsi in kimono", desc:"noleggio per la giornata" },
      { id:"trad_artigiani",  nome:"Artigiani al lavoro", desc:"botteghe, laboratori, mani" },
      { id:"trad_spettacolo", nome:"Spettacoli e sumo", desc:"kabuki, sumo, teatro" } ] },
  { id:"neve", nome:"Neve e inverno", desc:"sci, festival della neve, onsen nella neve",
    dettaglio:"La neve giapponese è famosa perché è tanta e leggera. Ma inverno non vuol dire per forza sci.",
    rami:[
      { id:"neve_sci",       nome:"Sci e snowboard", desc:"giornate sugli sci, attrezzatura a noleggio" },
      { id:"neve_paesaggi",  nome:"Paesaggi e festival", desc:"villaggi sotto la neve, sculture di ghiaccio" },
      { id:"neve_onsen",     nome:"Onsen nella neve", desc:"vasca all'aperto mentre nevica" } ] },
  { id:"mare", nome:"Mare e isole", desc:"Okinawa, mare interno, traghetti",
    dettaglio:"Due mari diversi: quello tropicale di Okinawa e il mare interno con le isole d'arte.",
    rami:[
      { id:"mare_spiagge", nome:"Spiagge", desc:"sabbia, snorkeling, caldo" },
      { id:"mare_isole",   nome:"Isole", desc:"traghetti, isole piccole, arte" },
      { id:"mare_costa",   nome:"Coste e passeggiate", desc:"treni lungo il mare, promontori" } ] },
  { id:"musei", nome:"Musei", desc:"dall'archeologia alla tecnica",
    dettaglio:"I musei giapponesi di tecnica sono i migliori del mondo e quasi nessun turista ci mette piede.",
    rami:[
      { id:"museo_arte",   nome:"Arte", desc:"classica e moderna" },
      { id:"museo_tecnica",nome:"Scienza e tecnica", desc:"treni, robot, fabbriche, Toyota" },
      { id:"museo_storia", nome:"Storia e archeologia", desc:"dalle origini a ieri" },
      { id:"museo_anime",  nome:"Musei di anime", desc:"Ghibli, Doraemon, mostre a tema" },
      { id:"museo_strano", nome:"Musei strani", desc:"parassiti, ramen, francobolli" } ] },
  { id:"insolito", nome:"Cose strane", desc:"posti che nessuno mette in itinerario",
    dettaglio:"La categoria che salva un viaggio dal sembrare la guida di tutti gli altri.",
    rami:[
      { id:"ins_quartieri",  nome:"Quartieri fuori rotta", desc:"dove non ci sono turisti" },
      { id:"ins_esperienze", nome:"Esperienze assurde", desc:"cose che si raccontano tornati a casa" },
      { id:"ins_abbandono",  nome:"Abbandonato e industriale", desc:"rovine, isole vuote, archeologia recente" } ] },
  { id:"panorama", nome:"Panorami e foto", desc:"punti alti, skyline, il Fuji",
    dettaglio:"Se fotografi, l'ora conta più del posto. I rami qui sotto decidono a che ora ti mando dove.",
    rami:[
      { id:"pano_alto",  nome:"Dall'alto", desc:"torri, terrazze, osservatori" },
      { id:"pano_fuji",  nome:"Il Fuji", desc:"i punti da cui si vede davvero" },
      { id:"pano_notte", nome:"Skyline di notte", desc:"insegne, incroci, luci" } ] },
  { id:"kids", nome:"Adatto ai bambini", desc:"parchi, acquari, cose che non annoiano",
    dettaglio:"Con i bambini il vincolo non è il costo, è la durata: dopo due ore in un tempio è finita.",
    rami:[
      { id:"kids_parchi",     nome:"Parchi a tema", desc:"giornate intere, code, felicità" },
      { id:"kids_animali",    nome:"Animali e acquari", desc:"cervi, gufi, vasche enormi" },
      { id:"kids_interattivo",nome:"Cose da toccare", desc:"musei dove si preme e si sale" } ] }
]

};
