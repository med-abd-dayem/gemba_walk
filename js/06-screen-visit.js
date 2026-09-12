"use strict";
/* ---------- NOUVELLE VISITE ---------- */
function renderNouvelle(){
  const tpls=state.cache.templates;
  app.innerHTML=`
  <header class="appbar"><span class="back" data-go="accueil"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><path d="M15 6l-6 6 6 6"/></svg></span><h1>Nouvelle visite</h1></header>
  <div class="screen">
    <div class="card card-pad">
      <div class="field"><label>Secteur / Lieu</label>
        <select id="f-sect">${(state.cache.sectors||[]).map(s=>`<option>${esc(s)}</option>`).join('')}${(state.cache.sectors||[]).length?'':'<option>Général</option>'}</select>
      </div>
      <div class="field"><label>Formulaire</label>
        <select id="f-tpl">${tpls.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Date</label><input type="date" id="f-date" value="${todayISO()}"></div>
      <div class="field"><label>Tour fait par <span style="color:var(--nok)">*</span></label><input type="text" id="f-author" placeholder="Nom du responsable (obligatoire)"></div>
      <button class="btn btn-primary" id="f-start">Commencer la visite</button>
    </div>
    <p class="fab-note">Secteurs et formulaires sont personnalisables dans <b>Réglages</b>.</p>
  </div>
  ${tabbar('')}`;
  bindCommon();
  $('#f-start').onclick=()=>{
    const author=$('#f-author').value.trim();
    if(!author){toast('Veuillez saisir le nom du responsable');const fa=$('#f-author');if(fa){fa.style.borderColor='var(--nok)';fa.focus();}return;}
    const tid=$('#f-tpl').value;
    const t=state.cache.templates.find(x=>x.id===tid);
    state.visit={id:uid('v'),templateId:tid,templateName:t.name,code:t.code||'',
      secteur:($('#f-sect')?$('#f-sect').value:'')||'',
      date:$('#f-date').value||todayISO(),author:author,
      status:'en_cours',results:{},createdAt:Date.now()};
    // ouvrir le premier axe
    state._openAxes={};if(t.axes[0])state._openAxes[t.axes[0].id]=true;
    go('visite');
  };
}

/* ---------- VISITE EN COURS ---------- */
function renderVisite(){
  const v=state.visit; const t=state.cache.templates.find(x=>x.id===v.templateId);
  _collapsedCrits=new Set();
  const c=counts(v); const conf=conformity(v);
  app.innerHTML=`
  <header class="appbar">
    <span class="back" data-back-visite><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><path d="M15 6l-6 6 6 6"/></svg></span>
    <h1>${esc(v.templateName)} <span class="sub">${frDate(v.date)}${v.author?' · '+esc(v.author):''}</span></h1>
  </header>
  <div class="screen">
    <div class="progwrap">
      <div class="progbar"><span style="width:${c.total?Math.round(c.ans/c.total*100):0}%"></span></div>
      <div class="progmeta"><span>${c.ans}/${c.total} évalués</span>
        <span class="conf">${conf==null?'Conformité —':'Conformité '+conf+'%'} · <span style="color:var(--nok)">${c.nok} écart(s)</span></span></div>
    </div>
    <div id="axes">${t.axes.map(a=>axeBlock(a,v)).join('')}</div>
    <button class="btn btn-primary" id="v-finish" style="margin-top:6px">Terminer la visite</button>
    <button class="btn btn-ghost" style="margin-top:10px" data-back-visite>Enregistrer et fermer</button>
  </div>`;
  bindCommon();
  bindVisite();
}
function axeBlock(a,v){
  let ok=0,nok=0;a.criteria.forEach(cr=>{const r=v.results[cr.id];if(r){if(r.status==='ok')ok++;if(r.status==='nok')nok++;}});
  const open=state._openAxes&&state._openAxes[a.id];
  return `<div class="axe ${open?'open':''}" data-axe="${a.id}">
    <div class="axe-head" data-toggle="${a.id}">
      <span class="an">${esc(a.name)}</span>
      <span class="ac">${ok} Conf. · ${nok} Écart</span>
      <span class="caret"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 6l6 6-6 6"/></svg></span>
    </div>
    <div class="axe-body">${a.criteria.map(cr=>critBlock(a,cr,v)).join('')}</div>
  </div>`;
}
function photoZoneHtml(photos){
  const camIcon='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  const thumbs=(photos||[]).map((p,i)=>`<div class="photo-thumb"><img src="${p}"><span class="rm" data-rmidx="${i}">×</span></div>`).join('');
  const add=`<label style="display:inline-block;vertical-align:top"><span class="photo-btn">${camIcon}${photos&&photos.length?'Ajouter':'Ajouter une photo'}</span><input type="file" accept="image/*" capture="environment" data-photo hidden></label>`;
  return thumbs+add;
}
function critSummary(r){r=r||{};const nph=getPhotos(r).length;const s=[r.urgence==='urgente'?'Urgente':'',nph?(nph+' photo'+(nph>1?'s':'')):''].filter(Boolean).join('  ·  ');return s||'Détails masqués — appuyez sur le chevron pour ouvrir';}
let _collapsedCrits=new Set();
function critBlock(a,cr,v){
  const r=v.results[cr.id]||{};
  const isNok=r.status==='nok';
  const collapsed=_collapsedCrits.has(cr.id);
  return `<div class="crit ${isNok?'is-nok':''} ${collapsed?'collapsed':''}" data-crit="${cr.id}" data-axe="${a.id}">
    <div class="cl" style="display:flex;align-items:center;gap:8px"><span style="flex:1">${esc(cr.label)}</span><button class="crit-caret" data-crit-toggle aria-label="Réduire"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 9l6 6 6-6"/></svg></button></div>
    <div class="seg">
      <button data-set="ok" class="${r.status==='ok'?'sel-ok':''}">Conforme</button>
      <button data-set="nok" class="${r.status==='nok'?'sel-nok':''}">Écart</button>
    </div>
    <div class="crit-sum" data-crit-sum>${esc(critSummary(r))}</div>
    <div class="detail">
      <label>Observation</label>
      <textarea data-obs placeholder="Décrire l'écart constaté…">${esc(r.observation||'')}</textarea>
      <label style="margin-top:10px">Urgence</label>
      <div class="chips" data-urg>
        <button class="chip ${r.urgence==='urgente'?'sel-urg':''}" data-u="urgente">Urgente</button>
        <button class="chip ${r.urgence==='non_urgente'?'sel':''}" data-u="non_urgente">Non urgente</button>
      </div>
      <div data-photo-zone style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start">${photoZoneHtml(getPhotos(r))}</div>
    </div>
  </div>`;
}
function bindVisite(){
  const v=state.visit;
  // toggle axes
  app.querySelectorAll('[data-toggle]').forEach(h=>h.onclick=()=>{
    const id=h.getAttribute('data-toggle');state._openAxes=state._openAxes||{};state._openAxes[id]=!state._openAxes[id];
    h.closest('.axe').classList.toggle('open');
  });
  // set status
  app.querySelectorAll('.crit .seg button').forEach(b=>b.onclick=()=>{
    const crit=b.closest('.crit');const cid=crit.getAttribute('data-crit');const val=b.getAttribute('data-set');
    v.results[cid]=v.results[cid]||{};
    v.results[cid].status = v.results[cid].status===val?null:val;
    // refresh seg + detail visibility
    const st=v.results[cid].status;
    crit.querySelectorAll('.seg button').forEach(x=>{x.className='';const sv=x.getAttribute('data-set');if(sv===st)x.className=sv==='ok'?'sel-ok':'sel-nok';});
    crit.classList.toggle('is-nok',st==='nok');
    if(st==='nok'){crit.classList.remove('collapsed');_collapsedCrits.delete(cid);}
    updateProg();persistVisit();
  });
  // replier / déplier le bloc de détails (chevron)
  app.querySelectorAll('[data-crit-toggle]').forEach(btn=>btn.onclick=(e)=>{
    e.stopPropagation();const crit=btn.closest('.crit');const cid=crit.getAttribute('data-crit');
    const willCollapse=!crit.classList.contains('collapsed');
    crit.classList.toggle('collapsed',willCollapse);
    if(willCollapse){_collapsedCrits.add(cid);const s=crit.querySelector('[data-crit-sum]');if(s)s.textContent=critSummary(v.results[cid]);}
    else _collapsedCrits.delete(cid);
  });
  // detail inputs (delegated via each crit)
  app.querySelectorAll('.crit').forEach(crit=>{
    const cid=crit.getAttribute('data-crit');
    const obs=crit.querySelector('[data-obs]');
    if(obs)obs.oninput=()=>{v.results[cid]=v.results[cid]||{};v.results[cid].observation=obs.value;persistVisit();};
    crit.querySelectorAll('[data-urg] .chip').forEach(c=>c.onclick=()=>{
      v.results[cid]=v.results[cid]||{};const u=c.getAttribute('data-u');
      v.results[cid].urgence=v.results[cid].urgence===u?'':u;
      crit.querySelectorAll('[data-urg] .chip').forEach(x=>{x.className='chip';const xu=x.getAttribute('data-u');if(xu===v.results[cid].urgence)x.className='chip '+(xu==='urgente'?'sel-urg':'sel');});
      persistVisit();
    });
    bindPhotoZone(crit,cid);
  });
  function bindPhotoZone(crit,cid){
    const zone=crit.querySelector('[data-photo-zone]');if(!zone)return;
    const refresh=()=>{zone.innerHTML=photoZoneHtml(getPhotos(v.results[cid]));bindPhotoZone(crit,cid);};
    const inp=zone.querySelector('[data-photo]');
    if(inp)inp.onchange=async()=>{if(!inp.files[0])return;const d=await compressImage(inp.files[0]);v.results[cid]=v.results[cid]||{};const arr=getPhotos(v.results[cid]).slice();arr.push(d);v.results[cid].photos=arr;delete v.results[cid].photo;await persistVisit();refresh();};
    zone.querySelectorAll('[data-rmidx]').forEach(x=>x.onclick=()=>{const i=+x.getAttribute('data-rmidx');const arr=getPhotos(v.results[cid]).slice();arr.splice(i,1);v.results[cid]=v.results[cid]||{};v.results[cid].photos=arr;delete v.results[cid].photo;persistVisit();refresh();});
  }

  app.querySelectorAll('[data-back-visite]').forEach(b=>b.onclick=async()=>{await persistVisit();toast('Visite enregistrée');await loadCache();go('accueil');});
  $('#v-finish').onclick=finishVisite;
  function updateProg(){
    const c=counts(v);const conf=conformity(v);
    $('.progbar>span').style.width=(c.total?Math.round(c.ans/c.total*100):0)+'%';
    $('.progmeta').innerHTML=`<span>${c.ans}/${c.total} évalués</span><span class="conf">${conf==null?'Conformité —':'Conformité '+conf+'%'} · <span style="color:var(--nok)">${c.nok} écart(s)</span></span>`;
    // maj compteurs d'axe
    const t=state.cache.templates.find(x=>x.id===v.templateId);
    t.axes.forEach(a=>{let ok=0,nok=0;a.criteria.forEach(cr=>{const r=v.results[cr.id];if(r){if(r.status==='ok')ok++;if(r.status==='nok')nok++;}});const el=app.querySelector(`[data-axe="${a.id}"] .ac`);if(el)el.textContent=`${ok} Conf. · ${nok} Écart`;});
  }
  window._updateProg=updateProg;
}
async function persistVisit(){await Store.put('visits',state.visit);}

async function finishVisite(){
  const v=state.visit;const c=counts(v);
  if(c.ans===0){toast('Évaluez au moins un élément');return;}
  go('resume');
}

/* ---------- RÉSUMÉ / SIGNATURE / CLÔTURE ---------- */
function renderResume(){
  const v=state.visit;const conf=conformity(v);const c=counts(v);
  const t=state.cache.templates.find(x=>x.id===v.templateId);
  const noks=[];
  t.axes.forEach(a=>a.criteria.forEach(cr=>{const r=v.results[cr.id];if(r&&r.status==='nok')noks.push({axe:a.name,label:cr.label,...r});}));
  app.innerHTML=`
  <header class="appbar"><span class="back" data-go="visite"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><path d="M15 6l-6 6 6 6"/></svg></span><h1>Résumé de la visite</h1></header>
  <div class="screen">
    <div class="stats">
      <div class="tile ${conf!=null&&conf<70?'alert':'good'}"><div class="k">Conformité</div><div class="v">${conf==null?'—':conf+'<small>%</small>'}</div></div>
      <div class="tile ${c.nok?'alert':''}"><div class="k">Écarts</div><div class="v">${c.nok}</div></div>
    </div>
    <div class="section-title">${noks.length?noks.length+' action(s) générée(s)':'Aucun écart relevé'}</div>
    ${noks.length?`<div class="card">${noks.map(n=>`<div class="lrow"><div class="main"><div class="t">${esc(n.label)}</div><div class="m">${esc(n.axe)}${n.observation?' · '+esc(n.observation):''}</div></div>${n.urgence==='urgente'?`<span class="badge open">Urgente</span>`:''}</div>`).join('')}</div>`:''}

    <div class="section-title">Points forts observés</div>
    <div class="card card-pad"><textarea id="r-forts" placeholder="Bonnes pratiques à valoriser (une par ligne)…" style="width:100%;min-height:58px;border:1px solid var(--line-strong);border-radius:10px;padding:10px">${esc(v.pointsForts||'')}</textarea></div>
    <div class="section-title">Remarques de l'équipe</div>
    <div class="card card-pad"><textarea id="r-remarques" placeholder="Ce que les opérateurs ont signalé sur le terrain…" style="width:100%;min-height:58px;border:1px solid var(--line-strong);border-radius:10px;padding:10px">${esc(v.remarquesEquipe||'')}</textarea></div>

    ${exportBtnsHtml()}
    <button class="btn btn-primary" id="r-save">Clôturer et enregistrer</button>
  </div>`;
  bindCommon();
  exportVisitBtns(()=>state.visit).bind(app);
  const rf=$('#r-forts');if(rf)rf.oninput=()=>{state.visit.pointsForts=rf.value;persistVisit();};
  const rr=$('#r-remarques');if(rr)rr.oninput=()=>{state.visit.remarquesEquipe=rr.value;persistVisit();};
  $('#r-save').onclick=saveVisitFinal;
}
async function saveVisitFinal(){
  const v=state.visit;
  v.status='termine';v.completedAt=Date.now();
  await Store.put('visits',v);
  // générer les actions à partir des NOK
  const t=state.cache.templates.find(x=>x.id===v.templateId);
  for(const a of t.axes){for(const cr of a.criteria){const r=v.results[cr.id];
    if(r&&r.status==='nok'){
      await Store.put('actions',{id:uid('act'),visitId:v.id,date:v.date,templateName:v.templateName,secteur:v.secteur||'',
        axeName:a.name,critLabel:cr.label,observation:r.observation||'',
        urgence:r.urgence||'',photos:getPhotos(r),responsable:'',echeance:'',
        statut:'ouverte',createdAt:Date.now(),closedAt:null});
    }}}
  await loadCache();
  toast('Visite clôturée');
  state.visit=null;
  go('accueil');
}

