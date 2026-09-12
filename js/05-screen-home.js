"use strict";
/* ---------- ACCUEIL ---------- */
function renderAccueil(){
  const visits=state.cache.visits.filter(v=>v.status==='termine');
  const last=visits[0];
  const lastConf=last?conformity(last):null;
  const openA=state.cache.actions.filter(a=>a.statut==='ouverte');
  const lateA=openA.filter(a=>a.echeance&&a.echeance<todayISO());
  const rec=recurrents();
  app.innerHTML=`
  <header class="appbar"><span class="brand"><img src="${LOGO_SNIM}" alt="SNIM"></span><h1>Gemba Walk <span class="jp">現場</span><br><span class="sub">SNIM · Tournée terrain</span></h1></header>
  <div class="screen">
    <div class="hero">
      <div class="lead">Réalisez votre tournée terrain, relevez les écarts et suivez les actions jusqu'à leur clôture.</div>
      <button class="btn" data-go="nouvelle">＋ Nouvelle visite</button>
    </div>

    <div class="stats">
      <div class="tile ${lastConf!=null&&lastConf<70?'alert':lastConf!=null?'good':''}">
        <div class="k">Dernière conformité</div>
        <div class="v">${lastConf!=null?lastConf+'<small>%</small>':'—'}</div>
      </div>
      <div class="tile ${lateA.length?'alert':''}">
        <div class="k">Actions ouvertes</div>
        <div class="v">${openA.length}${lateA.length?` <small style="color:var(--nok)">· ${lateA.length} en retard</small>`:''}</div>
      </div>
    </div>

    ${lateA.length?`<div class="recurrent" data-goto-retard style="background:var(--nok-bg);border-color:#f0b8b2;cursor:pointer">
      <span class="ic" style="color:var(--nok)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>
      <div style="flex:1"><div class="rt" style="color:var(--nok)">${lateA.length} action(s) en retard</div><div class="rm" style="color:#8a2f27">À traiter en priorité — appuyez pour voir</div></div>
      <span class="chev" style="color:var(--nok);align-self:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span>
    </div>`:''}

    ${rec.length?`<div class="section-title">Problèmes récurrents</div>
      ${rec.map(r=>`<div class="recurrent">
        <span class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg></span>
        <div><div class="rt">${esc(r.label)}</div><div class="rm">Signalé NOK ${r.count} fois · ${esc(r.template)}</div></div>
      </div>`).join('')}`:''}

    ${(()=>{const ss=sectorStats();return ss.length?`<div class="section-title">Conformité par secteur</div><div class="card">${ss.map(s=>`<div class="lrow" data-sect-go="${esc(s.secteur)}"><div class="main"><div class="t">${esc(s.secteur)}</div><div class="m">${s.n} visite(s)${s.open?' · '+s.open+' action(s) ouverte(s)':''}</div></div><span class="badge ${s.conf==null?'g-amber':s.conf>=85?'g-ok':s.conf>=70?'g-amber':'g-nok'}">${s.conf==null?'—':s.conf+'%'}</span><span class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span></div>`).join('')}</div>`:'';})()}

    ${(()=>{const d=(typeof backupDaysAgo==='function')?backupDaysAgo():null;const need=(d===null||d>=3)&&visits.length>0;return need?`<div class="recurrent" data-do-backup style="background:var(--amber-bg);border-color:#f0d9a8;cursor:pointer">
      <span class="ic" style="color:var(--amber)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg></span>
      <div style="flex:1"><div class="rt" style="color:#8a5a10">Sauvegarde recommandée</div><div class="rm" style="color:#8a5a10">${d===null?'Aucune sauvegarde encore effectuée':'Dernière sauvegarde il y a '+d+' jours'} — appuyez pour sauvegarder</div></div>
      <span class="chev" style="color:var(--amber);align-self:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span>
    </div>`:'';})()}

    <div class="section-title">Dernières visites</div>
    ${visits.length?`<div class="card">${visits.slice(0,4).map(v=>visitRow(v)).join('')}</div>`
      :`<div class="empty"><svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg><p>Aucune visite pour le moment</p><span>Commencez votre première tournée Gemba.</span></div>`}
  </div>
  ${tabbar('accueil')}`;
  bindCommon();
  const gr=$('[data-goto-retard]');if(gr)gr.onclick=()=>{_actFilter='retard';go('actions');};
  const bkp=$('[data-do-backup]');if(bkp)bkp.onclick=async()=>{if(typeof shareBackup==='function'){await shareBackup();render();}};
  app.querySelectorAll('[data-sect-go]').forEach(b=>b.onclick=()=>{_histSect=b.getAttribute('data-sect-go');go('historique');});
}
function sectorStats(){
  const done=state.cache.visits.filter(v=>v.status==='termine'&&v.secteur);
  const map={};
  done.forEach(v=>{const k=v.secteur;const c=conformity(v);(map[k]=map[k]||{secteur:k,sum:0,cnt:0,n:0});map[k].n++;if(c!=null){map[k].sum+=c;map[k].cnt++;}});
  state.cache.actions.filter(a=>a.statut==='ouverte'&&a.secteur).forEach(a=>{if(map[a.secteur])map[a.secteur].open=(map[a.secteur].open||0)+1;});
  return Object.values(map).map(x=>({secteur:x.secteur,n:x.n,open:x.open||0,conf:x.cnt?Math.round(x.sum/x.cnt):null})).sort((a,b)=>(a.conf??999)-(b.conf??999));
}
function visitRow(v){
  const c=conformity(v);
  const cls=c==null?'g-amber':c>=85?'g-ok':c>=70?'g-amber':'g-nok';
  return `<div class="lrow" data-visit="${v.id}">
    <div class="main"><div class="t">${esc(v.templateName)}</div>
      <div class="m">${v.secteur?esc(v.secteur)+' · ':''}${frDate(v.date)}${v.author?' · '+esc(v.author):''}</div></div>
    <span class="badge ${cls}">${c==null?'—':c+'%'}</span>
    <span class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span>
  </div>`;
}
function recurrents(){
  const map={};
  state.cache.visits.filter(v=>v.status==='termine').slice(0,8).forEach(v=>{
    const t=state.cache.templates.find(x=>x.id===v.templateId); if(!t)return;
    t.axes.forEach(a=>a.criteria.forEach(cr=>{
      const r=v.results&&v.results[cr.id];
      if(r&&r.status==='nok'){const k=v.templateId+'|'+cr.label;(map[k]=map[k]||{label:cr.label,template:v.templateName,count:0}).count++;}
    }));
  });
  return Object.values(map).filter(x=>x.count>=2).sort((a,b)=>b.count-a.count).slice(0,4);
}

