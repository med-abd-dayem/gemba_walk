# Gemba Walk — SNIM · Version modulaire (backend Firebase)

Application PWA de tournée Gemba. Le code est **découpé par rôle** pour une maintenance facile. Les données sont désormais **centralisées dans le cloud (Firebase)** : toute l'équipe voit les mêmes visites/actions, synchronisées automatiquement, y compris après une coupure réseau ponctuelle.

## Structure des fichiers

```
index.html                     ← page + inclusions (CSS/JS)
manifest.json                  ← infos d'installation
sw.js                          ← mode hors ligne (met en cache css + js + icônes)
css/
  styles.css                   ← tout le style
js/
  vendor/                      ← SDK Firebase auto-hébergé (compat, scripts classiques)
  00-firebase-config.js        ← configuration du projet Firebase (À REMPLIR, voir plus bas)
  00b-screen-login.js          ← écran de connexion (e-mail / mot de passe)
  01-utils.js                  ← helpers (dates, esc, photos, logo, visionneuse zoom)
  02-store.js                  ← stockage centralisé (Firestore, y compris les photos) + sync temps réel
  03-calc.js                   ← calculs (conformité, compteurs) + compression photo
  04-core.js                   ← routage + barre d'onglets
  05-screen-home.js            ← écran Accueil + stats par secteur
  06-screen-visit.js           ← nouvelle visite + saisie OK/NOK + résumé
  07-screen-history.js         ← historique + tendance + détail de visite
  08-reports.js                ← génération PDF + Excel + partage
  09-screen-actions.js         ← suivi des actions
  10-screen-settings.js        ← réglages + formulaires + secteurs + compte + migration
  11-app.js                    ← liaisons communes + démarrage (boot) + garde d'authentification
icon-192.png / icon-512.png / icon-maskable-512.png   ← icônes (GEMBA WALK)
```

Les fichiers JS se chargent **dans l'ordre** (vendor → 00 → 01 → 11) et partagent le même contexte.
Icône de l'écran d'accueil = **GEMBA WALK**. Logo **SNIM** conservé dans l'en-tête et les rapports.

## Configuration Firebase (obligatoire avant utilisation)

Reste entièrement sur le **forfait gratuit Spark** — aucune carte bancaire nécessaire (les photos sont stockées directement dans Firestore, pas dans Firebase Storage, qui lui exige le forfait payant Blaze).

**Un compte par membre** : l'app affiche un écran de connexion e-mail/mot de passe. C'est nécessaire car l'app est déployée sur une URL publique (GitHub Pages) — sans compte réel, n'importe qui trouvant le lien pourrait accéder aux données via l'authentification anonyme.

1. Créer un projet sur [console.firebase.google.com](https://console.firebase.google.com), puis activer :
   - **Firestore Database** (mode production)
   - **Authentication** → Sign-in method → activer **« Adresse e-mail/Mot de passe »**
   - **Important** : si le fournisseur **« Anonyme »** a été activé à un moment, le **désactiver** — sinon n'importe qui connaissant les clés publiques du projet (visibles dans le code) pourrait s'authentifier anonymement en contournant complètement l'écran de connexion.
2. Créer un compte (e-mail/mot de passe) pour chaque membre de l'équipe (Authentication → Users → Add user).
3. Copier la configuration du projet (Paramètres du projet → Général → « Vos applications » → icône `</>`) dans `js/00-firebase-config.js`, à la place des valeurs `REMPLACER_MOI`.
4. Dans Firestore → Rules, exiger un utilisateur connecté :
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
5. Recharger l'application : l'écran de connexion apparaît, chaque membre se connecte avec son compte.

**Limite à connaître** : chaque document Firestore est plafonné à 1 Mo. Les photos sont compressées (900 px, JPEG 60 %) avant stockage pour rester loin de cette limite, mais une visite avec un très grand nombre de photos pourrait théoriquement l'atteindre — un cas rare en usage normal.

Tant que `js/00-firebase-config.js` contient encore des valeurs `REMPLACER_MOI`, l'application affiche un message d'avertissement au lieu de l'écran de connexion.

## IMPORTANT — tester en local

Ne pas ouvrir `index.html` par double-clic (le mode `file://` bloque le chargement des modules et du service worker).
Utiliser **Live Server** dans VS Code (clic droit sur `index.html` → « Open with Live Server »), ou `npx serve`.

## Déployer / mettre à jour sur GitHub Pages

Dépôt : `https://github.com/med-abd-dayem/gemba_walk`

1. `git add -A && git commit -m "..." && git push` sur la branche `main`.
2. GitHub → Settings → Pages → Source **"Deploy from a branch"** → `main` / `/ (root)`.
3. URL publiée : `https://med-abd-dayem.github.io/gemba_walk/` (se met à jour automatiquement à chaque push, en général en 1-2 minutes).
4. Sur le téléphone : rouvre l'app et rafraîchis une fois pour que le service worker se mette à jour.

Le site publié est **public** (limite du plan gratuit GitHub) — la protection réelle des données vient des comptes Firebase (voir section Configuration Firebase ci-dessus), pas de la confidentialité du lien.

### Alternative : Netlify

Comme il y a plusieurs fichiers et dossiers (`css/`, `js/`), il faut **tout téléverser ensemble** :

1. Copier tout le dossier (avec `css/` et `js/`) dans ton projet local.
2. Netlify → ton projet → onglet **Deploys** → glisse le **dossier complet** dans la zone de dépôt.
3. Vérifie que `index.html` est bien à la racine, avec les dossiers `css/` et `js/` à côté.
4. Sur le téléphone : rouvre l'app et rafraîchis une fois (le service worker se met à jour en `gemba-v10`).

## Installer sur le téléphone (rappel)

- **Android (Chrome)** : menu ⋮ → « Installer l'application ».
- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».

## Sauvegarde des données

Données stockées **de façon centralisée dans Firebase (Firestore, y compris les photos)**, partagées et synchronisées automatiquement entre tous les membres connectés — plus besoin d'échanger un fichier `.json` entre téléphones. L'app continue de fonctionner **hors-ligne** (Firestore garde un cache local et resynchronise seul, photos comprises, au retour du réseau).

**Réglages → Sauvegarder maintenant** reste disponible comme copie de secours `.json` (utile si Firebase est temporairement injoignable). **Réglages → Importer d'anciennes données locales vers le cloud** sert une seule fois, pour récupérer sur un téléphone donné les visites qui avaient été saisies avant le passage à cette version (ancienne base IndexedDB locale).
