# Studio Couture — consignes projet

Produit : **Studio Couture** (slug technique : `studio-couture`).

- Source unique de la marque : `src/lib/brand.ts` (`BRAND_NAME`, `BRAND_SLUG`, `BRAND_DESCRIPTION`, `BRAND_DATABASE_NAME`, `BRAND_ENV_PREFIX`, `brandCacheName`). Tout le code y fait référence ; seuls les fichiers statiques non-importables (`package.json`, `static/manifest.webmanifest`, `src/app.html`) en recopient les valeurs — les garder synchronisés.
- Variables d’environnement produit préfixées `STUDIO_COUTURE_` (voir `.env.example`) ; `DATABASE_URL` reste accepté en repli par `src/lib/server/db.ts`.
- Base PostgreSQL : `studio_couture`.
- Cache service worker : `studio-couture-v<version>` via `brandCacheName()`.
- Règles produit : voir `README.md` (10 règles non négociables) et `docs/PHASE_0.md`.
- Vérifications : `npm test`, `npm run check`, `npm run build`. Ne jamais lancer `npm audit fix --force` sans accord explicite.
- État courant et résultats réels : `HANDOFF.md`.
