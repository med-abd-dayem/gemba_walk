"use strict";
/* ============================================================
   Gemba Walk PWA — stockage centralisé (Firebase Firestore)
   Données partagées et synchronisées entre tous les membres.
   ============================================================ */
"use strict";
const STORES=['templates','visits','actions','settings'];
const Store={
  async getAll(s){
    if(!db)return [];
    const snap=await db.collection(s).get();
    return snap.docs.map(d=>d.data());
  },
  async get(s,id){
    if(!db)return null;
    const doc=await db.collection(s).doc(id).get();
    return doc.exists?doc.data():null;
  },
  async put(s,o){
    if(!db)return o;
    await db.collection(s).doc(o.id).set(o);
    return o;
  },
  async del(s,id){
    if(!db)return;
    await db.collection(s).doc(id).delete();
  },
};

/* ---------- Modèle par défaut (basé sur le formulaire SNIM Réception) ---------- */
function seedTemplate(){
  const mk=labels=>labels.map(l=>({id:uid('c'),label:l}));
  return {
    id:'tpl_reception', name:'Réception', code:'SNIM · DAL–APPROS · Sc 280',
    createdAt:Date.now(),
    axes:[
      {id:uid('a'),name:'5S Zones & Magasins Réception',criteria:mk(['5S Magasin cage','5S Magasin houle','5S Magasin F04','5S Magasin S02','5S Magasin S03','5S Magasin 05','5S Magasin EVB','5S Magasin Ecounema','5S Zone Parcs'])},
      {id:uid('a'),name:'Sécurité et Environnement',criteria:mk(['EPI respectés','Tri des déchets','Présence des extincteurs'])},
      {id:uid('a'),name:'Gestion par les Standards & Management Visuel',criteria:mk(['Planning audits','Planning leçons en points','Traitement retour audits','Affichage Standards','Respect des Standards','BQ service','RAN Réception'])},
      {id:uid('a'),name:'Visite Équipe Réception',criteria:mk(['Équipe réception'])},
    ]
  };
}

function defaultAxes(){
  const mk=labels=>labels.map(l=>({id:uid('c'),label:l}));
  return [
    {id:uid('a'),name:'5S Zones & Magasins',criteria:mk(['5S Zone 1','5S Zone 2'])},
    {id:uid('a'),name:'Sécurité et Environnement',criteria:mk(['EPI respectés','Tri des déchets','Présence des extincteurs'])},
    {id:uid('a'),name:'Gestion par les Standards & Management Visuel',criteria:mk(['Planning audits','Planning leçons en points','Traitement retour audits','Affichage Standards','Respect des Standards'])},
    {id:uid('a'),name:'Visite Équipe',criteria:mk(['Visite équipe'])},
  ];
}

/* ---------- État applicatif ---------- */
const state={screen:'accueil',visit:null,cache:{templates:[],visits:[],actions:[],sectors:[],backupMeta:null},editTpl:null};

function applySettingsDoc(doc){
  if(!doc)return;
  if(doc.id==='sectors')state.cache.sectors=doc.list?doc.list:[];
  if(doc.id==='backupMeta')state.cache.backupMeta=doc;
}

async function loadCache(){
  state.cache.templates=await Store.getAll('templates');
  state.cache.visits=(await Store.getAll('visits')).sort((a,b)=>b.createdAt-a.createdAt);
  state.cache.actions=(await Store.getAll('actions')).sort((a,b)=>b.createdAt-a.createdAt);
  state.cache.sectors=[];state.cache.backupMeta=null;
  (await Store.getAll('settings')).forEach(applySettingsDoc);
}

/* ---------- Synchronisation en direct entre membres ---------- */
// On ne redessine automatiquement que les écrans "de lecture" : sur les écrans
// de saisie (visite, résumé, réglages, édition de formulaire), un redessin en
// plein milieu de frappe ferait perdre le focus/le curseur de l'utilisateur.
const LIVE_RERENDER_SCREENS=new Set(['accueil','historique','actions','visitDetail']);
function safeRerender(){
  if(LIVE_RERENDER_SCREENS.has(state.screen)){try{render();}catch(e){}}
}
let _watchersStarted=false;
function watchCollections(){
  if(_watchersStarted||!db)return;
  _watchersStarted=true;
  db.collection('templates').onSnapshot(snap=>{state.cache.templates=snap.docs.map(d=>d.data());safeRerender();});
  db.collection('visits').onSnapshot(snap=>{state.cache.visits=snap.docs.map(d=>d.data()).sort((a,b)=>b.createdAt-a.createdAt);safeRerender();});
  db.collection('actions').onSnapshot(snap=>{state.cache.actions=snap.docs.map(d=>d.data()).sort((a,b)=>b.createdAt-a.createdAt);safeRerender();});
  db.collection('settings').onSnapshot(snap=>{snap.docs.forEach(d=>applySettingsDoc(d.data()));safeRerender();});
}
