"use strict";
/* ---------- CONNEXION (Firebase Auth — lien envoyé par e-mail, sans mot de passe) ---------- */
const LOGIN_EMAIL_KEY='gembaLoginEmail';

function renderLogin(msg){
  app.innerHTML=`
  <header class="appbar"><h1>Gemba Walk <span class="sub">Connexion</span></h1></header>
  <div class="screen">
    ${!FIREBASE_CONFIGURED?`<div class="empty"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg><p>Configuration Firebase manquante</p><span>Renseignez js/00-firebase-config.js avec les identifiants de votre projet Firebase.</span></div>`:`
    <div class="card card-pad">
      <div class="field"><label>E-mail</label><input type="email" id="lg-email" autocomplete="username" placeholder="prenom.nom@snim.com"></div>
      ${msg?`<p style="color:var(--nok);font-size:13px;margin:4px 0 10px">${esc(msg)}</p>`:''}
      <button class="btn btn-primary" id="lg-submit">Recevoir le lien de connexion</button>
    </div>
    <p class="fab-note">Un lien de connexion vous sera envoyé par e-mail — ouvrez-le depuis ce téléphone pour vous connecter, sans mot de passe.</p>`}
  </div>`;
  if(!FIREBASE_CONFIGURED)return;
  const submit=async()=>{
    const email=$('#lg-email').value.trim();
    if(!email){renderLogin('Veuillez saisir votre e-mail');return;}
    const btn=$('#lg-submit');btn.textContent='Envoi…';btn.disabled=true;
    try{
      await auth.sendSignInLinkToEmail(email,{url:location.origin+location.pathname,handleCodeInApp:true});
      localStorage.setItem(LOGIN_EMAIL_KEY,email);
      renderLinkSent(email);
    }catch(e){renderLogin(loginErrorLabel(e));}
  };
  $('#lg-submit').onclick=submit;
  $('#lg-email').addEventListener('keydown',e=>{if(e.key==='Enter')submit();});
}

function renderLinkSent(email){
  app.innerHTML=`
  <header class="appbar"><h1>Gemba Walk <span class="sub">Connexion</span></h1></header>
  <div class="screen">
    <div class="empty">
      <svg viewBox="0 0 24 24"><path d="M3 8l9 6 9-6"/><path d="M3 6h18v12H3z"/></svg>
      <p>Vérifiez votre boîte mail</p>
      <span>Un lien de connexion a été envoyé à <b>${esc(email)}</b>. Ouvrez-le depuis ce même téléphone pour vous connecter.</span>
    </div>
    <button class="btn btn-ghost" id="lg-back" style="margin-top:16px">Utiliser une autre adresse</button>
  </div>`;
  $('#lg-back').onclick=()=>renderLogin();
}

/* Écran de confirmation si le lien est ouvert sur un autre appareil que celui
   qui l'a demandé (localStorage ne contient alors pas l'e-mail). */
function renderConfirmEmailForLink(){
  return new Promise(resolve=>{
    app.innerHTML=`
    <header class="appbar"><h1>Gemba Walk <span class="sub">Connexion</span></h1></header>
    <div class="screen">
      <div class="card card-pad">
        <div class="field"><label>Confirmez votre e-mail</label><input type="email" id="ce-email" autocomplete="username" placeholder="prenom.nom@snim.com"></div>
        <button class="btn btn-primary" id="ce-submit">Continuer</button>
      </div>
      <p class="fab-note">Ce lien a été ouvert sur un autre appareil que celui utilisé pour le demander — merci de reconfirmer votre e-mail.</p>
    </div>`;
    $('#ce-submit').onclick=()=>resolve($('#ce-email').value.trim());
    $('#ce-email').addEventListener('keydown',e=>{if(e.key==='Enter')resolve($('#ce-email').value.trim());});
  });
}

async function completeEmailLinkSignIn(){
  let email=localStorage.getItem(LOGIN_EMAIL_KEY);
  if(!email)email=await renderConfirmEmailForLink();
  try{
    await auth.signInWithEmailLink(email,location.href);
    localStorage.removeItem(LOGIN_EMAIL_KEY);
    history.replaceState({},document.title,location.pathname);
    return true;
  }catch(e){
    renderLogin(loginErrorLabel(e));
    return false;
  }
}

function loginErrorLabel(e){
  const c=(e&&e.code)||'';
  if(c.includes('invalid-email'))return 'Adresse e-mail invalide.';
  if(c.includes('invalid-action-code')||c.includes('expired-action-code'))return 'Ce lien est expiré ou déjà utilisé — redemandez-en un nouveau.';
  if(c.includes('too-many-requests'))return 'Trop de tentatives — réessayez plus tard.';
  if(c.includes('network-request-failed'))return 'Pas de connexion réseau — réessayez une fois en ligne.';
  return 'Connexion impossible. Réessayez.';
}
