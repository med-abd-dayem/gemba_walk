"use strict";
/* ---------- Couche de stockage : IndexedDB avec repli mémoire ---------- */
const STORES=['templates','visits','actions','photos','settings'];
let DB=null, MEM=null;
function openDB(){
  return new Promise(res=>{
    let ok=false;
    try{
      const rq=indexedDB.open('gembaDB',1);
      rq.onupgradeneeded=e=>{const db=e.target.result;STORES.forEach(s=>{if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id'})});};
      rq.onsuccess=e=>{DB=e.target.result;ok=true;res();};
      rq.onerror=()=>{if(!ok){MEM=memStore();res();}};
      setTimeout(()=>{if(!DB&&!MEM){MEM=memStore();res();}},1200);
    }catch(e){MEM=memStore();res();}
  });
}
function memStore(){const m={};STORES.forEach(s=>m[s]=new Map());return m;}
const Store={
  getAll(s){return MEM?Promise.resolve([...MEM[s].values()]):new Promise((res,rej)=>{const r=DB.transaction(s).objectStore(s).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});},
  get(s,id){return MEM?Promise.resolve(MEM[s].get(id)||null):new Promise((res,rej)=>{const r=DB.transaction(s).objectStore(s).get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error);});},
  put(s,o){return MEM?(MEM[s].set(o.id,o),Promise.resolve(o)):new Promise((res,rej)=>{const t=DB.transaction(s,'readwrite');t.objectStore(s).put(o);t.oncomplete=()=>res(o);t.onerror=()=>rej(t.error);});},
  del(s,id){return MEM?(MEM[s].delete(id),Promise.resolve()):new Promise((res,rej)=>{const t=DB.transaction(s,'readwrite');t.objectStore(s).delete(id);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);});},
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
const state={screen:'accueil',visit:null,cache:{templates:[],visits:[],actions:[]},editTpl:null};

async function loadCache(){
  state.cache.templates=await Store.getAll('templates');
  state.cache.visits=(await Store.getAll('visits')).sort((a,b)=>b.createdAt-a.createdAt);
  state.cache.actions=(await Store.getAll('actions')).sort((a,b)=>b.createdAt-a.createdAt);
  const sc=await Store.get('settings','sectors');state.cache.sectors=(sc&&sc.list)?sc.list:[];
}

