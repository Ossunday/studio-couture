# HANDOFF — Studio Couture

Dernière mise à jour : 2026-10-28 (étape 1 sécurité, puis phase 1).

## Étape 1 — Sécurité des dépendances (2026-10-28)

- Règles git permanentes ajoutées à `CLAUDE.md` : jamais de `git config` local, identité globale pour les commits, jamais de `git push`.
- `npm audit` initial : 10 vulnérabilités (7 low, 1 moderate, 2 critical). `@sveltejs/kit` est en `devDependencies` mais embarqué dans le serveur `adapter-node` construit : ses avis sont traités comme production.
- Aucune version corrigée en 2.x : les avis Kit (GHSA-pfhg-q3qv-9q6r redirection via envoi de formulaire amélioré, GHSA-27mw-82g8-phjj XSS via `cache-control` de page pré-rendue, `range: <3.0.0`) et `cookie <0.7` (GHSA-pxg6-pf52-xh8x) ne sont corrigés que par `@sveltejs/kit@3.1.0`. Vérifié par `npm view` : dernière 2.x = `2.70.3` (déjà résolue par le lockfile, portée explicitée dans `package.json`), dernière `@sveltejs/vite-plugin-svelte` 5.x = `5.1.1` (déjà installée ; 6.x/7.x gardent `deepmerge 4.3.1`, sans correctif amont).
- **Décision : ne pas migrer vers Kit 3 maintenant.** Notes de migration lues (svelte.dev/docs/kit/migrating-to-sveltekit-3) : Kit 3 exige Node ≥22.17, TypeScript 6, Vite 8, `@sveltejs/vite-plugin-svelte` 7, supprime `svelte.config.js`, remplace `$lib` par `#lib`, change l’API CSRF/cookies/adapter (`ORIGIN` supprimé) — réécriture transversale disproportionnée pour deux avis *low* (CVSS 4,7 et 0, interaction/complexité élevées). **Atténuations en vigueur et à maintenir tant que Kit 2 est utilisé : aucun formulaire amélioré (`use:enhance` interdit), aucune page pré-rendue avec `cache-control` personnalisé, en-têtes photos déjà en `private, no-store` côté serveur.** À replanifier comme chantier dédié avant toute activation de ces fonctionnalités.
- `vitest` `3.2.7 → 4.1.12` (dernière 4.x, `npm view vitest dist-tags`) : corrige `@vitest/mocker` (GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8) et `tinypool` (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr, corrigés dès `tinypool 2.1.2`) sans changement de configuration pour ce projet (même `vite.config.ts`, Vite 6 accepté). Pas de passage à vitest 5 : saut supplémentaire non nécessaire, 4.1.12 corrige déjà les avis concernés.
- Après mise à jour : `npm audit` = **7 low restantes, toutes liées au seul correctif Kit 3 (`--force` refusé)** ; `npm audit --omit=dev` = **0**.
- Vérifications réelles : `npm test` **6 fichiers / 14 tests réussis** (vitest 4.1.12), `npm run check` **0 erreur / 0 avertissement** (343 fichiers), `npm run build` **réussi** (adapter-node).


## Renommage « Studio de couture IA » → « Studio Couture »

- Produit : `Studio Couture`, slug `studio-couture` (ancien : `studio-couture-ia`).
- Créé `src/lib/brand.ts` : `BRAND_NAME`, `BRAND_SLUG`, `BRAND_SHORT_NAME`, `BRAND_DESCRIPTION`, `BRAND_DESCRIPTION_LONG`, `BRAND_DATABASE_NAME` (`studio_couture`), `BRAND_ENV_PREFIX` (`STUDIO_COUTURE_`), `ENV_DATABASE_URL`, `ENV_PHOTO_ENCRYPTION_KEY`, `ENV_SESSION_SECRET`, `brandCacheName(version)`.
- Pointent sur `brand.ts` : `src/lib/i18n/fr.ts` (`app.nom`, `app.tagline`), en-tête + pied de page (`src/routes/+layout.svelte`), titre (`src/routes/+page.svelte`), cache service worker (`src/service-worker.ts` → `studio-couture-v<version>`), base de données (`src/lib/server/db.ts` : `STUDIO_COUTURE_DATABASE_URL` prioritaire, `DATABASE_URL` en repli), clé photo (`src/lib/server/crypto.ts`).
- Fichiers statiques alignés sur les mêmes valeurs (non-importables) : `package.json` (`name: studio-couture`, regénéré dans `package-lock.json`), `static/manifest.webmanifest` (`name`/`short_name`/`description`), `src/app.html` (meta description), `README.md`, `CLAUDE.md` (créé, absent avant), `docs/*.md`, commentaire `migrations/0001_init.sql`, `.env.example` (variables préfixées `STUDIO_COUTURE_`, base `studio_couture`).
- Vérifié : plus aucune occurrence de `Studio de couture IA`, `studio-couture-ia`, `STUDIO_COUTURE_IA` ni `studio_couture_ia` hors `node_modules`.

## Corrections techniques

- `src/lib/ai/manual.ts` : signatures alignées sur `src/lib/ai/types.ts` — `ManualTryOnProvider.rendre(e: EntreeTryOn)`, `ManualMeasurementProvider.estimer(photoClienteRef: string)` (et `ManualSegmentationProvider.segmenter(photoRef: string)` par cohérence).
- Conflit Vite/vitest résolu : `vitest` `^2.1.8` → `^3.2.7`, compatible Vite 6 ; `vite.config.ts` importait déjà `defineConfig` depuis `vitest/config` (conservé). `npm ls vite vitest` : un seul Vite `6.4.5` dédupliqué partout, `vitest@3.2.7`.

## Vérifications réelles (2026-10-28, nouvel emplacement `studio-couture/`)

- Chemins absolus : aucun chemin machine (`C:\Users…`, `ClaudeDev`, ancien dossier) dans le code/docs hors `node_modules` — rien à corriger.
- `npm test` : **6 fichiers, 14 tests, tous réussis** (vitest 3.2.7 ; avertissement tsconfig initial disparu après `svelte-kit sync`).
- `npm run check` : **0 erreur, 0 avertissement** (340 fichiers).
- `npm run build` : **réussi** (Vite 6.4.5, adapter-node, service worker généré).
- Git : **aucun dépôt `.git` trouvé** dans le dossier déplacé ni dans ses parents — l’historique antérieur n’a pas survécu au déplacement. Dépôt réinitialisé ici ; `git log` ne montre donc que le commit de renommage ci-dessous. Si l’ancien historique existe ailleurs (archive, autre clone), le rattacher avant de pousser.

## Audit (sans `npm audit fix --force`)

- `npm audit --omit=dev` : **0 vulnérabilité** (production = `pg` seul).
- `npm audit` (complet) : **10 vulnérabilités, toutes en développement** (arborescence `devDependencies`), aucun correctif non-cassant proposé — les correctifs exigent `--force` (SvelteKit 3 / vitest 5), donc **non appliqués** :

| Paquet | Gravité | Portée |
|---|---|---|
| `@rollup/plugin-node-resolve` | low | développement |
| `@sveltejs/adapter-node` | low | développement |
| `@sveltejs/kit` | low | développement |
| `@sveltejs/vite-plugin-svelte` | low | développement |
| `@sveltejs/vite-plugin-svelte-inspector` | low | développement |
| `cookie` | low | développement |
| `deepmerge` | low | développement |
| `@vitest/mocker` | moderate | développement |
| `tinypool` | critical | développement |
| `vitest` | critical (via `tinypool`/`@vitest/mocker`) | développement |

## Commit

`renommage Studio Couture, déplacement et corrections` (voir `git log` dans ce dossier).
