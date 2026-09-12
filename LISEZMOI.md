# Gemba Walk — SNIM · Version modulaire

Application PWA de tournée Gemba. Le code est désormais **découpé par rôle** pour une maintenance facile. Le comportement est **identique** à la version précédente.

## Structure des fichiers

```
index.html                     ← page + inclusions (CSS/JS)
manifest.json                  ← infos d'installation
sw.js                          ← mode hors ligne (met en cache css + js + icônes)
css/
  styles.css                   ← tout le style
js/
  01-utils.js                  ← helpers (dates, esc, photos, logo, visionneuse zoom)
  02-store.js                  ← base locale (IndexedDB) + modèle par défaut + secteurs
  03-calc.js                   ← calculs (conformité, compteurs) + compression photo
  04-core.js                   ← routage + barre d'onglets
  05-screen-home.js            ← écran Accueil + stats par secteur
  06-screen-visit.js           ← nouvelle visite + saisie OK/NOK + résumé
  07-screen-history.js         ← historique + tendance + détail de visite
  08-reports.js                ← génération PDF + Excel + partage
  09-screen-actions.js         ← suivi des actions
  10-screen-settings.js        ← réglages + formulaires + secteurs + duplication
  11-app.js                    ← liaisons communes + démarrage (boot)
icon-192.png / icon-512.png / icon-maskable-512.png   ← icônes (GEMBA WALK)
```

Les fichiers JS se chargent **dans l'ordre** (01 → 11) et partagent le même contexte.
Icône de l'écran d'accueil = **GEMBA WALK**. Logo **SNIM** conservé dans l'en-tête et les rapports.

## IMPORTANT — tester en local

Ne pas ouvrir `index.html` par double-clic (le mode `file://` bloque le chargement des modules et du service worker).
Utiliser **Live Server** dans VS Code (clic droit sur `index.html` → « Open with Live Server »), ou `npx serve`.

## Déployer / mettre à jour sur Netlify

Comme il y a maintenant plusieurs fichiers et dossiers (`css/`, `js/`), il faut **tout téléverser ensemble** :

1. Copier tout le dossier (avec `css/` et `js/`) dans ton projet local.
2. Netlify → ton projet → onglet **Deploys** → glisse le **dossier complet** dans la zone de dépôt.
3. Vérifie que `index.html` est bien à la racine, avec les dossiers `css/` et `js/` à côté.
4. Sur le téléphone : rouvre l'app et rafraîchis une fois (le service worker se met à jour en `gemba-v2`).

## Installer sur le téléphone (rappel)

- **Android (Chrome)** : menu ⋮ → « Installer l'application ».
- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».

## Sauvegarde des données

Données stockées **localement** sur chaque téléphone. Pense à **Réglages → Exporter une sauvegarde (.json)** régulièrement.
