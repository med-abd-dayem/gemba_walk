"use strict";
/* ---------- Liaisons communes ---------- */
function bindCommon(){
  app.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.getAttribute('data-go')));
  app.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>go(b.getAttribute('data-tab')));
  app.querySelectorAll('[data-visit]').forEach(b=>b.onclick=()=>{const id=b.getAttribute('data-visit');const v=state.cache.visits.find(x=>x.id===id);if(v&&v.status==='en_cours'){state.visit=v;state._openAxes={};go('visite');}else openVisit(id);});
  app.querySelectorAll('[data-edit-tpl]').forEach(b=>b.onclick=()=>openEditTpl(b.getAttribute('data-edit-tpl')));
}

/* ---------- Amorçage ---------- */
async function startApp(){
  let tpls=await Store.getAll('templates');
  if(!tpls.length){await Store.put('templates',seedTemplate());}
  const sec=await Store.get('settings','sectors');
  if(!sec)await Store.put('settings',{id:'sectors',list:['Atelier','Appros / Réception','Maintenance','Production']});
  await loadCache();
  watchCollections();
  render();
}
async function boot(){
  app.addEventListener('click',e=>{const im=e.target.closest('.photo-thumb img');if(im){const s=im.getAttribute('src');if(s)openPhoto(s);}});
  if('serviceWorker' in navigator){try{await navigator.serviceWorker.register('sw.js');}catch(e){}}
  if(!FIREBASE_CONFIGURED){renderLogin();return;}
  auth.onAuthStateChanged(user=>{
    if(user)startApp();
    else renderLogin();
  });
}
boot();
