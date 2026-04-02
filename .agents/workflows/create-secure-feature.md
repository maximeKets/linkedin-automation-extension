---
description: Guide l'agent pour analyser, coder, tester et ouvrir une PR proprement via MCP.
---

# Titre : Création et soumission d'une feature sécurisée
# Description : Guide l'agent pour analyser, coder, tester et ouvrir une PR proprement via MCP.

**Étape 1 : Analyse et Design**
- Demande à l'utilisateur de confirmer le périmètre exact de la feature.
- Identifie les fichiers impactés. Vérifie que tu respectes les règles de Clean Architecture en vigueur sur ces fichiers.

**Étape 2 : Implémentation**
- Rédige le code ou modifie les fichiers existants.
- Ajoute les tests unitaires correspondants dans le dossier approprié.

**Étape 3 : Audit de sécurité local**
- Relis tes propres modifications et assure-toi qu'aucune vulnérabilité (injection, fuite de log) n'a été introduite.

**Étape 4 : Soumission GitHub (via MCP)**
- Utilise l'outil MCP GitHub pour créer une nouvelle branche nommée `feat/[nom-court-de-la-feature]`.
- Commit les fichiers modifiés avec des messages conventionnels (ex: `feat: ajout de la validation X`).
- Push la branche et utilise l'outil MCP pour créer une Pull Request.
- Assigne l'utilisateur comme Reviewer de la PR.