"use strict";
/* ---------- HISTORIQUE ---------- */
function renderHistorique(){
  const all=state.cache.visits;
  const secteurs=[...new Set(all.map(v=>v.secteur).filter(Boolean))];
  const visits=(_histSect==='__all')?all:all.filter(v=>(v.secteur||'')===_histSect);
  const done=visits.filter(v=>v.status==='termine');
  const F=(id,label)=>`<button class="chip ${_histSect===id?'sel':''}" data-hsect="${esc(id)}">${esc(label)}</button>`;
  app.innerHTML=`
  <header class="appbar"><h1>Historique</h1></header>
  <div class="screen">
    ${secteurs.length?`<div class="chips" style="margin-bottom:14px">${F('__all','Tous les secteurs')}${secteurs.map(s=>F(s,s)).join('')}</div>`:''}
    <div class="section-title">Évolution de la conformité${_histSect!=='__all'?' — '+esc(_histSect):''}</div>
    <div class="card card-pad">${trendChart(done)}</div>
    ${(()=>{const st=axisStats(done);return st.length?`<div class="section-title">Statistiques par axe</div>
      <div class="card card-pad"><div class="donuts">${st.map(a=>`<div class="donut"><div class="d-chart">${donutSVG(a.conf,a.ok,a.nok)}</div><div class="d-name">${esc(a.name)}</div><div class="d-sub">${a.ok} OK · <span style="color:var(--nok)">${a.nok} NOK</span></div></div>`).join('')}</div></div>`:'';})()}
    <div class="section-title">${_histSect==='__all'?'Toutes les visites':'Visites — '+esc(_histSect)}</div>
    ${visits.length?`<div class="card">${visits.map(v=>`
      <div class="lrow" data-visit="${v.id}">
        <div class="main"><div class="t">${esc(v.templateName)} ${v.status==='en_cours'?'<span class="badge g-amber" style="margin-left:4px">en cours</span>':''}</div>
          <div class="m">${v.secteur?esc(v.secteur)+' · ':''}${frDate(v.date)}${v.author?' · '+esc(v.author):''}</div></div>
        ${v.status==='termine'?visitBadge(v):''}
        <span class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span>
      </div>`).join('')}</div>`
      :`<div class="empty"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><p>Aucune visite enregistrée</p></div>`}
  </div>
  ${tabbar('historique')}`;
  bindCommon();
  app.querySelectorAll('[data-hsect]').forEach(b=>b.onclick=()=>{_histSect=b.getAttribute('data-hsect');renderHistorique();});
}
let _histSect='__all';
function visitBadge(v){const c=conformity(v);const cls=c==null?'g-amber':c>=85?'g-ok':c>=70?'g-amber':'g-nok';return `<span class="badge ${cls}">${c==null?'—':c+'%'}</span>`;}
function trendChart(done){
  const data=done.slice().reverse().map(v=>({c:conformity(v),d:v.date})).filter(x=>x.c!=null);
  if(data.length<2)return `<div class="chart-empty">Deux visites clôturées minimum pour afficher la tendance.</div>`;
  const W=500,H=170,pad=28,pb=22;
  const n=data.length;const xs=i=>pad+(i*(W-pad*2)/(n-1));const ys=c=>H-pb-(c/100*(H-pb-10));
  let path='',area='',dots='';
  data.forEach((p,i)=>{const x=xs(i),y=ys(p.c);path+=(i?'L':'M')+x+' '+y+' ';dots+=`<circle cx="${x}" cy="${y}" r="3.5" fill="#2C4A63"/>`;});
  area=`M${xs(0)} ${H-pb} `+data.map((p,i)=>'L'+xs(i)+' '+ys(p.c)).join(' ')+` L${xs(n-1)} ${H-pb} Z`;
  const grid=[0,50,100].map(g=>`<line x1="${pad}" y1="${ys(g)}" x2="${W-pad}" y2="${ys(g)}" stroke="#E3E9EE"/><text x="4" y="${ys(g)+4}" font-size="10" fill="#8A98A4">${g}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C4A63" stop-opacity=".18"/><stop offset="1" stop-color="#2C4A63" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#ag)"/><path d="${path}" fill="none" stroke="#2C4A63" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
}

/* ---------- DÉTAIL VISITE ---------- */
let _detailVisitId=null;
function openVisit(id){_detailVisitId=id;go('visitDetail');}
function renderVisitDetail(){
  const v=state.cache.visits.find(x=>x.id===_detailVisitId);
  if(!v){go('historique');return;}
  const t=state.cache.templates.find(x=>x.id===v.templateId);
  const conf=conformity(v);const c=counts(v);
  const rows=[];
  if(t)t.axes.forEach(a=>{const items=a.criteria.map(cr=>({cr,r:v.results[cr.id]||{}})).filter(x=>x.r.status);
    if(items.length)rows.push(`<div class="section-title">${esc(a.name)}</div><div class="card">${items.map(({cr,r})=>`
      <div class="lrow"><div class="main"><div class="t">${esc(cr.label)}</div>${r.observation?`<div class="m">${esc(r.observation)}</div>`:''}
      ${getPhotos(r).map(p=>`<div class="photo-thumb" style="margin:6px 6px 0 0"><img src="${p}"></div>`).join('')}</div>
      <span class="badge ${r.status==='ok'?'g-ok':r.status==='nok'?'g-nok':'g-amber'}">${r.status==='na'?'N/A':r.status.toUpperCase()}</span></div>`).join('')}</div>`);
  });
  app.innerHTML=`
  <header class="appbar"><span class="back" data-go="historique"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><path d="M15 6l-6 6 6 6"/></svg></span>
  <h1>${esc(v.templateName)} <span class="sub">${frDate(v.date)}${v.author?' · '+esc(v.author):''}</span></h1>
  <button class="abtn" id="d-share">Partager</button></header>
  <div class="screen">
    ${v.code||v.secteur?`<p class="muted" style="font-size:12.5px;margin:0 0 12px">${v.secteur?'<b>'+esc(v.secteur)+'</b>':''}${v.secteur&&v.code?' · ':''}${esc(v.code||'')}</p>`:''}
    <div class="stats">
      <div class="tile ${conf!=null&&conf<70?'alert':'good'}"><div class="k">Conformité</div><div class="v">${conf==null?'—':conf+'<small>%</small>'}</div></div>
      <div class="tile ${c.nok?'alert':''}"><div class="k">OK / NOK</div><div class="v" style="font-size:22px">${c.ok} / ${c.nok}</div></div>
    </div>
    ${rows.join('')||'<div class="empty"><p>Aucun élément évalué</p></div>'}
    ${v.pointsForts&&v.pointsForts.trim()?`<div class="section-title">Points forts</div><div class="card card-pad" style="font-size:14px;white-space:pre-line">${esc(v.pointsForts.trim())}</div>`:''}
    ${v.remarquesEquipe&&v.remarquesEquipe.trim()?`<div class="section-title">Remarques de l'équipe</div><div class="card card-pad" style="font-size:14px;white-space:pre-line">${esc(v.remarquesEquipe.trim())}</div>`:''}
    ${exportBtnsHtml()}
    <button class="btn btn-ghost" id="d-del" style="margin-top:6px;color:var(--nok)">Supprimer cette visite</button>
  </div>`;
  bindCommon();
  exportVisitBtns(()=>v).bind(app);
  $('#d-share').onclick=()=>shareMenu(v);
  $('#d-del').onclick=async()=>{if(confirm('Supprimer définitivement cette visite ? Les actions associées seront aussi supprimées.')){
    for(const act of state.cache.actions.filter(a=>a.visitId===v.id))await Store.del('actions',act.id);
    await Store.del('visits',v.id);await loadCache();toast('Visite supprimée');go('historique');}};
}

