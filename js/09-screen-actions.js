"use strict";
/* ---------- ACTIONS ---------- */
let _actFilter='ouverte';
function avgClosureDays(){const d=state.cache.actions.filter(a=>a.statut==='terminee'&&a.closedAt&&a.createdAt);if(!d.length)return null;return Math.round(d.reduce((n,a)=>n+(a.closedAt-a.createdAt),0)/d.length/86400000);}
function lateDays(a){if(!(a.statut==='ouverte'&&a.echeance&&a.echeance<todayISO()))return 0;const e=new Date(a.echeance+'T00:00:00').getTime();return Math.max(0,Math.round((Date.now()-e)/86400000));}
function closureDays(a){if(!(a.closedAt&&a.createdAt))return null;return Math.max(0,Math.round((a.closedAt-a.createdAt)/86400000));}
function renderActions(){
  let acts=state.cache.actions.slice();
  const open=acts.filter(a=>a.statut==='ouverte');
  const late=open.filter(a=>a.echeance&&a.echeance<todayISO());
  if(_actFilter==='ouverte')acts=open;
  else if(_actFilter==='retard')acts=late;
  else if(_actFilter==='terminee')acts=acts.filter(a=>a.statut==='terminee');
  // tri : retard puis échéance
  acts.sort((a,b)=>{const la=a.echeance&&a.echeance<todayISO(),lb=b.echeance&&b.echeance<todayISO();if(la!==lb)return la?-1:1;return (a.echeance||'9999').localeCompare(b.echeance||'9999');});
  const F=(id,label,n)=>`<button class="chip ${_actFilter===id?'sel':''}" data-filter="${id}">${label}${n!=null?' ('+n+')':''}</button>`;
  app.innerHTML=`
  <header class="appbar"><h1>Actions &amp; Suivi</h1></header>
  <div class="screen">
    <div class="chips" style="margin-bottom:14px">
      ${F('ouverte','Ouvertes',open.length)}
      ${F('retard','En retard',late.length)}
      ${F('terminee','Clôturées')}
    </div>
    <div class="stats">
      <div class="tile ${late.length?'alert':''}"><div class="k">Actions en retard</div><div class="v">${late.length}</div></div>
      <div class="tile"><div class="k">Délai moyen de clôture</div><div class="v">${(()=>{const a=avgClosureDays();return a==null?'—':a+'<small> j</small>';})()}</div></div>
    </div>
    ${state.cache.actions.length?`<button class="btn btn-ghost btn-sm" id="exp-actions" style="width:100%;margin-bottom:14px">⤓ Exporter toutes les actions (Excel)</button>`:''}
    ${acts.length?acts.map(actionCard).join(''):`<div class="empty"><svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg><p>${_actFilter==='terminee'?'Aucune action clôturée':'Aucune action ouverte'}</p><span>Les écarts NOK créent automatiquement des actions.</span></div>`}
  </div>
  ${tabbar('actions')}`;
  bindCommon();
  app.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{_actFilter=b.getAttribute('data-filter');renderActions();});
  const ea=$('#exp-actions');if(ea)ea.onclick=()=>shareFile(actionsToXlsx(),'Gemba_Actions_'+todayISO()+'.xlsx');
  bindActions();
}
function actionCard(a){
  const late=a.statut==='ouverte'&&a.echeance&&a.echeance<todayISO();const ld=lateDays(a);
  const cd=closureDays(a);
  return `<div class="card card-pad" data-act="${a.id}" style="${late?'border-color:var(--nok)':''}">
    <div style="display:flex;gap:8px;align-items:flex-start">
      <div style="flex:1">
        <div style="font-weight:700;font-size:15.5px">${esc(a.critLabel)}</div>
        <div class="m" style="font-size:12.5px;color:var(--ink-soft);margin-top:2px">${esc(a.axeName)} · ${esc(a.templateName)} · ${frDate(a.date)}</div>
      </div>
      ${late?`<span class="badge late">EN RETARD${ld?' · '+ld+'j':''}</span>`:a.statut==='terminee'?'<span class="badge done">Clôturée</span>':a.urgence==='urgente'?'<span class="badge open">Urgente</span>':''}
    </div>
    ${a.observation?`<div class="muted" style="font-size:13.5px;margin-top:8px">${esc(a.observation)}</div>`:''}
    ${getPhotos(a).map(p=>`<div class="photo-thumb" style="margin:8px 6px 0 0"><img src="${p}"></div>`).join('')}
    ${a.statut==='ouverte'?`
      <div class="action-detail">
        <div><label style="font-size:12px;font-weight:700;color:var(--ink-soft)">Responsable</label><input class="small-input" data-resp value="${esc(a.responsable||'')}" placeholder="Nom" style="width:100%;border:1px solid var(--line-strong);border-radius:9px;margin-top:5px"></div>
        <div><label style="font-size:12px;font-weight:700;color:var(--ink-soft)">Échéance</label><input class="small-input" type="date" data-eche value="${a.echeance||''}" style="width:100%;border:1px solid var(--line-strong);border-radius:9px;margin-top:5px"></div>
      </div>
      <button class="btn btn-ok btn-sm" data-close style="width:100%;margin-top:12px">Marquer comme traitée</button>`
    :`<div class="muted" style="font-size:12.5px;margin-top:10px">${a.responsable?'Responsable : '+esc(a.responsable)+' · ':''}Clôturée le ${frDate((a.closedAt?new Date(a.closedAt):new Date()).toISOString().slice(0,10))}${cd!=null?' · en '+cd+' j':''}</div>
      <button class="btn btn-ghost btn-sm" data-reopen style="width:100%;margin-top:10px">Rouvrir</button>`}
  </div>`;
}
function bindActions(){
  app.querySelectorAll('[data-act]').forEach(card=>{
    const id=card.getAttribute('data-act');const a=state.cache.actions.find(x=>x.id===id);if(!a)return;
    const save=async()=>{await Store.put('actions',a);};
    const rp=card.querySelector('[data-resp]');if(rp)rp.onchange=async()=>{a.responsable=rp.value.trim();await save();};
    const ec=card.querySelector('[data-eche]');if(ec)ec.onchange=async()=>{a.echeance=ec.value;await save();await loadCache();renderActions();};
    const cl=card.querySelector('[data-close]');if(cl)cl.onclick=async()=>{a.statut='terminee';a.closedAt=Date.now();await save();await loadCache();toast('Action clôturée');renderActions();};
    const ro=card.querySelector('[data-reopen]');if(ro)ro.onclick=async()=>{a.statut='ouverte';a.closedAt=null;await save();await loadCache();renderActions();};
  });
}

