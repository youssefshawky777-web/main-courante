/* Main courante — appli installable (PWA) avec Supabase */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const p=String(s||'').split('-').map(Number);return new Date(p[0],(p[1]||1)-1,p[2]||1)};
const todayISO=()=>iso(new Date());
const nf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
const ef=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
const eur=v=>ef.format(+v||0);
const num=v=>{const n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:0};
const MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const JOURS=['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'];
const short=s=>{if(!s)return '—';const d=parse(s);return pad(d.getDate())+'/'+pad(d.getMonth()+1)};
const dayLabel=s=>{const d=parse(s);return JOURS[d.getDay()]+' '+d.getDate()+' '+MOIS[d.getMonth()]};
const store_={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};

/* ---------- Modules ---------- */
const MODS={
  travail:{label:'Boulots',tag:'BOULOT',c:'var(--c-travail)',dateKey:'date',
    fields:[
      {k:'date',label:'Date',type:'date',req:1,def:todayISO},
      {k:'job',label:'Boulot',type:'select',opts:['Sécurité de nuit','Pâtisserie — Comptoir du Flan','Auto-entrepreneur'],req:1},
      {k:'heures',label:'Heures',type:'number',step:'0.25',min:'0',ph:'9',pair:'a'},
      {k:'montant',label:'Gagné (€)',type:'number',step:'0.01',min:'0',ph:'0',pair:'a'},
      {k:'note',label:'Note',type:'text',ph:'Ronde RAS, incident, livraison…'}
    ]},
  fac:{label:'Fac',tag:'FAC',c:'var(--c-fac)',dateKey:'echeance',
    fields:[
      {k:'titre',label:'Intitulé',type:'text',req:1,ph:'Partiel de proba, rendu projet…'},
      {k:'type',label:'Type',type:'select',opts:['Partiel','Devoir / TD','Projet','Cours à rattraper','Stage','Admin fac'],pair:'a'},
      {k:'matiere',label:'Matière',type:'text',ph:'Proba, BDD…',pair:'a'},
      {k:'echeance',label:'Échéance',type:'date',def:todayISO,pair:'b'},
      {k:'statut',label:'Statut',type:'select',opts:['À faire','En cours','Fait'],pair:'b'}
    ]},
  sport:{label:'Sport & tir',tag:'SPORT',c:'var(--c-sport)',dateKey:'date',
    fields:[
      {k:'date',label:'Date',type:'date',req:1,def:todayISO},
      {k:'activite',label:'Activité',type:'select',opts:['Tir sportif','Musculation','Course','Autre'],req:1,pair:'a'},
      {k:'duree',label:'Durée (min)',type:'number',step:'5',min:'0',ph:'60',pair:'a'},
      {k:'note',label:'Score / ressenti',type:'text',ph:'Série 10 m : 92/100…'}
    ]},
  budget:{label:'Budget',tag:'BUDGET',c:'var(--c-budget)',dateKey:'date',
    fields:[
      {k:'date',label:'Date',type:'date',req:1,def:todayISO,pair:'a'},
      {k:'sens',label:'Sens',type:'select',opts:['Dépense','Revenu'],req:1,pair:'a'},
      {k:'montant',label:'Montant (€)',type:'number',step:'0.01',min:'0',req:1,ph:'0',pair:'b'},
      {k:'categorie',label:'Catégorie',type:'select',opts:['Courses','Logement','Transport','Sorties','Équipement','Fac','Admin','Bourse / aides','Autre'],pair:'b'},
      {k:'libelle',label:'Libellé',type:'text',ph:'Loyer CROUS, abonnement TaM…'}
    ]}
};
const VIEWS=[['bord','Tableau de bord','var(--ink)'],...Object.entries(MODS).map(([k,m])=>[k,m.label,m.c])];
const JOB_C={'Sécurité de nuit':'var(--c-travail)','Pâtisserie — Comptoir du Flan':'var(--c-budget)','Auto-entrepreneur':'var(--c-fac)'};

/* ---------- État ---------- */
let sb=null, user=null, entries=[], ready=false, channel=null;
let view=(location.hash||'').slice(1); if(!VIEWS.some(v=>v[0]===view)&&view!=='reglages') view='bord';
let month=todayISO().slice(0,7);
let authMode='login', justLoggedIn=false, recovering=false;
// PIN
let locked=false, pinRec=null, mode='unlock', buf='', first='', fails=0, waitUntil=0, hiddenAt=0, pinAction=null;
const pinKey=()=>'mc-pin-'+(user?user.id:'');
const cacheKey=()=>'mc-cache-'+(user?user.id:'');

/* ---------- Petites aides ---------- */
let tt;function toast(t){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(tt);tt=setTimeout(()=>el.hidden=true,2400)}
function showNote(t){const n=$('#note');n.textContent=t;n.hidden=!t}
function frErr(e){
  const m=(e&&(e.message||e.error_description))||'';
  if(/Invalid login credentials/i.test(m))return 'Adresse ou mot de passe incorrect.';
  if(/Email not confirmed/i.test(m))return 'Confirme d’abord ton adresse avec le lien reçu par mail.';
  if(/already registered|already been registered/i.test(m))return 'Un compte existe déjà avec cette adresse. Connecte-toi.';
  if(/Password should be at least/i.test(m))return 'Le mot de passe doit faire au moins 8 caractères.';
  if(/rate limit|too many/i.test(m))return 'Trop de tentatives. Patiente quelques minutes.';
  if(/Failed to fetch|NetworkError|network/i.test(m))return 'Pas de connexion internet. Réessaie quand le réseau revient.';
  return m?('Erreur : '+m):'Une erreur est survenue. Réessaie.';
}
function setOffline(){$('#offline').hidden=navigator.onLine}
window.addEventListener('online',()=>{setOffline();if(user)loadEntries()});
window.addEventListener('offline',setOffline);

/* ---------- Écrans ---------- */
function show(which){
  $('#auth').hidden=which!=='auth';
  $('#app').hidden=which!=='app';
}
function setAuthMode(m,info){
  authMode=m;
  const T={login:['Connexion','Se connecter'],signup:['Créer un compte','Créer mon compte'],reset:['Mot de passe oublié','Recevoir le lien']}[m];
  $('#authTitle').textContent=T[0];$('#authSubmit').textContent=T[1];
  $('#pwField').hidden=m==='reset';
  $('#authPw').autocomplete=m==='signup'?'new-password':'current-password';
  $('#toSignup').textContent=m==='login'?'Créer un compte':'J’ai déjà un compte';
  $('#toReset').hidden=m!=='login';
  $('#authErr').hidden=true;
  const i=$('#authInfo');i.textContent=info||'';i.hidden=!info;
}
function showAuth(info){
  show('auth');$('#loginForm').hidden=false;$('#newPwForm').hidden=true;setAuthMode('login',info);
}

/* ---------- Données ---------- */
const rowToEntry=r=>Object.assign({},r.data||{},{id:r.id,mod:r.mod,createdAt:Date.parse(r.created_at)||0});
async function loadEntries(){
  const {data,error}=await sb.from('entries').select('id,mod,data,created_at').order('created_at',{ascending:true});
  if(error){
    const cached=store_.get(cacheKey(),null);
    if(cached){entries=cached;ready=true;render();}
    showNote(navigator.onLine?'Chargement impossible pour le moment. '+frErr(error):'Hors connexion : dernières données enregistrées sur ce téléphone.');
    return;
  }
  entries=data.map(rowToEntry);ready=true;store_.set(cacheKey(),entries);showNote('');render();
}
let reloadT;const scheduleReload=()=>{clearTimeout(reloadT);reloadT=setTimeout(loadEntries,250)};
function subscribe(){
  if(channel){sb.removeChannel(channel);channel=null}
  channel=sb.channel('entries-'+user.id)
    .on('postgres_changes',{event:'*',schema:'public',table:'entries',filter:'user_id=eq.'+user.id},scheduleReload)
    .subscribe();
}
async function addEntry(o){
  const {mod,...rest}=o;
  const {data,error}=await sb.from('entries').insert({mod,data:rest}).select('id,mod,data,created_at').single();
  if(error)throw error;
  entries.push(rowToEntry(data));store_.set(cacheKey(),entries);render();
}
async function delEntry(id){
  const {error}=await sb.from('entries').delete().eq('id',id);
  if(error)throw error;
  entries=entries.filter(e=>e.id!==id);store_.set(cacheKey(),entries);render();
}
async function updEntry(id,patch){
  const e=entries.find(x=>x.id===id);if(!e)return;
  const {id:_i,mod:_m,createdAt:_c,...rest}=Object.assign({},e,patch);
  const {error}=await sb.from('entries').update({data:rest}).eq('id',id);
  if(error)throw error;
  Object.assign(e,patch);store_.set(cacheKey(),entries);render();
}

/* ---------- Démarrage / session ---------- */
async function startApp(session){
  if(recovering)return;
  user=session.user;
  pinRec=store_.get(pinKey(),null);
  show('app');
  if(pinRec&&!justLoggedIn){lockNow()}else{locked=false;renderLock()}
  justLoggedIn=false;
  const cached=store_.get(cacheKey(),null);
  if(cached){entries=cached;ready=true}
  render();
  await loadEntries();
  subscribe();
}
function stopApp(){
  if(channel){sb.removeChannel(channel);channel=null}
  user=null;entries=[];ready=false;locked=false;renderLock();
}

/* ---------- Rendu ---------- */
const of=mod=>entries.filter(e=>e.mod===mod);
const inMonth=(e,key)=>String(e[key]||'').slice(0,7)===month;
const sum=(arr,k)=>arr.reduce((a,e)=>a+num(e[k]),0);
const byDateDesc=key=>(a,b)=>String(b[key]||'').localeCompare(String(a[key]||''))||(b.createdAt||0)-(a.createdAt||0);
function monthLabel(){const [y,m]=month.split('-').map(Number);return MOIS[m-1]+' '+y}
function shiftMonth(d){let [y,m]=month.split('-').map(Number);m+=d;if(m<1){m=12;y--}if(m>12){m=1;y++}month=y+'-'+pad(m);render()}

function renderTabs(){
  $('#tabs').innerHTML=VIEWS.map(([k,l,c])=>`<button class="tab" role="tab" type="button" data-v="${k}" style="--dot:${c}" aria-selected="${k===view}"><i aria-hidden="true"></i>${esc(l)}</button>`).join('');
}
function render(){
  if(!user)return;
  $('#monthLbl').textContent=monthLabel();
  $('#lockBtn').hidden=!pinRec;
  const main=$('#main');
  if(locked&&!pinAction){$('#tabs').innerHTML='';main.innerHTML='';return}
  renderTabs();
  if(view==='reglages'){main.innerHTML=settingsView();return}
  if(!ready){main.innerHTML='<p class="ras">Ouverture du registre…</p>';return}
  main.innerHTML=view==='bord'?dash():modView(view);
  drawChart();
}

function dash(){
  const TODAY=todayISO();
  const tr=of('travail').filter(e=>inMonth(e,'date'));
  const h=sum(tr,'heures'),g=sum(tr,'montant');
  const bud=of('budget').filter(e=>inMonth(e,'date'));
  const dep=sum(bud.filter(e=>e.sens==='Dépense'),'montant');
  const rev=sum(bud.filter(e=>e.sens==='Revenu'),'montant');
  const solde=g+rev-dep;
  const sp=of('sport').filter(e=>inMonth(e,'date'));
  const tir=sp.filter(e=>e.activite==='Tir sportif').length;
  const jobs={};tr.forEach(e=>jobs[e.job]=(jobs[e.job]||0)+num(e.heures));
  const jobTxt=Object.entries(jobs).map(([j,v])=>`${nf.format(v)} h ${j.startsWith('Sécu')?'sécu':j.startsWith('Pât')?'pâtisserie':'auto-entr.'}`).join(' · ')||'Aucune heure saisie';

  const dues=of('fac').filter(e=>e.statut!=='Fait').sort((a,b)=>String(a.echeance||'9999').localeCompare(String(b.echeance||'9999'))).slice(0,6);
  const dueHTML=dues.length?`<ul class="dues">${dues.map(e=>{
      const d=e.echeance?Math.round((parse(e.echeance)-parse(TODAY))/864e5):null;
      const cls=d==null?'':d<0?'late':d<=7?'soon':'';
      const w=d==null?'sans date':d<0?`en retard · ${short(e.echeance)}`:d===0?'aujourd’hui':d===1?'demain':`J-${d} · ${short(e.echeance)}`;
      return `<li><div><div class="t">${esc(e.titre)}</div><div class="m">${esc([e.type,e.matiere,e.statut].filter(Boolean).join(' · '))}</div></div><span class="when ${cls}">${w}</span></li>`}).join('')}</ul>`
    :`<p class="ras"><b>RAS</b> — aucune échéance en attente. Ajoute un partiel ou un rendu dans l’onglet Fac.</p>`;

  const cats={};bud.filter(e=>e.sens==='Dépense').forEach(e=>{const c=e.categorie||'Autre';cats[c]=(cats[c]||0)+num(e.montant)});
  const catArr=Object.entries(cats).sort((a,b)=>b[1]-a[1]);const cmax=catArr.length?catArr[0][1]:1;
  const catHTML=catArr.length?`<div class="hbars">${catArr.map(([c,v])=>`<div class="hbar"><span class="name">${esc(c)}</span><span class="track"><span class="fill" style="display:block;width:${Math.max(3,v/cmax*100)}%"></span></span><span class="num">${eur(v)}</span></div>`).join('')}</div>`
    :`<p class="ras"><b>RAS</b> — aucune dépense ce mois-ci.</p>`;

  const acts={};sp.forEach(e=>{acts[e.activite]=acts[e.activite]||{n:0,m:0};acts[e.activite].n++;acts[e.activite].m+=num(e.duree)});
  const spHTML=sp.length?`<div class="hbars">${Object.entries(acts).map(([a,o])=>`<div class="hbar"><span class="name">${esc(a)}</span><span class="track"><span class="fill" style="display:block;background:var(--c-sport);width:${Math.max(3,o.n/sp.length*100)}%"></span></span><span class="num">${o.n} · ${nf.format(o.m)}′</span></div>`).join('')}</div>`
    :`<p class="ras"><b>RAS</b> — aucune séance ce mois-ci.</p>`;

  const log=entries.map(e=>Object.assign({_d:e[MODS[e.mod]?MODS[e.mod].dateKey:'date']||''},e)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,9);
  const logHTML=log.length?`<ul class="log">${log.map(e=>{const m=MODS[e.mod];if(!m)return '';return `<li style="--c:${m.c}"><span>${short(e._d)}</span><span class="tag">${m.tag}</span><span class="txt">${esc(logText(e))}</span></li>`}).join('')}</ul>`
    :`<p class="ras"><b>RAS</b> — rien à signaler pour l’instant. Ta première entrée apparaîtra ici.</p>`;

  return `
  <section class="tiles" aria-label="Résumé du mois">
    <div class="tile"><span class="lbl">Heures bossées</span><span class="val">${nf.format(h)} h</span><span class="sub">${esc(jobTxt)}</span></div>
    <div class="tile"><span class="lbl">Gagné (boulots)</span><span class="val">${eur(g)}</span><span class="sub">${h?eur(g/h)+' / h en moyenne':'—'}</span></div>
    <div class="tile"><span class="lbl">Dépensé</span><span class="val">${eur(dep)}</span><span class="sub">${rev?'+ '+eur(rev)+' d’aides et autres revenus':'Aucun autre revenu saisi'}</span></div>
    <div class="tile"><span class="lbl">Solde du mois</span><span class="val ${solde>=0?'pos':'neg'}">${solde>=0?'+':''}${eur(solde)}</span><span class="sub">${sp.length} séance${sp.length>1?'s':''} de sport · ${tir} au tir</span></div>
  </section>
  <div class="grid2">
    <div class="stack">
      <section class="panel"><h2>Heures par semaine <small>8 dernières semaines</small></h2>
        <div class="legend">${Object.entries(JOB_C).map(([j,c])=>`<span><i style="background:${c}"></i>${esc(j)}</span>`).join('')}</div>
        <svg class="chart" id="chart" viewBox="0 0 640 210" role="img" aria-label="Heures travaillées par semaine"></svg>
      </section>
      <section class="panel"><h2>Main courante <small>dernières entrées</small></h2>${logHTML}</section>
    </div>
    <div class="stack">
      <section class="panel"><h2>Échéances fac <small>non terminées</small></h2>${dueHTML}</section>
      <section class="panel"><h2>Dépenses <small>${esc(monthLabel())}</small></h2>${catHTML}</section>
      <section class="panel"><h2>Sport & tir <small>séances · minutes</small></h2>${spHTML}</section>
    </div>
  </div>`;
}
function logText(e){
  switch(e.mod){
    case 'travail':return `${e.job||'Boulot'} · ${nf.format(num(e.heures))} h${num(e.montant)?' · '+eur(e.montant):''}${e.note?' — '+e.note:''}`;
    case 'fac':return `${e.titre}${e.statut?' · '+e.statut:''}`;
    case 'sport':return `${e.activite}${num(e.duree)?' · '+nf.format(num(e.duree))+' min':''}${e.note?' — '+e.note:''}`;
    case 'budget':return `${e.sens==='Revenu'?'+':'−'}${eur(e.montant)} · ${e.libelle||e.categorie||''}`;
  }return '';
}
function drawChart(){
  const svg=$('#chart');if(!svg)return;
  const [y,m]=month.split('-').map(Number);
  const endM=new Date(y,m,0);const t=parse(todayISO());const end=endM<t?endM:t;
  const mon=d=>{const x=new Date(d);const k=(x.getDay()+6)%7;x.setDate(x.getDate()-k);x.setHours(0,0,0,0);return x};
  const last=mon(end);const weeks=[];
  for(let i=7;i>=0;i--){const s=new Date(last);s.setDate(s.getDate()-7*i);weeks.push({s,v:{}})}
  of('travail').forEach(e=>{if(!e.date)return;const ws=mon(parse(e.date)).getTime();const w=weeks.find(w=>w.s.getTime()===ws);if(w)w.v[e.job]=(w.v[e.job]||0)+num(e.heures)});
  const tot=weeks.map(w=>Object.values(w.v).reduce((a,b)=>a+b,0));
  const max=Math.max(10,...tot);const step=max<=20?5:max<=40?10:20;const top=Math.ceil(max/step)*step;
  const L=34,R=8,T=12,B=30,W=640-L-R,H=210-T-B,bw=W/8;
  let g='';
  for(let v=0;v<=top;v+=step){const yy=T+H-(v/top)*H;g+=`<line x1="${L}" x2="${640-R}" y1="${yy}" y2="${yy}" stroke="var(--line)" stroke-width="1"/><text x="${L-6}" y="${yy+4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${v}</text>`}
  weeks.forEach((w,i)=>{
    let acc=0;const x=L+i*bw+bw*0.2,ww=bw*0.6;
    Object.keys(JOB_C).forEach(j=>{const v=w.v[j]||0;if(!v)return;const hh=v/top*H;const yy=T+H-(acc+v)/top*H;acc+=v;g+=`<rect x="${x}" y="${yy}" width="${ww}" height="${Math.max(hh-1,1)}" fill="${JOB_C[j]}" rx="1.5"><title>${esc(j)} : ${nf.format(v)} h</title></rect>`});
    if(tot[i])g+=`<text x="${x+ww/2}" y="${T+H-tot[i]/top*H-5}" text-anchor="middle" font-size="11" fill="var(--ink)" font-family="IBM Plex Mono, monospace">${nf.format(tot[i])}</text>`;
    g+=`<text x="${x+ww/2}" y="200" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${pad(w.s.getDate())}/${pad(w.s.getMonth()+1)}</text>`;
  });
  svg.innerHTML=g;
}

function fieldHTML(mod,f){
  const id=`f-${mod}-${f.k}`;
  const ctl=f.type==='select'
    ?`<select id="${id}" name="${f.k}">${f.opts.map(o=>`<option>${esc(o)}</option>`).join('')}</select>`
    :`<input id="${id}" name="${f.k}" type="${f.type}"${f.step?` step="${f.step}" inputmode="decimal"`:''}${f.min?` min="${f.min}"`:''}${f.ph?` placeholder="${esc(f.ph)}"`:''}${f.def?` value="${f.def()}"`:''}${f.req?' required':''}>`;
  return `<div class="field"><label for="${id}">${esc(f.label)}</label>${ctl}</div>`;
}
function formHTML(mod){
  const m=MODS[mod];let out='',i=0;const fs=m.fields;
  while(i<fs.length){const f=fs[i];
    if(f.pair&&fs[i+1]&&fs[i+1].pair===f.pair){out+=`<div class="pair">${fieldHTML(mod,f)}${fieldHTML(mod,fs[i+1])}</div>`;i+=2}
    else{out+=fieldHTML(mod,f);i++}}
  return `<form class="add" data-mod="${mod}" style="--c:${m.c}" novalidate><h2>Nouvelle entrée</h2>${out}<p class="err" hidden></p><button class="btn" type="submit">Ajouter au registre</button></form>`;
}
function rowHTML(e){
  const del=`<button class="del" type="button" data-del="${esc(e.id)}" aria-label="Supprimer">Suppr.</button>`;
  switch(e.mod){
    case 'travail':return `<li class="row"><div class="main"><div class="ttl">${esc(e.job)}</div>${e.note?`<div class="meta">${esc(e.note)}</div>`:''}</div><div class="v">${nf.format(num(e.heures))} h${num(e.montant)?'<br>'+eur(e.montant):''}</div>${del}</li>`;
    case 'sport':return `<li class="row"><div class="main"><div class="ttl">${esc(e.activite)}</div>${e.note?`<div class="meta">${esc(e.note)}</div>`:''}</div><div class="v">${num(e.duree)?nf.format(num(e.duree))+' min':''}</div>${del}</li>`;
    case 'budget':{const r=e.sens==='Revenu';return `<li class="row"><div class="main"><div class="ttl">${esc(e.libelle||e.categorie)}</div><div class="meta">${esc(e.categorie||'')}</div></div><div class="v ${r?'pos':'neg'}">${r?'+':'−'}${eur(e.montant)}</div>${del}</li>`}
    case 'fac':return `<li class="row"><div class="main"><div class="ttl">${esc(e.titre)}</div><div class="meta">${esc([e.type,e.matiere,e.echeance?'pour le '+dayLabel(e.echeance):''].filter(Boolean).join(' · '))}</div></div><button class="status" type="button" data-st="${esc(e.id)}" data-s="${esc(e.statut||'À faire')}" aria-label="Changer le statut">${esc(e.statut||'À faire')}</button>${del}</li>`;
  }return '';
}
function grouped(list,key){
  if(!list.length)return '';
  let out='',cur=null;
  list.forEach(e=>{const d=e[key]||'';if(d!==cur){if(cur!==null)out+='</ul>';out+=`<div class="day">${d?dayLabel(d):'Sans date'}</div><ul class="rows">`;cur=d}out+=rowHTML(e)});
  return out+'</ul>';
}
function modView(mod){
  const m=MODS[mod];let sm='',body='';
  if(mod==='fac'){
    const all=of('fac').sort((a,b)=>String(a.echeance||'9999').localeCompare(String(b.echeance||'9999')));
    const groups=['À faire','En cours','Fait'].map(s=>[s,all.filter(e=>(e.statut||'À faire')===s)]);
    sm=`<div class="sumline"><span>À faire <b>${groups[0][1].length}</b></span><span>En cours <b>${groups[1][1].length}</b></span><span>Fait <b>${groups[2][1].length}</b></span><span>Touche le statut pour le faire avancer.</span></div>`;
    body=all.length?groups.filter(g=>g[1].length).map(([s,l])=>`<div class="sect">${s} <small>${l.length}</small></div><ul class="rows">${l.map(rowHTML).join('')}</ul>`).join('')
      :`<p class="ras"><b>RAS</b> — aucun partiel ni rendu enregistré. Ajoute le prochain avec le formulaire.</p>`;
  }else{
    const list=of(mod).filter(e=>inMonth(e,'date')).sort(byDateDesc('date'));
    if(mod==='travail'){sm=`<div class="sumline"><span>Shifts <b>${list.length}</b></span><span>Heures <b>${nf.format(sum(list,'heures'))} h</b></span><span>Gagné <b>${eur(sum(list,'montant'))}</b></span></div>`}
    if(mod==='sport'){sm=`<div class="sumline"><span>Séances <b>${list.length}</b></span><span>Temps <b>${nf.format(sum(list,'duree'))} min</b></span><span>Au tir <b>${list.filter(e=>e.activite==='Tir sportif').length}</b></span></div>`}
    if(mod==='budget'){const d=sum(list.filter(e=>e.sens==='Dépense'),'montant'),r=sum(list.filter(e=>e.sens==='Revenu'),'montant');sm=`<div class="sumline"><span>Dépenses <b>${eur(d)}</b></span><span>Revenus <b>${eur(r)}</b></span><span>Les paies des boulots se saisissent dans Boulots.</span></div>`}
    body=list.length?grouped(list,'date'):`<p class="ras"><b>RAS</b> — rien en ${esc(monthLabel())}. Ajoute une entrée avec le formulaire.</p>`;
  }
  return `<div class="split" style="--c:${m.c}">${formHTML(mod)}<section class="listpanel" aria-label="${esc(m.label)}">${sm}${body}</section></div>`;
}
function settingsView(){
  return `<div class="settings">
    <section class="panel"><h2>Compte</h2><p>Connecté avec <b>${esc(user.email)}</b>. Tes données sont liées à ce compte et visibles uniquement par toi.</p>
      <div class="row-btns"><button class="btn ghost" type="button" id="logoutBtn">Se déconnecter</button></div></section>
    <section class="panel"><h2>Code PIN</h2>
      <p>${pinRec?`Code à ${pinRec.len} chiffres actif sur cet appareil. Il est demandé à l’ouverture et après 2 minutes en arrière-plan.`:'Aucun code sur cet appareil. Avec un PIN, tu ouvres l’appli sans retaper ton mot de passe, et personne ne peut la consulter si ton téléphone est déverrouillé.'}</p>
      <div class="row-btns">${pinRec?'<button class="btn ghost" type="button" id="pinChange">Changer le PIN</button><button class="btn ghost" type="button" id="pinOff">Désactiver</button>':'<button class="btn" type="button" id="pinOn">Activer un code PIN</button>'}</div></section>
    <section class="panel"><h2>Sauvegarde</h2><p>${entries.length} entrée${entries.length>1?'s':''} dans ton registre. Télécharge une copie au format JSON à garder de côté.</p>
      <div class="row-btns"><button class="btn ghost" type="button" id="exportBtn">Télécharger une copie</button></div></section>
  </div>`;
}

/* ---------- Code PIN ---------- */
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const randHex=n=>hex(crypto.getRandomValues(new Uint8Array(n)).buffer);
async function hashPin(pin,salt){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('main-courante:'+salt+':'+pin)))}
const TXT={
  set1:['Crée ton code PIN','4 à 6 chiffres, puis OK.'],
  set2:['Confirme ton code','Tape-le une deuxième fois, puis OK.'],
  unlock:['Code PIN','Tape ton code pour ouvrir le registre.'],
  old:['Code actuel','Tape ton code actuel pour continuer.']
};
function renderLock(msg){
  const L=$('#lock');L.hidden=!locked;if(!locked)return;
  const t=TXT[mode];$('#lockT').textContent=t[0];$('#lockS').textContent=t[1];
  const fixed=(mode==='unlock'||mode==='old')&&pinRec?pinRec.len:4;
  const n=Math.max(fixed,buf.length);
  $('#dots').innerHTML=Array.from({length:n},(_,i)=>`<i class="${i<buf.length?'on':''}"></i>`).join('');
  $('#lockMsg').textContent=msg||'';
  $('#lockAlt').textContent=pinAction?'Annuler':'Utiliser mon mot de passe';
}
function lockNow(){if(!pinRec)return;locked=true;pinAction=null;buf='';first='';mode='unlock';render();renderLock()}
function unlockNow(){locked=false;pinAction=null;buf='';first='';render();renderLock()}
function startPinFlow(action){pinAction=action;locked=true;buf='';first='';mode=action==='create'?'set1':'old';renderLock()}
async function press(k){
  if(Date.now()<waitUntil)return renderLock(`Trop d’essais. Réessaie dans ${Math.ceil((waitUntil-Date.now())/1000)} s.`);
  if(k==='del'){buf=buf.slice(0,-1);return renderLock()}
  if(k==='ok')return submitPin();
  if(buf.length>=6)return;
  buf+=k;renderLock();
  if((mode==='unlock'||mode==='old')&&pinRec&&buf.length===pinRec.len)submitPin();
}
async function submitPin(){
  const p=buf;
  if(mode==='set1'){if(p.length<4)return renderLock('Il faut au moins 4 chiffres.');first=p;buf='';mode='set2';return renderLock()}
  if(mode==='set2'){
    buf='';
    if(p!==first){first='';mode='set1';return renderLock('Les deux codes ne correspondent pas. Recommence.')}
    const salt=randHex(16);pinRec={salt,hash:await hashPin(p,salt),len:p.length};store_.set(pinKey(),pinRec);
    const was=pinAction;unlockNow();toast(was==='change'?'Code PIN changé':'Code PIN activé');return;
  }
  buf='';
  let ok=false;try{ok=!!pinRec&&(await hashPin(p,pinRec.salt))===pinRec.hash}catch(e){}
  if(!ok){fails++;if(fails>=5){fails=0;waitUntil=Date.now()+30000;return renderLock('Trop d’essais. Réessaie dans 30 s.')}return renderLock('Code incorrect.')}
  fails=0;
  if(mode==='old'){
    if(pinAction==='disable'){store_.del(pinKey());pinRec=null;unlockNow();toast('Code PIN désactivé');return}
    mode='set1';return renderLock();
  }
  unlockNow();
}

/* ---------- Événements ---------- */
document.addEventListener('click',async ev=>{
  const t=ev.target.closest('button');if(!t)return;
  if(t.dataset.key){press(t.dataset.key);return}
  if(t.id==='lockAlt'){
    if(pinAction){unlockNow();return}
    locked=false;renderLock();await sb.auth.signOut();return;
  }
  if(t.dataset.v){view=t.dataset.v;try{history.replaceState(null,'','#'+view)}catch(e){}render();window.scrollTo({top:0});return}
  switch(t.id){
    case 'prevM':return shiftMonth(-1);
    case 'nextM':return shiftMonth(1);
    case 'lockBtn':return lockNow();
    case 'settingsBtn':view='reglages';try{history.replaceState(null,'','#reglages')}catch(e){}render();window.scrollTo({top:0});return;
    case 'logoutBtn':await sb.auth.signOut();return;
    case 'pinOn':return startPinFlow('create');
    case 'pinChange':return startPinFlow('change');
    case 'pinOff':return startPinFlow('disable');
    case 'exportBtn':{
      const blob=new Blob([JSON.stringify({exporte_le:new Date().toISOString(),entrees:entries},null,2)],{type:'application/json'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='main-courante-'+todayISO()+'.json';document.body.appendChild(a);a.click();
      setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);return;
    }
    case 'toSignup':return setAuthMode(authMode==='login'?'signup':'login');
    case 'toReset':return setAuthMode('reset');
  }
  if(t.dataset.del){
    if(!t.classList.contains('armed')){t.classList.add('armed');t.textContent='Confirmer';setTimeout(()=>{if(t.isConnected){t.classList.remove('armed');t.textContent='Suppr.'}},3000);return}
    try{await delEntry(t.dataset.del);toast('Entrée supprimée')}catch(e){toast(frErr(e))}
    return;
  }
  if(t.dataset.st){
    const cyc=['À faire','En cours','Fait'];const n=cyc[(cyc.indexOf(t.dataset.s)+1)%3];
    try{await updEntry(t.dataset.st,{statut:n})}catch(e){toast(frErr(e))}
  }
});

document.addEventListener('submit',async ev=>{
  const f=ev.target;ev.preventDefault();
  if(f.id==='loginForm')return submitAuth();
  if(f.id==='newPwForm'){
    const pw=$('#newPw').value;const err=$('#newPwErr');
    if(pw.length<8){err.textContent='Le mot de passe doit faire au moins 8 caractères.';err.hidden=false;return}
    const {error}=await sb.auth.updateUser({password:pw});
    if(error){err.textContent=frErr(error);err.hidden=false;return}
    recovering=false;$('#newPwForm').hidden=true;$('#loginForm').hidden=false;toast('Mot de passe changé');
    const {data}=await sb.auth.getSession();if(data.session){justLoggedIn=true;startApp(data.session)}
    return;
  }
  if(!f.classList.contains('add'))return;
  const mod=f.dataset.mod;const m=MODS[mod];const o={mod};const err=f.querySelector('.err');
  for(const fd of m.fields){const el=f.elements[fd.k];const v=el.value.trim();
    if(fd.req&&!v){err.textContent=`Renseigne « ${fd.label} » pour ajouter l’entrée.`;err.hidden=false;el.focus();return}
    o[fd.k]=fd.type==='number'?(v===''?0:num(v)):v}
  err.hidden=true;
  const btn=f.querySelector('button[type=submit]');btn.disabled=true;
  try{
    await addEntry(o);toast('Ajouté au registre');
    if(mod!=='fac'&&o[m.dateKey]&&o[m.dateKey].slice(0,7)!==month){month=o[m.dateKey].slice(0,7);render()}
  }catch(e){err.textContent=frErr(e);err.hidden=false;btn.disabled=false}
});

async function submitAuth(){
  const email=$('#authEmail').value.trim();const pw=$('#authPw').value;
  const err=$('#authErr'),info=$('#authInfo');err.hidden=true;info.hidden=true;
  const fail=t=>{err.textContent=t;err.hidden=false};
  if(!/^\S+@\S+\.\S+$/.test(email))return fail('Entre une adresse mail valide.');
  if(authMode!=='reset'&&pw.length<8)return fail('Le mot de passe doit faire au moins 8 caractères.');
  const btn=$('#authSubmit');btn.disabled=true;
  const back=location.origin+location.pathname;
  try{
    if(authMode==='login'){
      justLoggedIn=true;
      const {error}=await sb.auth.signInWithPassword({email,password:pw});
      if(error){justLoggedIn=false;fail(frErr(error))}
    }else if(authMode==='signup'){
      const {data,error}=await sb.auth.signUp({email,password:pw,options:{emailRedirectTo:back}});
      if(error)fail(frErr(error));
      else if(!data.session)setAuthMode('login','Compte créé. Ouvre le mail de confirmation, puis connecte-toi ici.');
      else justLoggedIn=true;
    }else{
      const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:back});
      if(error)fail(frErr(error));else setAuthMode('login','Si un compte existe, un lien pour changer le mot de passe vient d’être envoyé.');
    }
  }finally{btn.disabled=false}
}

document.addEventListener('keydown',ev=>{
  if(!locked)return;
  if(/^[0-9]$/.test(ev.key)){press(ev.key);ev.preventDefault()}
  else if(ev.key==='Backspace'){press('del');ev.preventDefault()}
  else if(ev.key==='Enter'){press('ok');ev.preventDefault()}
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hiddenAt=Date.now();return}
  if(!user)return;
  if(pinRec&&!locked&&hiddenAt&&Date.now()-hiddenAt>120000)lockNow();
  scheduleReload();
});

/* ---------- Lancement ---------- */
function boot(){
  setOffline();
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}
  const cfg=window.MC_CONFIG||{};
  if(!window.supabase||!cfg.SUPABASE_URL||/TON-PROJET/.test(cfg.SUPABASE_URL)||/COLLE-ICI/.test(cfg.SUPABASE_ANON_KEY||'')){
    showAuth();
    const err=$('#authErr');
    err.textContent=!window.supabase?'La librairie de connexion n’a pas pu se charger. Vérifie ta connexion internet.':'Appli pas encore reliée à Supabase : remplis config.js (voir le guide).';
    err.hidden=false;$('#authSubmit').disabled=true;return;
  }
  sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  sb.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){recovering=true;locked=false;renderLock();show('auth');$('#loginForm').hidden=true;$('#newPwForm').hidden=false;return}
    if(session&&session.user){
      if(!user||user.id!==session.user.id)setTimeout(()=>startApp(session),0);
    }else if(event==='SIGNED_OUT'||event==='INITIAL_SESSION'){
      stopApp();showAuth();
    }
  });
}
boot();
})();
