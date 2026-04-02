---
trigger: glob
globs: src/**/*.ts
---

Tu interviens sur du code régi par les principes de la Clean Architecture.

1. **Règle de dépendance :** Le code du domaine (entités, use cases) ne doit JAMAIS importer de modules externes (DB, API, Frameworks web). 
2. **Ports & Adapters :** Si tu dois appeler une API externe ou la DB, définis une interface (Port) dans le domaine et implémente-la dans la couche infrastructure (Adapter).
3. **Contrôleurs :** Les contrôleurs ne doivent contenir AUCUNE logique métier. Ils parsents la requête, appellent un Use Case, et formatent la réponse.

Référence technique complète de notre projet : @docs/architecture-decisions.md