# -*- coding: utf-8 -*-
import json, os, sys
BASE = "/Volumes/ssd02/Dropbox/claude_workspace/giapponenelmondo/calendar"
data = json.load(open(os.path.join(BASE,"catalogo_dati.json")))
payload = json.dumps(data, ensure_ascii=False)

HTML = """<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GnM — Catalogo video interrogabile</title>
<style>
:root{
 --bg:#faf8f5; --card:#fff; --ink:#1a1714; --muted:#6b625a; --line:#e6ded4;
 --accent:#b4291f; --accent-soft:#fbeceb; --ok:#1f7a4d; --warn:#b06b0a;
 --shadow:0 1px 2px rgba(26,23,20,.06),0 6px 18px rgba(26,23,20,.05);
}
@media (prefers-color-scheme:dark){:root{
 --bg:#14110f; --card:#1e1a17; --ink:#f0eae3; --muted:#a2968a; --line:#332c26;
 --accent:#ff6b5e; --accent-soft:#33201d; --ok:#4fbd85;
}}
@media (prefers-color-scheme:dark){:root{--warn:#e0a24a;}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
 font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,system-ui,sans-serif;}
header{padding:28px 24px 18px;border-bottom:1px solid var(--line);background:var(--card);
 position:sticky;top:0;z-index:20;box-shadow:var(--shadow)}
h1{margin:0 0 4px;font-size:21px;letter-spacing:-.02em}
.sub{color:var(--muted);font-size:13px;margin:0 0 14px}
.searchrow{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
input[type=search]{flex:1;min-width:220px;padding:10px 13px;border:1px solid var(--line);
 border-radius:10px;background:var(--bg);color:var(--ink);font-size:15px}
input[type=search]:focus{outline:2px solid var(--accent);outline-offset:-1px}
select{padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:var(--bg);
 color:var(--ink);font-size:14px}
main{max-width:1180px;margin:0 auto;padding:20px 24px 80px}
.filters{display:flex;flex-direction:column;gap:10px;margin:18px 0 8px}
.frow{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
.flab{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);
 min-width:96px;font-weight:600}
.chip{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;
 padding:5px 12px;font-size:13px;cursor:pointer;transition:.12s}
.chip:hover{border-color:var(--accent)}
.chip.on{background:var(--accent);border-color:var(--accent);color:#fff}
.bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;
 margin:16px 0 12px;padding-top:14px;border-top:1px solid var(--line)}
.count{font-size:13px;color:var(--muted)}
.count b{color:var(--ink);font-size:16px}
.reset{background:none;border:none;color:var(--accent);cursor:pointer;font-size:13px;
 text-decoration:underline;padding:0}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 17px;
 box-shadow:var(--shadow);display:flex;flex-direction:column;gap:10px}
.card h3{margin:0;font-size:16px;line-height:1.35;letter-spacing:-.01em}
.tags{display:flex;gap:6px;flex-wrap:wrap}
.t{font-size:11.5px;padding:3px 9px;border-radius:6px;border:1px solid var(--line);
 color:var(--muted);white-space:nowrap}
.t.arg{background:var(--accent-soft);border-color:transparent;color:var(--accent);font-weight:600}
.t.easy{color:var(--ok);border-color:currentColor}
.t.med{color:var(--warn);border-color:currentColor}
.t.hard{color:var(--accent);border-color:currentColor}
.t.trend{background:var(--accent);color:#fff;border-color:transparent;font-weight:600}
.nota{font-size:13px;color:var(--muted);margin:0}
.nec{font-size:12.5px;color:var(--muted);border-top:1px dashed var(--line);padding-top:9px;margin:0}
.nec b{color:var(--ink);font-weight:600}
.meta{display:flex;gap:14px;font-size:12px;color:var(--muted);margin-top:auto;padding-top:4px}
.score{margin-left:auto;font-variant-numeric:tabular-nums}
.empty{text-align:center;color:var(--muted);padding:60px 20px}
footer{max-width:1180px;margin:0 auto;padding:0 24px 40px;color:var(--muted);font-size:12.5px}
</style></head><body>
<header>
 <h1>Giappone nel Mondo — catalogo video</h1>
 <p class="sub">__N__ voci · piano editoriale 22/07/2026 + radar trend 24/08/2026 · aggiornato __AGG__</p>
 <div class="searchrow">
  <input type="search" id="q" placeholder="cerca: titolo, nota, tag, necessità…">
  <select id="sort">
   <option value="score">Ordina: consigliato</option>
   <option value="fit">Resa attesa</option>
   <option value="effort">Più facile prima</option>
   <option value="durata">Più corto prima</option>
   <option value="trend">Segnale trend</option>
   <option value="titolo">Alfabetico</option>
  </select>
 </div>
</header>
<main>
 <div class="filters" id="filters"></div>
 <div class="bar">
  <span class="count"><b id="n">0</b> video corrispondono</span>
  <button class="reset" id="reset">azzera filtri</button>
 </div>
 <div class="grid" id="grid"></div>
 <div class="empty" id="empty" hidden>Nessun video con questi filtri.</div>
</main>
<footer>
 <p><b>Come si legge.</b> <i>Resa attesa</i> e <i>difficoltà</i> vengono dal piano editoriale di luglio (analisi del canale + CSV idee).
 <i>Tipologia</i>, <i>durata</i> e <i>necessità speciali</i> sono stime dedotte dalle note, non misure.
 <i>Segnale trend</i> viene dai report dell'agente trend-analysis delle ultime 6 settimane: <b>alto</b> = tema ricorrente con gap IT alto e saturazione IT 1-2/10.
 <i>Consigliato</i> = resa + segnale trend + materiale già pronto − difficoltà.</p>
</footer>
<script>
const DATA = __PAYLOAD__;
const L = DATA.labels;
const items = DATA.items;
const DIFF = {1:'Facile',2:'Medio',3:'Pesante'};
const TRENDW = {alto:3,medio:2,basso:1,nullo:0};

const NEC = [...new Set(items.flatMap(i=>i.necessita))].sort();
const FACETS = [
 {key:'cluster', lab:'Argomento', vals:[...new Set(items.map(i=>i.cluster))].sort(), fmt:v=>L.cluster[v]||v},
 {key:'tipologia', lab:'Tipologia', vals:[...new Set(items.map(i=>i.tipologia))].sort(), fmt:v=>L.tipologia[v]||v},
 {key:'effort', lab:'Difficoltà', vals:[1,2,3], fmt:v=>DIFF[v]},
 {key:'stato', lab:'Stato', vals:[...new Set(items.map(i=>i.stato))].sort(), fmt:v=>L.stato[v]||v},
 {key:'tipo', lab:'Ruolo', vals:[...new Set(items.map(i=>i.tipo))].sort(), fmt:v=>L.tipo[v]||v},
 {key:'trend', lab:'Segnale trend', vals:['alto','medio','basso','nullo'], fmt:v=>v},
 {key:'stagione', lab:'Stagionalità', vals:[...new Set(items.map(i=>i.stagione))].sort(), fmt:v=>v},
 {key:'necessita', lab:'Necessità', vals:NEC, fmt:v=>v, multi:true},
];
const state = {}; FACETS.forEach(f=>state[f.key]=new Set());

const fEl = document.getElementById('filters');
FACETS.forEach(f=>{
 const row = document.createElement('div'); row.className='frow';
 const lab = document.createElement('span'); lab.className='flab'; lab.textContent=f.lab; row.appendChild(lab);
 f.vals.forEach(v=>{
  const b=document.createElement('button'); b.className='chip'; b.textContent=f.fmt(v);
  b.onclick=()=>{ state[f.key].has(v)?state[f.key].delete(v):state[f.key].add(v);
                  b.classList.toggle('on'); render(); };
  row.appendChild(b);
 });
 fEl.appendChild(row);
});

function match(it){
 const q = document.getElementById('q').value.trim().toLowerCase();
 if(q){
  const hay = [it.titolo,it.nota,it.cluster,it.tipologia,it.stato,it.tipo,it.stagione,
               L.cluster[it.cluster],L.tipologia[it.tipologia],it.necessita.join(' '),it.origine]
              .join(' ').toLowerCase();
  if(!q.split(/\\s+/).every(w=>hay.includes(w))) return false;
 }
 for(const f of FACETS){
  const s=state[f.key]; if(!s.size) continue;
  if(f.multi){ if(![...s].some(v=>it.necessita.includes(v))) return false; }
  else if(!s.has(it[f.key])) return false;
 }
 return true;
}

function render(){
 const sort=document.getElementById('sort').value;
 let out = items.filter(match);
 const cmp = {
  score:(a,b)=>b.score-a.score, fit:(a,b)=>b.fit-a.fit,
  effort:(a,b)=>a.effort-b.effort||b.score-a.score,
  durata:(a,b)=>a.durata_min-b.durata_min,
  trend:(a,b)=>TRENDW[b.trend]-TRENDW[a.trend]||b.score-a.score,
  titolo:(a,b)=>a.titolo.localeCompare(b.titolo,'it'),
 }[sort];
 out=[...out].sort(cmp);
 document.getElementById('n').textContent=out.length;
 const g=document.getElementById('grid'); g.innerHTML='';
 document.getElementById('empty').hidden = out.length>0;
 out.forEach(it=>{
  const c=document.createElement('article'); c.className='card';
  const dcls = it.effort===1?'easy':it.effort===2?'med':'hard';
  c.innerHTML =
   '<h3>'+esc(it.titolo)+'</h3>'+
   '<div class="tags">'+
    '<span class="t arg">'+esc(L.cluster[it.cluster]||it.cluster)+'</span>'+
    '<span class="t">'+esc(L.tipologia[it.tipologia])+'</span>'+
    '<span class="t '+dcls+'">'+DIFF[it.effort]+'</span>'+
    '<span class="t">'+it.durata_min+'–'+it.durata_max+' min</span>'+
    '<span class="t">'+esc(L.stato[it.stato]||it.stato)+'</span>'+
    (it.trend==='alto'?'<span class="t trend">trend alto</span>':
     it.trend==='medio'?'<span class="t med">trend medio</span>':'')+
    (it.stagione!=='nessuna'?'<span class="t">'+esc(it.stagione)+'</span>':'')+
   '</div>'+
   '<p class="nota">'+esc(it.nota)+'</p>'+
   '<p class="nec"><b>Serve:</b> '+it.necessita.map(esc).join(' · ')+'</p>'+
   '<div class="meta"><span>resa '+it.fit+'/10</span><span>'+esc(L.tipo[it.tipo])+'</span>'+
   '<span class="score">punteggio '+it.score+'</span></div>';
  g.appendChild(c);
 });
}
function esc(s){return String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
document.getElementById('q').addEventListener('input',render);
document.getElementById('sort').addEventListener('change',render);
document.getElementById('reset').onclick=()=>{
 FACETS.forEach(f=>state[f.key].clear());
 document.querySelectorAll('.chip.on').forEach(c=>c.classList.remove('on'));
 document.getElementById('q').value=''; render();
};
render();
</script></body></html>"""

HTML = HTML.replace("__PAYLOAD__", payload).replace("__N__", str(len(data["items"]))).replace("__AGG__", data["aggiornato"])
p = os.path.join(BASE,"catalogo_video.html")
open(p,"w").write(HTML)
print("scritto:", p, len(HTML), "byte")
