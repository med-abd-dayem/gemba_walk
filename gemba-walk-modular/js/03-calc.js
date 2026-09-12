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

/* ---------- Photos ---------- */
function compressImage(file){
  return new Promise((res)=>{
    const rd=new FileReader();
    rd.onload=()=>{const img=new Image();img.onload=()=>{
      const max=1280;let{width:w,height:h}=img;
      if(w>h&&w>max){h=h*max/w;w=max;}else if(h>max){w=w*max/h;h=max;}
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      res(cv.toDataURL('image/jpeg',.72));
    };img.src=rd.result;};
    rd.readAsDataURL(file);
  });
}

