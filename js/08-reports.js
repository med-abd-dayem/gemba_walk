"use strict";
/* ---------- PARTAGE ---------- */
function buildReport(v){
  const t=state.cache.templates.find(x=>x.id===v.templateId);
  const conf=conformity(v);const c=counts(v);
  let out=`GEMBA WALK — ${v.templateName}\n${v.code||''}\n${v.secteur?'Secteur : '+v.secteur+'\n':''}Date : ${frDate(v.date)}\nTour fait par : ${v.author||'—'}\n`;
  out+=`Conformité : ${conf==null?'—':conf+'%'}  |  OK ${c.ok} · NOK ${c.nok}\n`;
  out+=`\n— ÉCARTS RELEVÉS —\n`;
  let any=false;
  if(t)t.axes.forEach(a=>{a.criteria.forEach(cr=>{const r=v.results[cr.id];if(r&&r.status==='nok'){any=true;
    out+=`• [${a.name}] ${cr.label}`;
    if(r.gravite)out+=` (${r.gravite})`;
    if(r.urgence)out+=r.urgence==='urgente'?' — URGENT':' — non urgent';
    if(r.observation)out+=`\n   Obs : ${r.observation}`;
    out+='\n';}});});
  if(!any)out+='Aucun écart. Conforme.\n';
  if(v.pointsForts&&v.pointsForts.trim())out+=`\n— POINTS FORTS —\n${v.pointsForts.trim()}\n`;
  if(v.remarquesEquipe&&v.remarquesEquipe.trim())out+=`\n— REMARQUES DE L'ÉQUIPE —\n${v.remarquesEquipe.trim()}\n`;
  out+=`\nRapport généré via l'application Gemba Walk.`;
  return out;
}
async function shareVisit(v){
  const text=buildReport(v);const title=`Gemba Walk — ${v.templateName} (${frDate(v.date)})`;
  if(navigator.share){try{await navigator.share({title,text});return;}catch(e){if(e&&e.name==='AbortError')return;}}
  // repli : e-mail
  const url='mailto:?subject='+encodeURIComponent(title)+'&body='+encodeURIComponent(text);
  try{window.location.href=url;}catch(e){}
  try{await navigator.clipboard.writeText(text);toast('Rapport copié');}catch(e){}
}

/* ---------- EXPORT : Excel (.xlsx natif) + PDF (impression) ---------- */
const _crcTable=(()=>{let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=_crcTable[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function _sb(s){return new TextEncoder().encode(s);}
function _dataUrlToBytes(u){const m=/^data:([^;]+);base64,(.*)$/.exec(u||'');if(!m)return null;const bin=atob(m[2]);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);const ext=/png/i.test(m[1])?'png':/jpe?g/i.test(m[1])?'jpeg':'png';return{bytes:a,ext};}
function zipStore(files){
  const parts=[],central=[];let offset=0;const time=0,date=((2020-1980)<<9)|(1<<5)|1;
  for(const f of files){
    const nameB=_sb(f.name),data=f.data,crc=crc32(data);
    const lh=new Uint8Array(30+nameB.length),dv=new DataView(lh.buffer);
    dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0x0800,true);dv.setUint16(8,0,true);
    dv.setUint16(10,time,true);dv.setUint16(12,date,true);dv.setUint32(14,crc,true);
    dv.setUint32(18,data.length,true);dv.setUint32(22,data.length,true);dv.setUint16(26,nameB.length,true);
    lh.set(nameB,30);parts.push(lh,data);
    const ch=new Uint8Array(46+nameB.length),cv=new DataView(ch.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);
    cv.setUint16(10,0,true);cv.setUint16(12,time,true);cv.setUint16(14,date,true);cv.setUint32(16,crc,true);
    cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,nameB.length,true);
    cv.setUint32(42,offset,true);ch.set(nameB,46);central.push(ch);
    offset+=lh.length+data.length;
  }
  const cSize=central.reduce((n,c)=>n+c.length,0);
  const end=new Uint8Array(22),ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);
  ev.setUint32(12,cSize,true);ev.setUint32(16,offset,true);
  const all=[...parts,...central,end];const total=all.reduce((n,c)=>n+c.length,0);
  const out=new Uint8Array(total);let p=0;for(const c of all){out.set(c,p);p+=c.length;}return out;
}
function _colRef(n){let s='';n++;while(n){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-1-m)/26;}return s;}
function _cellXml(r,ci,cell){
  const ref=_colRef(ci)+r;
  if(cell==null||cell==='')return `<c r="${ref}"/>`;
  let v=cell,s='';if(typeof cell==='object'){v=cell.v;if(cell.s)s=` s="${cell.s}"`;}
  if(typeof v==='number'&&isFinite(v))return `<c r="${ref}"${s}><v>${v}</v></c>`;
  const t=String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${t}</t></is></c>`;
}
function _sheetXml(sheet){const rows=sheet.rows||[];const rh=sheet.rowHeights||{};
  let cols='';if(sheet.cols&&sheet.cols.length){cols='<cols>'+sheet.cols.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')+'</cols>';}
  let body='';rows.forEach((row,ri)=>{const r=ri+1;const h=rh[r]?` ht="${rh[r]}" customHeight="1"`:'';let cells='';(row||[]).forEach((cell,ci)=>cells+=_cellXml(r,ci,cell));body+=`<row r="${r}"${h}>${cells}</row>`;});
  const af=sheet.autofilter?`<autoFilter ref="${sheet.autofilter}"/>`:'';
  const mg=(sheet.merges&&sheet.merges.length)?`<mergeCells count="${sheet.merges.length}">${sheet.merges.map(m=>`<mergeCell ref="${m}"/>`).join('')}</mergeCells>`:'';
  const dr=sheet._drawing?`<drawing r:id="${sheet._drawing}"/>`:'';
  const spr=sheet.fit?'<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>':'';
  const ps=sheet.fit?'<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="portrait" fitToWidth="1" fitToHeight="0"/>':'';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${spr}${cols}<sheetData>${body}</sheetData>${af}${mg}${ps}${dr}</worksheet>`;}
function xlsxBlob(sheets){
  const f=[],e=_sb;let mediaCount=0,hasImg=false;const media=[];
  sheets.forEach((s,si)=>{if(s.images&&s.images.length){hasImg=true;const di=si+1;let anchors='';const rels=[];
    s.images.forEach((im,k)=>{const b=_dataUrlToBytes(im.dataUrl);if(!b)return;mediaCount++;const mn='image'+mediaCount+'.'+b.ext;media.push({name:'xl/media/'+mn,data:b.bytes});const rid='rId'+(k+1);
      rels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mn}"/>`);
      const cx=Math.round((im.wpx||110)*9525),cy=Math.round((im.hpx||82)*9525),colOff=Math.round((im.colOffPx!=null?im.colOffPx:3)*9525),rowOff=Math.round((im.rowOffPx!=null?im.rowOffPx:3)*9525);
      anchors+=`<xdr:oneCellAnchor><xdr:from><xdr:col>${im.col}</xdr:col><xdr:colOff>${colOff}</xdr:colOff><xdr:row>${im.row}</xdr:row><xdr:rowOff>${rowOff}</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${k+1}" name="Photo ${k+1}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;});
    f.push({name:`xl/drawings/drawing${di}.xml`,data:e(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors}</xdr:wsDr>`)});
    f.push({name:`xl/drawings/_rels/drawing${di}.xml.rels`,data:e(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`)});
    f.push({name:`xl/worksheets/_rels/sheet${si+1}.xml.rels`,data:e(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${di}.xml"/></Relationships>`)});
    s._drawing='rIdDr';}});
  const drawOv=sheets.map((s,i)=>(s.images&&s.images.length)?`<Override PartName="/xl/drawings/drawing${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`:'').join('');
  const imgDef=hasImg?`<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>`:'';
  f.push({name:'[Content_Types].xml',data:e(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${imgDef}<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}${drawOv}</Types>`)});
  f.push({name:'_rels/.rels',data:e(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)});
  f.push({name:'xl/workbook.xml',data:e(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${String(s.name).replace(/[\\\/?*\[\]:]/g,' ').slice(0,31)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`)});
  f.push({name:'xl/_rels/workbook.xml.rels',data:e(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)});
  f.push({name:'xl/styles.xml',data:e(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="6"><font><sz val="11"/><name val="Calibri"/><color rgb="FF16232E"/></font><font><b/><sz val="11"/><color rgb="FF1B3140"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF1B3140"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF1E8E5A"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFD63A2E"/><name val="Calibri"/></font></fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2C4A63"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE4F3EB"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFBE7E4"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4F6F8"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFDCE2E8"/></left><right style="thin"><color rgb="FFDCE2E8"/></right><top style="thin"><color rgb="FFDCE2E8"/></top><bottom style="thin"><color rgb="FFDCE2E8"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="5" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`)});
  sheets.forEach((s,i)=>f.push({name:`xl/worksheets/sheet${i+1}.xml`,data:e(_sheetXml(s))}));
  media.forEach(m=>f.push(m));
  return new Blob([zipStore(f)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
const _safe=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w\-]+/g,'_').slice(0,40);
async function shareFile(blob,filename){
  try{const file=new File([blob],filename,{type:blob.type});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:filename});return;}
  }catch(e){if(e&&e.name==='AbortError')return;}
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);toast('Fichier téléchargé');
}
function visitToXlsx(v){
  const t=state.cache.templates.find(x=>x.id===v.templateId);const conf=conformity(v);const c=counts(v);
  const T=x=>({v:x,s:2}),L=x=>({v:x,s:1}),Hd=x=>({v:x,s:3}),D=x=>({v:x,s:7}),AX=x=>({v:x,s:6});
  const NC=6; // colonnes A..F : Élément, Statut, Observation, Gravité, Urgence, Photo
  const rows=[],merges=[],images=[],rowHeights={};
  const blank=()=>rows.push([]);
  const full=(cell)=>{const r=[cell];for(let i=1;i<NC;i++)r.push('');rows.push(r);merges.push(`A${rows.length}:F${rows.length}`);};
  // Bandeau titre + référence (comme le PDF)
  full(T('Rapport Gemba Walk — '+v.templateName));
  full({v:v.code||'',s:0});
  blank();
  rows.push([L('Date :'),{v:frDate(v.date)},'',L('Tour fait par :'),{v:v.author||'—'},'']);
  rows.push([L('Secteur :'),{v:v.secteur||'—'},'',L('Conformité :'),{v:conf==null?'—':conf+'%',s:conf!=null&&conf<70?5:4},'']);
  rows.push([L('OK / NOK :'),{v:c.ok+' / '+c.nok},'','','','']);
  blank();
  // Tableaux par axe (comme le PDF)
  if(t)t.axes.forEach(a=>{
    full(AX(a.name));
    rows.push([Hd('Élément'),Hd('Statut'),Hd('Observation'),Hd('Gravité'),Hd('Urgence'),Hd('Photo')]);
    a.criteria.forEach(cr=>{const r=v.results[cr.id]||{};
      const st=r.status?(r.status==='na'?'N/A':r.status.toUpperCase()):'—';const ss=r.status==='ok'?4:r.status==='nok'?5:7;
      rows.push([D(cr.label),{v:st,s:ss},D(r.observation||''),D(r.gravite||''),D(r.urgence==='urgente'?'Urgente':r.urgence==='non_urgente'?'Non urgente':''),D('')]);
      const phs=getPhotos(r);
      if(phs.length){const ri=rows.length;const w=100,h=74,gap=6;rowHeights[ri]=Math.round(h*0.78)+8;phs.forEach((p,k)=>images.push({dataUrl:p,col:5,row:ri-1,wpx:w,hpx:h,colOffPx:3+k*(w+gap)}));}
    });
    blank();
  });
  // Points forts + remarques (comme le PDF)
  if(v.pointsForts&&v.pointsForts.trim()){full(AX('Points forts'));v.pointsForts.trim().split('\n').forEach(l=>{if(l.trim())full(D(l.trim()));});blank();}
  if(v.remarquesEquipe&&v.remarquesEquipe.trim()){full(AX('Remarques de l\'équipe'));full(D(v.remarquesEquipe.trim()));}
  return xlsxBlob([{name:'Rapport',rows,cols:[30,10,42,12,13,18],merges,images,rowHeights,fit:true}]);
}
function actionsToXlsx(){
  const Hd=x=>({v:x,s:3}),D=x=>({v:x,s:7});
  const rows=[[Hd('Date visite'),Hd('Secteur'),Hd('Formulaire'),Hd('Axe'),Hd('Élément'),Hd('Observation'),Hd('Gravité'),Hd('Urgence'),Hd('Photo'),Hd('Responsable'),Hd('Échéance'),Hd('Statut'),Hd('En retard')]];
  state.cache.actions.forEach(a=>{const late=a.statut==='ouverte'&&a.echeance&&a.echeance<todayISO();const ss=a.statut==='terminee'?4:late?5:7;
    rows.push([D(frDate(a.date)),D(a.secteur||''),D(a.templateName),D(a.axeName),D(a.critLabel),D(a.observation||''),D(a.gravite||''),D(a.urgence==='urgente'?'Urgente':a.urgence==='non_urgente'?'Non urgente':''),D(getPhotos(a).length?'Oui':'Non'),D(a.responsable||''),D(a.echeance?frDate(a.echeance):''),{v:a.statut==='terminee'?'Clôturée':'Ouverte',s:ss},D(late?'OUI':'')]);});
  return xlsxBlob([{name:'Actions',rows,cols:[12,16,18,22,24,34,11,13,7,16,12,11,10],autofilter:'A1:M'+rows.length}]);
}
function visitToPrintable(v){
  const t=state.cache.templates.find(x=>x.id===v.templateId);const conf=conformity(v);const c=counts(v);let ax='';
  if(t)t.axes.forEach(a=>{ax+=`<h3>${esc(a.name)}</h3><table><thead><tr><th style="width:24%">Élément</th><th>Statut</th><th style="width:28%">Observation</th><th>Gravité</th><th>Urgence</th><th>Photo</th></tr></thead><tbody>`;
    a.criteria.forEach(cr=>{const r=v.results[cr.id]||{};const st=r.status?(r.status==='na'?'N/A':r.status.toUpperCase()):'—';const cls=r.status==='ok'?'ok':r.status==='nok'?'nok':'';const urg=r.urgence==='urgente'?'Urgente':r.urgence==='non_urgente'?'Non urgente':'';const ph=getPhotos(r).map(p=>`<img src="${p}" style="max-width:88px;max-height:66px;border:1px solid #DCE2E8;border-radius:4px;display:inline-block;margin:0 3px 3px 0">`).join('');ax+=`<tr><td>${esc(cr.label)}</td><td class="${cls}">${st}</td><td>${esc(r.observation||'')}</td><td>${esc(r.gravite||'')}</td><td>${urg}</td><td>${ph}</td></tr>`;});ax+='</tbody></table>';});
  const forts=(v.pointsForts&&v.pointsForts.trim())?`<h3>Points forts</h3><ul style="margin:4px 0 8px 18px;font-size:12px">${v.pointsForts.trim().split('\n').filter(l=>l.trim()).map(l=>`<li>${esc(l.trim())}</li>`).join('')}</ul>`:'';
  const rem=(v.remarquesEquipe&&v.remarquesEquipe.trim())?`<h3>Remarques de l'équipe</h3><p style="font-size:12px;margin:4px 0 8px">${esc(v.remarquesEquipe.trim())}</p>`:'';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Gemba Walk — ${esc(v.templateName)}</title><style>*{font-family:Arial,Helvetica,sans-serif;color:#16232E;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:22px}.hd{border-bottom:3px solid #2C4A63;padding-bottom:10px;margin-bottom:12px}.hd h1{margin:0;font-size:19px;color:#1B3140}.hd .ref{color:#5A6B78;font-size:12px;margin-top:3px}.meta{font-size:13px;margin:8px 0}.meta b{color:#5A6B78}.kpis{display:flex;gap:10px;margin:12px 0}.kpi{border:1px solid #DCE2E8;border-radius:8px;padding:8px 14px;font-size:12px;color:#5A6B78}.kpi .v{font-size:20px;font-weight:700;color:#16232E}.conf{color:${conf!=null&&conf<70?'#D63A2E':'#1E8E5A'}!important}h3{font-size:13px;color:#1B3140;margin:16px 0 6px;border-left:4px solid #2C4A63;padding-left:8px}table{width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:4px}th,td{border:1px solid #DCE2E8;padding:5px 7px;text-align:left;vertical-align:top}th{background:#F4F6F8;font-size:11px}td.ok{color:#1E8E5A;font-weight:700}td.nok{color:#D63A2E;font-weight:700}.sig img{border:1px solid #DCE2E8;border-radius:6px;max-width:200px;margin-top:4px}.ft{margin-top:22px;color:#8A98A4;font-size:10px;border-top:1px solid #DCE2E8;padding-top:8px}@media print{body{margin:12mm}h3{page-break-after:avoid}tr{page-break-inside:avoid}}</style></head><body><div class="hd"><h1>Rapport Gemba Walk — ${esc(v.templateName)}</h1><div class="ref">${esc(v.code||'')}</div></div><div class="meta"><b>Date :</b> ${frDate(v.date)} &nbsp;&nbsp; <b>Tour fait par :</b> ${esc(v.author||'—')}${v.secteur?' &nbsp;&nbsp; <b>Secteur :</b> '+esc(v.secteur):''}</div><div class="kpis"><div class="kpi">Conformité<div class="v conf">${conf==null?'—':conf+'%'}</div></div><div class="kpi">OK / NOK<div class="v">${c.ok} / ${c.nok}</div></div></div>${ax}${forts}${rem}<div class="ft">Généré via l'application Gemba Walk — SNIM · ${frDate(todayISO())}</div></body></html>`;
}
function exportPDF(v){
  const html=visitToPrintable(v);
  const w=window.open('','_blank');
  if(!w){toast('Autorisez les pop-ups pour le PDF');return;}
  w.document.open();w.document.write(html);w.document.close();
  setTimeout(()=>{try{w.focus();w.print();}catch(e){}},600);
}
function exportVisitBtns(getV){
  return {
    bind(scope){
      const p=scope.querySelector('[data-exp="pdf"]');if(p)p.onclick=()=>exportPDF(getV());
      const x=scope.querySelector('[data-exp="xlsx"]');if(x)x.onclick=()=>{const v=getV();shareFile(visitToXlsx(v),'Gemba_'+_safe(v.templateName)+'_'+v.date+'.xlsx');};
      const t=scope.querySelector('[data-exp="txt"]');if(t)t.onclick=()=>shareVisit(getV());
    }
  };
}
function exportBtnsHtml(){
  return `<div class="section-title">Exporter le rapport</div><div class="row-btns" style="margin-bottom:14px"><button class="btn btn-ghost btn-sm" data-exp="pdf">PDF</button><button class="btn btn-ghost btn-sm" data-exp="xlsx">Excel</button><button class="btn btn-ghost btn-sm" data-exp="txt">Texte</button></div>`;
}
function shareMenu(v){
  const bg=document.createElement('div');bg.className='modal-bg';
  bg.innerHTML=`<div class="modal"><h3>Partager le rapport</h3>
    <button class="btn btn-primary" data-m="pdf" style="margin-bottom:10px">Rapport PDF</button>
    <button class="btn btn-dark" data-m="xlsx" style="margin-bottom:10px">Rapport Excel</button>
    <button class="btn btn-ghost" data-m="txt" style="margin-bottom:10px">Texte (e-mail / WhatsApp)</button>
    <button class="btn btn-ghost" data-m="close" style="color:var(--ink-soft)">Annuler</button></div>`;
  document.body.appendChild(bg);
  const close=()=>bg.remove();
  bg.addEventListener('click',e=>{if(e.target===bg)close();});
  bg.querySelector('[data-m="pdf"]').onclick=()=>{close();exportPDF(v);};
  bg.querySelector('[data-m="xlsx"]').onclick=()=>{close();shareFile(visitToXlsx(v),'Gemba_'+_safe(v.templateName)+'_'+v.date+'.xlsx');};
  bg.querySelector('[data-m="txt"]').onclick=()=>{close();shareVisit(v);};
  bg.querySelector('[data-m="close"]').onclick=close;
}

