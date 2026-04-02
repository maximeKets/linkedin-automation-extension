# Registre des Décisions d'Architecture (ADR)
**Projet :** Automate LinkedIn Furtif

Ce document trace les décisions techniques structurantes du projet. Chaque décision suit le format : Contexte -> Décision -> Conséquences.

---

## ADR-001 : Stack Front-end et Build (Extension MV3)

**Date :** 2026-04-01
**Statut :** Approuvé

**Contexte :** L'environnement Chrome Extension Manifest V3 impose des contraintes de sécurité (CSP strictes, pas de code distant) et de cycle de vie (Service Workers éphémères). La popup doit s'ouvrir instantanément. L'expérience développeur nécessite du Hot Module Replacement (HMR) pour itérer vite.

**Décision :** Nous utilisons **Vite + @crxjs/vite-plugin** avec **Preact** et **TypeScript**.

**Conséquences :**
* **✓ Correct :** Preact pèse ~3kB, garantissant un montage DOM de la popup sans latence perçue, contrairement à React lourd.
* **✓ Correct :** TypeScript est obligatoire pour typer les contrats de données de `chrome.storage` et les promesses asynchrones du DOM.
* **✗ Rejeté :** Utilisation de Webpack (trop lourd/lent) ou Vanilla JS (maintenabilité de l'UI trop coûteuse à long terme).

---

## ADR-002 : Gestion de l'État et IPC (Inter-Process Communication)

**Date :** 2026-04-01
**Statut :** Approuvé

**Contexte :** Dans MV3, le Service Worker s'endort. La Popup est détruite à chaque clic hors de son cadre. Le Content Script vit dans la page web mais est isolé du reste. Il faut un mécanisme fiable pour partager l'état (Campagne active, quotas) entre ces entités.

**Décision :** **`chrome.storage.local` est l'unique Source de Vérité (SSOT).** Nous n'utilisons PAS `chrome.runtime.sendMessage` pour piloter la logique d'orchestration. Le Content Script écoute passivement les mutations via `chrome.storage.onChanged` pour démarrer ou stopper son exécution.

**Conséquences :**
* **✓ Correct :** Résilience totale. Si l'utilisateur ferme l'onglet ou la popup, l'état de la machine asynchrone est préservé.
* **! Risque :** Concurrence d'écriture. L'accès au storage est asynchrone. Le `storage.ts` doit implémenter un système de *Mutex* ou utiliser des transactions atomiques si plusieurs onglets LinkedIn tournent en même temps (Limitation : forcer l'exécution sur un seul onglet actif).

---

## ADR-003 : Interaction DOM et Résilience aux mutations LinkedIn

**Date :** 2026-04-01
**Statut :** Approuvé

**Contexte :** L'application LinkedIn est une SPA React complexe. Le DOM est paresseux (Lazy-loaded) et les classes CSS sont régulièrement régénérées.

**Décision :** Le Content Script (Moteur) est architecturé comme une Machine à États asynchrone.
1.  **Sélecteurs robustes :** Interdiction d'utiliser des classes CSS générées. Ciblage exclusif par attributs d'accessibilité (`aria-label`, `data-control-name`) ou hiérarchie structurelle.
2.  **Attente Non-Bloquante :** Utilisation systématique de `waitForElement(selector, timeout)` basé sur des `MutationObserver`.
3.  **Bypass du Virtual DOM :** Injection des messages via manipulation du prototype natif `HTMLInputElement` + dispatch d'events `input`/`change` synthétiques.

**Conséquences :**
* **~ Trade-off :** Le code d'interaction DOM (`reactUtils.ts`) est un hack "sale" par nature, mais c'est le seul moyen d'interagir avec une SPA tierce sans se faire rejeter par l'état interne de React. Les erreurs de timeout doivent échouer gracieusement et passer au profil suivant.

---

## ADR-004 : Sécurité du Compte et "Safe by Default"

**Date :** 2026-04-01
**Statut :** Approuvé

**Contexte :** Le risque principal du produit est le bannissement du compte de l'utilisateur. Les algorithmes anti-bot de LinkedIn détectent la vitesse de frappe, la régularité des requêtes et les volumes anormaux.

**Décision :** Implémentation d'un **Rate Limiting Local couplé à un Jitter cognitif**.
1.  Plafond dur de 30 invitations/jour (déverrouillable uniquement via un Opt-in explicite "Mode Expert").
2.  Pause aléatoire (`pauseMin`: 20s, `pauseMax`: 45s) entre chaque ouverture de modale.
3.  Blackout nocturne : Exécution suspendue en dehors des heures ouvrées configurées.

**Conséquences :**
* **✓ Correct :** Réduit drastiquement le risque de flag algorithmique. L'outil agit à la vitesse d'un humain lisant un profil.
* **! Risque :** Le tracking de l'historique dans `chrome.storage.local` (tableau des `historiqueInvits`) va croître indéfiniment.
* **Action requise :** Le module `storage.ts` devra implémenter une rotation ou un nettoyage des logs au-delà de 3 mois pour ne pas saturer le quota de 5MB du `chrome.storage.local`.