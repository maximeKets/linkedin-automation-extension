---
trigger: model_decision
description: Security & Git Operations Guardrails
---

# Security & Git Operations Guardrails

1. **Sécurité des données :** Ne génère jamais de code qui logge des mots de passe, des tokens ou des PII (Personal Identifiable Information) en clair. Valide toujours les inputs utilisateurs (prévention XSS/SQLi).
2. **Opérations GitHub (MCP) :** - Tu as l'interdiction absolue de proposer des push directs sur la branche `main` ou `master`.
   - Toute modification de code via MCP doit se faire sur une nouvelle branche préfixée par `agent/` ou `feat/`.
   - Tu dois terminer ton action par l'ouverture d'une Pull Request.