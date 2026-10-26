/* Main courante v2 — appli installable (PWA) avec Supabase, pages personnalisables */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const p=String(s||'').split('-').map(Number);return new Date(p[0],(p[1]||1)-1,p[2]||1)};
const todayISO=()=>iso(new Date());
const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return iso(d)};
const nf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
const ef=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
const eur=v=>ef.format(+v||0);
const num=v=>{const n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0};
const MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const JOURS=['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'];
const short=s=>{if(!s)return '—';const d=parse(s);return pad(d.getDate())+'/'+pad(d.getMonth()+1)};
const frDate=s=>{if(!s)return '';const d=parse(s);return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()};
const dayLabel=s=>{const d=parse(s);return JOURS[d.getDay()]+' '+d.getDate()+' '+MOIS[d.getMonth()]};
const uid8=()=>Math.random().toString(36).slice(2,10);
const fold=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const slugify=s=>fold(s).replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,24)||'champ';
const clone=o=>JSON.parse(JSON.stringify(o));
const store_={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};

/* ---------- Couleurs, types, modèles de page ---------- */
const COLORS=[['orange','Orange'],['bleu','Bleu'],['vert','Vert'],['violet','Violet'],['rouge','Rouge'],['jaune','Moutarde'],['cyan','Cyan'],['rose','Rose'],['gris','Gris']];
const cv=c=>`var(--k-${COLORS.some(x=>x[0]===c)?c:'gris'})`;
const SERIES=['orange','violet','bleu','vert','rouge','jaune','cyan','rose'];
const STATUTS=['À faire','En cours','Fait'];
const UNITS=[['','Aucune'],['€','€'],['h','heures'],['min','minutes'],['km','km'],['kg','kg']];
const FTYPES=[['text','Texte'],['number','Nombre'],['date','Date'],['select','Liste de choix'],['photo','Photo']];
const RESERVED=['id','mod','createdat','created_at','user_id'];
const TPL={
  journal:{label:'Journal daté',desc:'Entrées groupées par jour, totaux du mois. Ex. : boulots, sport.',dateKey:'date',
    fields:()=>[{k:'date',label:'Date',type:'date',req:1,core:1},{k:'quoi',label:'Quoi',type:'text',req:1},{k:'note',label:'Note',type:'text'}]},
  taches:{label:'Tâches à échéance',desc:'À faire → En cours → Fait, compte à rebours, rappel calendrier. Ex. : fac, admin.',dateKey:'echeance',
    fields:()=>[{k:'titre',label:'Intitulé',type:'text',req:1,core:1},{k:'echeance',label:'Échéance',type:'date',core:1},{k:'statut',label:'Statut',type:'select',opts:STATUTS.slice(),core:1,fixed:1}]},
  argent:{label:'Argent',desc:'Dépenses et revenus par catégorie, solde du mois. Ex. : budget, voyage.',dateKey:'date',
    fields:()=>[{k:'date',label:'Date',type:'date',req:1,core:1},{k:'sens',label:'Sens',type:'select',opts:['Dépense','Revenu'],req:1,core:1,fixed:1},{k:'montant',label:'Montant',type:'number',unit:'€',req:1,core:1},{k:'categorie',label:'Catégorie',type:'select',opts:['Courses','Sorties','Autre'],core:1},{k:'libelle',label:'Libellé',type:'text'},{k:'ticket',label:'Ticket',type:'photo'}]},
  habitude:{label:'Habitude',desc:'Une case par jour, série en cours et record. Ex. : lecture, révisions.',dateKey:'date',
    fields:()=>[{k:'date',label:'Date',type:'date',req:1,core:1},{k:'note',label:'Note',type:'text'}]}
};
const DEFAULT_PAGES=()=>[
  {slug:'travail',name:'Boulots',color:'orange',position:0,template:'journal',settings:{},fields:[
    {k:'date',label:'Date',type:'date',req:1,core:1},
    {k:'job',label:'Boulot',type:'select',opts:['Sécurité de nuit','Pâtisserie — Comptoir du Flan','Auto-entrepreneur'],req:1},
    {k:'heures',label:'Heures',type:'number',unit:'h',ph:'9'},
    {k:'montant',label:'Gagné',type:'number',unit:'€',ph:'0'},
    {k:'note',label:'Note',type:'text',ph:'Ronde RAS, incident, livraison…'}]},
  {slug:'fac',name:'Fac',color:'bleu',position:1,template:'taches',settings:{},fields:[
    {k:'titre',label:'Intitulé',type:'text',req:1,core:1,ph:'Partiel de proba, rendu projet…'},
    {k:'type',label:'Type',type:'select',opts:['Partiel','Devoir / TD','Projet','Cours à rattraper','Stage','Admin fac']},
    {k:'matiere',label:'Matière',type:'text',ph:'Proba, BDD…'},
    {k:'echeance',label:'Échéance',type:'date',core:1},
    {k:'statut',label:'Statut',type:'select',opts:STATUTS.slice(),core:1,fixed:1}]},
  {slug:'sport',name:'Sport & tir',color:'vert',position:2,template:'journal',settings:{},fields:[
    {k:'date',label:'Date',type:'date',req:1,core:1},
    {k:'activite',label:'Activité',type:'select',opts:['Tir sportif','Musculation','Course','Autre'],req:1},
    {k:'duree',label:'Durée',type:'number',unit:'min',ph:'60'},
    {k:'note',label:'Score / ressenti',type:'text',ph:'Série 10 m : 92/100…'}]},
  {slug:'budget',name:'Budget',color:'violet',position:3,template:'argent',settings:{},fields:[
    {k:'date',label:'Date',type:'date',req:1,core:1},
    {k:'sens',label:'Sens',type:'select',opts:['Dépense','Revenu'],req:1,core:1,fixed:1},
    {k:'montant',label:'Montant',type:'number',unit:'€',req:1,core:1,ph:'0'},
    {k:'categorie',label:'Catégorie',type:'select',opts:['Courses','Logement','Transport','Sorties','Équipement','Fac','Admin','Bourse / aides','Autre'],core:1},
    {k:'libelle',label:'Libellé',type:'text',ph:'Loyer CROUS, abonnement TaM…'},
    {k:'ticket',label:'Ticket',type:'photo'}]}
];

/* ---------- État ---------- */
let sb=null,user=null,entries=[],pages=[],ready=false,pagesReady=false,pagesOk=true,channel=null;
let pagesNote='',dataNote='';
let view=decodeURIComponent((location.hash||'').slice(1))||'bord';
let month=todayISO().slice(0,7);
let q='',filt='',gq='',editId=null,draft=null,skipKeep=false;
let authMode='login',justLoggedIn=false,recovering=false;
let locked=false,pinRec=null,mode='unlock',buf='',first='',fails=0,waitUntil=0,hiddenAt=0,pinAction=null;
let bioOk=false;
const pinKey=()=>'mc-pin-'+(user?user.id:'');
const bioKey=()=>'mc-bio-'+(user?user.id:'');
const cacheKey=()=>'mc-cache-'+(user?user.id:'');
const pagesKey=()=>'mc-pages-'+(user?user.id:'');
const BUCKET='tickets';
(async()=>{try{bioOk=!!(window.PublicKeyCredential&&PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())}catch(e){bioOk=false}})();

/* ---------- Petites aides ---------- */
let tt,toastFn=null;
function toast(t,act,fn){
  const el=$('#toast');el.innerHTML=esc(t)+(act?` <button class="toast-act" type="button" id="toastAct">${esc(act)}</button>`:'');
  toastFn=fn||null;el.hidden=false;clearTimeout(tt);tt=setTimeout(()=>{el.hidden=true;toastFn=null},act?5500:2400);
}
function showNote(t){const n=$('#note');n.textContent=t;n.hidden=!t}
function frErr(e){
  const m=(e&&(e.message||e.error_description||e.error))||'';
  if(/Invalid login credentials/i.test(m))return 'Adresse ou mot de passe incorrect.';
  if(/Email not confirmed/i.test(m))return 'Confirme d’abord ton adresse avec le lien reçu par mail.';
  if(/already registered|already been registered/i.test(m))return 'Un compte existe déjà avec cette adresse. Connecte-toi.';
  if(/Password should be at least/i.test(m))return 'Le mot de passe doit faire au moins 8 caractères.';
  if(/rate limit|too many/i.test(m))return 'Trop de tentatives. Patiente quelques minutes.';
  if(/Bucket not found/i.test(m))return 'Le stockage des photos n’existe pas encore : exécute supabase-v2.sql dans Supabase.';
  if(/entries_mod_check|violates check constraint/i.test(m))return 'Base pas à jour : exécute supabase-v2.sql dans Supabase.';
  if(/payload too large|exceeded the maximum/i.test(m))return 'Photo trop lourde (10 Mo max).';
  if(/Failed to fetch|NetworkError|network|Load failed/i.test(m))return 'Pas de connexion internet. Réessaie quand le réseau revient.';
  return m?('Erreur : '+m):'Une erreur est survenue. Réessaie.';
}
function setOffline(){$('#offline').hidden=navigator.onLine}
window.addEventListener('online',()=>{setOffline();if(user)loadAll()});
window.addEventListener('offline',setOffline);
async function saveFile(name,content,type){
  const blob=content instanceof Blob?content:new Blob([content],{type});
  const standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone;
  if(standalone&&navigator.canShare&&window.File){
    try{const file=new File([blob],name,{type});if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name});return}}
    catch(e){if(e&&e.name==='AbortError')return}
  }
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
}

/* ---------- Écrans ---------- */
function show(which){$('#auth').hidden=which!=='auth';$('#app').hidden=which!=='app'}
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
function showAuth(info){show('auth');$('#loginForm').hidden=false;$('#newPwForm').hidden=true;setAuthMode('login',info)}

/* ---------- Pages : aides ---------- */
const live=()=>pages.filter(p=>!p.archived).sort((a,b)=>a.position-b.position);
const archived=()=>pages.filter(p=>p.archived);
const pageOf=slug=>pages.find(p=>p.slug===slug);
const dk=p=>(TPL[p.template]||TPL.journal).dateKey;
const fld=(p,k)=>p.fields.find(f=>f.k===k);
const hourF=p=>p.fields.find(f=>f.type==='number'&&f.unit==='h');
const moneyF=p=>p.fields.find(f=>f.type==='number'&&f.unit==='€');
const isWork=p=>p.template==='journal'&&!!hourF(p)&&!!moneyF(p);
const firstSel=p=>p.fields.find(f=>f.type==='select'&&!f.fixed);
const fmtNum=(f,v)=>f&&f.unit==='€'?eur(v):nf.format(num(v))+(f&&f.unit?' '+f.unit:'');
const flabel=f=>f.label+(f.unit&&f.type==='number'?` (${f.unit})`:'');
const stepOf=f=>f.unit==='€'?'0.01':f.unit==='h'?'0.25':f.unit==='min'?'5':'any';

/* ---------- Données ---------- */
const rowToEntry=r=>Object.assign({},r.data||{},{id:r.id,mod:r.mod,createdAt:Date.parse(r.created_at)||0});
const PAGE_COLS='id,slug,name,color,position,template,fields,settings,archived';
const rowToPage=r=>({id:r.id,slug:r.slug,name:r.name,color:r.color||'gris',position:r.position||0,template:TPL[r.template]?r.template:'journal',
  fields:Array.isArray(r.fields)?r.fields:[],settings:r.settings&&typeof r.settings==='object'&&!Array.isArray(r.settings)?r.settings:{},archived:!!r.archived});
const pageRow=p=>({slug:p.slug,name:p.name,color:p.color,position:p.position,template:p.template,fields:p.fields,settings:p.settings||{},archived:!!p.archived});
const missingTable=e=>/42P01|PGRST205|PGRST106|does not exist|schema cache|Could not find the table/i.test(((e&&e.message)||'')+' '+((e&&e.code)||''));
const cachePages=()=>store_.set(pagesKey(),pages);
const cacheEntries=()=>store_.set(cacheKey(),entries);
const fallbackPages=()=>DEFAULT_PAGES().map(p=>Object.assign({id:null,archived:false},p));

async function loadPages(){
  const {data,error}=await sb.from('pages').select(PAGE_COLS).order('position',{ascending:true});
  if(error){
    pagesOk=!missingTable(error);
    const cached=store_.get(pagesKey(),null);
    if(!pages.length)pages=cached&&cached.length?cached:fallbackPages();
    pagesReady=true;
    pagesNote=pagesOk?'':'Base à mettre à jour : exécute supabase-v2.sql dans Supabase (voir le guide). En attendant, les 4 pages d’origine restent utilisables mais pas modifiables.';
    return;
  }
  pagesOk=true;pagesNote='';
  if(!data.length){
    await sb.from('pages').upsert(DEFAULT_PAGES().map(pageRow),{onConflict:'user_id,slug',ignoreDuplicates:true});
    const again=await sb.from('pages').select(PAGE_COLS).order('position',{ascending:true});
    pages=!again.error&&again.data.length?again.data.map(rowToPage):fallbackPages();
  }else pages=data.map(rowToPage);
  pagesReady=true;cachePages();
}
async function loadEntries(){
  const {data,error}=await sb.from('entries').select('id,mod,data,created_at').order('created_at',{ascending:true});
  if(error){
    const cached=store_.get(cacheKey(),null);
    if(cached&&!entries.length)entries=cached;
    if(cached)ready=true;
    dataNote=navigator.onLine?'Chargement impossible pour le moment. '+frErr(error):'Hors connexion : dernières données enregistrées sur ce téléphone.';
    return;
  }
  entries=data.map(rowToEntry);ready=true;dataNote='';cacheEntries();
}
async function loadAll(){await Promise.all([loadPages(),loadEntries()]);fixView();render()}
let reloadT;const scheduleReload=()=>{clearTimeout(reloadT);reloadT=setTimeout(loadAll,300)};
function subscribe(){
  if(channel){sb.removeChannel(channel);channel=null}
  channel=sb.channel('mc-'+user.id)
    .on('postgres_changes',{event:'*',schema:'public',table:'entries',filter:'user_id=eq.'+user.id},scheduleReload)
    .on('postgres_changes',{event:'*',schema:'public',table:'pages',filter:'user_id=eq.'+user.id},scheduleReload)
    .subscribe();
}
async function addEntry(o){
  const {mod,...rest}=o;
  const {data,error}=await sb.from('entries').insert({mod,data:rest}).select('id,mod,data,created_at').single();
  if(error)throw error;
  const e=rowToEntry(data);entries.push(e);cacheEntries();return e;
}
const photoPaths=e=>Object.values(e).filter(v=>typeof v==='string'&&user&&v.startsWith(user.id+'/'));
async function removePhotos(paths){if(paths.length){try{await sb.storage.from(BUCKET).remove(paths)}catch(e){}}}
async function delEntry(id){
  const e=entries.find(x=>x.id===id);
  const {error}=await sb.from('entries').delete().eq('id',id);
  if(error)throw error;
  entries=entries.filter(x=>x.id!==id);cacheEntries();
  if(e)removePhotos(photoPaths(e));
  if(editId===id)editId=null;
}
async function updEntry(id,patch){
  const e=entries.find(x=>x.id===id);if(!e)return;
  const {id:_i,mod:_m,createdAt:_c,...rest}=Object.assign({},e,patch);
  const {error}=await sb.from('entries').update({data:rest}).eq('id',id);
  if(error)throw error;
  Object.assign(e,patch);cacheEntries();
}
async function insertPage(p){
  const {data,error}=await sb.from('pages').insert(pageRow(p)).select(PAGE_COLS).single();
  if(error)throw error;
  const np=rowToPage(data);pages.push(np);cachePages();return np;
}
async function updatePage(p,patch){
  const {error}=await sb.from('pages').update(patch).eq('id',p.id);
  if(error)throw error;
  Object.assign(p,patch);cachePages();
}
async function deletePage(p){
  const list=of(p.slug);
  if(list.length){const {error}=await sb.from('entries').delete().eq('mod',p.slug);if(error)throw error}
  removePhotos(list.flatMap(photoPaths));
  const {error}=await sb.from('pages').delete().eq('id',p.id);
  if(error)throw error;
  pages=pages.filter(x=>x!==p);entries=entries.filter(e=>e.mod!==p.slug);cachePages();cacheEntries();
}

/* ---------- Photos ---------- */
async function compressImage(file){
  try{
    const url=URL.createObjectURL(file);
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url});
    const max=1600;const s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
    const w=Math.max(1,Math.round(img.naturalWidth*s)),h=Math.max(1,Math.round(img.naturalHeight*s));
    const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);URL.revokeObjectURL(url);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.78));
    if(blob)return blob;
  }catch(e){}
  return file;
}
async function uploadPhoto(file){
  const blob=await compressImage(file);
  const type=blob.type||'image/jpeg';
  const ext=type==='image/png'?'png':type==='image/webp'?'webp':/hei[cf]/.test(type)?'heic':'jpg';
  const path=`${user.id}/${Date.now().toString(36)}-${uid8()}.${ext}`;
  const {error}=await sb.storage.from(BUCKET).upload(path,blob,{contentType:type,upsert:false});
  if(error)throw error;
  return path;
}
async function openPhoto(path){
  const {data,error}=await sb.storage.from(BUCKET).createSignedUrl(path,3600);
  if(error||!data){toast(frErr(error));return}
  $('#viewerImg').src=data.signedUrl;$('#viewer').hidden=false;
}

/* ---------- Démarrage / session ---------- */
async function startApp(session){
  if(recovering)return;
  user=session.user;
  pinRec=store_.get(pinKey(),null);
  show('app');
  if(pinRec&&!justLoggedIn){lockNow()}else{locked=false;renderLock()}
  justLoggedIn=false;
  const cached=store_.get(cacheKey(),null);if(cached){entries=cached;ready=true}
  const cp=store_.get(pagesKey(),null);if(cp&&cp.length){pages=cp;pagesReady=true}
  render();
  await loadAll();
  subscribe();
}
function stopApp(){
  if(channel){sb.removeChannel(channel);channel=null}
  user=null;entries=[];pages=[];ready=false;pagesReady=false;locked=false;renderLock();
}

/* ---------- Navigation ---------- */
function go(v){
  if(v!==view){q='';filt='';editId=null;skipKeep=true}
  view=v;
  try{history.replaceState(null,'','#'+encodeURIComponent(v))}catch(e){}
  render();window.scrollTo({top:0});
}
function fixView(){
  if(view==='bord'||view==='reglages')return;
  if(view.startsWith('edit:')){if(!draft){const id=view.slice(5);if(!pagesOk||(id!=='new'&&!pages.some(p=>p.id===id)))view='bord';else makeDraft(id)}return}
  const p=pageOf(view);if(!p||p.archived)view='bord';
}

/* ---------- Calculs ---------- */
const of=mod=>entries.filter(e=>e.mod===mod);
const inMonth=(e,key)=>String(e[key]||'').slice(0,7)===month;
const ofMonth=p=>of(p.slug).filter(e=>inMonth(e,dk(p)));
const sum=(arr,k)=>arr.reduce((a,e)=>a+num(e[k]),0);
const byDateDesc=key=>(a,b)=>String(b[key]||'').localeCompare(String(a[key]||''))||(b.createdAt||0)-(a.createdAt||0);
function monthLabel(){const [y,m]=month.split('-').map(Number);return MOIS[m-1]+' '+y}
function shiftMonth(d){let [y,m]=month.split('-').map(Number);m+=d;if(m<1){m=12;y--}if(m>12){m=1;y++}month=y+'-'+pad(m);render()}
function primaryKey(p,e){
  if(p.template==='argent')return e.libelle?'libelle':'categorie';
  if(p.template==='taches')return 'titre';
  const f=p.fields.find(f=>(f.type==='select'||f.type==='text')&&e[f.k]);return f?f.k:null;
}
function primary(p,e){const k=primaryKey(p,e);return k&&e[k]?String(e[k]):(p.template==='argent'?'Sans libellé':p.name)}
function secondary(p,e){
  const pk=primaryKey(p,e);
  return p.fields.filter(f=>(f.type==='text'||f.type==='select')&&f.k!==pk&&!(p.template==='argent'&&f.k==='sens')&&!(p.template==='taches'&&f.k==='statut')&&e[f.k]).map(f=>String(e[f.k]));
}
function valuesOf(p,e){return p.fields.filter(f=>f.type==='number'&&num(e[f.k])&&!(p.template==='argent'&&f.k==='montant')).map(f=>fmtNum(f,e[f.k]))}
function logText(p,e){
  if(p.template==='argent')return `${e.sens==='Revenu'?'+':'−'}${eur(e.montant)} · ${primary(p,e)}`;
  if(p.template==='taches')return `${e.titre||''}${e.statut?' · '+e.statut:''}`;
  const v=valuesOf(p,e),s=secondary(p,e);
  return primary(p,e)+(v.length?' · '+v.join(' · '):'')+(s.length?' — '+s.join(' · '):'');
}
function matches(p,e,qq,ff){
  if(ff){const i=ff.indexOf('=');const k=ff.slice(0,i),v=ff.slice(i+1);if(String(e[k]||'')!==v)return false}
  if(qq){
    const hay=fold(p.fields.map(f=>f.type==='date'?(e[f.k]?frDate(e[f.k])+' '+dayLabel(e[f.k]):''):f.type==='photo'?'':e[f.k]).join(' ')+' '+p.name);
    return fold(qq).split(/\s+/).filter(Boolean).every(w=>hay.includes(w));
  }
  return true;
}
function rateFor(p,form){
  const r=(p.settings&&p.settings.rates)||{};const sf=firstSel(p);
  const key=sf&&form&&form.elements[sf.k]?form.elements[sf.k].value:'*';
  return num(r[key])||num(r['*']);
}
function streakOf(dates){
  const s=new Set(dates);const t=todayISO();let d=s.has(t)?t:addDays(t,-1);let n=0;
  while(s.has(d)){n++;d=addDays(d,-1)}
  const sorted=[...s].filter(Boolean).sort();let best=0,cur=0,prev=null;
  sorted.forEach(x=>{cur=prev&&addDays(prev,1)===x?cur+1:1;best=Math.max(best,cur);prev=x});
  return {cur:n,best};
}

/* ---------- Objectifs ---------- */
function goalField(p,g){if(g.metric==='dep'||g.metric==='rev')return {unit:'€'};if(g.metric&&g.metric.startsWith('sum:'))return fld(p,g.metric.slice(4))||{};return {}}
function goalValue(p,g){
  let list=ofMonth(p);
  if(g.fk)list=list.filter(e=>String(e[g.fk]||'')===g.fv);
  if(g.metric==='count')return list.length;
  if(g.metric==='dep')return sum(list.filter(e=>e.sens!=='Revenu'),'montant');
  if(g.metric==='rev')return sum(list.filter(e=>e.sens==='Revenu'),'montant');
  if(g.metric&&g.metric.startsWith('sum:'))return sum(list,g.metric.slice(4));
  return 0;
}
function goalLabel(p,g){
  if(g.label)return g.label;
  let m=g.metric==='count'?'Entrées':g.metric==='dep'?'Dépenses':g.metric==='rev'?'Revenus':(()=>{const f=fld(p,String(g.metric).slice(4));return f?'Total '+f.label.toLowerCase():'Total'})();
  return m+(g.fk&&g.fv?' · '+g.fv:'');
}
function metricOptions(p){
  const o=[['count','Nombre d’entrées']];
  if(p.template==='argent'){o.push(['dep','Dépenses'],['rev','Revenus'])}
  p.fields.filter(f=>f.type==='number'&&!(p.template==='argent'&&f.k==='montant')).forEach(f=>o.push(['sum:'+f.k,'Total '+f.label.toLowerCase()+(f.unit?' ('+f.unit+')':'')]));
  return o;
}
function gaugeHTML(p,g,withPage){
  const v=goalValue(p,g),t=num(g.target);if(!t)return '';
  const f=goalField(p,g);const fmt=x=>g.metric==='count'?nf.format(x):fmtNum(f,x);
  const pct=Math.min(100,v/t*100);
  let cls,txt;
  if(g.op==='min'){cls=v>=t?'ok':'go';txt=v>=t?'atteint ✓':'encore '+fmt(t-v)}
  else{cls=v>t?'over':v>=t*.8?'warn':'ok';txt=v>t?'dépassé de '+fmt(v-t):'reste '+fmt(t-v)}
  return `<div class="gauge ${cls}" style="--c:${cv(p.color)}"><div class="gtop"><span class="gname">${withPage?`<i style="background:${cv(p.color)}"></i>`:''}${esc(goalLabel(p,g))}</span><span class="gval">${fmt(v)} / ${fmt(t)}</span></div><div class="gtrack"><span style="width:${Math.max(2,pct)}%"></span></div><div class="gtxt">${g.op==='min'?'Au moins':'Au plus'} · ${txt}</div></div>`;
}

/* ---------- Rendu ---------- */
function renderTabs(){
  const cur=view.startsWith('edit:')?(draft&&draft.slug)||'':view;
  const tabs=[['bord','Tableau de bord','var(--ink)'],...live().map(p=>[p.slug,p.name,cv(p.color)])];
  $('#tabs').innerHTML=tabs.map(([k,l,c])=>`<button class="tab" role="tab" type="button" data-v="${esc(k)}" style="--dot:${c}" aria-selected="${k===cur}"><i aria-hidden="true"></i>${esc(l)}</button>`).join('')
    +(pagesOk&&pagesReady?`<button class="tab add" type="button" data-v="edit:new" aria-selected="${view==='edit:new'}">＋ Page</button>`:'');
}
function snapshotUI(){
  const a=document.activeElement;const s={id:a&&a.id?a.id:null,sel:null,vals:null};
  try{if(a&&a.selectionStart!=null&&a.setSelectionRange)s.sel=[a.selectionStart,a.selectionEnd]}catch(e){}
  const f=document.querySelector('#main form.add');
  if(f&&!skipKeep)s.vals={mod:f.dataset.mod,edit:f.dataset.edit||'',v:[...f.elements].filter(el=>el.name&&el.type!=='file'&&el.type!=='submit'&&el.type!=='button').map(el=>[el.name,el.type==='checkbox'?el.checked:el.value,el.dataset.auto])};
  if(skipKeep)s.id=null;
  skipKeep=false;return s;
}
function restoreUI(s){
  if(s.vals){const f=document.querySelector('#main form.add');
    if(f&&f.dataset.mod===s.vals.mod&&(f.dataset.edit||'')===s.vals.edit){
      s.vals.v.forEach(([n,v,auto])=>{const el=f.elements[n];if(!el||!el.tagName||el.type==='file')return;if(el.type==='checkbox')el.checked=v;else el.value=v;if(auto!=null)el.dataset.auto=auto});
    }}
  if(s.id){const el=document.getElementById(s.id);if(el&&el!==document.activeElement){try{el.focus({preventScroll:true});if(s.sel)el.setSelectionRange(s.sel[0],s.sel[1])}catch(e){}}}
}
function render(){
  if(!user)return;
  $('#monthLbl').textContent=monthLabel();
  $('#lockBtn').hidden=!pinRec;
  const main=$('#main');
  if(locked&&!pinAction){$('#tabs').innerHTML='';main.innerHTML='';return}
  showNote([pagesNote,dataNote].filter(Boolean).join(' '));
  const snap=snapshotUI();
  renderTabs();
  if(view==='reglages'){main.innerHTML=settingsView()}
  else if(view.startsWith('edit:')){main.innerHTML=draft?editorView():'<p class="ras">Ouverture…</p>'}
  else if(!ready||!pagesReady){main.innerHTML='<p class="ras">Ouverture du registre…</p>'}
  else{
    const p=pageOf(view);
    main.innerHTML=alertsHTML()+(p&&!p.archived?pageView(p):dash());
    drawChart();
  }
  restoreUI(snap);
}

/* Rappels d’échéances (bandeau) */
function dueTasks(){
  const t=todayISO();const out=[];
  live().filter(p=>p.template==='taches').forEach(p=>of(p.slug).forEach(e=>{if(e.statut!=='Fait'&&e.echeance)out.push([p,e,Math.round((parse(e.echeance)-parse(t))/864e5)])}));
  return out.sort((a,b)=>a[2]-b[2]);
}
const whenTxt=d=>d<0?`en retard de ${-d} j`:d===0?'aujourd’hui':d===1?'demain':`J-${d}`;
function alertsHTML(){
  const urgent=dueTasks().filter(x=>x[2]<=1);if(!urgent.length)return '';
  return `<div class="alert" role="status"><b>Rappel</b>${urgent.slice(0,4).map(([p,e,d])=>`<button type="button" class="alert-item" data-v="${esc(p.slug)}"><span class="when ${d<0?'late':'soon'}">${whenTxt(d)}</span> ${esc(e.titre)}</button>`).join('')}${urgent.length>4?`<span class="alert-more">+${urgent.length-4}</span>`:''}</div>`;
}

/* ---------- Tableau de bord ---------- */
let chartData=null;
function dash(){
  const L=live();
  const works=L.filter(isWork),moneyP=L.filter(p=>p.template==='argent'),tasks=L.filter(p=>p.template==='taches'),
        habits=L.filter(p=>p.template==='habitude'),journals=L.filter(p=>p.template==='journal'&&!isWork(p));
  let h=0,g=0;const byJob={};
  works.forEach(p=>{const hf=hourF(p),mf=moneyF(p),sf=firstSel(p);ofMonth(p).forEach(e=>{h+=num(e[hf.k]);g+=num(e[mf.k]);const key=sf&&e[sf.k]?e[sf.k]:p.name;byJob[key]=(byJob[key]||0)+num(e[hf.k])})});
  let dep=0,rev=0;const cats={};
  moneyP.forEach(p=>ofMonth(p).forEach(e=>{const v=num(e.montant);if(e.sens==='Revenu')rev+=v;else{dep+=v;const c=e.categorie||'Autre';cats[c]=(cats[c]||0)+v}}));
  const tile=(l,v,s,cls)=>`<div class="tile"><span class="lbl">${esc(l)}</span><span class="val ${cls||''}">${v}</span><span class="sub">${esc(s)}</span></div>`;
  const counts=journals.concat(habits).map(p=>`${ofMonth(p).length} ${p.name}`).join(' · ');
  const tiles=[];
  if(works.length){
    const jobTxt=Object.entries(byJob).filter(x=>x[1]).map(([j,v])=>`${nf.format(v)} h ${String(j).split(' ')[0].toLowerCase()}`).join(' · ')||'Aucune heure saisie';
    tiles.push(tile('Heures bossées',nf.format(h)+' h',jobTxt));
    tiles.push(tile('Gagné (boulots)',eur(g),h?eur(g/h)+' / h en moyenne':'—'));
  }
  if(moneyP.length)tiles.push(tile('Dépensé',eur(dep),rev?'+ '+eur(rev)+' d’aides et autres revenus':'Aucun autre revenu saisi'));
  if(works.length||moneyP.length){const s=g+rev-dep;tiles.push(tile('Solde du mois',(s>=0?'+':'')+eur(s),counts||'—',s>=0?'pos':'neg'))}
  if(tiles.length<4){const n=L.reduce((a,p)=>a+ofMonth(p).length,0);tiles.push(tile('Entrées du mois',nf.format(n),counts||'Toutes pages confondues'))}
  if(tiles.length<4&&tasks.length){const d=dueTasks();tiles.push(tile('Échéances en attente',nf.format(d.length),d.length?'Prochaine : '+whenTxt(d[0][2]):'Rien en attente'))}

  // Graphique heures/semaine
  chartData=null;let chartHTML='';
  if(works.length){
    const keys=[];works.forEach(p=>{const sf=firstSel(p);if(sf)sf.opts.forEach(o=>{if(!keys.includes(o))keys.push(o)});else if(!keys.includes(p.name))keys.push(p.name)});
    entries.forEach(e=>{const p=works.find(w=>w.slug===e.mod);if(!p)return;const sf=firstSel(p);const k=sf&&e[sf.k]?e[sf.k]:p.name;if(!keys.includes(k))keys.push(k)});
    const colors={};keys.forEach((k,i)=>colors[k]=cv(SERIES[i%SERIES.length]));
    chartData={works,colors,keys};
    chartHTML=`<section class="panel"><h2>Heures par semaine <small>8 dernières semaines</small></h2>
      <div class="legend">${keys.map(k=>`<span><i style="background:${colors[k]}"></i>${esc(k)}</span>`).join('')}</div>
      <svg class="chart" id="chart" viewBox="0 0 640 210" role="img" aria-label="Heures travaillées par semaine"></svg></section>`;
  }

  // Main courante + recherche globale
  const logHTML=`<section class="panel"><h2>Main courante <small>${gq?'résultats':'dernières entrées'}</small></h2>
    <input class="search" type="search" id="gq" placeholder="Chercher dans tout le registre…" value="${esc(gq)}" autocomplete="off" aria-label="Chercher dans tout le registre">
    <div id="logBody">${logBody()}</div></section>`;

  // Échéances
  const dues=dueTasks().slice(0,6);
  const dueHTML=tasks.length?`<section class="panel"><h2>Échéances <small>non terminées</small></h2>${dues.length?`<ul class="dues">${dues.map(([p,e,d])=>{
      const cls=d<0?'late':d<=7?'soon':'';const w=d<0?`en retard · ${short(e.echeance)}`:d===0?'aujourd’hui':d===1?'demain':`J-${d} · ${short(e.echeance)}`;
      const meta=[tasks.length>1?p.name:'',...secondary(p,e),e.statut].filter(Boolean).join(' · ');
      return `<li><div><div class="t">${esc(e.titre)}</div><div class="m">${esc(meta)}</div></div><span class="when ${cls}">${w}</span></li>`}).join('')}</ul>`
    :`<p class="ras"><b>RAS</b> — aucune échéance en attente.</p>`}</section>`:'';

  // Objectifs
  const goals=[];L.forEach(p=>((p.settings&&p.settings.goals)||[]).forEach(gl=>{if(num(gl.target))goals.push([p,gl])}));
  const goalHTML=goals.length?`<section class="panel"><h2>Objectifs <small>${esc(monthLabel())}</small></h2><div class="gauges">${goals.map(([p,gl])=>gaugeHTML(p,gl,true)).join('')}</div></section>`:'';

  // Dépenses par catégorie
  const catArr=Object.entries(cats).sort((a,b)=>b[1]-a[1]);const cmax=catArr.length?catArr[0][1]:1;
  const budColor=moneyP.length?cv(moneyP[0].color):'var(--ink)';
  const catHTML=moneyP.length?`<section class="panel"><h2>Dépenses <small>${esc(monthLabel())}</small></h2>${catArr.length?`<div class="hbars">${catArr.map(([c,v])=>`<div class="hbar"><span class="name">${esc(c)}</span><span class="track"><span class="fill" style="width:${Math.max(3,v/cmax*100)}%;background:${budColor}"></span></span><span class="num">${eur(v)}</span></div>`).join('')}</div>`:`<p class="ras"><b>RAS</b> — aucune dépense ce mois-ci.</p>`}</section>`:'';

  // Habitudes
  const habHTML=habits.length?`<section class="panel"><h2>Habitudes <small>14 derniers jours</small></h2><div class="habs">${habits.map(p=>{
      const ds=of(p.slug).map(e=>e.date);const st=streakOf(ds);const set=new Set(ds);const t=todayISO();
      const cells=Array.from({length:14},(_,i)=>{const d=addDays(t,i-13);return `<i class="${set.has(d)?'on':''}" title="${esc(dayLabel(d))}"></i>`}).join('');
      return `<button type="button" class="hab" data-v="${esc(p.slug)}" style="--c:${cv(p.color)}"><span class="hname">${esc(p.name)}</span><span class="hstreak">${st.cur} j de suite</span><span class="hcells">${cells}</span></button>`}).join('')}</div></section>`:'';

  // Autres journaux (sport, etc.)
  const jHTML=journals.map(p=>{
    const list=ofMonth(p);const sf=firstSel(p);const nfld=p.fields.find(f=>f.type==='number');
    let body;
    if(!list.length)body=`<p class="ras"><b>RAS</b> — rien ce mois-ci.</p>`;
    else if(sf){
      const acc={};list.forEach(e=>{const k=e[sf.k]||'Autre';acc[k]=acc[k]||{n:0,s:0};acc[k].n++;if(nfld)acc[k].s+=num(e[nfld.k])});
      body=`<div class="hbars">${Object.entries(acc).sort((a,b)=>b[1].n-a[1].n).map(([k,o])=>`<div class="hbar"><span class="name">${esc(k)}</span><span class="track"><span class="fill" style="width:${Math.max(3,o.n/list.length*100)}%;background:${cv(p.color)}"></span></span><span class="num">${o.n}${nfld?' · '+(nfld.unit==='min'?nf.format(o.s)+'′':fmtNum(nfld,o.s)):''}</span></div>`).join('')}</div>`;
    }else body=`<div class="sumline"><span>Entrées <b>${list.length}</b></span>${p.fields.filter(f=>f.type==='number').map(f=>`<span>${esc(f.label)} <b>${fmtNum(f,sum(list,f.k))}</b></span>`).join('')}</div>`;
    return `<section class="panel"><h2>${esc(p.name)} <small>${sf?'entrées'+(nfld?' · '+esc(nfld.label.toLowerCase()):''):esc(monthLabel())}</small></h2>${body}</section>`;
  }).join('');

  return `<section class="tiles" aria-label="Résumé du mois">${tiles.slice(0,4).join('')}</section>
  <div class="grid2">
    <div class="stack">${chartHTML}${logHTML}</div>
    <div class="stack">${dueHTML}${goalHTML}${catHTML}${habHTML}${jHTML}</div>
  </div>`;
}
function logBody(){
  const L=live();const map={};L.forEach(p=>map[p.slug]=p);
  let list=entries.filter(e=>map[e.mod]);
  if(gq){
    list=list.filter(e=>matches(map[e.mod],e,gq,'')).map(e=>Object.assign({_d:e[dk(map[e.mod])]||''},e)).sort(byDateDesc('_d')).slice(0,40);
    if(!list.length)return `<p class="ras"><b>Aucun résultat</b> pour « ${esc(gq)} ».</p>`;
  }else list=list.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,9);
  if(!list.length)return `<p class="ras"><b>RAS</b> — rien à signaler pour l’instant. Ta première entrée apparaîtra ici.</p>`;
  return `<ul class="log">${list.map(e=>{const p=map[e.mod];return `<li style="--c:${cv(p.color)}"><span>${short(e[dk(p)])}</span><span class="tag">${esc(p.name.toUpperCase())}</span><button type="button" class="txt loglink" data-open="${esc(e.id)}">${esc(logText(p,e))}</button></li>`}).join('')}</ul>`;
}
function drawChart(){
  const svg=$('#chart');if(!svg||!chartData)return;
  const {works,colors,keys}=chartData;
  const [y,m]=month.split('-').map(Number);
  const endM=new Date(y,m,0);const t=parse(todayISO());const end=endM<t?endM:t;
  const mon=d=>{const x=new Date(d);const k=(x.getDay()+6)%7;x.setDate(x.getDate()-k);x.setHours(0,0,0,0);return x};
  const last=mon(end);const weeks=[];
  for(let i=7;i>=0;i--){const s=new Date(last);s.setDate(s.getDate()-7*i);weeks.push({s,v:{}})}
  works.forEach(p=>{const hf=hourF(p),sf=firstSel(p);of(p.slug).forEach(e=>{if(!e.date)return;const ws=mon(parse(e.date)).getTime();const w=weeks.find(w=>w.s.getTime()===ws);if(!w)return;const k=sf&&e[sf.k]?e[sf.k]:p.name;w.v[k]=(w.v[k]||0)+num(e[hf.k])})});
  const tot=weeks.map(w=>Object.values(w.v).reduce((a,b)=>a+b,0));
  const max=Math.max(10,...tot);const step=max<=20?5:max<=40?10:20;const top=Math.ceil(max/step)*step;
  const L=34,R=8,T=12,B=30,W=640-L-R,H=210-T-B,bw=W/8;
  let g='';
  for(let v=0;v<=top;v+=step){const yy=T+H-(v/top)*H;g+=`<line x1="${L}" x2="${640-R}" y1="${yy}" y2="${yy}" stroke="var(--line)" stroke-width="1"/><text x="${L-6}" y="${yy+4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${v}</text>`}
  weeks.forEach((w,i)=>{
    let acc=0;const x=L+i*bw+bw*0.2,ww=bw*0.6;
    keys.forEach(k=>{const v=w.v[k]||0;if(!v)return;const hh=v/top*H;const yy=T+H-(acc+v)/top*H;acc+=v;g+=`<rect x="${x}" y="${yy}" width="${ww}" height="${Math.max(hh-1,1)}" fill="${colors[k]}" rx="1.5"><title>${esc(k)} : ${nf.format(v)} h</title></rect>`});
    if(tot[i])g+=`<text x="${x+ww/2}" y="${T+H-tot[i]/top*H-5}" text-anchor="middle" font-size="11" fill="var(--ink)" font-family="IBM Plex Mono, monospace">${nf.format(tot[i])}</text>`;
    g+=`<text x="${x+ww/2}" y="200" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${pad(w.s.getDate())}/${pad(w.s.getMonth()+1)}</text>`;
  });
  svg.innerHTML=g;
}

/* ---------- Vue d’une page ---------- */
function fieldHTML(p,f,val,isNew){
  const id=`f-${p.slug}-${f.k}`;
  let ctl;
  if(f.type==='select'){
    const opts=(f.opts||[]).slice();if(val&&!opts.includes(val))opts.push(val);
    ctl=`<select id="${id}" name="${esc(f.k)}">${opts.map(o=>`<option${o===val?' selected':''}>${esc(o)}</option>`).join('')}</select>`;
  }else if(f.type==='photo'){
    ctl=`<input id="${id}" name="${esc(f.k)}" type="file" accept="image/*">`+(val?`<span class="photo-cur"><button class="del photo" type="button" data-photo="${esc(val)}">📎 Voir la photo</button><label class="chk"><input type="checkbox" name="${esc(f.k)}__rm"> Retirer</label></span>`:'');
  }else{
    let v=val;if(isNew&&(v==null||v===''))v=f.type==='date'?todayISO():'';
    if(f.type==='number'&&!isNew&&!num(v))v='';
    const extra=f.type==='number'?` step="${stepOf(f)}" min="0" inputmode="decimal"`+(f.unit==='h'?' data-hours="1"':'')+(f.unit==='€'?` data-money="1" data-auto="${isNew?1:0}"`:''):'';
    ctl=`<input id="${id}" name="${esc(f.k)}" type="${f.type==='number'?'number':f.type==='date'?'date':'text'}"${extra}${f.ph?` placeholder="${esc(f.ph)}"`:''} value="${esc(v==null?'':v)}"${f.req?' required':''}>`;
  }
  return `<div class="field"><label for="${id}">${esc(flabel(f))}</label>${ctl}</div>`;
}
function formHTML(p){
  const e=editId?entries.find(x=>x.id===editId&&x.mod===p.slug):null;
  if(editId&&!e)editId=null;
  const isNew=!e;const fs=p.fields;let out='',i=0;
  const shortT=f=>f.type==='number'||f.type==='date'||f.type==='select';
  while(i<fs.length){const f=fs[i],n=fs[i+1];
    const val=e?e[f.k]:(f.type==='select'&&p.template==='taches'&&f.k==='statut'?'À faire':undefined);
    if(n&&shortT(f)&&shortT(n)){out+=`<div class="pair">${fieldHTML(p,f,val,isNew)}${fieldHTML(p,n,e?e[n.k]:undefined,isNew)}</div>`;i+=2}
    else{out+=fieldHTML(p,f,val,isNew);i++}}
  const presets=(p.settings&&p.settings.presets)||[];
  const chips=isNew&&presets.length&&p.template!=='habitude'?`<div class="chips" aria-label="Modèles rapides">${presets.map((pr,j)=>`<button type="button" class="chip" data-preset="${j}" title="Ajoute directement avec la date du jour">＋ ${esc(pr.name)}</button>`).join('')}</div>`:'';
  const presetSave=isNew&&p.template!=='habitude'&&pagesOk&&p.id?`<button class="link small" type="button" id="presetOpen">Enregistrer ces valeurs comme modèle rapide</button>
    <div class="preset-row" id="presetRow" hidden><input id="presetName" type="text" placeholder="Nom (ex. Nuit sécu 21h–7h)" maxlength="40" aria-label="Nom du modèle"><button class="btn ghost" type="button" id="presetSave">OK</button></div>`:'';
  return `<form class="add" data-mod="${esc(p.slug)}" ${e?`data-edit="${esc(e.id)}"`:''} style="--c:${cv(p.color)}" novalidate>
    <h2>${e?'Modifier l’entrée':'Nouvelle entrée'}</h2>${chips}${out}<p class="err" hidden></p>
    <div class="formbtns"><button class="btn" type="submit">${e?'Enregistrer':'Ajouter au registre'}</button>${e?'<button class="btn ghost" type="button" id="editCancel">Annuler</button>':''}</div>${presetSave}</form>`;
}
function rowHTML(p,e){
  const id=esc(e.id);
  const photos=p.fields.filter(f=>f.type==='photo'&&e[f.k]).map(f=>`<button class="ex photo" type="button" data-photo="${esc(e[f.k])}">📎 ${esc(f.label)}</button>`).join('');
  const acts=`<span class="acts">${p.template==='taches'&&e.echeance?`<button class="del" type="button" data-ics="${id}" aria-label="Ajouter au calendrier" title="Ajouter au calendrier (rappel la veille)">📅</button>`:''}<button class="del" type="button" data-edit="${id}" aria-label="Modifier" title="Modifier">✎</button><button class="del" type="button" data-del="${id}" aria-label="Supprimer" title="Supprimer">✕</button></span>`;
  const cls=`row${e.id===editId?' editing':''}`;
  const sec=secondary(p,e);
  if(p.template==='argent'){const r=e.sens==='Revenu';
    return `<li class="${cls}"><div class="main"><div class="ttl">${esc(primary(p,e))} ${photos}</div><div class="meta">${esc(sec.join(' · '))}</div></div><div class="v ${r?'pos':'neg'}">${r?'+':'−'}${eur(e.montant)}</div>${acts}</li>`}
  if(p.template==='taches'){
    const meta=[...sec,e.echeance?'pour le '+dayLabel(e.echeance):''].filter(Boolean).join(' · ');
    return `<li class="${cls}"><div class="main"><div class="ttl">${esc(e.titre)} ${photos}</div><div class="meta">${esc(meta)}${valuesOf(p,e).length?' · '+esc(valuesOf(p,e).join(' · ')):''}</div></div><div class="v"><button class="status" type="button" data-st="${id}" data-s="${esc(e.statut||'À faire')}" aria-label="Changer le statut">${esc(e.statut||'À faire')}</button></div>${acts}</li>`}
  const vals=valuesOf(p,e);
  return `<li class="${cls}"><div class="main"><div class="ttl">${esc(primary(p,e))} ${photos}</div>${sec.length?`<div class="meta">${esc(sec.join(' · '))}</div>`:''}</div><div class="v">${vals.map(esc).join('<br>')}</div>${acts}</li>`;
}
function grouped(p,list,key){
  if(!list.length)return '';
  let out='',cur=null;
  list.forEach(e=>{const d=e[key]||'';if(d!==cur){if(cur!==null)out+='</ul>';out+=`<div class="day">${d?dayLabel(d)+(d.slice(0,7)!==month?' '+d.slice(0,4):''):'Sans date'}</div><ul class="rows">`;cur=d}out+=rowHTML(p,e)});
  return out+'</ul>';
}
function filterSelect(p){
  const sels=p.fields.filter(f=>f.type==='select'&&(f.opts||[]).length);
  if(!sels.length)return '';
  return `<select id="pf" aria-label="Filtrer"><option value="">Tout afficher</option>${sels.map(f=>`<optgroup label="${esc(f.label)}">${f.opts.map(o=>{const v=f.k+'='+o;return `<option value="${esc(v)}"${v===filt?' selected':''}>${esc(o)}</option>`}).join('')}</optgroup>`).join('')}</select>`;
}
function listBody(p){
  const searching=!!(q||filt);
  let list=of(p.slug).filter(e=>matches(p,e,q,filt));
  let sm='',body='';
  if(p.template==='taches'){
    list.sort((a,b)=>String(a.echeance||'9999').localeCompare(String(b.echeance||'9999')));
    const groups=STATUTS.map(s=>[s,list.filter(e=>(e.statut||'À faire')===s)]);
    sm=`<div class="sumline">${groups.map(([s,l])=>`<span>${s} <b>${l.length}</b></span>`).join('')}<span>Touche le statut pour le faire avancer.</span></div>`;
    body=list.length?groups.filter(g=>g[1].length).map(([s,l])=>`<div class="sect">${s} <small>${l.length}</small></div><ul class="rows">${l.map(e=>rowHTML(p,e)).join('')}</ul>`).join('')
      :searching?`<p class="ras"><b>Aucun résultat.</b></p>`:`<p class="ras"><b>RAS</b> — rien d’enregistré. Ajoute la première tâche avec le formulaire.</p>`;
  }else{
    const key=dk(p);
    if(!searching)list=list.filter(e=>inMonth(e,key));
    list.sort(byDateDesc(key));
    if(p.template==='argent'){
      const d=sum(list.filter(e=>e.sens!=='Revenu'),'montant'),r=sum(list.filter(e=>e.sens==='Revenu'),'montant');
      sm=`<div class="sumline"><span>Dépenses <b>${eur(d)}</b></span><span>Revenus <b>${eur(r)}</b></span><span>Solde <b>${(r-d>=0?'+':'')+eur(r-d)}</b></span></div>`;
    }else if(p.template==='habitude'){
      const st=streakOf(of(p.slug).map(e=>e.date));
      sm=`<div class="sumline"><span>Ce mois <b>${new Set(list.map(e=>e.date)).size} j</b></span><span>Série <b>${st.cur} j</b></span><span>Record <b>${st.best} j</b></span></div>`;
    }else{
      sm=`<div class="sumline"><span>Entrées <b>${list.length}</b></span>${p.fields.filter(f=>f.type==='number').map(f=>`<span>${esc(f.label)} <b>${fmtNum(f,sum(list,f.k))}</b></span>`).join('')}</div>`;
      const sf=firstSel(p),bf=moneyF(p)||hourF(p)||p.fields.find(f=>f.type==='number');
      if(sf&&bf&&list.length){const acc={};list.forEach(e=>{const k=e[sf.k]||'—';acc[k]=(acc[k]||0)+num(e[bf.k])});
        const parts=Object.entries(acc).filter(x=>x[1]);
        if(parts.length>1)sm+=`<div class="sumline sub">${esc(bf.label)} par ${esc(sf.label.toLowerCase())} : ${parts.map(([k,v])=>`<span>${esc(k)} <b>${fmtNum(bf,v)}</b></span>`).join('')}</div>`;}
    }
    if(searching)sm=`<div class="sumline"><span>Résultats <b>${list.length}</b></span><span>tous mois confondus</span></div>`+sm;
    body=list.length?grouped(p,list,key):searching?`<p class="ras"><b>Aucun résultat.</b></p>`:`<p class="ras"><b>RAS</b> — rien en ${esc(monthLabel())}. Ajoute une entrée avec le formulaire.</p>`;
  }
  const goals=((p.settings&&p.settings.goals)||[]).filter(g=>num(g.target));
  const gHTML=goals.length&&!searching?`<div class="gauges inpage">${goals.map(g=>gaugeHTML(p,g,false)).join('')}</div>`:'';
  return sm+gHTML+body;
}
function habitCal(p){
  const [y,m]=month.split('-').map(Number);const first=new Date(y,m-1,1);const n=new Date(y,m,0).getDate();
  const off=(first.getDay()+6)%7;const set=new Set(of(p.slug).map(e=>e.date));const t=todayISO();
  let cells='';for(let i=0;i<off;i++)cells+='<span></span>';
  for(let d=1;d<=n;d++){const ds=month+'-'+pad(d);const fut=ds>t;
    cells+=`<button type="button" class="cday${set.has(ds)?' on':''}${ds===t?' today':''}" data-hab="${ds}"${fut?' disabled':''} aria-pressed="${set.has(ds)}" aria-label="${esc(dayLabel(ds))}">${d}</button>`}
  return `<div class="cal" style="--c:${cv(p.color)}">${['L','M','M','J','V','S','D'].map(x=>`<span class="cdow">${x}</span>`).join('')}${cells}</div><p class="hint">Touche un jour pour le cocher. Touche deux fois un jour coché pour l’effacer.</p>`;
}
function pageView(p){
  const tools=`<div class="tools"><input class="search" type="search" id="pq" placeholder="Chercher dans ${esc(p.name)}…" value="${esc(q)}" autocomplete="off" aria-label="Chercher">${filterSelect(p)}</div>`;
  const foot=`<div class="pagefoot"><span>Exporter (CSV) :</span><button class="link small" type="button" data-csv="month">${esc(monthLabel())}</button><button class="link small" type="button" data-csv="all">Tout</button>${pagesOk&&p.id?`<button class="btn ghost" type="button" data-pedit="${esc(p.id)}">Modifier la page</button>`:''}</div>`;
  return `<div class="split" style="--c:${cv(p.color)}">${formHTML(p)}<section class="listpanel" aria-label="${esc(p.name)}">${p.template==='habitude'?habitCal(p):''}${tools}<div id="listBody">${listBody(p)}</div>${foot}</section></div>`;
}

/* ---------- Éditeur de page ---------- */
function makeDraft(id){
  if(id==='new'){
    const used=new Set(live().map(p=>p.color));const c=(COLORS.find(x=>!used.has(x[0]))||COLORS[0])[0];
    draft={id:null,slug:null,name:'',color:c,template:'journal',fields:TPL.journal.fields(),settings:{},archived:false,_new:true};
  }else{const p=pages.find(x=>x.id===id);if(!p)return false;draft=Object.assign(clone(p),{_new:false})}
  draft.fields.forEach(f=>{f._opts=(f.opts||[]).join('\n')});
  if(!draft.settings.goals)draft.settings.goals=[];
  if(!draft.settings.presets)draft.settings.presets=[];
  if(!draft.settings.rates)draft.settings.rates={};
  draft._armed=false;return true;
}
function openEditor(id){if(!pagesOk){toast('Exécute d’abord supabase-v2.sql dans Supabase.');return}if(makeDraft(id))go('edit:'+id)}
function draftOpts(f){return String(f._opts||'').split(/\n|;/).map(s=>s.trim()).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i)}
function editorView(){
  const d=draft;const P=d._new?null:pages.find(x=>x.id===d.id);const nEntries=P?of(P.slug).length:0;
  const sw=COLORS.map(([c,l])=>`<button type="button" class="swatch${d.color===c?' on':''}" data-color="${c}" style="--s:${cv(c)}" aria-label="${l}" aria-pressed="${d.color===c}"></button>`).join('');
  const tpls=d._new?`<div class="field"><span class="flbl">Modèle</span><div class="tpls">${Object.entries(TPL).map(([k,t])=>`<button type="button" class="tpl${d.template===k?' on':''}" data-tpl="${k}" aria-pressed="${d.template===k}"><b>${esc(t.label)}</b><span>${esc(t.desc)}</span></button>`).join('')}</div></div>`
    :`<p class="hint">Modèle : <b>${esc(TPL[d.template].label)}</b>. ${nEntries} entrée${nEntries>1?'s':''} enregistrée${nEntries>1?'s':''}.</p>`;
  const frows=d.fields.map((f,i)=>{
    const core=!!f.core;
    return `<li class="frow">
      <div class="fmain">
        <input id="ed-f${i}-label" class="in" type="text" data-f="${i}" data-fp="label" value="${esc(f.label)}" aria-label="Nom du champ" maxlength="40">
        <select id="ed-f${i}-type" class="in" data-f="${i}" data-fp="type" ${core?'disabled':''} aria-label="Type">${FTYPES.map(([v,l])=>`<option value="${v}"${f.type===v?' selected':''}>${l}</option>`).join('')}</select>
        ${f.type==='number'?`<select id="ed-f${i}-unit" class="in" data-f="${i}" data-fp="unit" aria-label="Unité">${UNITS.map(([v,l])=>`<option value="${v}"${(f.unit||'')===v?' selected':''}>Unité : ${l}</option>`).join('')}</select>`:''}
      </div>
      ${f.type==='select'?(f.fixed?`<p class="hint">Choix fixes : ${esc((f.opts||[]).join(' · '))}</p>`:`<textarea id="ed-f${i}-opts" class="in" data-f="${i}" data-fp="_opts" rows="3" placeholder="Un choix par ligne" aria-label="Choix de la liste">${esc(f._opts||'')}</textarea>`):''}
      <div class="fside">
        <label class="chk"><input type="checkbox" data-f="${i}" data-fp="req" ${f.req?'checked':''} ${core&&f.req?'disabled':''}> Obligatoire</label>
        ${core?'<span class="lockt">champ de base</span>':''}
        <span class="fbtns"><button type="button" class="del" data-fmove="${i}:-1" aria-label="Monter" ${i===0?'disabled':''}>↑</button><button type="button" class="del" data-fmove="${i}:1" aria-label="Descendre" ${i===d.fields.length-1?'disabled':''}>↓</button>${core?'':`<button type="button" class="del" data-fdel="${i}" aria-label="Retirer le champ">✕</button>`}</span>
      </div></li>`}).join('');
  // Taux horaire
  const hf=d.fields.find(f=>f.type==='number'&&f.unit==='h'),mf=d.fields.find(f=>f.type==='number'&&f.unit==='€');
  const sf=d.fields.find(f=>f.type==='select'&&!f.fixed);
  let ratesHTML='';
  if(d.template==='journal'&&hf&&mf){
    const keys=sf?draftOpts(sf):['*'];
    ratesHTML=`<section class="panel"><h2>Taux horaire <small>calcul auto de « ${esc(mf.label)} »</small></h2><p class="hint">Quand tu tapes les heures, le montant se remplit tout seul (heures × taux). Laisse vide pour ne rien calculer.</p>
      <div class="rates">${keys.map((k,j)=>`<div class="field"><label for="ed-rate-${j}">${k==='*'?'Taux':esc(k)} (€/h)</label><input id="ed-rate-${j}" type="number" step="0.01" min="0" inputmode="decimal" data-rate="${esc(k)}" value="${esc(d.settings.rates[k]==null?'':d.settings.rates[k])}" placeholder="—"></div>`).join('')}</div></section>`;
  }
  // Modèles rapides
  const pr=d.settings.presets;
  const presetHTML=d.template==='habitude'?'':`<section class="panel"><h2>Modèles rapides <small>ajout en un tap</small></h2>
    ${pr.length?`<ul class="plist">${pr.map((x,j)=>`<li><span class="pname">${esc(x.name)}</span><span class="pmeta">${esc(Object.entries(x.values||{}).filter(([,v])=>v!==''&&v!=null).map(([k,v])=>{const f=d.fields.find(ff=>ff.k===k);return f?(f.type==='number'?fmtNum(f,v):v):v}).join(' · '))}</span><button type="button" class="del" data-prdel="${j}" aria-label="Supprimer le modèle">✕</button></li>`).join('')}</ul>`:'<p class="hint">Aucun modèle. Pour en créer un : remplis le formulaire de la page puis touche « Enregistrer ces valeurs comme modèle rapide ».</p>'}</section>`;
  // Objectifs
  const tmp={template:d.template,fields:d.fields.map(f=>Object.assign({},f,{opts:f.type==='select'&&!f.fixed?draftOpts(f):f.opts}))};
  const mopts=metricOptions(tmp);
  const fopts=tmp.fields.filter(f=>f.type==='select'&&(f.opts||[]).length);
  const goalsHTML=`<section class="panel"><h2>Objectifs du mois <small>jauges sur le tableau de bord</small></h2>
    ${d.settings.goals.map((g,j)=>`<div class="grow">
      <select id="ed-g${j}-m" class="in" data-g="${j}" data-gp="metric" aria-label="Mesure">${mopts.map(([v,l])=>`<option value="${esc(v)}"${g.metric===v?' selected':''}>${esc(l)}</option>`).join('')}</select>
      <select id="ed-g${j}-f" class="in" data-g="${j}" data-gp="filter" aria-label="Filtre"><option value="">Toutes les entrées</option>${fopts.map(f=>`<optgroup label="${esc(f.label)}">${f.opts.map(o=>`<option value="${esc(f.k+'='+o)}"${g.fk===f.k&&g.fv===o?' selected':''}>${esc(o)}</option>`).join('')}</optgroup>`).join('')}</select>
      <select id="ed-g${j}-o" class="in" data-g="${j}" data-gp="op" aria-label="Sens"><option value="max"${g.op!=='min'?' selected':''}>Au plus</option><option value="min"${g.op==='min'?' selected':''}>Au moins</option></select>
      <input id="ed-g${j}-t" class="in" type="number" step="any" min="0" inputmode="decimal" data-g="${j}" data-gp="target" value="${esc(g.target==null?'':g.target)}" placeholder="Cible" aria-label="Cible">
      <button type="button" class="del" data-gdel="${j}" aria-label="Retirer l’objectif">✕</button></div>`).join('')}
    <p class="hint">Ex. : Dépenses · Sorties au plus 80 € ; Nombre d’entrées · Tir sportif au moins 8.</p>
    <div><button type="button" class="btn ghost" id="gAdd">＋ Ajouter un objectif</button></div></section>`;
  const danger=P?`<section class="panel danger-zone"><h2>Retirer la page</h2>
    <p class="hint">Archiver cache l’onglet mais garde les ${nEntries} entrée${nEntries>1?'s':''} : tu peux la restaurer depuis Réglages. Supprimer efface la page et ses entrées pour de bon.</p>
    <div class="row-btns"><button type="button" class="btn ghost" id="edArchive">Archiver la page</button><button type="button" class="btn ${d._armed?'danger':'ghost'}" id="edDelete">${d._armed?`Confirmer : tout supprimer (${nEntries})`:'Supprimer la page et ses entrées'}</button></div></section>`:'';
  return `<div class="editor" style="--c:${cv(d.color)}">
    <section class="panel"><h2>${d._new?'Nouvelle page':'Modifier la page'} <small>${d._new?'':esc(P?P.name:'')}</small></h2>
      <div class="field"><label for="ed-name">Nom de la page</label><input id="ed-name" class="in" type="text" data-d="name" value="${esc(d.name)}" maxlength="30" placeholder="Ex. Lecture, Admin, Voyage Maroc…"></div>
      <div class="field"><span class="flbl">Couleur</span><div class="swatches">${sw}</div></div>
      ${tpls}
    </section>
    <section class="panel"><h2>Champs du formulaire <small>${d.fields.length}</small></h2>
      <ul class="flist">${frows}</ul>
      <p class="hint">Retirer un champ ne supprime pas ce qui a déjà été saisi (ça reste dans la sauvegarde).</p>
      <div><button type="button" class="btn ghost" id="fAdd">＋ Ajouter un champ</button></div>
    </section>
    ${ratesHTML}${presetHTML}${goalsHTML}
    <p class="err" id="edErr" hidden></p>
    <div class="edit-actions"><button type="button" class="btn" id="edSave">${d._new?'Créer la page':'Enregistrer'}</button><button type="button" class="btn ghost" id="edCancel">Annuler</button></div>
    ${danger}
  </div>`;
}
async function saveDraft(){
  const d=draft;const err=$('#edErr');const fail=t=>{err.textContent=t;err.hidden=false;err.scrollIntoView({block:'center',behavior:'smooth'})};
  const name=String(d.name||'').trim();if(!name)return fail('Donne un nom à la page.');
  if(live().some(p=>p.id!==d.id&&fold(p.name)===fold(name)))return fail('Une autre page porte déjà ce nom.');
  const used=new Set(d.fields.filter(f=>f.k).map(f=>f.k));
  const fields=[];
  for(const f of d.fields){
    const label=String(f.label||'').trim();if(!label)return fail('Chaque champ doit avoir un nom.');
    const o={k:f.k,label,type:f.type};
    if(f.req)o.req=1;if(f.core)o.core=1;if(f.fixed)o.fixed=1;if(f.ph)o.ph=f.ph;
    if(f.type==='number'&&f.unit)o.unit=f.unit;
    if(f.type==='select'){o.opts=f.fixed?f.opts:draftOpts(f);if(!o.opts.length)return fail(`Ajoute au moins un choix à la liste « ${label} ».`)}
    if(!o.k){const base=slugify(label);let k=base,n=2;while(used.has(k)||RESERVED.includes(k))k=base+'_'+n++;used.add(k);o.k=k}
    fields.push(o);
  }
  const rates={};Object.entries(d.settings.rates||{}).forEach(([k,v])=>{if(num(v)>0)rates[k]=num(v)});
  const goals=(d.settings.goals||[]).filter(g=>num(g.target)>0).map(g=>({metric:g.metric||'count',op:g.op==='min'?'min':'max',target:num(g.target),...(g.fk?{fk:g.fk,fv:g.fv}:{})}));
  const settings=Object.assign({},d.settings,{rates,goals,presets:d.settings.presets||[]});
  const btn=$('#edSave');btn.disabled=true;
  try{
    if(d._new){
      const pos=pages.reduce((m,p)=>Math.max(m,p.position),-1)+1;
      const np=await insertPage({slug:'p'+uid8(),name,color:d.color,position:pos,template:d.template,fields,settings,archived:false});
      draft=null;toast('Page créée');go(np.slug);
    }else{
      const p=pages.find(x=>x.id===d.id);if(!p){draft=null;return go('bord')}
      await updatePage(p,{name,color:d.color,fields,settings});
      draft=null;toast('Page enregistrée');go(p.slug);
    }
  }catch(e){btn.disabled=false;fail(frErr(e))}
}
async function movePage(id,dir){
  const arr=live();const i=arr.findIndex(p=>p.id===id);const j=i+dir;if(i<0||j<0||j>=arr.length)return;
  [arr[i],arr[j]]=[arr[j],arr[i]];
  const changed=arr.map((p,k)=>[p,k]).filter(([p,k])=>p.position!==k);
  try{await Promise.all(changed.map(([p,k])=>updatePage(p,{position:k})));render()}catch(e){toast(frErr(e))}
}

/* ---------- Réglages ---------- */
function settingsView(){
  const L=live(),A=archived();const bio=!!store_.get(bioKey(),null);
  const plist=pagesReady?`<ul class="plist">${L.map((p,i)=>`<li><i class="pdot" style="background:${cv(p.color)}"></i><span class="pname">${esc(p.name)}</span><span class="pmeta">${esc(TPL[p.template].label)} · ${of(p.slug).length}</span>
      ${pagesOk&&p.id?`<span class="fbtns"><button class="del" type="button" data-pmove="${esc(p.id)}:-1" aria-label="Monter" ${i===0?'disabled':''}>↑</button><button class="del" type="button" data-pmove="${esc(p.id)}:1" aria-label="Descendre" ${i===L.length-1?'disabled':''}>↓</button><button class="del" type="button" data-pedit="${esc(p.id)}">Modifier</button></span>`:''}</li>`).join('')}</ul>`:'';
  const arch=A.length?`<h3 class="sub">Archivées</h3><ul class="plist">${A.map(p=>`<li><i class="pdot" style="background:${cv(p.color)}"></i><span class="pname">${esc(p.name)}</span><span class="pmeta">${of(p.slug).length} entrées</span><span class="fbtns"><button class="del" type="button" data-prestore="${esc(p.id)}">Restaurer</button><button class="del" type="button" data-ppurge="${esc(p.id)}">Supprimer</button></span></li>`).join('')}</ul>`:'';
  const nDue=dueTasks().filter(x=>x[2]>=0).length;
  return `<div class="settings">
    <section class="panel wide"><h2>Pages <small>ordre des onglets</small></h2>
      ${pagesOk?'':'<p class="warnp">Exécute <b>supabase-v2.sql</b> dans Supabase pour pouvoir ajouter, modifier ou supprimer des pages.</p>'}
      ${plist}${arch}
      ${pagesOk?'<div class="row-btns"><button class="btn" type="button" data-v="edit:new">＋ Nouvelle page</button></div>':''}</section>
    <section class="panel"><h2>Code PIN</h2>
      <p>${pinRec?`Code à ${pinRec.len} chiffres actif sur cet appareil. Il est demandé à l’ouverture et après 2 minutes en arrière-plan.`:'Aucun code sur cet appareil. Avec un PIN, tu ouvres l’appli sans retaper ton mot de passe.'}</p>
      <div class="row-btns">${pinRec?'<button class="btn ghost" type="button" id="pinChange">Changer le PIN</button><button class="btn ghost" type="button" id="pinOff">Désactiver</button>':'<button class="btn" type="button" id="pinOn">Activer un code PIN</button>'}</div>
      ${pinRec?(bioOk?`<p>${bio?'Face ID / empreinte activé : touche le bouton sur l’écran de verrouillage.':'Déverrouille avec Face ID ou ton empreinte au lieu de taper le code.'}</p><div class="row-btns">${bio?'<button class="btn ghost" type="button" id="bioOff">Désactiver Face ID / empreinte</button>':'<button class="btn ghost" type="button" id="bioOn">Activer Face ID / empreinte</button>'}</div>`:'<p>Face ID / empreinte : pas disponible sur cet appareil ou ce navigateur.</p>'):''}
    </section>
    <section class="panel"><h2>Rappels</h2><p>Ajoute tes échéances à l’agenda du téléphone : rappel la veille à 18 h et 7 jours avant. Sur chaque tâche, le bouton 📅 fait pareil pour une seule.</p>
      <div class="row-btns"><button class="btn ghost" type="button" id="icsAll" ${nDue?'':'disabled'}>Ajouter les ${nDue} échéance${nDue>1?'s':''} à venir</button></div></section>
    <section class="panel"><h2>Export & sauvegarde</h2><p>${entries.length} entrée${entries.length>1?'s':''}. Le CSV s’ouvre dans Excel ou Numbers (pratique pour déclarer ton chiffre d’affaires).</p>
      <div class="row-btns"><button class="btn ghost" type="button" id="csvAll">Tout en CSV</button><button class="btn ghost" type="button" id="exportBtn">Copie complète (JSON)</button></div></section>
    <section class="panel"><h2>Compte</h2><p>Connecté avec <b>${esc(user.email)}</b>. Tes données sont visibles uniquement par toi.</p>
      <div class="row-btns"><button class="btn ghost" type="button" id="logoutBtn">Se déconnecter</button></div></section>
  </div>`;
}

/* ---------- Exports ---------- */
const csvCell=c=>{const s=c==null?'':String(c);return /[;"\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
const csvNum=v=>String(Math.round(num(v)*100)/100).replace('.',',');
const csvText=rows=>'\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');
const csvVal=(f,e)=>f.type==='number'?(e[f.k]==null||e[f.k]===''?'':csvNum(e[f.k])):f.type==='date'?frDate(e[f.k]):(e[f.k]||'');
function exportPage(p,all){
  const fs=p.fields.filter(f=>f.type!=='photo');const key=dk(p);
  let list=of(p.slug);if(!all)list=list.filter(e=>inMonth(e,key));
  list.sort((a,b)=>String(a[key]||'').localeCompare(String(b[key]||'')));
  if(!list.length){toast('Rien à exporter.');return}
  const rows=[fs.map(flabel),...list.map(e=>fs.map(f=>csvVal(f,e)))];
  if(fs.some(f=>f.type==='number'))rows.push(fs.map((f,i)=>f.type==='number'?csvNum(sum(list,f.k)):i===0?'TOTAL':''));
  saveFile(`main-courante_${slugify(p.name)}_${all?'tout':month}.csv`,csvText(rows),'text/csv;charset=utf-8');
}
function exportAll(){
  const L=pages;const cols=[];
  L.forEach(p=>p.fields.filter(f=>f.type!=='photo').forEach(f=>{const l=flabel(f);if(!cols.includes(l))cols.push(l)}));
  const rows=[['Page',...cols]];
  L.forEach(p=>{const key=dk(p);of(p.slug).slice().sort((a,b)=>String(a[key]||'').localeCompare(String(b[key]||''))).forEach(e=>{
    const r=new Array(cols.length).fill('');p.fields.filter(f=>f.type!=='photo').forEach(f=>{r[cols.indexOf(flabel(f))]=csvVal(f,e)});rows.push([p.name+(p.archived?' (archivée)':''),...r])})});
  if(rows.length<2){toast('Rien à exporter.');return}
  saveFile(`main-courante_tout_${todayISO()}.csv`,csvText(rows),'text/csv;charset=utf-8');
}
const icsEsc=s=>String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
function icsEvent(p,e){
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
  const d=e.echeance.replace(/-/g,''),d2=addDays(e.echeance,1).replace(/-/g,'');
  const desc=[p.name,...secondary(p,e)].join(' · ');
  return ['BEGIN:VEVENT',`UID:${e.id}@main-courante`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${d}`,`DTEND;VALUE=DATE:${d2}`,`SUMMARY:${icsEsc(e.titre)}`,`DESCRIPTION:${icsEsc(desc)}`,
    'BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${icsEsc(e.titre)} — demain`,'TRIGGER:-PT6H','END:VALARM',
    'BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${icsEsc(e.titre)} — dans 7 jours`,'TRIGGER:-P6DT6H','END:VALARM','END:VEVENT'];
}
function saveIcs(items,name){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Main courante//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH',...items.flatMap(([p,e])=>icsEvent(p,e)),'END:VCALENDAR'];
  saveFile(name,lines.join('\r\n'),'text/calendar;charset=utf-8');
}

/* ---------- Code PIN + biométrie ---------- */
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const randHex=n=>hex(crypto.getRandomValues(new Uint8Array(n)).buffer);
async function hashPin(pin,salt){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('main-courante:'+salt+':'+pin)))}
const b64u=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64u=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
async function bioEnable(){
  try{
    const cred=await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:'Main courante'},
      user:{id:crypto.getRandomValues(new Uint8Array(16)),name:user.email,displayName:'Main courante'},
      pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
      authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'discouraged'},timeout:60000,attestation:'none'}});
    store_.set(bioKey(),b64u(cred.rawId));toast('Face ID / empreinte activé');render();
  }catch(e){toast(e&&e.name==='NotAllowedError'?'Activation annulée.':'Activation impossible sur cet appareil.')}
}
async function bioUnlock(){
  const id=store_.get(bioKey(),null);if(!id)return;
  try{
    await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id:unb64u(id),transports:['internal']}],userVerification:'required',timeout:60000}});
    fails=0;unlockNow();
  }catch(e){renderLock(e&&e.name==='NotAllowedError'?'Déverrouillage annulé. Tape ton code.':'Biométrie indisponible. Tape ton code.')}
}
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
  $('#bioBtn').hidden=!(mode==='unlock'&&!pinAction&&bioOk&&store_.get(bioKey(),null));
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
    if(pinAction==='disable'){store_.del(pinKey());store_.del(bioKey());pinRec=null;unlockNow();toast('Code PIN désactivé');return}
    mode='set1';return renderLock();
  }
  unlockNow();
}

/* ---------- Saisie ---------- */
function readForm(p,f){
  const o={};
  for(const fd of p.fields){
    if(fd.type==='photo')continue;
    const el=f.elements[fd.k];if(!el)continue;const v=String(el.value||'').trim();
    if(fd.req&&!v)return {err:`Renseigne « ${fd.label} » pour enregistrer.`,el};
    o[fd.k]=fd.type==='number'?(v===''?0:num(v)):v;
  }
  return {o};
}
async function quickAdd(p,pr){
  const o={mod:p.slug};
  p.fields.forEach(f=>{const v=pr.values?pr.values[f.k]:undefined;
    if(f.type==='photo')return;
    if(f.type==='date')o[f.k]=todayISO();
    else if(v!==undefined&&v!=='')o[f.k]=f.type==='number'?num(v):v;
    else o[f.k]=f.type==='number'?0:f.type==='select'?(p.template==='taches'&&f.k==='statut'?'À faire':(f.opts||[])[0]||''):'';
  });
  const hf=hourF(p),mf=moneyF(p);
  if(hf&&mf&&!num(o[mf.k])){const r=(p.settings.rates||{});const sf=firstSel(p);const rate=num(r[sf?o[sf.k]:'*'])||num(r['*']);if(rate)o[mf.k]=Math.round(num(o[hf.k])*rate*100)/100}
  try{
    const e=await addEntry(o);
    if(dk(p)==='date'&&o.date.slice(0,7)!==month)month=o.date.slice(0,7);
    render();
    toast(`Ajouté : ${pr.name}`,'Annuler',async()=>{try{await delEntry(e.id);render();toast('Ajout annulé')}catch(x){toast(frErr(x))}});
  }catch(x){toast(frErr(x))}
}
function autoMoney(form){
  const p=pageOf(form.dataset.mod);if(!p)return;
  const hf=hourF(p),mf=moneyF(p);if(!hf||!mf)return;
  const m=form.elements[mf.k];if(!m||m.dataset.auto!=='1')return;
  const rate=rateFor(p,form);if(!rate)return;
  const h=num(form.elements[hf.k].value);
  m.value=h?String(Math.round(h*rate*100)/100):'';
}

/* ---------- Événements ---------- */
document.addEventListener('input',ev=>{
  const t=ev.target;
  if(t.id==='pq'){q=t.value;const p=pageOf(view);if(p)$('#listBody').innerHTML=listBody(p);return}
  if(t.id==='gq'){gq=t.value;$('#logBody').innerHTML=logBody();return}
  const form=t.closest&&t.closest('form.add');
  if(form){
    if(t.dataset.money){t.dataset.auto=t.value===''?'1':'0';return}
    autoMoney(form);return;
  }
  if(!draft)return;
  if(t.dataset.d){draft[t.dataset.d]=t.value;return}
  if(t.dataset.f!=null&&t.dataset.fp){
    const f=draft.fields[+t.dataset.f];if(!f)return;const k=t.dataset.fp;
    if(k==='req')f.req=t.checked?1:0;
    else if(k==='type'){f.type=t.value;if(f.type==='select'&&!f._opts)f._opts='Choix 1\nChoix 2';render()}
    else if(k==='unit'){f.unit=t.value;render()}
    else f[k]=t.value;
    return;
  }
  if(t.dataset.rate!=null){draft.settings.rates[t.dataset.rate]=t.value;return}
  if(t.dataset.g!=null){const g=draft.settings.goals[+t.dataset.g];if(!g)return;const k=t.dataset.gp;
    if(k==='filter'){const i=t.value.indexOf('=');if(i<0){delete g.fk;delete g.fv}else{g.fk=t.value.slice(0,i);g.fv=t.value.slice(i+1)}}
    else g[k]=t.value;return}
});
document.addEventListener('change',ev=>{
  const t=ev.target;
  if(t.id==='pf'){filt=t.value;const p=pageOf(view);if(p)$('#listBody').innerHTML=listBody(p);return}
  const form=t.closest&&t.closest('form.add');if(form&&t.tagName==='SELECT')autoMoney(form);
});
document.addEventListener('click',async ev=>{
  const t=ev.target.closest('button');if(!t)return;
  if(t.id==='toastAct'){const fn=toastFn;toastFn=null;$('#toast').hidden=true;if(fn)fn();return}
  if(t.id==='viewerClose'){$('#viewer').hidden=true;$('#viewerImg').src='';return}
  if(t.dataset.key){press(t.dataset.key);return}
  if(t.id==='bioBtn'){bioUnlock();return}
  if(t.id==='lockAlt'){
    if(pinAction){unlockNow();return}
    locked=false;renderLock();await sb.auth.signOut();return;
  }
  if(t.dataset.v){const v=t.dataset.v;if(v.startsWith('edit:'))return openEditor(v.slice(5));return go(v)}
  if(t.dataset.pedit)return openEditor(t.dataset.pedit);
  if(t.dataset.photo){openPhoto(t.dataset.photo);return}
  switch(t.id){
    case 'prevM':return shiftMonth(-1);
    case 'nextM':return shiftMonth(1);
    case 'lockBtn':return lockNow();
    case 'settingsBtn':return go('reglages');
    case 'logoutBtn':await sb.auth.signOut();return;
    case 'pinOn':return startPinFlow('create');
    case 'pinChange':return startPinFlow('change');
    case 'pinOff':return startPinFlow('disable');
    case 'bioOn':return bioEnable();
    case 'bioOff':store_.del(bioKey());toast('Face ID / empreinte désactivé');return render();
    case 'csvAll':return exportAll();
    case 'icsAll':{const items=dueTasks().filter(x=>x[2]>=0).map(([p,e])=>[p,e]);if(items.length)saveIcs(items,'main-courante_echeances.ics');return}
    case 'exportBtn':return saveFile('main-courante-'+todayISO()+'.json',JSON.stringify({exporte_le:new Date().toISOString(),pages,entrees:entries},null,2),'application/json');
    case 'toSignup':return setAuthMode(authMode==='login'?'signup':'login');
    case 'toReset':return setAuthMode('reset');
    case 'editCancel':editId=null;skipKeep=true;return render();
    case 'presetOpen':{const r=$('#presetRow');r.hidden=!r.hidden;if(!r.hidden)$('#presetName').focus();return}
    case 'presetSave':{
      const f=t.closest('form.add');const p=pageOf(f.dataset.mod);const name=$('#presetName').value.trim();
      if(!name){$('#presetName').focus();return}
      const values={};p.fields.forEach(fd=>{if(fd.type==='date'||fd.type==='photo')return;const el=f.elements[fd.k];if(!el)return;const v=String(el.value||'').trim();if(v!==''&&!(fd.type==='number'&&!num(v)))values[fd.k]=fd.type==='number'?num(v):v});
      const settings=Object.assign({},p.settings,{presets:[...(p.settings.presets||[]),{name,values}]});
      try{await updatePage(p,{settings});toast('Modèle « '+name+' » enregistré');render()}catch(e){toast(frErr(e))}
      return;
    }
    // Éditeur
    case 'fAdd':draft.fields.push({k:null,label:'Nouveau champ',type:'text'});render();{const el=document.getElementById('ed-f'+(draft.fields.length-1)+'-label');if(el){el.focus();el.select()}}return;
    case 'gAdd':draft.settings.goals.push({metric:draft.template==='argent'?'dep':'count',op:'max',target:''});return render();
    case 'edSave':return saveDraft();
    case 'edCancel':{const d=draft;draft=null;const p=d&&!d._new?pages.find(x=>x.id===d.id):null;return go(p&&!p.archived?p.slug:'reglages')}
    case 'edArchive':{const p=pages.find(x=>x.id===draft.id);if(!p)return;try{await updatePage(p,{archived:true});draft=null;toast('Page archivée','Annuler',async()=>{try{await updatePage(p,{archived:false});render()}catch(e){toast(frErr(e))}});go('bord')}catch(e){toast(frErr(e))}return}
    case 'edDelete':{
      if(!draft._armed){draft._armed=true;render();setTimeout(()=>{if(draft&&draft._armed){draft._armed=false;if(view.startsWith('edit:'))render()}},4000);return}
      const p=pages.find(x=>x.id===draft.id);if(!p)return;t.disabled=true;
      try{await deletePage(p);draft=null;toast('Page supprimée');go('bord')}catch(e){t.disabled=false;toast(frErr(e))}
      return;
    }
  }
  if(t.dataset.color){draft.color=t.dataset.color;return render()}
  if(t.dataset.tpl){draft.template=t.dataset.tpl;draft.fields=TPL[t.dataset.tpl].fields();draft.fields.forEach(f=>{f._opts=(f.opts||[]).join('\n')});draft.settings.goals=[];return render()}
  if(t.dataset.fmove){const [i,d]=t.dataset.fmove.split(':').map(Number);const a=draft.fields;const j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];return render()}
  if(t.dataset.fdel){draft.fields.splice(+t.dataset.fdel,1);return render()}
  if(t.dataset.prdel){draft.settings.presets.splice(+t.dataset.prdel,1);return render()}
  if(t.dataset.gdel){draft.settings.goals.splice(+t.dataset.gdel,1);return render()}
  if(t.dataset.pmove){const [id,d]=t.dataset.pmove.split(':');return movePage(id,+d)}
  if(t.dataset.prestore){const p=pages.find(x=>x.id===t.dataset.prestore);if(!p)return;try{await updatePage(p,{archived:false,position:pages.reduce((m,x)=>Math.max(m,x.position),-1)+1});toast('Page restaurée');render()}catch(e){toast(frErr(e))}return}
  if(t.dataset.ppurge){
    const p=pages.find(x=>x.id===t.dataset.ppurge);if(!p)return;
    if(!t.classList.contains('armed')){t.classList.add('armed');t.textContent=`Confirmer (${of(p.slug).length} entrées)`;setTimeout(()=>{if(t.isConnected){t.classList.remove('armed');t.textContent='Supprimer'}},4000);return}
    try{await deletePage(p);toast('Page supprimée');render()}catch(e){toast(frErr(e))}return;
  }
  // Page / entrées
  if(t.dataset.preset!=null){const p=pageOf(view);if(p&&p.settings.presets&&p.settings.presets[+t.dataset.preset])quickAdd(p,p.settings.presets[+t.dataset.preset]);return}
  if(t.dataset.csv){const p=pageOf(view);if(p)exportPage(p,t.dataset.csv==='all');return}
  if(t.dataset.ics){const e=entries.find(x=>x.id===t.dataset.ics);const p=e&&pageOf(e.mod);if(p)saveIcs([[p,e]],`${slugify(e.titre)}.ics`);return}
  if(t.dataset.open){const e=entries.find(x=>x.id===t.dataset.open);const p=e&&pageOf(e.mod);if(!p)return;go(p.slug);editId=e.id;skipKeep=true;const k=e[dk(p)];if(k&&p.template!=='taches')month=k.slice(0,7);render();const f=$('#main form.add');if(f)f.scrollIntoView({block:'start'});return}
  if(t.dataset.edit){editId=t.dataset.edit;skipKeep=true;render();const f=$('#main form.add');if(f)f.scrollIntoView({block:'start',behavior:'smooth'});return}
  if(t.dataset.hab){
    const p=pageOf(view);if(!p)return;const ds=t.dataset.hab;const list=of(p.slug).filter(e=>e.date===ds);
    if(list.length){
      if(!t.classList.contains('armed')){document.querySelectorAll('.cday.armed').forEach(x=>x.classList.remove('armed'));t.classList.add('armed');setTimeout(()=>{if(t.isConnected)t.classList.remove('armed')},3000);return}
      try{for(const e of list)await delEntry(e.id);render()}catch(e){toast(frErr(e))}
    }else{
      const o={mod:p.slug};p.fields.forEach(f=>{if(f.type==='photo')return;o[f.k]=f.k==='date'?ds:f.type==='number'?0:f.type==='select'?(f.opts||[])[0]||'':''});
      try{await addEntry(o);render()}catch(e){toast(frErr(e))}
    }
    return;
  }
  if(t.dataset.del){
    if(!t.classList.contains('armed')){t.classList.add('armed');t.textContent='Confirmer';setTimeout(()=>{if(t.isConnected){t.classList.remove('armed');t.textContent='✕'}},3000);return}
    try{await delEntry(t.dataset.del);render();toast('Entrée supprimée')}catch(e){toast(frErr(e))}
    return;
  }
  if(t.dataset.st){
    const n=STATUTS[(STATUTS.indexOf(t.dataset.s)+1)%3];
    try{await updEntry(t.dataset.st,{statut:n});render()}catch(e){toast(frErr(e))}
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
  const p=pageOf(f.dataset.mod);if(!p)return;
  const err=f.querySelector('.err');const r=readForm(p,f);
  if(r.err){err.textContent=r.err;err.hidden=false;r.el.focus();return}
  err.hidden=true;
  const btn=f.querySelector('button[type=submit]');btn.disabled=true;const label=btn.textContent;
  const editing=f.dataset.edit?entries.find(x=>x.id===f.dataset.edit):null;
  try{
    const o=r.o;const oldPhotos=[];
    for(const fd of p.fields.filter(x=>x.type==='photo')){
      const inp=f.elements[fd.k];const rm=f.elements[fd.k+'__rm'];const prev=editing?editing[fd.k]:'';
      if(inp&&inp.files&&inp.files[0]){btn.textContent='Envoi de la photo…';o[fd.k]=await uploadPhoto(inp.files[0]);if(prev)oldPhotos.push(prev)}
      else if(rm&&rm.checked){o[fd.k]='';if(prev)oldPhotos.push(prev)}
      else if(editing)o[fd.k]=prev||'';
    }
    if(editing){
      await updEntry(editing.id,o);removePhotos(oldPhotos);editId=null;skipKeep=true;
      toast('Entrée modifiée');
    }else{
      await addEntry(Object.assign({mod:p.slug},o));skipKeep=true;toast('Ajouté au registre');
    }
    const k=o[dk(p)];if(p.template!=='taches'&&k&&k.slice(0,7)!==month)month=k.slice(0,7);
    render();
  }catch(e){err.textContent=frErr(e);err.hidden=false;btn.disabled=false;btn.textContent=label}
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
  if(!$('#viewer').hidden&&ev.key==='Escape'){$('#viewer').hidden=true;return}
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
