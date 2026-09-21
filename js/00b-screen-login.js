"use strict";
/* ---------- Passerelle de connexion (connexion anonyme silencieuse) ----------
   Aucun formulaire : l'app se connecte seule à Firebase (Auth anonyme) au
   démarrage. Cet écran ne s'affiche que si la configuration est manquante
   ou si la connexion anonyme échoue (ex. non activée côté console, ou
   aucun réseau au tout premier lancement). */
function renderAuthGate(err){
  const notConfigured=!FIREBASE_CONFIGURED;
  app.innerHTML=`
  <header class="appbar"><h1>Gemba Walk</h1></header>
  <div class="screen">
    <div class="empty">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
      <p>${notConfigured?'Configuration Firebase manquante':'Connexion impossible'}</p>
      <span>${notConfigured
        ?'Renseignez js/00-firebase-config.js avec les identifiants de votre projet Firebase.'
        :'Vérifiez que la connexion anonyme est activée dans Firebase (Authentication → Sign-in method → Anonyme), et que vous êtes en ligne.'}</span>
    </div>
    ${!notConfigured?'<button class="btn btn-primary" id="ag-retry" style="margin-top:16px">Réessayer</button>':''}
  </div>`;
  const btn=$('#ag-retry');if(btn)btn.onclick=()=>{auth.signInAnonymously().catch(e=>renderAuthGate(e));};
}
