"use strict";
/* ============================================================
   ROUTAGE / RENDU
   ============================================================ */
const app=$('#app');
function go(screen){state.screen=screen;render();window.scrollTo(0,0);}
function render(){
  const s=state.screen;
  if(s==='accueil')return renderAccueil();
  if(s==='nouvelle')return renderNouvelle();
  if(s==='visite')return renderVisite();
  if(s==='resume')return renderResume();
  if(s==='historique')return renderHistorique();
  if(s==='visitDetail')return renderVisitDetail();
  if(s==='actions')return renderActions();
  if(s==='reglages')return renderReglages();
  if(s==='template')return renderTemplateEdit();
}
function tabbar(active){
  const openActions=state.cache.actions.filter(a=>a.statut==='ouverte').length;
  const T=(id,label,path,dot)=>`<button data-tab="${id}" class="${active===id?'active':''}" style="position:relative">
    ${dot?'<span class="dot"></span>':''}<svg viewBox="0 0 24 24">${path}</svg>${label}</button>`;
  return `<nav class="tabbar">
    ${T('accueil','Accueil','<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>')}
    ${T('actions','Actions','<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',openActions>0)}
    ${T('historique','Historique','<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')}
    ${T('reglages','Réglages','<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2l-.4-2.6H9.9l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h4.2l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6A7 7 0 0 0 19 12z"/>')}
  </nav>`;
}

