"use strict";
/* ---------- CONNEXION (Firebase Auth) ---------- */
function renderLogin(msg){
  app.innerHTML=`
  <header class="appbar"><h1>Gemba Walk <span class="sub">Connexion</span></h1></header>
  <div class="screen">
    ${!FIREBASE_CONFIGURED?`<div class="empty"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg><p>Configuration Firebase manquante</p><span>Renseignez js/00-firebase-config.js avec les identifiants de votre projet Firebase.</span></div>`:`
    <div class="card card-pad">
      <div class="field"><label>E-mail</label><input type="email" id="lg-email" autocomplete="username" placeholder="prenom.nom@snim.mr"></div>
      <div class="field"><label>Mot de passe</label><input type="password" id="lg-pass" autocomplete="current-password" placeholder="••••••••"></div>
      ${msg?`<p style="color:var(--nok);font-size:13px;margin:4px 0 10px">${esc(msg)}</p>`:''}
      <button class="btn btn-primary" id="lg-submit">Se connecter</button>
    </div>`}
  </div>`;
  if(!FIREBASE_CONFIGURED)return;
  const submit=async()=>{
    const email=$('#lg-email').value.trim(),pass=$('#lg-pass').value;
    if(!email||!pass){renderLogin('Veuillez saisir e-mail et mot de passe');return;}
    const btn=$('#lg-submit');btn.textContent='Connexion…';btn.disabled=true;
    try{await auth.signInWithEmailAndPassword(email,pass);}
    catch(e){renderLogin(loginErrorLabel(e));}
  };
  $('#lg-submit').onclick=submit;
  $('#lg-pass').addEventListener('keydown',e=>{if(e.key==='Enter')submit();});
}
function loginErrorLabel(e){
  const c=(e&&e.code)||'';
  if(c.includes('wrong-password')||c.includes('user-not-found')||c.includes('invalid-credential'))return 'E-mail ou mot de passe incorrect.';
  if(c.includes('too-many-requests'))return 'Trop de tentatives — réessayez plus tard.';
  if(c.includes('network-request-failed'))return 'Pas de connexion réseau — réessayez une fois en ligne.';
  return 'Connexion impossible. Réessayez.';
}
