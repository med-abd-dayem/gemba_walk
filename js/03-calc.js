"use strict";
/* ---------- Calculs ---------- */
function conformity(visit){
  let ok=0,nok=0;
  Object.values(visit.results||{}).forEach(r=>{if(r.status==='ok')ok++;else if(r.status==='nok')nok++;});
  const tot=ok+nok; return tot?Math.round(ok/tot*100):null;
}
function counts(visit){
  let ok=0,nok=0,na=0,ans=0,total=0;
  const t=state.cache.templates.find(x=>x.id===visit.templateId);
  if(t)t.axes.forEach(a=>a.criteria.forEach(()=>total++));
  Object.values(visit.results||{}).forEach(r=>{if(r.status){ans++;if(r.status==='ok')ok++;if(r.status==='nok')nok++;if(r.status==='na')na++;}});
  return {ok,nok,na,ans,total};
}

/* ---------- Photos ----------
   Compression plus forte que la version Storage : les photos sont stockées
   telles quelles (base64) dans les documents Firestore (limite 1 Mo/doc). */
function compressImage(file){
  return new Promise((res)=>{
    const rd=new FileReader();
    rd.onload=()=>{const img=new Image();img.onload=()=>{
      const max=900;let{width:w,height:h}=img;
      if(w>h&&w>max){h=h*max/w;w=max;}else if(h>max){w=w*max/h;h=max;}
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      res(cv.toDataURL('image/jpeg',.6));
    };img.src=rd.result;};
    rd.readAsDataURL(file);
  });
}

/* ---------- Statistiques par axe (agrégées sur des visites terminées) ---------- */
function axisStats(visits){
  const map={};
  (visits||[]).forEach(v=>{
    if(v.status!=='termine')return;
    const t=state.cache.templates.find(x=>x.id===v.templateId);
    if(!t)return;
    t.axes.forEach(a=>{
      const m=(map[a.name]=map[a.name]||{name:a.name,ok:0,nok:0});
      a.criteria.forEach(cr=>{const r=v.results&&v.results[cr.id];if(r){if(r.status==='ok')m.ok++;else if(r.status==='nok')m.nok++;}});
    });
  });
  return Object.values(map).map(m=>{const tot=m.ok+m.nok;return{name:m.name,ok:m.ok,nok:m.nok,tot,conf:tot?Math.round(m.ok/tot*100):null};})
    .filter(m=>m.tot>0).sort((a,b)=>(a.conf??101)-(b.conf??101));
}
/* Donut SVG : proportion OK (vert) / NOK (rouge) + % au centre */
function donutSVG(conf,ok,nok){
  const tot=ok+nok;const r=42,c=2*Math.PI*r,cx=50,cy=50;
  const okFrac=tot?ok/tot:0;const okLen=c*okFrac;
  const col=conf==null?'#8A98A4':conf>=85?'#1E8E5A':conf>=70?'#E08A2B':'#D63A2E';
  return `<svg viewBox="0 0 100 100" width="96" height="96">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#FBE7E4" stroke-width="12"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1E8E5A" stroke-width="12"
      stroke-dasharray="${okLen} ${c-okLen}" stroke-dashoffset="${c*0.25}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>
    <text x="50" y="49" text-anchor="middle" font-size="20" font-weight="700" fill="${col}">${conf==null?'—':conf}</text>
    <text x="50" y="64" text-anchor="middle" font-size="10" fill="#8A98A4">${conf==null?'':'%'}</text>
  </svg>`;
}
