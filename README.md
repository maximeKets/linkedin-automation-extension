# 🛡️ LinkedIn Stealth Automator

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-lightgrey)

**LinkedIn Stealth Automator** est une extension de navigateur conçue pour automatiser l'envoi d'invitations LinkedIn avec des messages personnalisés, tout en restant indétectable grâce à des algorithmes de comportement humain ("Stealth").

---

## ✨ Fonctionnalités

- 🤖 **Automatisation Intelligente** : Parcours automatique des résultats de recherche.
- ✉️ **Messages Personnalisés** : Moteur de templates avec variables dynamiques `{prenom}`, `{nom}`, `{titre}`, `{entreprise}`.
- 🕶️ **Comportement Furtif** :
  - Pauses aléatoires entre chaque action (Jitter).
  - Simulation de mouvements de souris et de scroll.
  - Respect des horaires de bureau (évite de tourner à 3h du matin).
- 🛡️ **Sécurité Native** : Limite journalière bridée par défaut pour protéger votre compte.
- 📊 **Tableau de Bord** : Suivi en temps réel de votre campagne.

---

## 🚀 Installation (Guide Zéro Friction)

L'extension n'est pas encore sur le Chrome Web Store. Voici comment l'installer en 30 secondes :

1.  **Télécharger l'extension** : Récupérez le fichier `linkedin-stealth-automator-v1.zip` et dézippez-le sur votre ordinateur.
2.  **Ouvrir les Extensions** : Dans Chrome ou Edge, accédez à `chrome://extensions/`.
3.  **Activer le Mode Développeur** : Cochez l'interrupteur en haut à droite de la page.
4.  **Charger l'extension** : Cliquez sur le bouton **"Charger l'extension décompressée"** et sélectionnez le dossier `dist/` issu du dézippage.
5.  **Épingler** : Cliquez sur l'icône puzzle en haut à droite de votre navigateur et épinglez l'icône bleue "S".

---

## 🛠️ Utilisation

1.  Effectuez une recherche sur LinkedIn (ex: "CTO Lyon") et filtrez par **Personnes**.
2.  Ouvrez le popup de l'extension.
3.  Configurez votre message (ex: *Bonjour {prenom}, j'ai vu votre profil chez {entreprise}...*).
4.  Cliquez sur **DÉMARRER**.
5.  Laissez l'onglet ouvert. L'automate fera le reste, page après page.

---

## ⚠️ Avertissement Légal

Cet outil est destiné à un usage pédagogique et professionnel responsable. Son utilisation peut enfreindre les Conditions Générales d'Utilisation de LinkedIn. L'auteur ne saurait être tenu responsable des conséquences liées à l'usage de cet outil (restrictions de compte, etc.).

Voir le fichier [DISCLAIMER.md](./DISCLAIMER.md) pour plus de détails.

---

## 👨‍💻 Développement

Si vous souhaitez modifier l'extension :

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Créer un build de production
npm run build
```

---

*Développé avec ❤️ pour une automatisation plus humaine.*
