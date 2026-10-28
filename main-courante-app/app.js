/* Main courante v4 — appli installable (PWA) avec Supabase, pages personnalisables */
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
    fields:()=>[{k:'date',label:'Date',type:'date',req:1,core:1},{k:'sens',label:'Sens',type:'select',opts:['Dépense','Revenu','Épargne'],req:1,core:1,fixed:1},{k:'montant',label:'Montant',type:'number',unit:'€',req:1,core:1},{k:'categorie',label:'Catégorie',type:'select',opts:['Courses','Sorties','Autre'],core:1},{k:'libelle',label:'Description',type:'text'},{k:'ticket',label:'Ticket',type:'photo'}]},
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
    {k:'sens',label:'Sens',type:'select',opts:['Dépense','Revenu','Épargne'],req:1,core:1,fixed:1},
    {k:'montant',label:'Montant',type:'number',unit:'€',req:1,core:1,ph:'0'},
    {k:'categorie',label:'Catégorie',type:'select',opts:['Courses','Logement','Transport','Sorties','Équipement','Fac','Admin','Bourse / aides','Autre'],core:1},
    {k:'libelle',label:'Description',type:'text',ph:'Loyer CROUS, abonnement TaM…'},
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
  if(/pages_template_check/i.test(m))return 'Base pas à jour : exécute supabase-v3.sql dans Supabase (voir le guide).';
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
    pagesNote=pagesOk?'':'Base à mettre à jour : exécute supabase-v3.sql dans Supabase (voir le guide). En attendant, les 4 pages d’origine restent utilisables mais pas modifiables.';
    return;
  }
  pagesOk=true;pagesNote='';
  if(!data.length){
    await sb.from('pages').upsert(DEFAULT_PAGES().map(pageRow),{onConflict:'user_id,slug',ignoreDuplicates:true});
    const again=await sb.from('pages').select(PAGE_COLS).order('position',{ascending:true});
    pages=!again.error&&again.data.length?again.data.map(rowToPage):fallbackPages();
  }else pages=data.map(rowToPage);
  pagesReady=true;cachePages();
  for(const p of pages.filter(p=>p.template==='argent'&&p.id)){
    const se=fld(p,'sens');if(!se||(se.opts||[]).includes('Épargne'))continue;
    const fields=p.fields.map(f=>f.k==='sens'?Object.assign({},f,{opts:(f.opts||[]).concat(['Épargne'])}):f.k==='libelle'&&f.label==='Libellé'?Object.assign({},f,{label:'Description'}):f);
    try{await updatePage(p,{fields})}catch(e){}
  }
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
let pendingRender=false;
const typing=()=>{const a=document.activeElement;return !!(a&&a.closest&&a.closest('#main')&&(a.tagName==='TEXTAREA'||(a.tagName==='INPUT'&&/^(text|search|number|url|email|tel)$/.test(a.type))))};
function softRender(){if(typing()){pendingRender=true;return}pendingRender=false;render()}
document.addEventListener('focusout',()=>{if(pendingRender)setTimeout(()=>{if(pendingRender&&!typing()){pendingRender=false;render()}},120)});
async function loadAll(){await Promise.all([loadPages(),loadEntries()]);fixView();softRender();runRecurring()}
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
  const sh=$('#sheet');if(sh)sh.hidden=true;
  if(v!==view){q='';filt='';editId=null;skipKeep=true}
  view=v;
  try{history.replaceState(null,'','#'+encodeURIComponent(v))}catch(e){}
  render();window.scrollTo({top:0});
}
function fixView(){
  if(view==='bord'||view==='reglages'||view==='bilan')return;
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
  if(isSp(p)){const x=spText(p,e);return p.template==='jour'?x.split(' — ')[0]:x.slice(0,160)}
  if(p.template==='argent')return `${e.sens==='Revenu'?'+':e.sens==='Épargne'?'→ ':'−'}${eur(e.montant)} · ${primary(p,e)}`;
  if(p.template==='taches')return `${e.titre||''}${e.statut?' · '+e.statut:''}`;
  const v=valuesOf(p,e),s=secondary(p,e);
  return primary(p,e)+(v.length?' · '+v.join(' · '):'')+(s.length?' — '+s.join(' · '):'');
}
function matches(p,e,qq,ff){
  if(ff){const i=ff.indexOf('=');const k=ff.slice(0,i),v=ff.slice(i+1);if(String(e[k]||'')!==v)return false}
  if(qq&&isSp(p)){const hay=fold(spText(p,e)+' '+p.name);return fold(qq).split(/\s+/).filter(Boolean).every(w=>hay.includes(w))}
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
function goalField(p,g){if(g.metric==='dep'||g.metric==='rev'||g.metric==='epa')return {unit:'€'};if(g.metric&&g.metric.startsWith('sum:'))return fld(p,g.metric.slice(4))||{};return {}}
function goalValue(p,g){
  let list=ofMonth(p);
  if(g.fk)list=list.filter(e=>String(e[g.fk]||'')===g.fv);
  if(g.metric==='count')return list.length;
  if(g.metric==='dep')return sum(list.filter(e=>e.sens!=='Revenu'&&e.sens!=='Épargne'),'montant');
  if(g.metric==='epa')return sum(list.filter(e=>e.sens==='Épargne'),'montant');
  if(g.metric==='rev')return sum(list.filter(e=>e.sens==='Revenu'),'montant');
  if(g.metric&&g.metric.startsWith('sum:'))return sum(list,g.metric.slice(4));
  return 0;
}
function goalLabel(p,g){
  if(g.label)return g.label;
  let m=g.metric==='count'?'Entrées':g.metric==='dep'?'Dépenses':g.metric==='rev'?'Revenus':g.metric==='epa'?'Épargne':(()=>{const f=fld(p,String(g.metric).slice(4));return f?'Total '+f.label.toLowerCase():'Total'})();
  return m+(g.fk&&g.fv?' · '+g.fv:'');
}
function metricOptions(p){
  const o=[['count','Nombre d’entrées']];
  if(p.template==='argent'){o.push(['dep','Dépenses'],['rev','Revenus'],['epa','Épargne'])}
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
  if(!skipKeep)s.dirty=[...document.querySelectorAll('#main [data-dirty="1"]')].filter(el=>el.id).map(el=>[el.id,el.value]);
  if(skipKeep)s.id=null;
  skipKeep=false;return s;
}
function restoreUI(s){
  if(s.vals){const f=document.querySelector('#main form.add');
    if(f&&f.dataset.mod===s.vals.mod&&(f.dataset.edit||'')===s.vals.edit){
      s.vals.v.forEach(([n,v,auto])=>{const el=f.elements[n];if(!el||!el.tagName||el.type==='file')return;if(el.type==='checkbox')el.checked=v;else el.value=v;if(auto!=null)el.dataset.auto=auto});
      const ks=f.elements.kind;if(ks&&ks.tagName==='SELECT'&&f.classList.contains('sp')){f.classList.remove('k-rdv','k-edt');f.classList.add('k-'+ks.value)}
    }}
  if(s.dirty)s.dirty.forEach(([id,v])=>{const el=document.getElementById(id);if(el&&el.value!==v){el.value=v;el.dataset.dirty='1'}});
  if(s.id){const el=document.getElementById(s.id);if(el&&el!==document.activeElement){try{el.focus({preventScroll:true});if(s.sel)el.setSelectionRange(s.sel[0],s.sel[1])}catch(e){}}}
}
function render(){
  if(!user)return;
  $('#monthLbl').textContent=monthLabel();
  $('#lockBtn').hidden=!pinRec;
  renderBnav();
  const main=$('#main');
  if(locked&&!pinAction){$('#tabs').innerHTML='';main.innerHTML='';return}
  showNote([pagesNote,dataNote].filter(Boolean).join(' '));
  const snap=snapshotUI();
  renderTabs();
  if(view==='reglages'){main.innerHTML=settingsView()}
  else if(view==='bilan'){main.innerHTML=ready&&pagesReady?bilanView():'<p class="ras">Ouverture…</p>'}
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
  const urgent=dueTasks().filter(x=>x[2]<=1);const rvp=byTpl('revision');const nrv=rvp.length?rvDue(rvp,todayISO()).length:0;if(!urgent.length&&!nrv)return '';
  return `<div class="alert" role="status"><b>Rappel</b>${nrv?`<button type="button" class="alert-item" data-v="${esc(rvp[0].slug)}"><span class="when soon">révisions</span> ${nrv} à faire aujourd’hui</button>`:''}${urgent.slice(0,4).map(([p,e,d])=>`<button type="button" class="alert-item" data-v="${esc(p.slug)}"><span class="when ${d<0?'late':'soon'}">${whenTxt(d)}</span> ${esc(e.titre)}</button>`).join('')}${urgent.length>4?`<span class="alert-more">+${urgent.length-4}</span>`:''}</div>`;
}

/* ---------- Tableau de bord ---------- */
let chartData=null;
function dash(){
  const L=live();
  const works=L.filter(isWork),moneyP=L.filter(p=>p.template==='argent'),tasks=L.filter(p=>p.template==='taches'),
        habits=L.filter(p=>p.template==='habitude'),journals=L.filter(p=>p.template==='journal'&&!isWork(p));
  let h=0,g=0;const byJob={};
  works.forEach(p=>{const hf=hourF(p),mf=moneyF(p),sf=firstSel(p);ofMonth(p).forEach(e=>{h+=num(e[hf.k]);g+=num(e[mf.k]);const key=sf&&e[sf.k]?e[sf.k]:p.name;byJob[key]=(byJob[key]||0)+num(e[hf.k])})});
  let dep=0,rev=0,epa=0;const cats={};
  moneyP.forEach(p=>ofMonth(p).forEach(e=>{const v=num(e.montant);if(e.sens==='Revenu')rev+=v;else if(e.sens==='Épargne')epa+=v;else{dep+=v;const c=e.categorie||'Autre';cats[c]=(cats[c]||0)+v}}));
  const tile=(l,v,s,cls)=>`<div class="tile"><span class="lbl">${esc(l)}</span><span class="val ${cls||''}">${v}</span><span class="sub">${esc(s)}</span></div>`;
  const counts=journals.concat(habits).map(p=>`${ofMonth(p).length} ${p.name}`).join(' · ');
  const tiles=[];
  if(works.length){
    const jobTxt=Object.entries(byJob).filter(x=>x[1]).map(([j,v])=>`${nf.format(v)} h ${String(j).split(' ')[0].toLowerCase()}`).join(' · ')||'Aucune heure saisie';
    tiles.push(tile('Heures bossées',nf.format(h)+' h',jobTxt));
    tiles.push(tile('Gagné (boulots)',eur(g),h?eur(g/h)+' / h en moyenne':'—'));
  }
  if(moneyP.length)tiles.push(tile('Dépensé',eur(dep),rev?'+ '+eur(rev)+' d’aides et autres revenus':'Aucun autre revenu saisi'));
  if(works.length||moneyP.length){const s=g+rev-dep-epa;tiles.push(tile('Reste du mois',(s>=0?'+':'')+eur(s),epa?eur(epa)+' mis de côté':(counts||'—'),s>=0?'pos':'neg'))}
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

  return `${packHTML()}${todayHTML()}<div class="dashtools"><button type="button" class="btn ghost" data-v="bilan">Bilan de ${esc(monthLabel())} →</button></div><section class="tiles" aria-label="Résumé du mois">${tiles.slice(0,4).join('')}</section>
  <div class="grid2">
    <div class="stack">${chartHTML}${logHTML}</div>
    <div class="stack">${dueHTML}${goalHTML}${catHTML}${habHTML}${jHTML}</div>
  </div>`;
}
function logBody(){
  const L=live();const map={};L.forEach(p=>map[p.slug]=p);
  let list=entries.filter(e=>map[e.mod]);
  if(gq){
    list=list.filter(e=>matches(map[e.mod],e,gq,'')).map(e=>Object.assign({_d:eDate(map[e.mod],e)},e)).sort(byDateDesc('_d')).slice(0,40);
    if(!list.length)return `<p class="ras"><b>Aucun résultat</b> pour « ${esc(gq)} ».</p>`;
  }else list=list.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,9);
  if(!list.length)return `<p class="ras"><b>RAS</b> — rien à signaler pour l’instant. Ta première entrée apparaîtra ici.</p>`;
  return `<ul class="log">${list.map(e=>{const p=map[e.mod];return `<li style="--c:${cv(p.color)}"><span>${short(eDate(p,e))}</span><span class="tag">${esc(p.name.toUpperCase())}</span><button type="button" class="txt loglink" data-open="${esc(e.id)}">${esc(logText(p,e))}</button></li>`}).join('')}</ul>`;
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
  if(p.template==='argent'){const sg=e.sens==='Revenu'?['pos','+']:e.sens==='Épargne'?['sav','→ ']:['neg','−'];
    return `<li class="${cls}"><div class="main"><div class="ttl">${esc(primary(p,e))} ${photos}</div><div class="meta">${e.sens==='Épargne'?'épargne':esc(sec.join(' · '))}</div></div><div class="v ${sg[0]}">${sg[1]}${eur(e.montant)}</div>${acts}</li>`}
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
      sm=budgetSum(p,list,searching);
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
  if(isSp(p))return spPage(p);
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
    ${TPL[d.template].special?spSettingsHTML(d):`<section class="panel"><h2>Champs du formulaire <small>${d.fields.length}</small></h2>
      <ul class="flist">${frows}</ul>
      <p class="hint">Retirer un champ ne supprime pas ce qui a déjà été saisi (ça reste dans la sauvegarde).</p>
      <div><button type="button" class="btn ghost" id="fAdd">＋ Ajouter un champ</button></div>
    </section>
    ${ratesHTML}${presetHTML}${goalsHTML}`}${d.template==='argent'?argentSetHTML(d)+recurHTML(d):''}
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
  if(TPL[d.template].special)Object.assign(settings,spNorm(d.template,d.settings));
  if(d.template==='argent'){settings.withWork=!(d.settings.withWork===false||d.settings.withWork==='false');settings.recur=normRecur(d.settings.recur)}
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
      ${pagesOk?`<div class="row-btns"><button class="btn" type="button" data-v="edit:new">＋ Nouvelle page</button>${missingPack().length?`<button class="btn ghost" type="button" id="packAgain">Pages v3 à ajouter (${missingPack().length})</button>`:''}</div>`:''}</section>
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
  if(isSp(p)){const rows=spCsv(p);if(rows.length<2){toast('Rien à exporter.');return}saveFile(`main-courante_${slugify(p.name)}_${todayISO()}.csv`,csvText(rows),'text/csv;charset=utf-8');return}
  const fs=p.fields.filter(f=>f.type!=='photo');const key=dk(p);
  let list=of(p.slug);if(!all)list=list.filter(e=>inMonth(e,key));
  list.sort((a,b)=>String(a[key]||'').localeCompare(String(b[key]||'')));
  if(!list.length){toast('Rien à exporter.');return}
  const rows=[fs.map(flabel),...list.map(e=>fs.map(f=>csvVal(f,e)))];
  if(fs.some(f=>f.type==='number'))rows.push(fs.map((f,i)=>f.type==='number'?csvNum(sum(list,f.k)):i===0?'TOTAL':''));
  saveFile(`main-courante_${slugify(p.name)}_${all?'tout':month}.csv`,csvText(rows),'text/csv;charset=utf-8');
}
function exportAll(){
  const L=pages.filter(p=>!isSp(p));const cols=[];
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
  if(t.id&&t.closest&&t.closest('#main')&&!t.closest('.editor')&&!t.closest('form.add')&&t.type!=='checkbox')t.dataset.dirty='1';
  if(t.id==='lq'){lq=t.value;const p=pageOf(view);if(p)$('#lbody').innerHTML=liensBody(p);return}
  if(t.id==='pq'){q=t.value;const p=pageOf(view);if(p)$('#listBody').innerHTML=listBody(p);return}
  if(t.id==='gq'){gq=t.value;$('#logBody').innerHTML=logBody();return}
  const form=t.closest&&t.closest('form.add');
  if(form){
    if(t.dataset.money){t.dataset.auto=t.value===''?'1':'0';return}
    autoMoney(form);return;
  }
  if(!draft)return;
  if(t.dataset.rc!=null){const r=(draft.settings.recur||[])[+t.dataset.rc];if(r)r[t.dataset.rp]=t.value;return}
  if(t.dataset.ds!=null){draft.settings[t.dataset.ds]=t.type==='checkbox'?t.checked:t.value;return}
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
  if(spChange(t))return;
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
  if(await spClick(t))return;
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
  if(t.dataset.tpl){const k=t.dataset.tpl;draft.template=k;draft.fields=TPL[k].fields();draft.fields.forEach(f=>{f._opts=(f.opts||[]).join('\n')});draft.settings=Object.assign({goals:[],presets:[],rates:{}},clone(SP_DEF[k]||{}));if(TPL[k].special&&(!String(draft.name||'').trim()||Object.values(TPL).some(x=>x.name===draft.name)))draft.name=TPL[k].name;return render()}
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
  if(t.dataset.edit){editId=t.dataset.edit;const ee=entries.find(x=>x.id===editId);if(ee&&ee.kind)agKind=ee.kind==='edt'?'edt':'rdv';skipKeep=true;render();const f=$('#main form.add');if(f)f.scrollIntoView({block:'start',behavior:'smooth'});return}
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
  if(f.classList.contains('tadd')||f.classList.contains('oadd'))return spAddForm(f);
  if(!f.classList.contains('add'))return;
  if(f.classList.contains('sp'))return spSubmit(f);
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
  if(document.hidden){hiddenAt=Date.now();const a=document.activeElement;if(a&&(a.id==='jbilan'||a.id==='jplus'))a.blur();return}
  if(!user)return;
  if(pinRec&&!locked&&hiddenAt&&Date.now()-hiddenAt>120000)lockNow();
  scheduleReload();
});

/* =================== v3 : pages spéciales =================== */
const SP_TPL={
  jour:{label:'Ma journée',desc:'To-do en 3 niveaux, humeur, productivité, temps de travail, mini-bilan et citation du jour.',dateKey:'date',name:'Ma journée'},
  objectifs:{label:'Objectifs',desc:'Jour, semaine, mois, année. Le « très important » de la semaine et le bilan hebdo.',dateKey:'periode',name:'Objectifs'},
  agenda:{label:'Agenda',desc:'Emploi du temps (créneaux de chaque semaine) et planning (événements datés).',dateKey:'date',name:'Agenda'},
  liste:{label:'Liste à cocher',desc:'Pense-bête, courses, idées… avec une date si besoin.',dateKey:'quand',name:'À ne pas oublier'},
  revision:{label:'Cours · méthode des J',desc:'Matière, chapitre, J0 puis J1, J3, J7… avec ce qu’il faut revoir aujourd’hui.',dateKey:'date',name:'Révisions'},
  livres:{label:'Lectures',desc:'Livres de l’année : référence, dates, note et notes perso.',dateKey:'fin',name:'Lectures'},
  liens:{label:'Liens & notes',desc:'Applis, sites et notes utiles rangés par catégorie.',dateKey:'date',name:'Liens & notes'}
};
Object.entries(SP_TPL).forEach(([k,t])=>{TPL[k]=Object.assign({special:1,fields:()=>[]},t)});
const isSp=p=>!!(p&&TPL[p.template]&&TPL[p.template].special);
const SP_DEF={
  jour:{quotes:[],onlyMine:false},
  agenda:{h0:8,h1:20},
  revision:{intervals:[1,3,7,14,30],matieres:['Proba','Estimation & tests','Algèbre linéaire','Sciences des données','Bases de données','Neuropsycho','Cognition & ingénierie','Gestion de projet','Programmation web']},
  livres:{goal:12},
  liens:{cats:['Fac','Outils','Boulot','Admin','Perso']}
};
const spS=(p,k)=>{const s=p&&p.settings;return s&&s[k]!=null&&s[k]!==''?s[k]:(SP_DEF[p&&p.template]||{})[k]};
const toList=v=>(Array.isArray(v)?v.map(String):String(v||'').split(/\n/)).map(s=>s.trim()).filter(Boolean);
const byTpl=t=>live().filter(p=>p.template===t);
const firstTpl=t=>byTpl(t)[0];
const PACK=[
  {slug:'jour',template:'jour',name:'Ma journée',color:'jaune',position:-7},
  {slug:'objectifs',template:'objectifs',name:'Objectifs',color:'rouge',position:-6},
  {slug:'agenda',template:'agenda',name:'Agenda',color:'cyan',position:-5},
  {slug:'pense-bete',template:'liste',name:'À ne pas oublier',color:'rose',position:-4},
  {slug:'revisions',template:'revision',name:'Révisions',color:'bleu',position:20},
  {slug:'livres',template:'livres',name:'Lectures',color:'vert',position:21},
  {slug:'liens',template:'liens',name:'Liens & notes',color:'gris',position:22}
];
const packKey=()=>'mc-pack-later-'+(user?user.id:'');
const missingPack=()=>PACK.filter(x=>!pages.some(p=>p.slug===x.slug));
async function installPack(slugs){
  const rows=missingPack().filter(x=>slugs.includes(x.slug)).map(x=>pageRow({slug:x.slug,name:x.name,color:x.color,position:x.position,template:x.template,fields:[],settings:clone(SP_DEF[x.template]||{}),archived:false}));
  if(!rows.length)return 0;
  const {error}=await sb.from('pages').upsert(rows,{onConflict:'user_id,slug',ignoreDuplicates:true});
  if(error)throw error;
  await loadPages();return rows.length;
}

/* Dates */
const MOISC=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const DOW=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const shortM=s=>{const d=parse(s);return d.getDate()+' '+MOISC[d.getMonth()]};
const monday=s=>{const d=parse(s);d.setDate(d.getDate()-(d.getDay()+6)%7);return iso(d)};
function isoWeek(s){const t=parse(s);t.setDate(t.getDate()-(t.getDay()+6)%7+3);const y=t.getFullYear();const f=new Date(y,0,4);const w=1+Math.round(((t-f)/864e5-3+(f.getDay()+6)%7)/7);return {y,w,key:y+'-W'+pad(w)}}
function wkMon(key){const m=/^(\d{4})-W(\d{1,2})$/.exec(key||'');if(!m)return todayISO();const j4=iso(new Date(+m[1],0,4));return addDays(monday(j4),(+m[2]-1)*7)}
const weekLabel=s=>{const m=monday(s);return `Semaine ${isoWeek(s).w} · ${shortM(m)} → ${shortM(addDays(m,6))}`};
const hm=min=>{min=Math.max(0,Math.round(num(min)));const h=Math.floor(min/60),m=min%60;return h?h+' h'+(m?' '+pad(m):''):m+' min'};
const tmin=s=>{const m=/^(\d{1,2}):(\d{2})/.exec(s||'');return m?(+m[1])*60+(+m[2]):null};

/* Citations (une par jour) */
const QUOTES=[
  ['Ce n’est pas parce que les choses sont difficiles que nous n’osons pas, c’est parce que nous n’osons pas qu’elles sont difficiles.','Sénèque'],
  ['Il n’y a pas de vent favorable pour celui qui ne sait pas où il va.','Sénèque'],
  ['Pendant qu’on la remet à plus tard, la vie passe.','Sénèque'],
  ['Ce qui trouble les hommes, ce ne sont pas les choses, mais les jugements qu’ils portent sur les choses.','Épictète'],
  ['Il y a ce qui dépend de nous, et ce qui ne dépend pas de nous.','Épictète'],
  ['La meilleure façon de se venger d’un ennemi, c’est de ne pas lui ressembler.','Marc Aurèle'],
  ['Rien ne sert de courir ; il faut partir à point.','La Fontaine'],
  ['Patience et longueur de temps font plus que force ni que rage.','La Fontaine'],
  ['Aide-toi, le ciel t’aidera.','La Fontaine'],
  ['On a souvent besoin d’un plus petit que soi.','La Fontaine'],
  ['Il faut cultiver notre jardin.','Voltaire'],
  ['Le travail éloigne de nous trois grands maux : l’ennui, le vice et le besoin.','Voltaire'],
  ['Qui veut voyager loin ménage sa monture.','Racine'],
  ['À vaincre sans péril, on triomphe sans gloire.','Corneille'],
  ['Ce que l’on conçoit bien s’énonce clairement.','Boileau'],
  ['Hâtez-vous lentement.','Boileau'],
  ['Vingt fois sur le métier remettez votre ouvrage.','Boileau'],
  ['Le cœur a ses raisons que la raison ne connaît point.','Pascal'],
  ['Tout le malheur des hommes vient d’une seule chose, qui est de ne savoir pas demeurer en repos dans une chambre.','Pascal'],
  ['Mieux vaut une tête bien faite que bien pleine.','Montaigne'],
  ['Que sais-je ?','Montaigne'],
  ['Diviser chacune des difficultés en autant de parcelles qu’il se pourrait.','Descartes'],
  ['Le hasard ne favorise que les esprits préparés.','Louis Pasteur'],
  ['Lire, c’est boire et manger. L’esprit qui ne lit pas maigrit comme le corps qui ne mange pas.','Victor Hugo'],
  ['On ne voit bien qu’avec le cœur. L’essentiel est invisible pour les yeux.','Antoine de Saint-Exupéry'],
  ['Un voyage de mille lieues commence toujours par un premier pas.','Lao Tseu'],
  ['Exige beaucoup de toi-même et attends peu des autres.','Confucius'],
  ['Connais-toi toi-même.','Temple de Delphes'],
  ['Deviens ce que tu es.','Pindare'],
  ['Ce qui ne me tue pas me rend plus fort.','Nietzsche'],
  ['La vie, c’est comme une bicyclette : il faut avancer pour ne pas perdre l’équilibre.','Albert Einstein'],
  ['Rien de grand ne s’est accompli dans le monde sans passion.','Hegel'],
  ['L’éducation est l’arme la plus puissante pour changer le monde.','Nelson Mandela'],
  ['La lecture est à l’esprit ce que l’exercice est au corps.','Joseph Addison'],
  ['Prends du repos : un champ qui s’est reposé donne une récolte abondante.','Ovide'],
  ['La goutte d’eau creuse la pierre, non par la force, mais en tombant souvent.','Ovide'],
  ['On n’est jamais si heureux ni si malheureux qu’on s’imagine.','La Rochefoucauld'],
  ['Agis comme si ce que tu fais faisait une différence. C’est le cas.','William James'],
  ['La discipline est le pont entre les objectifs et leur réalisation.','Jim Rohn'],
  ['Le génie est une longue patience.','Buffon'],
  ['Le plus lent à promettre est toujours le plus fidèle à tenir.','Jean-Jacques Rousseau'],
  ['Goutte à goutte, l’oued finit par couler.','Proverbe marocain'],
  ['La patience est la clé du soulagement.','Proverbe arabe'],
  ['Le temps est comme un sabre : si tu ne le coupes pas, il te coupe.','Proverbe arabe'],
  ['Celui qui a la santé a l’espoir, et celui qui a l’espoir a tout.','Proverbe arabe'],
  ['Petit à petit, l’oiseau fait son nid.','Proverbe'],
  ['Ne remets pas à demain ce que tu peux faire aujourd’hui.','Proverbe'],
  ['Le commencement est la moitié de tout.','Proverbe grec']
];
function parseQuote(s){const m=/^(.*?)\s+[—–-]\s+([^—–-]+)$/.exec(String(s).trim());return m?[m[1].replace(/^[«"\s]+|[»"\s]+$/g,''),m[2].trim()]:[String(s).trim().replace(/^[«"\s]+|[»"\s]+$/g,''),'']}
function quotePool(){const p=firstTpl('jour');const mine=p?toList(spS(p,'quotes')).map(parseQuote).filter(q=>q[0]):[];const only=p&&(spS(p,'onlyMine')===true||spS(p,'onlyMine')==='true');return only&&mine.length?mine:mine.concat(QUOTES)}
function quoteFor(d){const pool=quotePool();const n=Math.round((parse(d)-new Date(2020,0,1))/864e5);return pool[((n%pool.length)+pool.length)%pool.length]}
const quoteHTML=(d,cls)=>{const q=quoteFor(d);return `<figure class="quote ${cls||''}"><blockquote>« ${esc(q[0])} »</blockquote>${q[1]?`<figcaption>— ${esc(q[1])}</figcaption>`:''}</figure>`};

/* File d’attente : évite les doublons quand on touche vite */
const queues={};
function serial(k,fn){const run=(queues[k]||Promise.resolve()).then(fn);queues[k]=run.catch(()=>{});return run}
async function patchE(id,patch,msg){try{await updEntry(id,patch);render();if(msg)toast(msg)}catch(x){toast(frErr(x))}}

/* ---------------- Ma journée ---------------- */
let jourDate=todayISO();
const MOODS=[[1,'😞','Dur'],[2,'🙁','Bof'],[3,'😐','Moyen'],[4,'🙂','Bien'],[5,'😄','Top']];
const LVLS=[['must','À faire absolument'],['bonus','Si j’ai le temps'],['repos','Pour me reposer après']];
const LPH={must:'Ex. réviser le chapitre 3',bonus:'Ex. ranger mes notes',repos:'Ex. série, sport, appeler la famille'};
const emptyDay=d=>({date:d,todos:[],bilan:'',plus:'',mood:0,prod:0,travail:0});
const dayOf=(p,d)=>of(p.slug).find(e=>e.date===d);
const moodEm=v=>{const i=Math.min(5,Math.max(1,Math.round(v)));return MOODS[i-1][1]};
function saveDay(p,d,mk,quiet){
  return serial('day:'+p.slug+':'+d,async()=>{
    const e=dayOf(p,d);const base=e?clone(e):emptyDay(d);if(!Array.isArray(base.todos))base.todos=[];
    const patch=mk(base);if(!patch)return;
    if(e)await updEntry(e.id,patch);else await addEntry(Object.assign({mod:p.slug},emptyDay(d),patch));
    if(!quiet)render();
  }).catch(x=>toast(frErr(x)));
}
const chronoKey=()=>'mc-chrono-'+(user?user.id:'');
const chronoGet=()=>store_.get(chronoKey(),null);
function chronoTxt(c){if(c.mode==='pomo'){const cfg=pomoCfg();const left=Math.max(0,Math.ceil((phaseDur(c,cfg)-(Date.now()-c.ps))/1000));return (c.phase==='work'?'Travail ':'Pause ')+pad(Math.floor(left/60))+':'+pad(left%60)}const s=Math.max(0,Math.floor((Date.now()-c.start)/1000));return (s>=3600?Math.floor(s/3600)+':':'')+pad(Math.floor(s/60)%60)+':'+pad(s%60)}
setInterval(()=>{const c=chronoGet();if(!c)return;if(c.mode==='pomo')pomoTick();document.querySelectorAll('.chronoT').forEach(el=>el.textContent=chronoTxt(c))},1000);
function todoLi(x,lvl){
  return `<li class="${x.done?'done':''}"><button type="button" class="tick" data-jt="${esc(x.id)}" aria-pressed="${!!x.done}" aria-label="${x.done?'Décocher':'Cocher'} : ${esc(x.t)}">${x.done?'✓':''}</button><span class="tt">${esc(x.t)}</span><span class="tacts">${lvl!=='repos'&&!x.done?`<button type="button" class="del" data-jtmove="${esc(x.id)}" title="Reporter à demain" aria-label="Reporter à demain">↪</button>`:''}<button type="button" class="del" data-jtdel="${esc(x.id)}" aria-label="Retirer">✕</button></span></li>`;
}
function jourView(p){
  const d=jourDate,t=todayISO();const e=dayOf(p,d)||emptyDay(d);const todos=e.todos||[];
  const nav=`<div class="dnav"><button type="button" class="iconbtn" data-jnav="-1" aria-label="Jour précédent">‹</button><input type="date" id="jdate" class="in" value="${esc(d)}" aria-label="Choisir le jour"><button type="button" class="iconbtn" data-jnav="1" aria-label="Jour suivant">›</button>${d!==t?'<button type="button" class="btn ghost" data-jnav="0">Aujourd’hui</button>':''}<span class="dlabel">${d===t?'Aujourd’hui · ':''}${esc(dayLabel(d))}</span></div>`;
  const cols=LVLS.map(([lvl,lab])=>{const l=todos.filter(x=>x.lvl===lvl);const dn=l.filter(x=>x.done).length;
    return `<div class="tcol t-${lvl}"><h3>${lab} <small>${l.length?dn+'/'+l.length:''}</small></h3><ul class="tlist">${l.map(x=>todoLi(x,lvl)).join('')}</ul><form class="tadd" data-lvl="${lvl}" data-mod="${esc(p.slug)}" novalidate><input id="jadd-${lvl}" class="in" type="text" maxlength="140" placeholder="${esc(LPH[lvl])}" aria-label="Ajouter à « ${lab} »" autocomplete="off"><button class="btn ghost" type="submit" aria-label="Ajouter">＋</button></form></div>`}).join('');
  const undone=todos.filter(x=>!x.done&&x.lvl!=='repos').length;
  const left=todos.filter(x=>!x.done).length;
  const must=todos.filter(x=>x.lvl==='must'),mustD=must.filter(x=>x.done).length;
  const c=chronoGet();
  const pc=pomoCfg();const nP=c&&c.n||0;
  const chrono=c?`<button type="button" class="btn chrono on${c.mode==='pomo'&&c.phase!=='work'?' pause':''}" data-chrono="stop">■ Arrêter · <span class="chronoT">${chronoTxt(c)}</span></button><span class="hint">${c.mode==='pomo'?`Pomodoro ${pc.w}/${pc.b} · ${nP} terminé${nP>1?'s':''}`:'Chrono libre'}${c.date!==d?` · compté pour le ${esc(frDate(c.date))}`:''}</span>`:(d===t?`<button type="button" class="btn ghost chrono" data-chrono="start">▶ Chrono libre</button><button type="button" class="btn ghost chrono" data-chrono="pomo">Pomodoro ${pc.w}/${pc.b}</button>`:'');
  const todoP=`<section class="panel"><h2>To-do <small>${todos.length?(left?left+' restante'+(left>1?'s':''):'tout est fait ✓'):''}</small></h2><div class="tcols">${cols}</div>${undone?`<div><button type="button" class="link small" data-jcarry="1">${undone>1?`Reporter les ${undone} tâches non faites à demain`:'Reporter la tâche non faite à demain'}</button></div>`:''}</section>`;
  const stateP=`<section class="panel"><h2>Mon état <small>${esc(shortM(d))}</small></h2>
    <div class="srow"><span class="flbl">Humeur</span><div class="moods">${MOODS.map(([v,em,l])=>`<button type="button" class="mood${e.mood===v?' on':''}" data-jmood="${v}" aria-pressed="${e.mood===v}" style="--mc:var(--m${v})"><span aria-hidden="true">${em}</span><small>${l}</small></button>`).join('')}</div></div>
    <div class="srow"><span class="flbl">Productivité</span><div class="prods">${[1,2,3,4,5].map(v=>`<button type="button" class="prod${num(e.prod)>=v?' on':''}" data-jprod="${v}" aria-label="${v} sur 5" aria-pressed="${num(e.prod)===v}">${v}</button>`).join('')}</div><span class="hint">${must.length?`« Absolument » : ${mustD}/${must.length} fait${mustD>1?'s':''}`:'Note ta journée de 1 à 5'}</span></div>
    <div class="srow"><span class="flbl">Énergie</span><div class="prods">${[1,2,3,4,5].map(v=>`<button type="button" class="prod en${num(e.energie)>=v?' on':''}" data-jener="${v}" aria-label="Énergie ${v} sur 5" aria-pressed="${num(e.energie)===v}">${v}</button>`).join('')}</div></div>
    <div class="srow"><span class="flbl">Sommeil (nuit d’avant)</span><div class="work"><input id="jsleep" class="in" type="number" step="0.25" min="0" max="24" inputmode="decimal" value="${num(e.sommeil)||''}" placeholder="0" aria-label="Heures de sommeil"><span class="hint">h</span>${[5,6,7,8,9].map(h=>`<button type="button" class="btn ghost sm${num(e.sommeil)===h?' on':''}" data-jsleep="${h}">${h} h</button>`).join('')}</div></div>
    <div class="srow"><span class="flbl">Temps de travail</span><div class="work"><input id="jwork" class="in" type="number" step="0.25" min="0" inputmode="decimal" value="${num(e.travail)?Math.round(num(e.travail)/60*100)/100:''}" placeholder="0" aria-label="Heures de travail"><span class="hint">h · ${esc(hm(e.travail))}</span><button type="button" class="btn ghost sm" data-jwork="15">+15 min</button><button type="button" class="btn ghost sm" data-jwork="30">+30 min</button><button type="button" class="btn ghost sm" data-jwork="60">+1 h</button></div><div class="work">${chrono}</div></div>
  </section>`;
  const bilanP=`<section class="panel"><h2>Mini-bilan <small>${e.bilan||e.plus?'enregistré':''}</small></h2>
    <div class="field"><label for="jplus">Le point positif du jour</label><input id="jplus" class="in" type="text" maxlength="160" value="${esc(e.plus||'')}" placeholder="Une chose qui s’est bien passée"></div>
    <div class="field"><label for="jbilan">Bilan</label><textarea id="jbilan" class="in" rows="5" placeholder="Ce qui a marché, ce qui a bloqué, ce que je change demain…">${esc(e.bilan||'')}</textarea></div>
    <p class="hint">Enregistré automatiquement quand tu quittes le champ.</p></section>`;
  return `${nav}<div class="jgrid"><div class="stack">${quoteHTML(d)}${todoP}${stateP}${bilanP}</div><div class="stack">${jourAside(d)}</div></div>${jourMonth(p,d)}`;
}
function jourAside(d){
  const out=[];const box=(title,slug,body)=>`<section class="panel side"><h2><span>${title}</span><button type="button" class="link small" data-v="${esc(slug)}">Voir</button></h2>${body}</section>`;
  const ag=byTpl('agenda');
  if(ag.length){const it=agItems(d,ag);out.push(box('Agenda',ag[0].slug,it.length?`<ul class="mini">${it.map(({e})=>`<li><span class="mt">${esc(agTime(e)||'journée')}</span><span>${esc(e.titre)}${e.lieu?` <small>${esc(e.lieu)}</small>`:''}</span></li>`).join('')}</ul>`:'<p class="hint">Rien de prévu.</p>'))}
  const rv=byTpl('revision');
  if(rv.length){const it=rvDue(rv,d);out.push(box(`Révisions${it.length?` <small>${it.length}</small>`:''}`,rv[0].slug,it.length?`<ul class="tlist rv">${it.slice(0,8).map(rvItem).join('')}</ul>`:'<p class="hint">Rien à réviser ce jour-là.</p>'))}
  const op=firstTpl('objectifs');
  if(op){const wk=isoWeek(d).key;const imp=of(op.slug).filter(e=>e.horizon==='semaine'&&e.periode===wk&&e.prio);const dj=of(op.slug).filter(e=>e.horizon==='jour'&&e.periode===d);
    out.push(box('Très important cette semaine',op.slug,imp.length?`<ul class="tlist">${imp.map(e=>objItem(e,true)).join('')}</ul>`:'<p class="hint">Dans Objectifs, touche ★ sur un objectif de la semaine.</p>'));
    if(dj.length)out.push(box('Objectifs du jour',op.slug,`<ul class="tlist">${dj.map(e=>objItem(e,true)).join('')}</ul>`));}
  byTpl('liste').forEach(lp=>{const it=of(lp.slug).filter(e=>!e.done&&(!e.quand||e.quand<=addDays(d,3))).sort(listSort).slice(0,6);if(it.length)out.push(box(esc(lp.name),lp.slug,`<ul class="tlist">${it.map(e=>listLi(e,true)).join('')}</ul>`))});
  return out.join('');
}
function jourMonth(p,d){
  const ym=d.slice(0,7),[y,m]=ym.split('-').map(Number),n=new Date(y,m,0).getDate(),t=todayISO();
  const map={};of(p.slug).forEach(e=>{if(String(e.date||'').slice(0,7)===ym)map[e.date]=e});
  const off=(new Date(y,m-1,1).getDay()+6)%7;let cells='';for(let i=0;i<off;i++)cells+='<span></span>';
  for(let k=1;k<=n;k++){const ds=ym+'-'+pad(k);const e=map[ds];const mo=e&&e.mood||0;
    cells+=`<button type="button" class="mcell${ds===d?' sel':''}${ds===t?' today':''}${mo?' has':''}" data-jgo="${ds}" style="${mo?`--mc:var(--m${mo})`:''}" aria-label="${esc(dayLabel(ds))}"><span>${k}</span><small>${e&&num(e.travail)?esc(hm(e.travail).replace(' min','′').replace(' h','h')):''}</small></button>`}
  const list=Object.values(map);
  const md=list.filter(e=>e.mood>0),pd=list.filter(e=>num(e.prod)>0);
  const avgM=md.length?md.reduce((a,e)=>a+e.mood,0)/md.length:0,avgP=pd.length?pd.reduce((a,e)=>a+num(e.prod),0)/pd.length:0;
  const work=list.reduce((a,e)=>a+num(e.travail),0),wd=list.filter(e=>num(e.travail)>0).length;
  const must=list.flatMap(e=>(e.todos||[]).filter(x=>x.lvl==='must')),mustD=must.filter(x=>x.done).length;
  const stat=(l,v,s)=>`<div class="stat"><span class="lbl">${l}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`;
  const W=640,H=140,L=30,B=20,bw=(W-L-4)/n;const mx=Math.max(120,...list.map(e=>num(e.travail)));const top=Math.ceil(mx/60);const st=top<=4?1:top<=8?2:4;
  let g='';for(let v=0;v<=top;v+=st){const yy=H-B-(v*60/(top*60))*(H-B-8);g+=`<line x1="${L}" x2="${W}" y1="${yy}" y2="${yy}" stroke="var(--line)"/><text x="${L-5}" y="${yy+4}" text-anchor="end" font-size="10" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${v}h</text>`}
  for(let k=1;k<=n;k++){const ds=ym+'-'+pad(k);const e=map[ds];const v=e?num(e.travail):0;const x=L+(k-1)*bw+bw*0.15;
    if(v){const hh=v/(top*60)*(H-B-8);g+=`<rect x="${x}" y="${H-B-hh}" width="${bw*0.7}" height="${hh}" rx="1.5" fill="${cv(p.color)}"><title>${esc(dayLabel(ds))} : ${esc(hm(v))}</title></rect>`}
    if(k===1||k%5===0)g+=`<text x="${x+bw*0.35}" y="${H-5}" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${k}</text>`}
  return `<section class="panel"><h2>${esc(MOIS[m-1])} ${y} en un coup d’œil <small>humeur · travail</small></h2>
    <div class="statgrid">${stat('Humeur moyenne',avgM?moodEm(avgM)+' '+nf.format(Math.round(avgM*10)/10)+'/5':'—',md.length?md.length+' j notés':'')}${stat('Productivité',avgP?nf.format(Math.round(avgP*10)/10)+'/5':'—')}${stat('Temps de travail',hm(work),wd?'moy. '+hm(work/wd)+' / jour travaillé':'')}${stat('« Absolument » faits',must.length?Math.round(mustD/must.length*100)+' %':'—',must.length?mustD+'/'+must.length:'')}${sleepStats(list)}</div>${nightInsight(list)}
    <div class="jmonth"><div class="mcal">${['L','M','M','J','V','S','D'].map(x=>`<span class="cdow">${x}</span>`).join('')}${cells}</div>
    <div><div class="sect sm">Temps de travail</div><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Temps de travail par jour">${g}</svg>${sleepSvg(map,ym,n)}<div class="legend">${MOODS.map(([v,em,l])=>`<span><i style="background:var(--m${v})"></i>${em} ${l}</span>`).join('')}</div></div></div></section>`;
}

/* ---------------- Objectifs ---------------- */
let objDate=todayISO();
const HZ=[['jour','Jour'],['semaine','Semaine'],['mois','Mois'],['annee','Année']];
const OPH={jour:'Ex. finir le TD de proba',semaine:'Ex. 3 séances de tir',mois:'Ex. épargner 100 €',annee:'Ex. valider ma L3'};
const perKey=(h,d)=>h==='jour'?d:h==='semaine'?isoWeek(d).key:h==='mois'?d.slice(0,7):d.slice(0,4);
const perStart=(h,k)=>h==='jour'?k:h==='semaine'?wkMon(k):h==='mois'?k+'-01':k+'-01-01';
function perShift(h,d,n){if(h==='jour')return addDays(d,n);if(h==='semaine')return addDays(monday(d),7*n);const x=parse(d);return h==='mois'?iso(new Date(x.getFullYear(),x.getMonth()+n,1)):iso(new Date(x.getFullYear()+n,0,1))}
function perLabel(h,d){if(h==='jour')return (d===todayISO()?'Aujourd’hui · ':'')+dayLabel(d);if(h==='semaine')return weekLabel(d);if(h==='mois'){const x=parse(d);return MOIS[x.getMonth()]+' '+x.getFullYear()}return d.slice(0,4)}
const objOf=(p,h,k)=>of(p.slug).filter(e=>e.horizon===h&&e.periode===k).sort((a,b)=>(b.prio?1:0)-(a.prio?1:0)||(a.createdAt||0)-(b.createdAt||0));
function objItem(e,mini){
  return `<li class="${e.fait?'done':''}${e.prio?' prio':''}"><button type="button" class="tick" data-otick="${esc(e.id)}" aria-pressed="${!!e.fait}" aria-label="${e.fait?'Décocher':'Cocher'} : ${esc(e.titre)}">${e.fait?'✓':''}</button><span class="tt">${esc(e.titre)}</span>${mini?'':`<span class="tacts"><button type="button" class="del star${e.prio?' on':''}" data-ostar="${esc(e.id)}" aria-pressed="${!!e.prio}" title="Très important" aria-label="Très important">★</button>${e.fait?'':`<button type="button" class="del" data-omove="${esc(e.id)}" title="Reporter à la période suivante" aria-label="Reporter à la période suivante">↪</button>`}<button type="button" class="del" data-del="${esc(e.id)}" aria-label="Supprimer">✕</button></span>`}</li>`;
}
function objectifsView(p){
  const d=objDate,t=todayISO();
  const nav=`<div class="dnav"><button type="button" class="iconbtn" data-onav="-7" aria-label="Semaine précédente">«</button><button type="button" class="iconbtn" data-onav="-1" aria-label="Jour précédent">‹</button><input type="date" id="odate" class="in" value="${esc(d)}" aria-label="Choisir le jour"><button type="button" class="iconbtn" data-onav="1" aria-label="Jour suivant">›</button><button type="button" class="iconbtn" data-onav="7" aria-label="Semaine suivante">»</button>${d!==t?'<button type="button" class="btn ghost" data-onav="0">Aujourd’hui</button>':''}</div>`;
  const wk=isoWeek(d).key;const imp=of(p.slug).filter(e=>e.prio&&e.horizon==='semaine'&&e.periode===wk);
  const impP=`<section class="panel imp"><h2>Très important cette semaine <small>${esc(weekLabel(d))}</small></h2>${imp.length?`<ul class="tlist big">${imp.map(e=>objItem(e)).join('')}</ul>`:'<p class="hint">Ajoute un objectif dans la colonne Semaine puis touche ★ : il s’affiche ici et dans « Ma journée ».</p>'}</section>`;
  const cols=HZ.map(([h,lab])=>{const k=perKey(h,d);const l=objOf(p,h,k);const dn=l.filter(e=>e.fait).length;const pk=perKey(h,perShift(h,d,-1));const prev=of(p.slug).filter(e=>e.horizon===h&&e.periode===pk&&!e.fait).length;
    return `<section class="panel ocol"><h2>${lab} <small>${esc(perLabel(h,perStart(h,k)))}</small></h2>${l.length?`<div class="gtrack"><span style="width:${Math.max(2,dn/l.length*100)}%"></span></div><div class="gtxt">${dn}/${l.length} atteint${dn>1?'s':''}</div>`:''}<ul class="tlist">${l.map(e=>objItem(e)).join('')}</ul><form class="oadd" data-h="${h}" data-mod="${esc(p.slug)}" novalidate><input id="oadd-${h}" class="in" type="text" maxlength="140" placeholder="${esc(OPH[h])}" aria-label="Nouvel objectif (${lab.toLowerCase()})" autocomplete="off"><button class="btn ghost" type="submit" aria-label="Ajouter">＋</button></form>${prev?`<button type="button" class="link small" data-ocarry="${h}">Reprendre ${prev} objectif${prev>1?'s':''} non atteint${prev>1?'s':''} de la période d’avant</button>`:''}</section>`}).join('');
  return nav+impP+`<div class="ocols">${cols}</div>`+weekReview(monday(d));
}
function weekReview(ws){
  const days=[...Array(7)].map((_,i)=>addDays(ws,i));const inW=s=>!!s&&s>=ws&&s<=days[6];
  const jp=firstTpl('jour');const je=jp?of(jp.slug).filter(e=>inW(e.date)):[];
  const work=je.reduce((a,e)=>a+num(e.travail),0);
  const md=je.filter(e=>e.mood>0),avgM=md.length?md.reduce((a,e)=>a+e.mood,0)/md.length:0;
  const pd=je.filter(e=>num(e.prod)>0),avgP=pd.length?pd.reduce((a,e)=>a+num(e.prod),0)/pd.length:0;
  const must=je.flatMap(e=>(e.todos||[]).filter(x=>x.lvl==='must')),mustD=must.filter(x=>x.done).length;
  const op=firstTpl('objectifs');const wk=isoWeek(ws).key;const ow=op?of(op.slug).filter(e=>e.horizon==='semaine'&&e.periode===wk):[];
  let revs=0;byTpl('revision').forEach(p=>of(p.slug).forEach(e=>Object.values(e.done||{}).forEach(v=>{if(inW(v))revs++})));
  let h=0;live().filter(isWork).forEach(p=>{const hf=hourF(p);of(p.slug).forEach(e=>{if(inW(e.date))h+=num(e[hf.k])})});
  let dep=0;byTpl('argent').forEach(p=>of(p.slug).forEach(e=>{if(inW(e.date)&&e.sens!=='Revenu'&&e.sens!=='Épargne')dep+=num(e.montant)}));
  let books=0;byTpl('livres').forEach(p=>of(p.slug).forEach(e=>{if(e.statut==='Lu'&&inW(e.fin))books++}));
  const stat=(l,v,s)=>`<div class="stat"><span class="lbl">${l}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`;
  const per=days.map(d=>{const e=je.find(x=>x.date===d);return {d,m:e?num(e.travail):0,mood:e&&e.mood||0}});const mx=Math.max(60,...per.map(x=>x.m));
  const bars=`<div class="wbars" aria-label="Travail et humeur par jour">${per.map(x=>`<div class="wb"><span class="wbn">${x.m?esc(hm(x.m).replace(' min','′').replace(' h','h')):''}</span><span class="wbv" style="height:${Math.max(x.m?4:0,x.m/mx*100)}%"></span><span class="wbm">${x.mood?MOODS[x.mood-1][1]:'·'}</span><span class="wbd">${JOURS[parse(x.d).getDay()]}</span></div>`).join('')}</div>`;
  const items=[jp?stat('Travail perso',hm(work),je.filter(e=>num(e.travail)).length+' j travaillés'):'',
    jp?stat('Humeur moyenne',avgM?moodEm(avgM)+' '+nf.format(Math.round(avgM*10)/10):'—'):'',
    jp?stat('Sommeil moyen',(()=>{const sl=je.filter(e=>num(e.sommeil)>0);return sl.length?nf.format(Math.round(sl.reduce((a,e)=>a+num(e.sommeil),0)/sl.length*10)/10)+' h':'—'})()):'',
    jp?stat('Productivité',avgP?nf.format(Math.round(avgP*10)/10)+'/5':'—'):'',
    jp?stat('« Absolument » faits',must.length?mustD+'/'+must.length:'—'):'',
    op?stat('Objectifs semaine',ow.length?ow.filter(e=>e.fait).length+'/'+ow.length:'—'):'',
    byTpl('revision').length?stat('Révisions faites',revs):'',
    h?stat('Heures de boulot',nf.format(h)+' h'):'',
    byTpl('argent').length?stat('Dépensé',eur(dep)):'',
    books?stat('Livres finis',books):''].join('');
  return `<section class="panel"><h2>Bilan de la semaine <small>${esc(weekLabel(ws))}</small></h2><div class="statgrid">${items}</div>${jp?bars:''}</section>`;
}

/* ---------------- Agenda ---------------- */
let wkDate=todayISO(),agKind='rdv';
const agTime=e=>e.debut?e.debut+(e.fin?'–'+e.fin:''):'';
function agItems(d,pgs){
  const dow=(parse(d).getDay()+6)%7+1;const out=[];
  pgs.forEach(p=>of(p.slug).forEach(e=>{
    if(e.kind==='edt'){if(+e.jour===dow&&(!e.du||e.du<=d)&&(!e.au||d<=e.au))out.push({p,e})}
    else if(e.date===d)out.push({p,e});
  }));
  return out.sort((a,b)=>(tmin(a.e.debut)==null?-1:tmin(a.e.debut))-(tmin(b.e.debut)==null?-1:tmin(b.e.debut)));
}
const rowActs=(e,extra)=>`<span class="acts">${extra||''}<button class="del" type="button" data-edit="${esc(e.id)}" aria-label="Modifier" title="Modifier">✎</button><button class="del" type="button" data-del="${esc(e.id)}" aria-label="Supprimer" title="Supprimer">✕</button></span>`;
function agendaView(p){
  const ws=monday(wkDate),t=todayISO();const days=[...Array(7)].map((_,i)=>addDays(ws,i));
  const items=days.map(d=>agItems(d,[p]));
  let h0=Math.round(num(spS(p,'h0'))),h1=Math.round(num(spS(p,'h1')))||20;
  items.flat().forEach(({e})=>{const a=tmin(e.debut),b=tmin(e.fin);if(a!=null){h0=Math.min(h0,Math.floor(a/60));h1=Math.max(h1,Math.ceil((b!=null&&b>a?b:a+60)/60))}});
  h0=Math.max(0,h0);h1=Math.min(24,Math.max(h1,h0+1));
  const PX=0.8,H=(h1-h0)*60*PX;const nowM=new Date().getHours()*60+new Date().getMinutes();
  let heads='<div></div>',alls='<div class="wlab">journée</div>',bodies=`<div class="waxis" style="height:${H}px">${[...Array(h1-h0+1)].map((_,i)=>`<span style="top:${i*60*PX}px">${pad(h0+i)}h</span>`).join('')}</div>`;
  days.forEach((d,i)=>{const dd=parse(d);const timed=items[i].filter(x=>tmin(x.e.debut)!=null),allday=items[i].filter(x=>tmin(x.e.debut)==null);
    heads+=`<div class="whead${d===t?' today':''}">${JOURS[dd.getDay()]} <b>${dd.getDate()}</b></div>`;
    alls+=`<div class="wallc">${allday.map(x=>`<button type="button" class="wall" data-edit="${esc(x.e.id)}">${esc(x.e.titre)}</button>`).join('')}</div>`;
    const lanes=[];const pos=timed.map(x=>{const a=tmin(x.e.debut);const fb=tmin(x.e.fin);const b=Math.max(a+20,fb!=null&&fb>a?fb:a+60);let l=lanes.findIndex(end=>end<=a);if(l<0){l=lanes.length;lanes.push(b)}else lanes[l]=b;return {x,a,b,l}});
    const Ln=Math.max(1,lanes.length);
    const blocks=pos.map(({x,a,b,l})=>`<button type="button" class="wblk k-${x.e.kind==='edt'?'edt':'rdv'}" data-edit="${esc(x.e.id)}" style="top:${(a-h0*60)*PX}px;height:${Math.max(20,(b-a)*PX-2)}px;left:calc(${l*100/Ln}% + 1px);width:calc(${100/Ln}% - 2px)" title="${esc([agTime(x.e),x.e.titre,x.e.lieu].filter(Boolean).join(' · '))}"><b>${esc(x.e.debut)} ${esc(x.e.titre)}</b>${x.e.lieu?`<span>${esc(x.e.lieu)}</span>`:''}</button>`).join('');
    const lines=[...Array(h1-h0)].map((_,k)=>`<i style="top:${(k+1)*60*PX}px"></i>`).join('');
    const now=d===t&&nowM>=h0*60&&nowM<=h1*60?`<em class="wnow" style="top:${(nowM-h0*60)*PX}px"></em>`:'';
    bodies+=`<div class="wbody${d===t?' today':''}" style="height:${H}px">${lines}${blocks}${now}</div>`});
  const grid=`<div class="wgrid">${heads}${alls}${bodies}</div>`;
  const list=`<div class="wlist">${days.map((d,i)=>`<div class="aday${d===t?' today':''}"><div class="day">${esc(dayLabel(d))}${d===t?' · aujourd’hui':''}</div>${items[i].length?`<ul class="rows">${items[i].map(({e})=>`<li class="row"><div class="main"><div class="ttl">${esc(e.titre)}${e.kind==='edt'?' <span class="ex">chaque semaine</span>':''}</div><div class="meta">${esc([agTime(e),e.lieu,e.note].filter(Boolean).join(' · '))}</div></div><span></span>${rowActs(e)}</li>`).join('')}</ul>`:'<p class="ras">—</p>'}</div>`).join('')}</div>`;
  const nav=`<div class="dnav"><button type="button" class="iconbtn" data-wnav="-7" aria-label="Semaine précédente">‹</button><span class="dlabel">${esc(weekLabel(ws))}</span><button type="button" class="iconbtn" data-wnav="7" aria-label="Semaine suivante">›</button>${monday(t)!==ws?'<button type="button" class="btn ghost" data-wnav="0">Cette semaine</button>':''}</div>`;
  const all=of(p.slug);
  const up=all.filter(e=>e.kind!=='edt'&&e.date&&e.date>=t).sort((a,b)=>(a.date+(a.debut||'')).localeCompare(b.date+(b.debut||''))).slice(0,25);
  const edt=all.filter(e=>e.kind==='edt').sort((a,b)=>(+a.jour-+b.jour)||String(a.debut||'').localeCompare(String(b.debut||'')));
  const upHTML=up.length?`<ul class="rows">${up.map(e=>`<li class="row${e.id===editId?' editing':''}"><div class="main"><div class="ttl">${esc(e.titre)}</div><div class="meta">${esc([dayLabel(e.date),agTime(e),e.lieu,e.note].filter(Boolean).join(' · '))}</div></div><span></span>${rowActs(e,`<button class="del" type="button" data-agics="${esc(e.id)}" aria-label="Ajouter au calendrier du téléphone" title="Ajouter au calendrier">📅</button>`)}</li>`).join('')}</ul>`:'<p class="ras"><b>RAS</b> — aucun événement à venir.</p>';
  let edtHTML='';if(edt.length){let cur=0;edtHTML='<ul class="rows">';edt.forEach(e=>{if(+e.jour!==cur){cur=+e.jour;edtHTML+=`</ul><div class="day">${DOW[cur-1]||'?'}</div><ul class="rows">`}edtHTML+=`<li class="row${e.id===editId?' editing':''}"><div class="main"><div class="ttl">${esc(e.titre)}</div><div class="meta">${esc([agTime(e),e.lieu,e.du||e.au?('du '+(e.du?frDate(e.du):'…')+' au '+(e.au?frDate(e.au):'…')):'',e.note].filter(Boolean).join(' · '))}</div></div><span></span>${rowActs(e)}</li>`});edtHTML+='</ul>'}
  else edtHTML='<p class="ras">Ajoute tes cours avec le type « Cours / créneau » : ils reviennent chaque semaine.</p>';
  return `${nav}<section class="panel wpanel">${grid}${list}</section>
  <div class="split">${agForm(p)}<section class="listpanel"><div class="sect">Planning à venir <small>${up.length}</small></div>${upHTML}<div class="sect">Emploi du temps <small>${edt.length} créneau${edt.length>1?'x':''}</small>${edt.length?'<button type="button" class="link small" data-agicsall="'+esc(p.slug)+'">Ajouter au calendrier du téléphone</button>':''}</div>${edtHTML}</section></div>`;
}
function agForm(p){
  const e=editId?of(p.slug).find(x=>x.id===editId):null;if(editId&&!e)editId=null;
  const k=e?(e.kind==='edt'?'edt':'rdv'):agKind;const v=(f,d)=>esc(e&&e[f]!=null&&e[f]!==''?e[f]:(d||''));
  const t=todayISO();const defD=monday(wkDate)===monday(t)?t:monday(wkDate);const defJ=e&&e.jour?+e.jour:(parse(t).getDay()+6)%7+1;
  return `<form class="add sp k-${k}" data-sp="agenda" data-mod="${esc(p.slug)}" ${e?`data-edit="${esc(e.id)}"`:''} style="--c:${cv(p.color)}" novalidate><h2>${e?'Modifier':'Ajouter'}</h2>
    <div class="field"><label for="ag-kind">Type</label><select id="ag-kind" name="kind"><option value="rdv"${k==='rdv'?' selected':''}>Événement (une date)</option><option value="edt"${k==='edt'?' selected':''}>Cours / créneau (chaque semaine)</option></select></div>
    <div class="field"><label for="ag-titre">Titre</label><input id="ag-titre" name="titre" type="text" maxlength="80" value="${v('titre')}" placeholder="Ex. CM Proba, RDV CAF, nuit sécu…" required></div>
    <div class="pair"><div class="field only-rdv"><label for="ag-date">Date</label><input id="ag-date" name="date" type="date" value="${v('date',defD)}"></div><div class="field only-edt"><label for="ag-jour">Jour</label><select id="ag-jour" name="jour">${DOW.map((x,i)=>`<option value="${i+1}"${defJ===i+1?' selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label for="ag-lieu">Lieu</label><input id="ag-lieu" name="lieu" type="text" maxlength="60" value="${v('lieu')}" placeholder="Salle, adresse…"></div></div>
    <div class="pair"><div class="field"><label for="ag-debut">Début</label><input id="ag-debut" name="debut" type="time" value="${v('debut')}"></div><div class="field"><label for="ag-fin">Fin</label><input id="ag-fin" name="fin" type="time" value="${v('fin')}"></div></div>
    <div class="pair only-edt"><div class="field"><label for="ag-du">Du (facultatif)</label><input id="ag-du" name="du" type="date" value="${v('du')}"></div><div class="field"><label for="ag-au">Au (facultatif)</label><input id="ag-au" name="au" type="date" value="${v('au')}"></div></div>
    <div class="field"><label for="ag-note">Note</label><input id="ag-note" name="note" type="text" maxlength="120" value="${v('note')}"></div>
    <p class="err" hidden></p><div class="formbtns"><button class="btn" type="submit">${e?'Enregistrer':'Ajouter'}</button>${e?'<button class="btn ghost" type="button" id="editCancel">Annuler</button>':''}</div></form>`;
}
function agIcs(list){
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');const dt=(d,tm)=>d.replace(/-/g,'')+(tm?'T'+tm.replace(':','')+'00':'');
  const ev=e=>{let d=e.date;const rr=[];if(e.kind==='edt'){const base=e.du&&e.du>todayISO()?e.du:todayISO();d=addDays(monday(base),(+e.jour||1)-1);if(d<base)d=addDays(d,7);rr.push('RRULE:FREQ=WEEKLY'+(e.au?';UNTIL='+e.au.replace(/-/g,'')+'T235959':''))}
    const st=e.debut?['DTSTART:'+dt(d,e.debut),'DTEND:'+dt(d,e.fin&&tmin(e.fin)>tmin(e.debut)?e.fin:pad(Math.min(23,Math.floor(tmin(e.debut)/60)+1))+':'+e.debut.slice(3))]:['DTSTART;VALUE=DATE:'+dt(d),'DTEND;VALUE=DATE:'+dt(addDays(d,1))];
    return ['BEGIN:VEVENT',`UID:${e.id}@main-courante`,`DTSTAMP:${stamp}`,...st,...rr,`SUMMARY:${icsEsc(e.titre)}`,e.lieu?`LOCATION:${icsEsc(e.lieu)}`:'',e.note?`DESCRIPTION:${icsEsc(e.note)}`:'',...(e.kind!=='edt'?['BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${icsEsc(e.titre)}`,e.debut?'TRIGGER:-PT1H':'TRIGGER:-PT6H','END:VALARM']:[]),'END:VEVENT'].filter(Boolean)};
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Main courante//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH',...list.flatMap(ev),'END:VCALENDAR'].join('\r\n');
}

/* ---------------- Listes à cocher ---------------- */
const listSort=(a,b)=>(a.quand?0:1)-(b.quand?0:1)||String(a.quand||'').localeCompare(String(b.quand||''))||(a.createdAt||0)-(b.createdAt||0);
function listLi(e,mini){
  const t=todayISO();const d=e.quand?Math.round((parse(e.quand)-parse(t))/864e5):null;
  const w=e.quand&&!e.done?`<span class="when ${d<0?'late':d<=1?'soon':''}">${d<0?'en retard':d===0?'aujourd’hui':d===1?'demain':esc(short(e.quand))}</span>`:'';
  return `<li class="${e.done?'done':''}${e.id===editId?' editing':''}"><button type="button" class="tick" data-ltick="${esc(e.id)}" aria-pressed="${!!e.done}" aria-label="${e.done?'Décocher':'Cocher'} : ${esc(e.t)}">${e.done?'✓':''}</button><span class="tt">${esc(e.t)}${e.note&&!mini?`<small>${esc(e.note)}</small>`:''}</span>${w}${mini?'':`<span class="tacts"><button class="del" type="button" data-edit="${esc(e.id)}" aria-label="Modifier">✎</button><button class="del" type="button" data-del="${esc(e.id)}" aria-label="Supprimer">✕</button></span>`}</li>`;
}
function listeView(p){
  const all=of(p.slug);const open=all.filter(e=>!e.done).sort(listSort);const done=all.filter(e=>e.done).sort((a,b)=>String(b.doneAt||'').localeCompare(String(a.doneAt||'')));
  const e=editId?all.find(x=>x.id===editId):null;if(editId&&!e)editId=null;
  const form=`<form class="add sp" data-sp="liste" data-mod="${esc(p.slug)}" ${e?`data-edit="${esc(e.id)}"`:''} style="--c:${cv(p.color)}" novalidate><h2>${e?'Modifier':'Ajouter'}</h2>
    <div class="field"><label for="li-t">${esc(p.name)}</label><input id="li-t" name="t" type="text" maxlength="140" value="${esc(e?e.t:'')}" placeholder="Ex. renvoyer le dossier CROUS" required autocomplete="off"></div>
    <div class="pair"><div class="field"><label for="li-q">Pour le (facultatif)</label><input id="li-q" name="quand" type="date" value="${esc(e&&e.quand||'')}"></div><div class="field"><label for="li-n">Note</label><input id="li-n" name="note" type="text" maxlength="120" value="${esc(e&&e.note||'')}"></div></div>
    <p class="err" hidden></p><div class="formbtns"><button class="btn" type="submit">${e?'Enregistrer':'Ajouter'}</button>${e?'<button class="btn ghost" type="button" id="editCancel">Annuler</button>':''}</div></form>`;
  return `<div class="split">${form}<section class="listpanel"><div class="sumline"><span>À faire <b>${open.length}</b></span><span>Cochés <b>${done.length}</b></span></div>${open.length?`<ul class="tlist big">${open.map(x=>listLi(x)).join('')}</ul>`:'<p class="ras"><b>RAS</b> — rien à retenir pour l’instant.</p>'}${done.length?`<details class="donebox"><summary>Cochés (${done.length})</summary><ul class="tlist">${done.map(x=>listLi(x)).join('')}</ul><button class="btn ghost" type="button" data-lclear="${esc(p.slug)}">Effacer les cochés</button></details>`:''}</section></div>`;
}

/* ---------------- Révisions : méthode des J ---------------- */
const ivs=p=>{const v=spS(p,'intervals');const a=(Array.isArray(v)?v:String(v||'').split(/[^0-9]+/)).map(Number).filter(n=>n>0);return a.length?[...new Set(a)].sort((x,y)=>x-y):[1,3,7,14,30]};
function rvState(e,n,t){const due=addDays(e.date,n);const dn=e.done&&e.done[n];return {n,due,dn,st:dn?'done':due<t?'late':due===t?'today':'future'}}
function rvDue(pgs,d){const t=todayISO();const out=[];pgs.forEach(p=>{const iv=ivs(p);of(p.slug).forEach(e=>{if(!e.date)return;iv.forEach(n=>{const s=rvState(e,n,t);if(s.dn)return;if(d===t?s.due<=d:s.due===d)out.push(Object.assign({p,e},s))})})});return out.sort((a,b)=>a.due.localeCompare(b.due))}
function rvItem(x){const t=todayISO();const late=x.due<t?Math.round((parse(t)-parse(x.due))/864e5):0;
  return `<li><span class="jpill st-${x.st}">J${x.n}</span><span class="tt"><b>${esc(x.e.chapitre)}</b> <small>${esc(x.e.matiere||'')}</small>${late?` <span class="when late">+${late} j</span>`:''}</span><button type="button" class="btn ghost sm" data-rdone="${esc(x.e.id)}:${x.n}">Fait ✓</button></li>`}
function revisionView(p){
  const t=todayISO(),iv=ivs(p);const due=rvDue([p],t);
  const next=[...Array(7)].map((_,i)=>{const d=addDays(t,i+1);return {d,n:rvDue([p],d).length}});const mx=Math.max(1,...next.map(x=>x.n));
  const all=of(p.slug).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  const isFin=e=>iv.every(n=>e.done&&e.done[n]);const active=all.filter(e=>!isFin(e)),fin=all.filter(isFin);
  const groups={};active.forEach(e=>{const m=e.matiere||'Sans matière';(groups[m]=groups[m]||[]).push(e)});
  const row=e=>`<li class="row rrow${e.id===editId?' editing':''}"><div class="main"><div class="ttl">${esc(e.chapitre)}</div><div class="meta">J0 : ${esc(dayLabel(e.date))}${e.notes?' · '+esc(e.notes):''}</div><div class="jpills"><span class="jpill st-done" title="Appris le ${esc(frDate(e.date))}">J0</span>${iv.map(n=>{const s=rvState(e,n,t);return `<button type="button" class="jpill st-${s.st}" data-rpill="${esc(e.id)}:${n}" title="${s.dn?'Fait le '+esc(frDate(s.dn)):'Prévu le '+esc(frDate(s.due))}" aria-pressed="${!!s.dn}">J${n}<small>${esc(short(s.due))}</small></button>`}).join('')}</div></div>${rowActs(e)}</li>`;
  const mats=[...new Set(toList(spS(p,'matieres')).concat(all.map(e=>e.matiere).filter(Boolean)))];
  const e=editId?all.find(x=>x.id===editId):null;if(editId&&!e)editId=null;
  const form=`<form class="add sp" data-sp="revision" data-mod="${esc(p.slug)}" ${e?`data-edit="${esc(e.id)}"`:''} style="--c:${cv(p.color)}" novalidate><h2>${e?'Modifier le chapitre':'Nouveau chapitre'}</h2>
    <div class="field"><label for="rv-mat">Matière</label><input id="rv-mat" name="matiere" type="text" list="rv-mats" maxlength="50" value="${esc(e?e.matiere||'':'')}" placeholder="Choisis ou tape une matière" autocomplete="off"><datalist id="rv-mats">${mats.map(m=>`<option value="${esc(m)}"></option>`).join('')}</datalist></div>
    <div class="field"><label for="rv-ch">Titre du chapitre</label><input id="rv-ch" name="chapitre" type="text" maxlength="100" value="${esc(e?e.chapitre:'')}" placeholder="Ex. Ch. 3 — Lois continues" required></div>
    <div class="pair"><div class="field"><label for="rv-d">Appris le (J0)</label><input id="rv-d" name="date" type="date" value="${esc(e?e.date:t)}"></div><div class="field"><label for="rv-n">Notes</label><input id="rv-n" name="notes" type="text" maxlength="140" value="${esc(e&&e.notes||'')}" placeholder="Pages, exos…"></div></div>
    <p class="hint">Révisions prévues à ${iv.map(n=>'J'+n).join(', ')}. Modifiable dans « Modifier la page ».</p>
    <p class="err" hidden></p><div class="formbtns"><button class="btn" type="submit">${e?'Enregistrer':'Ajouter'}</button>${e?'<button class="btn ghost" type="button" id="editCancel">Annuler</button>':''}</div></form>`;
  const load=`<section class="panel"><h2>Charge à venir <small>7 prochains jours</small></h2><div class="wbars">${next.map(x=>`<div class="wb"><span class="wbn">${x.n||''}</span><span class="wbv" style="height:${x.n/mx*100}%"></span><span class="wbd">${JOURS[parse(x.d).getDay()]}</span></div>`).join('')}</div></section>`;
  return `<div class="split"><div class="stack">${form}${load}</div><section class="listpanel">${examsHTML(p)}<div class="sect">À revoir aujourd’hui <small>${due.length}</small></div>${due.length?`<ul class="tlist rv">${due.map(rvItem).join('')}</ul>`:'<p class="ras"><b>RAS</b> — rien à réviser aujourd’hui.</p>'}
    ${Object.keys(groups).sort((a,b)=>a.localeCompare(b,'fr')).map(m=>`<div class="sect">${esc(m)} <small>${groups[m].length} chapitre${groups[m].length>1?'s':''}</small></div><ul class="rows">${groups[m].map(row).join('')}</ul>`).join('')||(all.length?'':'<p class="ras">Ajoute ton premier chapitre : le jour où tu l’apprends devient J0, l’appli calcule les révisions.</p>')}
    ${fin.length?`<details class="donebox"><summary>Chapitres terminés (${fin.length})</summary><ul class="rows">${fin.map(row).join('')}</ul></details>`:''}
    <p class="hint">Touche une pastille pour la cocher ou la décocher. Vert : fait · orange : aujourd’hui · rouge : en retard.</p></section></div>`;
}

/* ---------------- Lectures ---------------- */
let bookYear=String(new Date().getFullYear());
const BSTAT=['Lu','En cours','À lire','Abandonné'];
const STARS=n=>{n=Math.round(num(n));return n?'★'.repeat(n)+'☆'.repeat(5-n):''};
function bookLi(e){
  const days=e.debut&&e.fin?Math.round((parse(e.fin)-parse(e.debut))/864e5)+1:0;
  return `<li class="row book${e.id===editId?' editing':''}"><div class="main"><div class="ttl">${esc(e.titre)}${num(e.note)?` <span class="stars" aria-label="${num(e.note)} sur 5">${STARS(e.note)}</span>`:''}</div><div class="meta">${esc([e.auteur,e.ref].filter(Boolean).join(' · '))}</div><div class="meta">${esc([e.debut?'commencé le '+frDate(e.debut):'',e.fin&&e.statut!=='En cours'?'fini le '+frDate(e.fin):'',days>0&&e.statut==='Lu'?'lu en '+days+' j':''].filter(Boolean).join(' · '))}</div>${e.avis?`<details class="bnotes"><summary>Mes notes</summary><p>${esc(e.avis)}</p></details>`:''}</div>${rowActs(e)}</li>`;
}
function livresView(p){
  const y=bookYear;const all=of(p.slug);
  const lus=all.filter(e=>e.statut==='Lu'&&String(e.fin||'').slice(0,4)===y).sort((a,b)=>String(b.fin).localeCompare(String(a.fin)));
  const cours=all.filter(e=>e.statut==='En cours'),alire=all.filter(e=>e.statut==='À lire'),ab=all.filter(e=>e.statut==='Abandonné');
  const goal=num(spS(p,'goal'));const nt=lus.filter(e=>num(e.note)>0);const avg=nt.length?nt.reduce((a,e)=>a+num(e.note),0)/nt.length:0;
  const e=editId?all.find(x=>x.id===editId):null;if(editId&&!e)editId=null;const v=(f,d)=>esc(e&&e[f]!=null&&e[f]!==''?e[f]:(d||''));
  const form=`<form class="add sp" data-sp="livres" data-mod="${esc(p.slug)}" ${e?`data-edit="${esc(e.id)}"`:''} style="--c:${cv(p.color)}" novalidate><h2>${e?'Modifier le livre':'Nouveau livre'}</h2>
    <div class="field"><label for="bk-t">Titre</label><input id="bk-t" name="titre" type="text" maxlength="120" value="${v('titre')}" required></div>
    <div class="pair"><div class="field"><label for="bk-a">Auteur</label><input id="bk-a" name="auteur" type="text" maxlength="80" value="${v('auteur')}"></div><div class="field"><label for="bk-s">Statut</label><select id="bk-s" name="statut">${BSTAT.map(s=>`<option${(e?e.statut:'Lu')===s?' selected':''}>${s}</option>`).join('')}</select></div></div>
    <div class="field"><label for="bk-r">Référence (édition, ISBN, année…)</label><input id="bk-r" name="ref" type="text" maxlength="120" value="${v('ref')}" placeholder="Ex. Folio, 2019 · ISBN 978-…"></div>
    <div class="pair"><div class="field"><label for="bk-d">Commencé le</label><input id="bk-d" name="debut" type="date" value="${v('debut')}"></div><div class="field"><label for="bk-f">Fini le</label><input id="bk-f" name="fin" type="date" value="${v('fin')}"></div></div>
    <div class="field"><label for="bk-n">Note</label><select id="bk-n" name="note">${[0,1,2,3,4,5].map(n=>`<option value="${n}"${num(e&&e.note)===n?' selected':''}>${n?STARS(n):'—'}</option>`).join('')}</select></div>
    <div class="field"><label for="bk-v">Mes notes</label><textarea id="bk-v" class="in" name="avis" rows="4" maxlength="2000" placeholder="Idées, passages, ce que j’en retiens…">${v('avis')}</textarea></div>
    <p class="err" hidden></p><div class="formbtns"><button class="btn" type="submit">${e?'Enregistrer':'Ajouter'}</button>${e?'<button class="btn ghost" type="button" id="editCancel">Annuler</button>':''}</div></form>`;
  const stat=(l,val,s)=>`<div class="stat"><span class="lbl">${l}</span><b>${val}</b>${s?`<small>${s}</small>`:''}</div>`;
  const head=`<div class="dnav"><button type="button" class="iconbtn" data-bnav="-1" aria-label="Année précédente">‹</button><span class="dlabel">Lectures ${esc(y)}</span><button type="button" class="iconbtn" data-bnav="1" aria-label="Année suivante">›</button></div>
    <div class="statgrid">${stat('Lus en '+esc(y),lus.length+(goal?' / '+goal:''),goal?`<span class="gtrack"><span style="width:${Math.min(100,Math.max(2,lus.length/goal*100))}%"></span></span>`:'')}${stat('En cours',cours.length)}${stat('Note moyenne',avg?nf.format(Math.round(avg*10)/10)+' / 5':'—')}${stat('À lire',alire.length)}</div>`;
  const sec=(t,l,emp)=>`<div class="sect">${t} <small>${l.length}</small></div>${l.length?`<ul class="rows">${l.map(bookLi).join('')}</ul>`:emp?`<p class="ras">${emp}</p>`:''}`;
  return `${head}<div class="split">${form}<section class="listpanel">${cours.length?sec('En cours',cours):''}${sec('Lus en '+esc(y),lus,'Aucun livre terminé cette année pour l’instant.')}${alire.length?sec('À lire',alire):''}${ab.length?`<details class="donebox"><summary>Abandonnés (${ab.length})</summary><ul class="rows">${ab.map(bookLi).join('')}</ul></details>`:''}</section></div>`;
}

/* ---------------- Liens & notes ---------------- */
let lq='';
function safeUrl(u){u=String(u||'').trim();if(!u)return '';if(!/^[a-z][a-z0-9+.-]*:/i.test(u))u='https://'+u;return /^(https?:|mailto:|tel:)/i.test(u)?u:''}
const hostOf=u=>{try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.hostname.replace(/^www\./,''):u.replace(/^(mailto|tel):/i,'')}catch(e){return ''}};
function lcard(e){const u=safeUrl(e.url);
  return `<article class="lcard${e.id===editId?' editing':''}">${u?`<a class="ltitle" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(e.titre)} <span aria-hidden="true">↗</span></a><span class="ldom">${esc(hostOf(u))}</span>`:`<b class="ltitle">${esc(e.titre)}</b>`}${e.note?`<p class="lnote">${esc(e.note)}</p>`:''}${rowActs(e,u?`<button class="del" type="button" data-copy="${esc(u)}" aria-label="Copier le lien" title="Copier le lien">⧉</button>`:'')}</article>`}
function liensBody(p){
  const cats=toList(spS(p,'cats'));let l=of(p.slug);
  if(lq){const w=fold(lq).split(/\s+/).filter(Boolean);l=l.filter(e=>{const h=fold([e.titre,e.url,e.cat,e.note].join(' '));return w.every(x=>h.includes(x))})}
  if(!l.length)return lq?'<p class="ras"><b>Aucun résultat.</b></p>':'<p class="ras"><b>RAS</b> — ajoute ton premier lien ou ta première note.</p>';
  const groups={};l.forEach(e=>{const c=e.cat||'Autre';(groups[c]=groups[c]||[]).push(e)});
  const order=[...cats.filter(c=>groups[c]),...Object.keys(groups).filter(c=>!cats.includes(c)).sort((a,b)=>a.localeCompare(b,'fr'))];
  return order.map(c=>`<div class="sect">${esc(c)} <small>${groups[c].length}</small></div><div class="lgrid">${groups[c].sort((a,b)=>String(a.titre).localeCompare(String(b.titre),'fr')).map(lcard).join('')}</div>`).join('');
}
function liensView(p){
  const all=of(p.slug);const cats=toList(spS(p,'cats'));
  const e=editId?all.find(x=>x.id===editId):null;if(editId&&!e)editId=null;const v=f=>esc(e&&e[f]||'');
  const form=`<form class="add sp" data-sp="liens" data-mod="${esc(p.slug)}" ${e?`data-edit="${esc(e.id)}"`:''} style="--c:${cv(p.color)}" novalidate><h2>${e?'Modifier':'Ajouter'}</h2>
    <div class="field"><label for="lk-t">Titre</label><input id="lk-t" name="titre" type="text" maxlength="80" value="${v('titre')}" placeholder="Ex. ENT Paul-Valéry, Moodle, Pronote…" required></div>
    <div class="field"><label for="lk-u">Adresse (facultatif)</label><input id="lk-u" name="url" type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="500" value="${v('url')}" placeholder="exemple.fr"></div>
    <div class="field"><label for="lk-c">Catégorie</label><input id="lk-c" name="cat" type="text" list="lk-cats" maxlength="40" value="${v('cat')||esc(cats[0]||'')}" autocomplete="off"><datalist id="lk-cats">${cats.map(c=>`<option value="${esc(c)}"></option>`).join('')}</datalist></div>
    <div class="field"><label for="lk-n">Note</label><textarea id="lk-n" class="in" name="note" rows="3" maxlength="2000" placeholder="Identifiant (pas le mot de passe), astuce, à quoi ça sert…">${v('note')}</textarea></div>
    <p class="err" hidden></p><div class="formbtns"><button class="btn" type="submit">${e?'Enregistrer':'Ajouter'}</button>${e?'<button class="btn ghost" type="button" id="editCancel">Annuler</button>':''}</div></form>`;
  return `<div class="split">${form}<section class="listpanel"><div class="tools"><input class="search" type="search" id="lq" placeholder="Chercher un lien ou une note…" value="${esc(lq)}" autocomplete="off" aria-label="Chercher"></div><div id="lbody">${liensBody(p)}</div></section></div>`;
}

/* ---------------- Budget : épargne et schémas ---------------- */
const workGain=(ym,from,to)=>{let g=0;live().filter(isWork).forEach(p=>{const mf=moneyF(p);of(p.slug).forEach(e=>{const d=String(e.date||'');if(ym?d.slice(0,7)===ym:(d>=from&&d<=to))g+=num(e[mf.k])})});return g};
const withWork=p=>!(p.settings&&(p.settings.withWork===false||p.settings.withWork==='false'));
function moneySplit(list){let dep=0,rev=0,epa=0;const cats={};list.forEach(e=>{const v=num(e.montant);if(e.sens==='Revenu')rev+=v;else if(e.sens==='Épargne')epa+=v;else{dep+=v;const c=e.categorie||'Autre';cats[c]=(cats[c]||0)+v}});return {dep,rev,epa,cats}}
function donut(parts,total,label){
  const R=56,C=2*Math.PI*R;let off=0;
  const segs=parts.map(([l,v,c])=>{const len=v/total*C;const gap=parts.length>1&&len>4?2:0;const s=`<circle r="${R}" cx="80" cy="80" fill="none" stroke="${c}" stroke-width="24" stroke-dasharray="${Math.max(0,len-gap)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)"><title>${esc(l)} : ${eur(v)}</title></circle>`;off+=len;return s}).join('');
  return `<svg viewBox="0 0 160 160" class="donut" role="img" aria-label="Répartition des dépenses"><circle r="${R}" cx="80" cy="80" fill="none" stroke="var(--sunk)" stroke-width="24"/>${segs}<text x="80" y="78" text-anchor="middle" class="dt1">${eur(total)}</text><text x="80" y="96" text-anchor="middle" class="dt2">${esc(label)}</text></svg>`;
}
function budgetSum(p,list,searching){
  const s=moneySplit(list);const w=withWork(p)&&!searching?workGain(month):0;const inc=s.rev+w;const reste=inc-s.dep-s.epa;
  let out=`<div class="sumline"><span>Revenus <b>${eur(inc)}</b></span><span>Dépenses <b>${eur(s.dep)}</b></span><span>Épargne <b>${eur(s.epa)}</b></span><span>Reste <b class="${reste>=0?'pos':'neg'}">${(reste>=0?'+':'')+eur(reste)}</b></span></div>`;
  if(w)out+=`<div class="sumline sub"><span>dont paies des boulots <b>${eur(w)}</b></span>${inc&&s.epa?`<span>Taux d’épargne <b>${Math.round(s.epa/inc*100)} %</b></span>`:''}</div>`;
  else if(inc&&s.epa)out+=`<div class="sumline sub"><span>Taux d’épargne <b>${Math.round(s.epa/inc*100)} %</b></span></div>`;
  {const R=recurOf(p);if(R.length)out+=`<div class="sumline sub"><span>Récurrentes : ${R.map(r=>esc(r.libelle||r.categorie)+' '+eur(r.montant)+' le '+r.jour).join(' · ')}</span></div>`}
  if(searching)return out;
  const catArr=Object.entries(s.cats).sort((a,b)=>b[1]-a[1]);const cols=catArr.map((c,i)=>cv(SERIES[i%SERIES.length]));
  const pie=catArr.length?`<div class="pie">${donut(catArr.map((c,i)=>[c[0],c[1],cols[i]]),s.dep,'dépensés')}<ul class="plegend">${catArr.map(([c,v],i)=>`<li><i style="background:${cols[i]}"></i><span>${esc(c)}</span><b>${eur(v)}</b><small>${Math.round(v/s.dep*100)} %</small></li>`).join('')}</ul></div>`:'<p class="ras">Pas encore de dépense ce mois-ci : le camembert apparaîtra ici.</p>';
  // 6 mois
  const [y,m]=month.split('-').map(Number);const months=[...Array(6)].map((_,i)=>{const d=new Date(y,m-1-5+i,1);return iso(d).slice(0,7)});
  const data=months.map(ym=>{const ms=moneySplit(of(p.slug).filter(e=>String(e.date||'').slice(0,7)===ym));return {ym,rev:ms.rev+(withWork(p)?workGain(ym):0),dep:ms.dep,epa:ms.epa}});
  const mx=Math.max(10,...data.flatMap(d=>[d.rev,d.dep,d.epa]));const W=440,H=210,L=40,B=22,gw=(W-L-6)/6,bw=gw*0.22;
  let g='';const stp=[0,.25,.5,.75,1];stp.forEach(f=>{const yy=H-B-f*(H-B-10);g+=`<line x1="${L}" x2="${W}" y1="${yy}" y2="${yy}" stroke="var(--line)"/><text x="${L-5}" y="${yy+4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${Math.round(mx*f)}</text>`});
  data.forEach((d,i)=>{const x0=L+i*gw+gw*0.12;[['rev','var(--good)','Revenus'],['dep','var(--bad)','Dépenses'],['epa','var(--k-bleu)','Épargne']].forEach(([k,c,l],j)=>{const v=d[k];const hh=v/mx*(H-B-10);if(v)g+=`<rect x="${x0+j*(bw+2)}" y="${H-B-hh}" width="${bw}" height="${hh}" rx="1.5" fill="${c}"><title>${l} ${esc(MOIS[+d.ym.slice(5)-1])} : ${eur(v)}</title></rect>`});
    g+=`<text x="${x0+bw*1.5+2}" y="${H-6}" text-anchor="middle" font-size="12" fill="${d.ym===month?'var(--ink)':'var(--muted)'}" font-family="IBM Plex Mono, monospace">${esc(MOISC[+d.ym.slice(5)-1])}</text>`});
  out+=`<div class="bcharts"><div><div class="sect">Répartition des dépenses <small>${esc(monthLabel())}</small></div>${pie}</div><div><div class="sect">6 derniers mois</div><div class="legend"><span><i style="background:var(--good)"></i>Revenus</span><span><i style="background:var(--bad)"></i>Dépenses</span><span><i style="background:var(--k-bleu)"></i>Épargne</span></div><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Revenus, dépenses et épargne sur 6 mois">${g}</svg></div></div>`;
  return out;
}

/* ---------------- Tableau de bord : aujourd’hui + nouvelles pages ---------------- */
function packHTML(){
  if(!pagesOk||!pagesReady)return '';const miss=missingPack();if(!miss.length||store_.get(packKey(),0))return '';
  return `<section class="panel pack"><h2>Nouvelles pages disponibles <small>v3</small></h2><p class="hint">Coche celles que tu veux. Tu pourras les renommer, les réordonner ou les supprimer ensuite.</p><div class="packlist">${miss.map(x=>`<label class="pk"><input type="checkbox" data-pack="${esc(x.slug)}" checked><i class="pdot" style="background:${cv(x.color)}"></i><span><b>${esc(x.name)}</b><small>${esc(TPL[x.template].desc)}</small></span></label>`).join('')}</div><div class="row-btns"><button class="btn" type="button" id="packAdd">Ajouter les pages cochées</button><button class="btn ghost" type="button" id="packNo">Plus tard</button></div></section>`;
}
function todayHTML(){
  const jp=firstTpl('jour'),rv=byTpl('revision'),ag=byTpl('agenda'),op=firstTpl('objectifs'),ls=byTpl('liste');
  if(!jp&&!rv.length&&!ag.length&&!op&&!ls.length)return '';
  const t=todayISO();const chips=[];
  if(jp){const e=dayOf(jp,t)||emptyDay(t);const td=e.todos||[];const must=td.filter(x=>x.lvl==='must');const c=chronoGet();
    chips.push([jp.slug,'À faire absolument',must.length?must.filter(x=>x.done).length+'/'+must.length:'—']);
    chips.push([jp.slug,'Humeur',e.mood?MOODS[e.mood-1][1]:'—']);
    chips.push([jp.slug,c?'Chrono en cours':'Travail aujourd’hui',c?`<span class="chronoT">${chronoTxt(c)}</span>`:esc(hm(e.travail))]);}
  if(op){const wk=isoWeek(t).key;const imp=of(op.slug).filter(e=>e.horizon==='semaine'&&e.periode===wk&&e.prio);if(imp.length)chips.push([op.slug,'Très important (semaine)',imp.filter(e=>e.fait).length+'/'+imp.length])}
  if(rv.length)chips.push([rv[0].slug,'Révisions du jour',String(rvDue(rv,t).length)]);
  if(ag.length)chips.push([ag[0].slug,'Agenda du jour',String(agItems(t,ag).length)]);
  ls.forEach(lp=>{const n=of(lp.slug).filter(e=>!e.done&&e.quand&&e.quand<=t).length;if(n)chips.push([lp.slug,lp.name+' (à faire)',String(n)])});
  {const ex=examsList()[0];if(ex){const dd=Math.round((parse(ex.date)-parse(t))/864e5);const rv0=byTpl('revision')[0];chips.unshift([rv0?rv0.slug:ex.src,'Prochain partiel',(dd===0?'Aujourd’hui':'J-'+dd)+' · '+esc(ex.titre)])}}
  return `<section class="todaybar">${jp?quoteHTML(t,'sm'):''}<div class="tchips">${chips.map(([s,l,v])=>`<button type="button" class="tchip" data-v="${esc(s)}"><span>${esc(l)}</span><b>${v}</b></button>`).join('')}</div></section>`;
}

/* ---------------- Dispatch ---------------- */
const SPV={jour:jourView,objectifs:objectifsView,agenda:agendaView,liste:listeView,revision:revisionView,livres:livresView,liens:liensView};
function spPage(p){
  const foot=`<div class="pagefoot"><span>Exporter (CSV) :</span><button class="link small" type="button" data-csv="all">Tout</button>${pagesOk&&p.id?`<button class="btn ghost" type="button" data-pedit="${esc(p.id)}">Modifier la page</button>`:''}</div>`;
  return `<div class="sp-page sp-${p.template}" style="--c:${cv(p.color)}">${SPV[p.template](p)}${foot}</div>`;
}
function spText(p,e){
  switch(p.template){
    case 'jour':{const td=e.todos||[];const m=td.filter(x=>x.lvl==='must');return `Journée${m.length?' · absolument '+m.filter(x=>x.done).length+'/'+m.length:''}${e.mood?' · '+MOODS[e.mood-1][1]:''}${num(e.travail)?' · '+hm(e.travail):''}${e.plus?' — '+e.plus:''}${e.bilan?' — '+e.bilan:''} ${td.map(x=>x.t).join(' ')}`}
    case 'objectifs':return `${(HZ.find(h=>h[0]===e.horizon)||['',''])[1]} · ${e.titre||''}${e.fait?' ✓':''}${e.prio?' ★':''}`;
    case 'agenda':return `${e.kind==='edt'?(DOW[(+e.jour||1)-1]+' (chaque semaine) '):''}${agTime(e)} ${e.titre||''}${e.lieu?' · '+e.lieu:''}${e.note?' · '+e.note:''}`;
    case 'liste':return `${e.t||''}${e.done?' ✓':''}${e.note?' · '+e.note:''}`;
    case 'revision':return `${e.matiere||''} · ${e.chapitre||''}${e.notes?' · '+e.notes:''}`;
    case 'livres':return `${e.titre||''}${e.auteur?' — '+e.auteur:''}${num(e.note)?' '+STARS(e.note):''} ${e.statut||''} ${e.ref||''} ${e.avis||''}`;
    case 'liens':return `${e.titre||''} ${e.url||''} ${e.cat||''} ${e.note||''}`;
  }return '';
}
const eDate=(p,e)=>p.template==='objectifs'?(e.horizon==='jour'?e.periode:''):p.template==='agenda'&&e.kind==='edt'?'':(e[dk(p)]||'');
function spCsv(p){
  const L=of(p.slug).slice();const yes=b=>b?'oui':'';
  switch(p.template){
    case 'jour':return [['Date','Humeur (1-5)','Productivité (1-5)','Énergie (1-5)','Sommeil (h)','Travail (h)','Absolument faits','Absolument total','Si j’ai le temps','Repos','Point positif','Bilan'],...L.sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(e=>{const td=e.todos||[];const m=td.filter(x=>x.lvl==='must');return [frDate(e.date),e.mood||'',e.prod||'',e.energie||'',num(e.sommeil)?csvNum(e.sommeil):'',csvNum(num(e.travail)/60),m.filter(x=>x.done).length,m.length,td.filter(x=>x.lvl==='bonus').map(x=>(x.done?'✓ ':'')+x.t).join(' | '),td.filter(x=>x.lvl==='repos').map(x=>(x.done?'✓ ':'')+x.t).join(' | '),e.plus||'',e.bilan||'']})];
    case 'objectifs':return [['Horizon','Période','Objectif','Atteint','Très important'],...L.sort((a,b)=>String(a.periode).localeCompare(String(b.periode))).map(e=>[(HZ.find(h=>h[0]===e.horizon)||['',e.horizon])[1],e.periode,e.titre,yes(e.fait),yes(e.prio)])];
    case 'agenda':return [['Type','Jour / date','Début','Fin','Titre','Lieu','Note','Du','Au'],...L.map(e=>[e.kind==='edt'?'Chaque semaine':'Événement',e.kind==='edt'?DOW[(+e.jour||1)-1]:frDate(e.date),e.debut||'',e.fin||'',e.titre,e.lieu||'',e.note||'',frDate(e.du),frDate(e.au)])];
    case 'liste':return [['Élément','Pour le','Fait','Note'],...L.sort(listSort).map(e=>[e.t,frDate(e.quand),yes(e.done),e.note||''])];
    case 'revision':{const iv=ivs(p);return [['Matière','Chapitre','J0',...iv.map(n=>'J'+n),'Notes'],...L.map(e=>[e.matiere||'',e.chapitre,frDate(e.date),...iv.map(n=>e.done&&e.done[n]?'fait le '+frDate(e.done[n]):'prévu le '+frDate(addDays(e.date,n))),e.notes||''])]}
    case 'livres':return [['Titre','Auteur','Référence','Statut','Commencé','Fini','Note /5','Notes'],...L.map(e=>[e.titre,e.auteur||'',e.ref||'',e.statut||'',frDate(e.debut),frDate(e.fin),num(e.note)||'',e.avis||''])];
    case 'liens':return [['Titre','Adresse','Catégorie','Note'],...L.map(e=>[e.titre,safeUrl(e.url),e.cat||'',e.note||''])];
  }return [];
}
function spRead(f,p){
  const g=n=>String((f.elements[n]||{}).value||'').trim();const fail=(t,n)=>({err:t,el:f.elements[n]});
  switch(f.dataset.sp){
    case 'agenda':{const kind=g('kind')==='edt'?'edt':'rdv';const o={kind,titre:g('titre'),lieu:g('lieu'),note:g('note'),debut:g('debut'),fin:g('fin')};
      if(!o.titre)return fail('Donne un titre.','titre');
      if(kind==='rdv'){o.date=g('date');if(!o.date)return fail('Choisis une date.','date');o.jour='';o.du='';o.au=''}
      else{o.jour=+g('jour')||1;o.du=g('du');o.au=g('au');o.date='';if(o.du&&o.au&&o.au<o.du)return fail('La date de fin doit être après la date de début.','au')}
      if(o.debut&&o.fin&&tmin(o.fin)<=tmin(o.debut))return fail('L’heure de fin doit être après le début.','fin');
      return {o}}
    case 'liste':{const o={t:g('t'),quand:g('quand'),note:g('note')};if(!o.t)return fail('Écris quelque chose à retenir.','t');return {o}}
    case 'revision':{const o={matiere:g('matiere'),chapitre:g('chapitre'),date:g('date')||todayISO(),notes:g('notes')};if(!o.chapitre)return fail('Donne le titre du chapitre.','chapitre');return {o}}
    case 'livres':{const o={titre:g('titre'),auteur:g('auteur'),ref:g('ref'),statut:BSTAT.includes(g('statut'))?g('statut'):'Lu',debut:g('debut'),fin:g('fin'),note:Math.min(5,Math.max(0,Math.round(num(g('note'))))),avis:String((f.elements.avis||{}).value||'').trim()};
      if(!o.titre)return fail('Donne le titre du livre.','titre');
      if(o.statut==='Lu'&&!o.fin)o.fin=todayISO();if(o.statut==='En cours'&&!o.debut)o.debut=todayISO();
      if(o.debut&&o.fin&&o.fin<o.debut)return fail('La date de fin doit être après le début.','fin');
      return {o}}
    case 'liens':{const o={titre:g('titre'),url:g('url'),cat:g('cat'),note:String((f.elements.note||{}).value||'').trim()};
      if(!o.titre)return fail('Donne un titre.','titre');if(o.url&&!safeUrl(o.url))return fail('Adresse non reconnue (elle doit commencer par https://).','url');
      if(o.url)o.url=safeUrl(o.url);return {o}}
  }
  return {err:'Formulaire inconnu.'};
}
async function spSubmit(f){
  const p=pageOf(f.dataset.mod);if(!p)return;const err=f.querySelector('.err');
  const r=spRead(f,p);if(r.err){err.textContent=r.err;err.hidden=false;if(r.el)r.el.focus();return}
  err.hidden=true;const btn=f.querySelector('button[type=submit]');btn.disabled=true;
  const editing=f.dataset.edit?entries.find(x=>x.id===f.dataset.edit):null;
  try{
    if(editing){await updEntry(editing.id,r.o);editId=null;toast('Modifié')}
    else{const o=Object.assign({mod:p.slug},r.o);if(p.template==='revision')o.done={};await addEntry(o);toast('Ajouté')}
    if(p.template==='agenda'&&r.o.kind==='rdv'&&monday(r.o.date)!==monday(wkDate))wkDate=r.o.date;
    if(p.template==='livres'&&r.o.statut==='Lu'&&r.o.fin)bookYear=r.o.fin.slice(0,4);
    skipKeep=true;render();
  }catch(x){err.textContent=frErr(x);err.hidden=false;btn.disabled=false}
}
function spSettingsHTML(d){
  const s=d.settings||{};const val=k=>{const v=s[k]!=null?s[k]:(SP_DEF[d.template]||{})[k];return Array.isArray(v)?v.join('\n'):(v==null?'':String(v))};
  const box=(title,sub,body)=>`<section class="panel"><h2>${title} <small>${sub}</small></h2>${body}</section>`;
  switch(d.template){
    case 'jour':return box('Citation du jour','une nouvelle chaque jour',`<p class="hint">Ajoute tes propres citations, une par ligne, au format « texte — auteur ». Elles passent en premier.</p><textarea class="in" id="ed-quotes" data-ds="quotes" rows="6" placeholder="Le succès, c’est tomber sept fois et se relever huit. — Proverbe japonais">${esc(val('quotes'))}</textarea><label class="chk"><input type="checkbox" data-ds="onlyMine" ${s.onlyMine===true||s.onlyMine==='true'?'checked':''}> N’afficher que mes citations</label>`)+box('Pomodoro','durées en minutes',`<div class="pair3"><div class="field"><label for="ed-pw">Travail</label><input class="in" id="ed-pw" data-ds="pomoW" type="number" min="5" max="180" inputmode="numeric" value="${esc(s.pomoW||25)}"></div><div class="field"><label for="ed-pb">Pause</label><input class="in" id="ed-pb" data-ds="pomoB" type="number" min="1" max="60" inputmode="numeric" value="${esc(s.pomoB||5)}"></div><div class="field"><label for="ed-pl">Longue pause (toutes les 4)</label><input class="in" id="ed-pl" data-ds="pomoL" type="number" min="1" max="90" inputmode="numeric" value="${esc(s.pomoL||15)}"></div></div><p class="hint">Un bip et une vibration à chaque fin de période quand l’appli est ouverte. Le temps de travail s’ajoute tout seul à Ma journée.</p>`);
    case 'revision':return box('Méthode des J','intervalles et matières',`<div class="field"><label for="ed-int">Jours de révision après J0</label><input class="in" id="ed-int" data-ds="intervals" value="${esc(val('intervals').replace(/\n/g,', '))}" placeholder="1, 3, 7, 14, 30" inputmode="numeric"></div><p class="hint">« 1, 3, 7, 14, 30 » = révisions à J1, J3, J7, J14 et J30.</p><div class="field"><label for="ed-mat">Matières (une par ligne)</label><textarea class="in" id="ed-mat" data-ds="matieres" rows="7">${esc(val('matieres'))}</textarea></div>`);
    case 'livres':return box('Objectif lecture','par an',`<div class="field"><label for="ed-goal">Livres à lire dans l’année</label><input class="in" id="ed-goal" data-ds="goal" type="number" min="0" step="1" inputmode="numeric" value="${esc(val('goal'))}"></div>`);
    case 'liens':return box('Catégories','dans l’ordre d’affichage',`<div class="field"><label for="ed-cats">Une par ligne</label><textarea class="in" id="ed-cats" data-ds="cats" rows="6">${esc(val('cats'))}</textarea></div>`);
    case 'agenda':return box('Grille de la semaine','heures affichées',`<div class="pair"><div class="field"><label for="ed-h0">Début (h)</label><input class="in" id="ed-h0" data-ds="h0" type="number" min="0" max="23" value="${esc(val('h0'))}"></div><div class="field"><label for="ed-h1">Fin (h)</label><input class="in" id="ed-h1" data-ds="h1" type="number" min="1" max="24" value="${esc(val('h1'))}"></div></div><p class="hint">La grille s’agrandit toute seule si un créneau dépasse.</p>`);
    default:return box('Réglages','',`<p class="hint">Rien à régler pour ce type de page : choisis juste le nom et la couleur.</p>`);
  }
}
function argentSetHTML(d){const on=!(d.settings&&(d.settings.withWork===false||d.settings.withWork==='false'));
  return `<section class="panel"><h2>Revenus <small>calcul du reste</small></h2><label class="chk"><input type="checkbox" data-ds="withWork" ${on?'checked':''}> Compter les paies des Boulots dans les revenus</label><p class="hint">Les montants « Gagné » de la page Boulots s’ajoutent aux revenus du budget, sans les saisir deux fois.</p></section>`}
function spNorm(t,s){
  const o={};
  if(t==='jour'){o.quotes=toList(s.quotes);o.onlyMine=s.onlyMine===true||s.onlyMine==='true';const cl=(v,a,b,d)=>{v=Math.round(num(v));return v>=a&&v<=b?v:d};o.pomoW=cl(s.pomoW,5,180,25);o.pomoB=cl(s.pomoB,1,60,5);o.pomoL=cl(s.pomoL,1,90,15)}
  if(t==='revision'){const iv=(Array.isArray(s.intervals)?s.intervals:String(s.intervals==null?'':s.intervals).split(/[^0-9]+/)).map(Number).filter(n=>n>0&&n<1000);o.intervals=[...new Set(iv)].sort((a,b)=>a-b);if(!o.intervals.length)o.intervals=SP_DEF.revision.intervals.slice();o.matieres=toList(s.matieres)}
  if(t==='livres')o.goal=Math.max(0,Math.round(num(s.goal)));
  if(t==='liens')o.cats=toList(s.cats);
  if(t==='agenda'){let a=s.h0===''||s.h0==null?8:Math.round(num(s.h0)),b=s.h1===''||s.h1==null?20:Math.round(num(s.h1));if(!(a>=0&&a<24))a=8;if(!(b>a&&b<=24))b=Math.min(24,Math.max(a+1,20));o.h0=a;o.h1=b}
  return o;
}
async function spClick(t){
  if(await v4Click(t))return true;
  const ds=t.dataset;const P=()=>pageOf(view);
  if(t.id==='packNo'){store_.set(packKey(),1);render();return true}
  if(t.id==='packAdd'){const sl=[...document.querySelectorAll('[data-pack]')].filter(x=>x.checked).map(x=>x.dataset.pack);if(!sl.length){toast('Coche au moins une page.');return true}
    t.disabled=true;try{const n=await installPack(sl);toast(n+' page'+(n>1?'s':'')+' ajoutée'+(n>1?'s':''));if(sl.includes('jour'))go('jour');else render()}catch(x){t.disabled=false;toast(frErr(x))}return true}
  if(t.id==='packAgain'){store_.del(packKey());go('bord');return true}
  // Ma journée
  if(ds.jnav!=null){jourDate=ds.jnav==='0'?todayISO():addDays(jourDate,+ds.jnav);skipKeep=true;render();return true}
  if(ds.jgo){jourDate=ds.jgo;skipKeep=true;render();window.scrollTo({top:0,behavior:'smooth'});return true}
  const jp=P()&&P().template==='jour'?P():firstTpl('jour');
  if(ds.jt&&jp){const id=ds.jt;saveDay(jp,jourDate,b=>({todos:b.todos.map(x=>x.id===id?Object.assign({},x,{done:!x.done}):x)}));return true}
  if(ds.jtdel&&jp){const id=ds.jtdel;saveDay(jp,jourDate,b=>({todos:b.todos.filter(x=>x.id!==id)}));return true}
  if(ds.jtmove&&jp){const id=ds.jtmove;const d=jourDate;const e=dayOf(jp,d);const x=e&&(e.todos||[]).find(y=>y.id===id);if(!x)return true;
    await saveDay(jp,addDays(d,1),b=>({todos:b.todos.concat([Object.assign({},x,{id:uid8(),done:false})])}),true);await saveDay(jp,d,b=>({todos:b.todos.filter(y=>y.id!==id)}));toast('Reporté à demain');return true}
  if(ds.jcarry&&jp){const d=jourDate;const e=dayOf(jp,d);const mv=(e&&e.todos||[]).filter(x=>!x.done&&x.lvl!=='repos');if(!mv.length)return true;
    await saveDay(jp,addDays(d,1),b=>({todos:b.todos.concat(mv.map(x=>Object.assign({},x,{id:uid8(),done:false})))}),true);const ids=new Set(mv.map(x=>x.id));await saveDay(jp,d,b=>({todos:b.todos.filter(y=>!ids.has(y.id))}));toast(mv.length+' tâche'+(mv.length>1?'s':'')+' reportée'+(mv.length>1?'s':'')+' à demain');return true}
  if(ds.jmood&&jp){const v=+ds.jmood;saveDay(jp,jourDate,b=>({mood:b.mood===v?0:v}));return true}
  if(ds.jprod&&jp){const v=+ds.jprod;saveDay(jp,jourDate,b=>({prod:num(b.prod)===v?0:v}));return true}
  if(ds.jwork&&jp){const v=+ds.jwork;saveDay(jp,jourDate,b=>({travail:Math.max(0,num(b.travail)+v)}));return true}
  if(ds.chrono&&jp){
    if(ds.chrono==='start'||ds.chrono==='pomo'){const now=Date.now();const c={start:now,date:todayISO(),slug:jp.slug};
      if(ds.chrono==='pomo'){Object.assign(c,{mode:'pomo',phase:'work',ps:now,n:0});try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.resume)audioCtx.resume()}catch(e){}try{if(window.Notification&&Notification.permission==='default')Notification.requestPermission()}catch(e){}}
      store_.set(chronoKey(),c);render();const pc=pomoCfg();toast(ds.chrono==='pomo'?`Pomodoro lancé : ${pc.w} min de travail puis ${pc.b} min de pause.`:'Chrono lancé : il continue même si tu fermes l’appli.');return true}
    const c=chronoGet();store_.del(chronoKey());if(!c){render();return true}
    if(c.mode==='pomo'){const r=pomoAdvance(c);let mn=r.add;if(c.phase==='work')mn+=Math.floor((Date.now()-c.ps)/60000);const pp=pageOf(c.slug)||jp;if(mn<1){render();toast('Pomodoro arrêté.');return true}await saveDay(pp,c.date,b=>({travail:num(b.travail)+mn}));toast(`Pomodoro arrêté : +${hm(mn)} de travail`);return true}
    let min=Math.round((Date.now()-c.start)/60000);let capped=false;if(min>720){min=720;capped=true}
    const p=pageOf(c.slug)||jp;if(min<1){render();toast('Moins d’une minute : rien ajouté.');return true}
    await saveDay(p,c.date,b=>({travail:num(b.travail)+min}));toast(`+${hm(min)} de travail${capped?' (limité à 12 h)':''}`);return true}
  // Objectifs
  if(ds.onav!=null){objDate=ds.onav==='0'?todayISO():addDays(objDate,+ds.onav);skipKeep=true;render();return true}
  if(ds.otick){const e=entries.find(x=>x.id===ds.otick);if(e)patchE(e.id,{fait:!e.fait});return true}
  if(ds.ostar){const e=entries.find(x=>x.id===ds.ostar);if(e)patchE(e.id,{prio:!e.prio});return true}
  if(ds.omove){const e=entries.find(x=>x.id===ds.omove);if(!e)return true;const nd=perShift(e.horizon,perStart(e.horizon,e.periode),1);patchE(e.id,{periode:perKey(e.horizon,nd)},'Reporté : '+perLabel(e.horizon,perStart(e.horizon,perKey(e.horizon,nd))));return true}
  if(ds.ocarry){const p=P();if(!p)return true;const h=ds.ocarry;const k=perKey(h,objDate),pk=perKey(h,perShift(h,objDate,-1));const l=of(p.slug).filter(e=>e.horizon===h&&e.periode===pk&&!e.fait);
    try{for(const e of l)await updEntry(e.id,{periode:k});render();toast(l.length+' objectif'+(l.length>1?'s':'')+' repris')}catch(x){toast(frErr(x))}return true}
  // Listes
  if(ds.ltick){const e=entries.find(x=>x.id===ds.ltick);if(e)patchE(e.id,{done:!e.done,doneAt:e.done?'':todayISO()});return true}
  if(ds.lclear){if(!t.classList.contains('armed')){t.classList.add('armed','danger');t.textContent='Confirmer : tout effacer';setTimeout(()=>{if(t.isConnected){t.classList.remove('armed','danger');t.textContent='Effacer les cochés'}},4000);return true}
    const l=of(ds.lclear).filter(e=>e.done);try{for(const e of l)await delEntry(e.id);render();toast(l.length+' élément'+(l.length>1?'s':'')+' effacé'+(l.length>1?'s':''))}catch(x){toast(frErr(x))}return true}
  // Révisions
  if(ds.rdone||ds.rpill){const [id,n]=(ds.rdone||ds.rpill).split(':');const e=entries.find(x=>x.id===id);if(!e)return true;const done=Object.assign({},e.done||{});
    if(ds.rpill&&done[n])delete done[n];else done[n]=todayISO();patchE(id,{done},ds.rdone?'Révision J'+n+' faite ✓':'');return true}
  // Agenda
  if(ds.wnav!=null){wkDate=ds.wnav==='0'?todayISO():addDays(wkDate,+ds.wnav);skipKeep=true;render();return true}
  if(ds.agics){const e=entries.find(x=>x.id===ds.agics);if(e)saveFile(slugify(e.titre)+'.ics',agIcs([e]),'text/calendar;charset=utf-8');return true}
  if(ds.agicsall){const l=of(ds.agicsall).filter(e=>e.kind==='edt');if(l.length)saveFile('emploi-du-temps.ics',agIcs(l),'text/calendar;charset=utf-8');return true}
  // Lectures
  if(ds.bnav){bookYear=String(+bookYear+(+ds.bnav));render();return true}
  // Liens
  if(ds.copy){try{await navigator.clipboard.writeText(ds.copy);toast('Lien copié')}catch(x){toast('Copie impossible sur cet appareil.')}return true}
  return false;
}
function spChange(t){
  if(v4Change(t))return true;
  if(t.id==='jdate'){jourDate=t.value||todayISO();skipKeep=true;render();return true}
  if(t.id==='odate'){objDate=t.value||todayISO();skipKeep=true;render();return true}
  if(t.id==='ag-kind'){agKind=t.value==='edt'?'edt':'rdv';const f=t.closest('form');if(f){f.classList.remove('k-rdv','k-edt');f.classList.add('k-'+agKind)}return true}
  const jp=pageOf(view);
  if(jp&&jp.template==='jour'){
    if(t.id==='jbilan'||t.id==='jplus'){const k=t.id==='jbilan'?'bilan':'plus';const v=t.value.trim();t.dataset.dirty='';saveDay(jp,jourDate,b=>(b[k]||'')===v?null:{[k]:v},true).then(()=>{const h=t.closest('.panel');const s=h&&h.querySelector('h2 small');if(s)s.textContent='enregistré'});return true}
    if(t.id==='jwork'){const h=Math.max(0,num(t.value));saveDay(jp,jourDate,()=>({travail:Math.round(h*60)}));return true}
  }
  return false;
}
async function spAddForm(f){
  const inp=f.querySelector('input');const txt=inp.value.trim();if(!txt){inp.focus();return}
  const p=pageOf(f.dataset.mod);if(!p)return;const fid=inp.id;
  if(f.classList.contains('tadd')){const lvl=f.dataset.lvl;skipKeep=true;await saveDay(p,jourDate,b=>({todos:b.todos.concat([{id:uid8(),t:txt,lvl,done:false}])}))}
  else{const h=f.dataset.h;try{await addEntry({mod:p.slug,titre:txt,horizon:h,periode:perKey(h,objDate),fait:false,prio:false});skipKeep=true;render()}catch(x){toast(frErr(x));return}}
  const el=document.getElementById(fid);if(el){el.value='';try{el.focus({preventScroll:true})}catch(e){}}
}

/* =================== v4 =================== */
/* 1. Barre de navigation du bas (téléphone) */
function renderBnav(){
  const nav=$('#bnav'),sh=$('#sheet');if(!nav)return;
  if(!user||(locked&&!pinAction)){nav.hidden=true;sh.hidden=true;return}
  nav.hidden=false;
  const cur=view.startsWith('edit:')?'':view;const top=live().slice(0,3);
  const item=(k,l,c)=>`<button type="button" class="bn${k===cur?' on':''}" data-v="${esc(k)}" style="--dot:${c}"><i aria-hidden="true"></i><span>${esc(l)}</span></button>`;
  const inTop=cur==='bord'||top.some(p=>p.slug===cur);const cp=pageOf(cur);
  nav.innerHTML=item('bord','Accueil','var(--ink)')+top.map(p=>item(p.slug,p.name,cv(p.color))).join('')+`<button type="button" class="bn more${!inTop?' on':''}" id="bnavAll" aria-expanded="${!sh.hidden}"><i class="burger" aria-hidden="true"></i><span>${!inTop&&cp&&!cp.archived?esc(cp.name):!inTop&&view==='bilan'?'Bilan':!inTop&&view==='reglages'?'Réglages':'Toutes'}</span></button>`;
}
function renderSheet(){
  const L=live();
  $('#sheet').innerHTML=`<div class="sheetbox" role="dialog" aria-modal="true" aria-label="Toutes les pages"><div class="sheethead"><b>Toutes les pages</b><button type="button" class="iconbtn" id="sheetClose" aria-label="Fermer">✕</button></div><div class="sheetgrid">${[['bord','Tableau de bord','var(--ink)'],...L.map(p=>[p.slug,p.name,cv(p.color)])].map(([k,l,c])=>`<button type="button" class="sg${k===view?' on':''}" data-v="${esc(k)}" style="--dot:${c}"><i aria-hidden="true"></i>${esc(l)}</button>`).join('')}</div><div class="sheetgrid">${'<button type="button" class="sg plain" data-v="bilan">Bilan du mois</button><button type="button" class="sg plain" data-v="reglages">Réglages</button>'}${pagesOk&&pagesReady?'<button type="button" class="sg plain" data-v="edit:new">＋ Nouvelle page</button>':''}</div><p class="hint">Les 3 premières pages vont dans la barre du bas : change l’ordre dans Réglages → Pages.</p></div>`;
}
document.addEventListener('click',ev=>{if(ev.target&&ev.target.id==='sheet'){$('#sheet').hidden=true;renderBnav()}});

/* 2. Récurrentes du budget */
const recurOf=p=>Array.isArray(p.settings&&p.settings.recur)?p.settings.recur:[];
function normRecur(list){return (Array.isArray(list)?list:[]).filter(r=>String(r.libelle||'').trim()||num(r.montant)>0).map(r=>({id:r.id||uid8(),libelle:String(r.libelle||'').trim(),montant:Math.round(num(r.montant)*100)/100,sens:['Dépense','Revenu','Épargne'].includes(r.sens)?r.sens:'Dépense',categorie:r.categorie||'Autre',jour:Math.min(28,Math.max(1,Math.round(num(r.jour))||1))}))}
let recBusy=false;
async function runRecurring(){
  if(recBusy||!pagesOk||!user)return;recBusy=true;let any=0;
  try{
    const t=todayISO(),ym=t.slice(0,7),day=+t.slice(8);
    for(const p of live().filter(p=>p.template==='argent'&&p.id)){
      const rec=recurOf(p).filter(r=>num(r.montant)>0);if(!rec.length)continue;
      const done=Object.assign({},p.settings.recDone||{});let changed=false;
      for(const r of rec){
        const jd=Math.min(28,Math.max(1,Math.round(num(r.jour))||1));if(day<jd)continue;
        const l=Array.isArray(done[r.id])?done[r.id]:[];if(l.includes(ym))continue;
        const o={mod:p.slug,date:ym+'-'+pad(jd),sens:r.sens||'Dépense',montant:num(r.montant),categorie:r.categorie||'Autre',libelle:r.libelle||'',rec:r.id};
        p.fields.forEach(f=>{if(o[f.k]===undefined&&f.type!=='photo')o[f.k]=f.type==='number'?0:''});
        await addEntry(o);done[r.id]=l.concat([ym]).slice(-24);changed=true;any++;
      }
      if(changed)await updatePage(p,{settings:Object.assign({},p.settings,{recDone:done})});
    }
  }catch(e){}finally{recBusy=false}
  if(any){toast(any+' opération'+(any>1?'s':'')+' récurrente'+(any>1?'s':'')+' ajoutée'+(any>1?'s':'')+' au budget');softRender()}
}
function recurHTML(d){
  if(!Array.isArray(d.settings.recur))d.settings.recur=[];const R=d.settings.recur;
  const cf=d.fields.find(f=>f.k==='categorie');const cats=cf?draftOpts(cf):['Autre'];
  return `<section class="panel"><h2>Récurrentes <small>ajoutées chaque mois</small></h2><p class="hint">Loyer, abonnements, bourse… ajoutés tout seuls le jour choisi (1 à 28), une fois par mois. Si tu supprimes l’entrée d’un mois, elle ne revient pas.</p>
    ${R.map((r,i)=>`<div class="rcrow"><input class="in" id="ed-rc${i}-l" data-rc="${i}" data-rp="libelle" value="${esc(r.libelle||'')}" placeholder="Ex. Loyer CROUS" aria-label="Libellé" maxlength="60"><input class="in" id="ed-rc${i}-m" data-rc="${i}" data-rp="montant" type="number" step="0.01" min="0" inputmode="decimal" value="${esc(r.montant==null?'':r.montant)}" placeholder="€" aria-label="Montant"><select class="in" id="ed-rc${i}-s" data-rc="${i}" data-rp="sens" aria-label="Sens">${['Dépense','Revenu','Épargne'].map(x=>`<option${(r.sens||'Dépense')===x?' selected':''}>${x}</option>`).join('')}</select><select class="in" id="ed-rc${i}-c" data-rc="${i}" data-rp="categorie" aria-label="Catégorie">${[...new Set(cats.concat(r.categorie?[r.categorie]:[]))].map(x=>`<option${r.categorie===x?' selected':''}>${esc(x)}</option>`).join('')}</select><label class="rcday">le <input class="in" id="ed-rc${i}-j" data-rc="${i}" data-rp="jour" type="number" min="1" max="28" inputmode="numeric" value="${esc(r.jour||1)}" aria-label="Jour du mois"></label><button type="button" class="del" data-rcdel="${i}" aria-label="Retirer">✕</button></div>`).join('')}
    <div><button type="button" class="btn ghost" id="rcAdd">＋ Ajouter une récurrente</button></div></section>`;
}

/* 3. Sommeil, énergie et nuits de sécu */
function nightDates(){const N=new Set();live().filter(p=>p.template==='journal').forEach(p=>{const ks=p.fields.filter(f=>f.type==='select'||f.type==='text').map(f=>f.k);of(p.slug).forEach(e=>{if(e.date&&ks.some(k=>/\bnuit\b/.test(fold(e[k]))))N.add(e.date)})});return N}
function nightInsight(list){
  const N=nightDates();if(!N.size)return '';
  const A=list.filter(e=>N.has(addDays(e.date,-1))),O=list.filter(e=>!N.has(addDays(e.date,-1)));
  const avg=(l,k)=>{const x=l.filter(e=>num(e[k])>0);return x.length?x.reduce((a,e)=>a+num(e[k]),0)/x.length:0};
  const f=v=>v?nf.format(Math.round(v*10)/10):'—';
  const ma=avg(A,'mood'),mo=avg(O,'mood');if(!ma||!mo)return '';
  const ea=avg(A,'energie'),eo=avg(O,'energie'),sa=avg(A,'sommeil'),so=avg(O,'sommeil');
  const diff=ma-mo;
  return `<div class="insight"><b>Après une nuit de sécu</b> (${A.filter(e=>e.mood>0).length} j) : humeur ${moodEm(ma)} ${f(ma)}${ea?' · énergie '+f(ea):''}${sa?' · sommeil '+f(sa)+' h':''} <span class="vs">— les autres jours : ${moodEm(mo)} ${f(mo)}${eo?' · énergie '+f(eo):''}${so?' · sommeil '+f(so)+' h':''}</span>${Math.abs(diff)>=0.5?`<small>${diff<0?'Ton humeur baisse nettement le lendemain d’une nuit : prévois des journées plus légères.':'Les lendemains de nuit ne pèsent pas sur ton humeur.'}</small>`:''}</div>`;
}
function sleepStats(list){
  const st=(l,v,s)=>`<div class="stat"><span class="lbl">${l}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`;
  const sl=list.filter(e=>num(e.sommeil)>0),en=list.filter(e=>num(e.energie)>0);
  const as=sl.length?sl.reduce((a,e)=>a+num(e.sommeil),0)/sl.length:0,ae=en.length?en.reduce((a,e)=>a+num(e.energie),0)/en.length:0;
  return st('Sommeil moyen',as?nf.format(Math.round(as*10)/10)+' h':'—',sl.length?sl.filter(e=>num(e.sommeil)<7).length+' nuit(s) < 7 h':'')+st('Énergie moyenne',ae?nf.format(Math.round(ae*10)/10)+'/5':'—');
}
function sleepSvg(map,ym,n){
  const vals=[];for(let k=1;k<=n;k++){const e=map[ym+'-'+pad(k)];vals.push(e?num(e.sommeil):0)}
  if(!vals.some(v=>v))return '';
  const W=640,H=110,L=30,B=18,bw=(W-L-4)/n,top=12;const yv=v=>H-B-(v/top)*(H-B-6);
  let g='';[0,4,8,12].forEach(v=>{g+=`<line x1="${L}" x2="${W}" y1="${yv(v)}" y2="${yv(v)}" stroke="var(--line)"${v===8?' stroke-dasharray="4 3"':''}/><text x="${L-5}" y="${yv(v)+4}" text-anchor="end" font-size="10" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${v}h</text>`});
  vals.forEach((v,i)=>{if(!v)return;const x=L+i*bw+bw*0.15;g+=`<rect x="${x}" y="${yv(Math.min(v,top))}" width="${bw*0.7}" height="${H-B-yv(Math.min(v,top))}" rx="1.5" fill="${v<7?'var(--warn)':'var(--k-bleu)'}"><title>${i+1} : ${nf.format(v)} h de sommeil</title></rect>`});
  return `<div class="sect sm">Sommeil <small>pointillés = 8 h · orange = moins de 7 h</small></div><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Heures de sommeil par jour">${g}</svg>`;
}

/* 4. Pomodoro */
const pomoCfg=()=>{const p=firstTpl('jour');const g=(k,d)=>{const v=Math.round(num(p&&p.settings&&p.settings[k]));return v>0&&v<=180?v:d};return {w:g('pomoW',25),b:g('pomoB',5),l:g('pomoL',15)}};
let audioCtx=null;
function beep(){
  try{if(audioCtx){const t=audioCtx.currentTime;[0,0.3].forEach(dt=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=880;o.connect(g);g.connect(audioCtx.destination);g.gain.setValueAtTime(0.0001,t+dt);g.gain.exponentialRampToValueAtTime(0.3,t+dt+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+dt+0.25);o.start(t+dt);o.stop(t+dt+0.3)})}}catch(e){}
  try{if(navigator.vibrate)navigator.vibrate([200,100,200])}catch(e){}
}
function notify(msg){toast(msg);beep();try{if(document.hidden&&window.Notification&&Notification.permission==='granted')new Notification('Main courante',{body:msg})}catch(e){}}
const phaseDur=(c,cfg)=>(c.phase==='work'?cfg.w:((c.n||0)>0&&(c.n||0)%4===0?cfg.l:cfg.b))*60000;
function pomoAdvance(c){
  const cfg=pomoCfg();let add=0,msg='',changed=false,guard=0;
  while(Date.now()-c.ps>=phaseDur(c,cfg)&&guard<200){
    guard++;const d=phaseDur(c,cfg);
    if(c.phase==='work'){add+=cfg.w;c.n=(c.n||0)+1;c.phase='break';msg=`Pomodoro ${c.n} terminé : pause de ${c.n%4===0?cfg.l:cfg.b} min`}
    else{c.phase='work';msg='Pause finie : on reprend'}
    c.ps+=d;changed=true;
  }
  return {add,msg,changed};
}
let pomoLock=false;
async function pomoTick(){
  const c=chronoGet();if(!c||c.mode!=='pomo'||pomoLock)return;
  const r=pomoAdvance(c);if(!r.changed)return;
  pomoLock=true;store_.set(chronoKey(),c);
  try{if(r.add){const p=pageOf(c.slug)||firstTpl('jour');if(p)await saveDay(p,c.date,b=>({travail:num(b.travail)+r.add}),true)}notify(r.msg);softRender()}finally{pomoLock=false}
}

/* 5. Bilan du mois */
function bilanView(){
  const ym=month,L=live(),t=todayISO();const [y,m]=ym.split('-').map(Number);const n=new Date(y,m,0).getDate();const inM=s=>String(s||'').slice(0,7)===ym;
  const stat=(l,v,s)=>`<div class="stat"><span class="lbl">${l}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`;
  const sec=(title,body,color)=>body?`<section class="panel bsec" style="--c:${color||'var(--ink)'}"><h2>${title}</h2>${body}</section>`:'';
  const f1=v=>nf.format(Math.round(v*10)/10);
  const parts=[];
  const works=L.filter(isWork);
  if(works.length){let h=0,g=0,nb=0;const by={};
    works.forEach(p=>{const hf=hourF(p),mf=moneyF(p),sf=firstSel(p);of(p.slug).filter(e=>inM(e.date)).forEach(e=>{nb++;h+=num(e[hf.k]);g+=num(e[mf.k]);const k=sf&&e[sf.k]?e[sf.k]:p.name;by[k]=by[k]||{h:0,g:0,n:0};by[k].h+=num(e[hf.k]);by[k].g+=num(e[mf.k]);by[k].n++})});
    if(nb)parts.push(sec('Boulots',`<div class="statgrid">${stat('Heures',nf.format(h)+' h',nb+' shift'+(nb>1?'s':''))}${stat('Gagné',eur(g),h?eur(g/h)+' / h en moyenne':'')}</div><table class="btable"><thead><tr><th>Boulot</th><th>Shifts</th><th>Heures</th><th>Gagné</th></tr></thead><tbody>${Object.entries(by).map(([k,o])=>`<tr><td>${esc(k)}</td><td>${o.n}</td><td>${nf.format(o.h)} h</td><td>${eur(o.g)}</td></tr>`).join('')}</tbody></table>`,cv(works[0].color)))}
  byTpl('argent').forEach(p=>{const list=of(p.slug).filter(e=>inM(e.date));const s=moneySplit(list);const w=withWork(p)?workGain(ym):0;const inc=s.rev+w;if(!list.length&&!w)return;const reste=inc-s.dep-s.epa;
    const ca=Object.entries(s.cats).sort((a,b)=>b[1]-a[1]);const cols=ca.map((c,i)=>cv(SERIES[i%SERIES.length]));
    parts.push(sec(esc(p.name),`<div class="statgrid">${stat('Revenus',eur(inc),w?'dont paies '+eur(w):'')}${stat('Dépenses',eur(s.dep))}${stat('Épargne',eur(s.epa),inc&&s.epa?Math.round(s.epa/inc*100)+' % des revenus':'')}${stat('Reste',(reste>=0?'+':'')+eur(reste))}</div>${ca.length?`<div class="pie">${donut(ca.map((c,i)=>[c[0],c[1],cols[i]]),s.dep,'dépensés')}<ul class="plegend">${ca.map(([c,v],i)=>`<li><i style="background:${cols[i]}"></i><span>${esc(c)}</span><b>${eur(v)}</b><small>${Math.round(v/s.dep*100)} %</small></li>`).join('')}</ul></div>`:''}`,cv(p.color)))});
  const jp=firstTpl('jour');
  if(jp){const je=of(jp.slug).filter(e=>inM(e.date));if(je.length){
    const avg=k=>{const l=je.filter(e=>num(e[k])>0);return l.length?l.reduce((a,e)=>a+num(e[k]),0)/l.length:0};
    const work=je.reduce((a,e)=>a+num(e.travail),0);const must=je.flatMap(e=>(e.todos||[]).filter(x=>x.lvl==='must'));const md=must.filter(x=>x.done).length;const am=avg('mood');
    const plus=je.filter(e=>e.plus).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    parts.push(sec(esc(jp.name),`<div class="statgrid">${stat('Jours remplis',je.length+' / '+n)}${stat('Humeur moyenne',am?moodEm(am)+' '+f1(am):'—')}${stat('Énergie',avg('energie')?f1(avg('energie'))+'/5':'—')}${stat('Sommeil moyen',avg('sommeil')?f1(avg('sommeil'))+' h':'—')}${stat('Productivité',avg('prod')?f1(avg('prod'))+'/5':'—')}${stat('Travail perso',hm(work))}${stat('« Absolument » faits',must.length?Math.round(md/must.length*100)+' %':'—',must.length?md+'/'+must.length:'')}</div>${nightInsight(je)}${plus.length?`<div class="sect">Points positifs</div><ul class="blist">${plus.map(e=>`<li><span>${esc(short(e.date))}</span>${esc(e.plus)}</li>`).join('')}</ul>`:''}`,cv(jp.color)))}}
  const op=firstTpl('objectifs');
  if(op){const om=of(op.slug).filter(e=>e.horizon==='mois'&&e.periode===ym);const wks=new Set();for(let k=1;k<=n;k++)wks.add(isoWeek(ym+'-'+pad(k)).key);const ow=of(op.slug).filter(e=>e.horizon==='semaine'&&wks.has(e.periode));const oj=of(op.slug).filter(e=>e.horizon==='jour'&&inM(e.periode));const ok=l=>l.length?l.filter(e=>e.fait).length+'/'+l.length:'—';
    if(om.length||ow.length||oj.length)parts.push(sec(esc(op.name),`<div class="statgrid">${stat('Du mois',ok(om))}${stat('Des semaines',ok(ow))}${stat('Des jours',ok(oj))}</div>${om.length?`<ul class="blist">${om.map(e=>`<li><span>${e.fait?'✓':'✗'}</span>${esc(e.titre)}</li>`).join('')}</ul>`:''}`,cv(op.color)))}
  L.filter(p=>p.template==='taches').forEach(p=>{const l=of(p.slug).filter(e=>inM(e.echeance));if(l.length)parts.push(sec(esc(p.name),`<div class="statgrid">${stat('Échéances du mois',l.length)}${stat('Faites',l.filter(e=>e.statut==='Fait').length)}${stat('Restantes',l.filter(e=>e.statut!=='Fait').length)}</div><ul class="blist">${l.sort((a,b)=>String(a.echeance).localeCompare(String(b.echeance))).map(e=>`<li><span>${esc(short(e.echeance))}</span>${esc(e.titre)} <small>${esc(e.statut||'')}</small></li>`).join('')}</ul>`,cv(p.color)))});
  byTpl('revision').forEach(p=>{let done=0;const per={};of(p.slug).forEach(e=>Object.values(e.done||{}).forEach(v=>{if(inM(v)){done++;const k=e.matiere||'Sans matière';per[k]=(per[k]||0)+1}}));const added=of(p.slug).filter(e=>inM(e.date)).length;
    if(done||added)parts.push(sec(esc(p.name),`<div class="statgrid">${stat('Révisions faites',done)}${stat('Chapitres appris',added)}${stat('En retard aujourd’hui',rvDue([p],t).filter(x=>x.due<t).length)}</div>${Object.keys(per).length?`<ul class="blist">${Object.entries(per).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<li><span>${v}</span>${esc(k)}</li>`).join('')}</ul>`:''}`,cv(p.color)))});
  L.filter(p=>p.template==='journal'&&!isWork(p)).forEach(p=>{const l=of(p.slug).filter(e=>inM(e.date));if(!l.length)return;const sf=firstSel(p);const acc={};if(sf)l.forEach(e=>{const k=e[sf.k]||'Autre';acc[k]=(acc[k]||0)+1});
    parts.push(sec(esc(p.name),`<div class="statgrid">${stat('Entrées',l.length)}${p.fields.filter(f=>f.type==='number').map(f=>stat(esc(f.label),fmtNum(f,sum(l,f.k)))).join('')}</div>${sf?`<ul class="blist">${Object.entries(acc).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<li><span>${v}</span>${esc(k)}</li>`).join('')}</ul>`:''}`,cv(p.color)))});
  L.filter(p=>p.template==='habitude').forEach(p=>{const ds=new Set(of(p.slug).filter(e=>inM(e.date)).map(e=>e.date));if(ds.size)parts.push(sec(esc(p.name),`<div class="statgrid">${stat('Jours cochés',ds.size+' / '+n)}${stat('Record',streakOf(of(p.slug).map(e=>e.date)).best+' j')}</div>`,cv(p.color)))});
  byTpl('livres').forEach(p=>{const l=of(p.slug).filter(e=>e.statut==='Lu'&&inM(e.fin));if(l.length)parts.push(sec(esc(p.name),`<ul class="blist">${l.map(e=>`<li><span class="stars">${STARS(e.note)||'—'}</span>${esc(e.titre)}${e.auteur?' — '+esc(e.auteur):''}</li>`).join('')}</ul>`,cv(p.color)))});
  byTpl('agenda').forEach(p=>{const l=of(p.slug).filter(e=>e.kind!=='edt'&&inM(e.date));if(l.length)parts.push(sec(esc(p.name),`<div class="statgrid">${stat('Événements',l.length)}</div>`,cv(p.color)))});
  return `<div class="bilan"><div class="bilanhead"><div><span class="kicker">Main courante · bilan mensuel</span><h2>${esc(monthLabel())}</h2><small>Généré le ${esc(frDate(t))}</small></div><div class="row-btns noprint"><button type="button" class="btn" id="printBtn">Imprimer / PDF</button><button type="button" class="btn ghost" data-v="bord">Retour</button></div></div>
    <p class="hint noprint">Change de mois avec les flèches en haut. Pour un PDF : « Imprimer / PDF » puis « Enregistrer au format PDF ». Sur iPhone, si rien ne s’ouvre depuis l’appli installée, ouvre l’adresse dans Safari → Partager → Imprimer.</p>
    <div class="bgrid">${parts.join('')||'<p class="ras">Rien d’enregistré ce mois-ci.</p>'}</div></div>`;
}

/* 6. Partiels : compte à rebours */
const EXRE=/\b(partiels?|examens?|exam|controles?|cc|ds|oral|rattrapages?|ecrit)\b/;
function examsList(){
  const t=todayISO();const out=[];
  live().filter(p=>p.template==='taches').forEach(p=>of(p.slug).forEach(e=>{if(!e.echeance||e.echeance<t||e.statut==='Fait')return;if(EXRE.test(fold([e.type,e.titre].join(' '))))out.push({date:e.echeance,titre:e.titre||'',matiere:e.matiere||'',src:p.slug})}));
  byTpl('agenda').forEach(p=>of(p.slug).forEach(e=>{if(e.kind==='edt'||!e.date||e.date<t)return;if(EXRE.test(fold(e.titre)))out.push({date:e.date,titre:e.titre||'',matiere:'',src:p.slug,debut:e.debut})}));
  return out.sort((a,b)=>a.date.localeCompare(b.date));
}
function matMatch(ex,m){const a=fold(ex.matiere+' '+ex.titre);const b=fold(m||'');if(!b)return false;if(a.includes(b))return true;return b.split(/[^a-z0-9]+/).filter(w=>w.length>3).some(w=>a.includes(w))}
function examsHTML(p){
  const ex=examsList().slice(0,4);if(!ex.length)return '';const t=todayISO();const iv=ivs(p);
  return `<div class="sect">Partiels à venir <small>${ex.length}</small></div><div class="exams">${ex.map(x=>{
    const dd=Math.round((parse(x.date)-parse(t))/864e5);const ch=of(p.slug).filter(e=>e.date&&matMatch(x,e.matiere));let planned=0,late=0;const noRev=[];
    ch.forEach(e=>{let has=false;iv.forEach(n=>{const s=rvState(e,n,t);if(s.dn)return;if(s.due<=x.date){if(s.due<t)late++;else planned++;has=true}});if(!has)noRev.push(e)});
    return `<article class="exam"><div class="exhead"><span class="when ${dd<=3?'late':dd<=10?'soon':''}">${dd===0?'aujourd’hui':'J-'+dd}</span><b>${esc(x.titre)}</b><small>${esc(dayLabel(x.date))}${x.debut?' · '+esc(x.debut):''}</small></div>
      <div class="exmeta">${ch.length?`${ch.length} chapitre${ch.length>1?'s':''} · ${planned} révision${planned>1?'s':''} prévue${planned>1?'s':''} d’ici là${late?` · <b class="neg">${late} en retard</b>`:''}`:'Aucun chapitre de cette matière dans tes révisions (vérifie que la matière est écrite pareil).'}</div>
      ${noRev.length?`<div class="exmeta">Rien de prévu avant le partiel pour : ${noRev.map(e=>esc(e.chapitre)).join(', ')}</div>`:''}
      ${firstTpl('jour')&&dd>=1?`<button type="button" class="link small" data-exprep="${esc(x.date)}|${esc(x.titre)}">Ajouter « révision générale » la veille dans Ma journée</button>`:''}</article>`}).join('')}</div>`;
}

/* Clics et changements v4 */
async function v4Click(t){
  const ds=t.dataset;
  if(t.id==='bnavAll'){const sh=$('#sheet');if(sh.hidden){renderSheet();sh.hidden=false}else sh.hidden=true;renderBnav();return true}
  if(t.id==='sheetClose'){$('#sheet').hidden=true;renderBnav();return true}
  if(t.id==='printBtn'){try{window.print()}catch(e){toast('Impression impossible ici : ouvre l’appli dans le navigateur.')}return true}
  if(t.id==='rcAdd'&&draft){const cf=draft.fields.find(f=>f.k==='categorie');const c0=cf?(draftOpts(cf)[0]||'Autre'):'Autre';if(!Array.isArray(draft.settings.recur))draft.settings.recur=[];draft.settings.recur.push({id:uid8(),libelle:'',montant:'',sens:'Dépense',categorie:c0,jour:1});render();const el=document.getElementById('ed-rc'+(draft.settings.recur.length-1)+'-l');if(el)el.focus();return true}
  if(ds.rcdel!=null&&draft){draft.settings.recur.splice(+ds.rcdel,1);render();return true}
  const jp=pageOf(view)&&pageOf(view).template==='jour'?pageOf(view):firstTpl('jour');
  if(ds.jener&&jp){const v=+ds.jener;saveDay(jp,jourDate,b=>({energie:num(b.energie)===v?0:v}));return true}
  if(ds.jsleep&&jp){const v=num(ds.jsleep);saveDay(jp,jourDate,()=>({sommeil:v}));return true}
  if(ds.exprep&&jp){const i=ds.exprep.indexOf('|');const d=ds.exprep.slice(0,i),ti=ds.exprep.slice(i+1);const dv=addDays(d,-1);
    await saveDay(jp,dv,b=>(b.todos.some(x=>x.t==='Révision générale : '+ti)?null:{todos:b.todos.concat([{id:uid8(),t:'Révision générale : '+ti,lvl:'must',done:false}])}),true);toast('Ajouté à « À faire absolument » du '+frDate(dv));return true}
  return false;
}
function v4Change(t){
  const jp=pageOf(view);
  if(jp&&jp.template==='jour'&&t.id==='jsleep'){const h=Math.min(24,Math.max(0,num(t.value)));saveDay(jp,jourDate,()=>({sommeil:Math.round(h*4)/4}));return true}
  return false;
}

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
