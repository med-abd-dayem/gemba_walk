"use strict";
/* ---------- RÉGLAGES ---------- */
function renderReglages(){
  const tpls=state.cache.templates;
  app.innerHTML=`
  <header class="appbar"><h1>Réglages</h1></header>
  <div class="screen">
    <div class="section-title">Formulaires</div>
    <div class="card">
      ${tpls.map(t=>`<div class="lrow" data-edit-tpl="${t.id}"><div class="main"><div class="t">${esc(t.name)}</div><div class="m">${t.axes.length} axes · ${t.axes.reduce((n,a)=>n+a.criteria.length,0)} éléments</div></div><button data-dup-tpl="${t.id}" style="padding:7px 11px;border:1px solid var(--line-strong);border-radius:8px;font-size:12.5px;font-weight:650;color:var(--steel);background:var(--surface-2);margin-right:8px">Dupliquer</button><span class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span></div>`).join('')}
    </div>
    <button class="pill-add" id="add-tpl" style="margin-bottom:20px">＋ Nouveau formulaire</button>

    <div class="section-title">Services / Lieux</div>
    <div class="card"><div id="sect-list">${(state.cache.sectors||[]).map((s,i)=>`<div class="lrow" data-sect-row="${i}" style="padding:8px 15px"><input data-sect-input value="${esc(s)}" style="flex:1;padding:9px 11px;border:1px solid var(--line);border-radius:8px" placeholder="Nom du service"><button class="delbtn" data-sect-del="${i}">×</button></div>`).join('')}</div>
    <button class="pill-add" id="add-sect" style="margin:8px 15px 14px;border-radius:9px;padding:9px">＋ Service</button></div>
    <button class="pill-add" id="save-sect" style="margin-bottom:20px;background:var(--steel);color:#fff;border-style:solid;border-color:var(--steel)">Enregistrer les services</button>

    <div class="section-title">Sauvegarde des données</div>
    <div class="card card-pad">
      <div id="backup-state" style="font-size:13px;font-weight:600;margin-bottom:12px">${backupStateHtml()}</div>
      <button class="btn btn-primary" id="backup-now">Sauvegarder maintenant</button>
      <label class="btn btn-ghost" style="margin-top:10px;display:flex">Restaurer une sauvegarde<input type="file" accept="application/json" id="import" hidden></label>
      <p class="fab-note" style="margin-top:12px;text-align:left">Les données sont stockées uniquement sur cet appareil. « Sauvegarder » crée un fichier <code>.json</code> à envoyer par e-mail / WhatsApp (à toi-même ou à un responsable). Il permet de <b>tout restaurer</b> en cas de perte du téléphone.</p>
    </div>
  </div>
  ${tabbar('reglages')}`;
  bindCommon();
  $('#add-tpl').onclick=()=>{state.editTpl={id:uid('tpl'),name:'',code:'',axes:defaultAxes(),createdAt:Date.now(),_new:true};go('template');};
  app.querySelectorAll('[data-dup-tpl]').forEach(b=>b.onclick=async(e)=>{e.stopPropagation();await duplicateTpl(b.getAttribute('data-dup-tpl'));});
  const collectSect=()=>[...app.querySelectorAll('[data-sect-input]')].map(i=>i.value.trim()).filter(Boolean);
  const addS=$('#add-sect');if(addS)addS.onclick=async()=>{const list=collectSect();list.push('');await Store.put('settings',{id:'sectors',list});state.cache.sectors=list;renderReglages();};
  app.querySelectorAll('[data-sect-del]').forEach(b=>b.onclick=async()=>{const list=collectSect();list.splice(+b.getAttribute('data-sect-del'),1);await Store.put('settings',{id:'sectors',list});state.cache.sectors=list;renderReglages();});
  const saveS=$('#save-sect');if(saveS)saveS.onclick=async()=>{const list=collectSect();await Store.put('settings',{id:'sectors',list});state.cache.sectors=list;toast('Services enregistrés');renderReglages();};
  const bn=$('#backup-now');if(bn)bn.onclick=async()=>{await shareBackup();renderReglages();};
  $('#import').onchange=importData;
}
function backupStateHtml(){
  const d=backupDaysAgo();
  if(d===null)return '<span style="color:var(--nok)">⚠️ Aucune sauvegarde effectuée</span>';
  if(d===0)return '<span style="color:var(--ok)">✓ Dernière sauvegarde : aujourd\'hui</span>';
  const col=d>=3?'var(--nok)':d>=1?'var(--amber)':'var(--ok)';
  return `<span style="color:${col}">Dernière sauvegarde : il y a ${d} jour${d>1?'s':''}</span>`;
}
async function buildBackupBlob(){
  const data={templates:await Store.getAll('templates'),visits:await Store.getAll('visits'),actions:await Store.getAll('actions'),settings:await Store.getAll('settings'),exportedAt:new Date().toISOString()};
  return new Blob([JSON.stringify(data)],{type:'application/json'});
}
function backupDaysAgo(){const m=state.cache.backupMeta;if(!m||!m.lastBackup)return null;return Math.floor((Date.now()-m.lastBackup)/86400000);}
async function shareBackup(){
  const blob=await buildBackupBlob();const fn='gemba-sauvegarde-'+todayISO()+'.json';
  let shared=false;
  try{const file=new File([blob],fn,{type:'application/json'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Sauvegarde Gemba Walk'});shared=true;}
  }catch(e){if(e&&e.name==='AbortError')shared=true;}
  if(!shared){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);}
  await Store.put('settings',{id:'backupMeta',lastBackup:Date.now()},false);
  state.cache.backupMeta={id:'backupMeta',lastBackup:Date.now()};
  toast('Sauvegarde prête');
}
async function importData(e){
  const f=e.target.files[0];if(!f)return;
  try{const data=JSON.parse(await f.text());
    if(!confirm('Importer cette sauvegarde ? Les formulaires, visites et actions seront ajoutés/mis à jour.'))return;
    for(const s of ['templates','visits','actions','settings'])if(Array.isArray(data[s]))for(const o of data[s])await Store.put(s,o);
    await loadCache();toast('Importation réussie');go('reglages');
  }catch(err){toast('Fichier invalide');}
}

/* ---------- ÉDITION DE FORMULAIRE ---------- */
async function duplicateTpl(id){
  const t=state.cache.templates.find(x=>x.id===id);if(!t)return;
  const copy=JSON.parse(JSON.stringify(t));
  copy.id=uid('tpl');copy.name=(t.name||'Formulaire')+' (copie)';copy.createdAt=Date.now();
  (copy.axes||[]).forEach(a=>{a.id=uid('a');(a.criteria||[]).forEach(c=>c.id=uid('c'));});
  await Store.put('templates',copy);await loadCache();
  state.editTpl=JSON.parse(JSON.stringify(copy));toast('Formulaire dupliqué');go('template');
}
function openEditTpl(id){const t=state.cache.templates.find(x=>x.id===id);state.editTpl=JSON.parse(JSON.stringify(t));go('template');}
function renderTemplateEdit(){
  const t=state.editTpl;
  app.innerHTML=`
  <header class="appbar"><span class="back" data-go="reglages"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><path d="M15 6l-6 6 6 6"/></svg></span><h1>${t._new?'Nouveau formulaire':'Modifier le formulaire'}</h1><button class="abtn" id="t-save">Enregistrer</button></header>
  <div class="screen">
    <div class="card card-pad">
      <div class="field"><label>Nom du formulaire</label><input id="t-name" value="${esc(t.name)}" placeholder="Ex : Réception, Expédition…"></div>
      <div class="field"><label>Référence (facultatif)</label><input id="t-code" value="${esc(t.code||'')}" placeholder="Ex : SNIM · DAL–APPROS · Sc 280"></div>
    </div>
    <div id="axes-edit">${t.axes.map((a,ai)=>axeEdit(a,ai)).join('')}</div>
    <button class="pill-add" id="add-axe">＋ Ajouter un axe</button>
    ${!t._new?`<button class="btn btn-ghost" id="t-del" style="margin-top:16px;color:var(--nok)">Supprimer ce formulaire</button>`:''}
  </div>`;
  bindCommon();
  bindTemplateEdit();
}
function axeEdit(a,ai){
  return `<div class="card" data-axe-edit="${a.id}" style="margin-bottom:14px">
    <div class="card-pad" style="padding-bottom:6px">
      <div style="display:flex;gap:8px;align-items:center">
        <input data-axe-name value="${esc(a.name)}" style="flex:1;font-weight:700;padding:10px 11px;border:1px solid var(--line-strong);border-radius:9px" placeholder="Nom de l'axe">
        <button class="delbtn" data-del-axe="${a.id}">Suppr.</button>
      </div>
    </div>
    <div>${a.criteria.map(cr=>`<div class="lrow" data-crit-edit="${cr.id}" style="padding:8px 15px">
      <input data-crit-label value="${esc(cr.label)}" style="flex:1;padding:9px 11px;border:1px solid var(--line);border-radius:8px" placeholder="Élément évalué">
      <button class="delbtn" data-del-crit="${cr.id}">×</button></div>`).join('')}</div>
    <button class="pill-add" data-add-crit="${a.id}" style="margin:8px 15px 14px;border-radius:9px;padding:9px">＋ Élément</button>
  </div>`;
}
function bindTemplateEdit(){
  const t=state.editTpl;
  const rerender=()=>{$('#axes-edit').innerHTML=t.axes.map((a,ai)=>axeEdit(a,ai)).join('');attach();};
  function attach(){
    app.querySelectorAll('[data-axe-name]').forEach(inp=>{const ax=inp.closest('[data-axe-edit]').getAttribute('data-axe-edit');inp.onchange=()=>{const a=t.axes.find(x=>x.id===ax);a.name=inp.value;};});
    app.querySelectorAll('[data-crit-label]').forEach(inp=>{const cid=inp.closest('[data-crit-edit]').getAttribute('data-crit-edit');inp.onchange=()=>{t.axes.forEach(a=>{const cr=a.criteria.find(c=>c.id===cid);if(cr)cr.label=inp.value;});};});
    app.querySelectorAll('[data-del-axe]').forEach(b=>b.onclick=()=>{if(t.axes.length<=1){toast('Au moins un axe requis');return;}const id=b.getAttribute('data-del-axe');t.axes=t.axes.filter(a=>a.id!==id);rerender();});
    app.querySelectorAll('[data-del-crit]').forEach(b=>b.onclick=()=>{const id=b.getAttribute('data-del-crit');t.axes.forEach(a=>a.criteria=a.criteria.filter(c=>c.id!==id));rerender();});
    app.querySelectorAll('[data-add-crit]').forEach(b=>b.onclick=()=>{const id=b.getAttribute('data-add-crit');const a=t.axes.find(x=>x.id===id);a.criteria.push({id:uid('c'),label:''});rerender();});
  }
  attach();
  $('#add-axe').onclick=()=>{t.axes.push({id:uid('a'),name:'',criteria:[{id:uid('c'),label:''}]});rerender();};
  $('#t-save').onclick=async()=>{
    t.name=$('#t-name').value.trim();t.code=$('#t-code').value.trim();
    if(!t.name){toast('Donnez un nom au formulaire');return;}
    t.axes=t.axes.filter(a=>a.name.trim()||a.criteria.some(c=>c.label.trim()));
    t.axes.forEach(a=>a.criteria=a.criteria.filter(c=>c.label.trim()));
    delete t._new;
    await Store.put('templates',t);await loadCache();toast('Formulaire enregistré');go('reglages');
  };
  const del=$('#t-del');if(del)del.onclick=async()=>{if(confirm('Supprimer ce formulaire ? (les visites déjà réalisées sont conservées)')){await Store.del('templates',t.id);await loadCache();toast('Formulaire supprimé');go('reglages');}};
}

