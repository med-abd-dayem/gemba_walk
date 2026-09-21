"use strict";
/* ============================================================
   Configuration Firebase — À REMPLIR avec les valeurs de VOTRE
   projet (Console Firebase → Paramètres du projet → Général →
   "Vos applications" → configuration SDK).
   ============================================================ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCk61bF8InQI1RQhv6kUPw69xuJhA--pHY",
  authDomain: "gemba-walk-snim.firebaseapp.com",
  projectId: "gemba-walk-snim",
  storageBucket: "gemba-walk-snim.firebasestorage.app",
  messagingSenderId: "984436270119",
  appId: "1:984436270119:web:d055e4712206f13dca5a02",
};
const FIREBASE_CONFIGURED = !Object.values(FIREBASE_CONFIG).some(v => String(v).includes('REMPLACER_MOI'));

let auth = null, db = null;
if (FIREBASE_CONFIGURED) {
  firebase.initializeApp(FIREBASE_CONFIG);
  auth = firebase.auth();
  db = firebase.firestore();
  db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
}
