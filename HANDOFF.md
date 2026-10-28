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


## Phase 1 — Authentification atelier (2026-10-28)

- Migration `migrations/0002_phase1.sql` : `utilisatrices.identifiant` (unique) + `mot_de_passe_hash`, table `sessions`, `consentements.signature_nom/texte_version`, colonnes photo chiffrée en base, index unique mensurations `(cliente_id, code)`. **Non appliquée ici : aucun PostgreSQL/`psql` ni `STUDIO_COUTURE_DATABASE_URL` dans cette session** — à appliquer avant déploiement (voir fin).
- Connexion par e-mail **ou** téléphone (normalisation `src/lib/domain/identifiant.ts`), rôles `admin`/`couturiere` inchangés (`permissions.ts`), page admin `/atelier/utilisatrices` pour créer les comptes, `/installation` ouverte seulement tant qu’aucun compte n’existe.
- Mots de passe : **scrypt** Node (`auth.ts`, format `scrypt$N$r$p$sel$hash`, comparaison à temps constant) — équivalent choisi à argon2 pour éviter un module natif à compiler. Sessions serveur : jeton aléatoire, SHA-256 seul en base, cookie `HttpOnly`, `SameSite=Lax`, `Secure` en production, expiration 7 jours. CSRF : vérification d’origine SvelteKit + jeton par session exigé sur chaque écriture. Limitation de débit connexion : 5 échecs / 15 min par IP+identifiant (mémoire, mono-instance — limite documentée).
- Accès données derrière `Repository` (`repository.ts`) : PostgreSQL (production) ou mémoire (`STUDIO_COUTURE_REPOSITORY=memoire`, tests/Playwright uniquement).
- Tests réels : `npm test` **8 fichiers / 23 tests réussis**, `npm run check` **0 erreur**, `npm run build` **réussi**.

## Phase 1 — Clientes et consentement signé (2026-10-28)

- CRUD clientes SSR (`/clientes`, recherche nom/téléphone, `/clientes/nouvelle`, fiche, `/modifier`, suppression **admin seule** selon `permissions.ts`) ; isolation par atelier vérifiée côté serveur sur chaque accès. États vide (aucune cliente / aucun résultat), erreur (formulaire) présents.
- Consentement photo : formulaire signé (case d’accord explicite texte v1 + nom tapé en signature, accord rendu indicatif optionnel, entraînement IA toujours refusé), révocation qui supprime immédiatement les photos. Aucune photo possible sans consentement actif (`assertConsentementPhoto`, testé).
- Tests réels : `npm test` **9 fichiers / 26 tests réussis**, `check` **0 erreur**, `build` **réussi**.

## Phase 1 — Photos chiffrées et suppression à 7 jours (2026-10-28)

- Upload depuis la fiche cliente (consentement actif exigé) : JPEG/PNG/WebP, 5 Mo max, chiffré **AES-256-GCM** avant stockage, données chiffrées en base PostgreSQL (aucun fichier en clair, aucune URL publique). Lecture authentifiée même atelier via `/clientes/[id]/photos/[photoId]`, déchiffrement en mémoire, `cache-control: private, no-store`.
- Expiration = création + 7 jours (`retention.ts`) affichée sur la fiche ; purge : suppression des lignes expirées à l’ouverture d’une fiche + script cron `scripts/purger-photos-expirees.mjs` (quotidien recommandé). Révocation du consentement = suppression immédiate des photos.
- Clé via `STUDIO_COUTURE_PHOTO_ENCRYPTION_KEY_BASE64` (32 octets) ; absente ici (aucun secret dans cette session) — upload réel à tester après configuration.
- Tests réels : `npm test` **10 fichiers / 29 tests réussis**, `check` **0 erreur** (après correction d’un type `Response`), `build` **réussi** (re-vérifié au jalon Playwright ci-dessous).

## Phase 1 — Mensurations manuelles (2026-10-28)

- Saisie manuelle sur la fiche cliente : 8 mensurations courantes (poitrine, taille, hanches, dos, épaules, manche, jupe, pantalon), **en cm**, virgule ou point, bornes de plausibilité documentées dans `src/lib/domain/mensurations-saisie.ts` — aucune formule de patron ajoutée (règle n°3 intacte). Enregistrées en `source = saisie_couturiere`, `valideeParCouturiere = true` (donc utilisables par le moteur quand les formules seront validées), mise à jour par `(cliente, code)`.
- Tests réels : `npm test` **11 fichiers / 32 tests réussis**, `check` **0 erreur**, `build` **réussi**.

## Phase 1 — Playwright, diagnostic CSRF et bilan (2026-10-28)

- Test Playwright `tests-e2e/cliente-mensurations.spec.ts` (installation → connexion → cliente → consentement signé → mensurations) : **1 test réussi** (`npm run test:e2e`, serveur construit `node build/index.js`, dépôt mémoire — `scripts/lancer-e2e.mjs` testé puis **supprimé** : le `webServer` simple avec ses variables d’environnement suffit, une fois la vraie cause corrigée).
- **Cause des 403 « Cross-site POST form submissions are forbidden »** (3 échecs initiaux) : ce n’était ni le jeton CSRF applicatif ni les cookies. Lecture du code installé : `@sveltejs/kit/src/runtime/server/respond.js:88` compare strictement l’en-tête `Origin` à `url.origin` (construite par adapter-node, `files/handler.js:101`, protocole `https` par défaut ligne 210 sans `ORIGIN`). Les scripts de diagnostic (`scripts/diagnostic/`, README dédié) ont prouvé que Chromium envoyait `Origin: null` (`debug-proxy.mjs` : `origin=null`, `sec-fetch-site=same-origin`) à cause de `referrer-policy: no-referrer` dans `hooks.server.ts` — le `fetch` Node du script, qui pose `Origin` explicitement, passait. Correction **sans contourner le CSRF** : `referrer-policy: same-origin` ; POST sans `Origin` toujours rejeté (403 vérifié), test unitaire de garde ajouté (`src/hooks.server.test.ts`).
- Vérifications réelles finales : `npm test` **12 fichiers / 33 tests réussis**, `npm run check` **0 erreur / 0 avertissement** (397 fichiers), `npm run build` **réussi**, `npm run test:e2e` **1 réussi**, `npm audit` **7 low** (toutes liées au seul correctif Kit 3, voir étape 1), `npm audit --omit=dev` **0**.
- **À valider par vous avant usage réel** : (1) appliquer `migrations/0002_phase1.sql` sur PostgreSQL et tester le chemin `RepositoryPg` (jamais exercé ici : aucun PostgreSQL dans cette session, seuls le dépôt mémoire des tests et les scripts SQL ont été vérifiés) ; (2) renseigner `STUDIO_COUTURE_PHOTO_ENCRYPTION_KEY_BASE64` et `STUDIO_COUTURE_SESSION_SECRET` sur le serveur et tester un upload photo réel ; (3) planifier le cron `scripts/purger-photos-expirees.mjs` ; (4) relire le texte de consentement v1 (juridique) et les bornes de plausibilité des mensurations avec l’atelier ; (5) créer le premier atelier via `/installation` puis fermer l’accès à cette page (automatique dès qu’un compte existe) ; (6) décider du chantier SvelteKit 3 (voir étape 1) avant d’activer formulaires améliorés ou pages pré-rendues.

## Durcissement avant validation (2026-10-28)

- **Mots de passe** : scrypt relevé au minimum OWASP `N=131072 (2^17), r=8, p=1`, `maxmem` explicite 256 Mio (≈128 Mio requis). Temps mesuré sur cette machine (Node, `scryptSync`) : **≈283 ms** par hachage contre ≈35 ms avec l’ancien `N=16384` — acceptable à la connexion. Non-régression testée : les anciens hash restent vérifiables car le format stocké contient ses paramètres (test avec un hash `N=16384` reconstruit).
- **Secrets obligatoires au démarrage** (`src/lib/server/config.ts`, hook `init` de `hooks.server.ts`) : secret de session ≥ 32 octets (comptés en octets UTF-8) et clé photo d’exactement 32 octets, sinon **le serveur refuse de démarrer — dépôt mémoire compris**. Le jeton CSRF n’a plus aucun repli sans secret. Secrets de test Playwright/diagnostic remplacés par des valeurs de test ≥ 32 caractères, clairement non-production.
- **Tests ajoutés** (47 tests unitaires au total) : coût OWASP + ancien format scrypt, refus CSRF sans secret, configuration de démarrage (absent/court/invalide/UTF-8), attributs du cookie de session via `optionsCookieSession` (HttpOnly, SameSite=Lax, Secure en production seulement, 7 jours — fonction désormais utilisée par la connexion), expiration des sessions à 7 jours (dépôt mémoire), cloisonnement par atelier (liste, recherche et accès par identifiant direct : modification/suppression par un autre atelier sans effet ; photo et mensurations inaccessibles sans la cliente de son atelier), purge effective des photos à 7 jours (expirées supprimées, valides conservées), `init` qui rejette sans secrets. La limitation de débit connexion était déjà testée (`auth.test.ts`).
- **Recherche de secrets** (dépôt + tout l’historique git, sans lire aucun fichier `.env`) : aucun `.env` commité (seul `.env.example` est suivi, dans tous les commits), aucun motif critique trouvé sur toutes les révisions (clés privées, `sk-…`, `AKIA…`, `ghp_…`, `AIza…`). Seules occurrences liées aux secrets : noms de variables d’environnement dans le code, champs de formulaire, et secrets **fictifs de test** (`Buffer.alloc(32, 7)` public, anciens `secret-e2e-local`/`secret-debug-local` dans l’historique, remplacés depuis) — aucun identifiant réel.
- **PostgreSQL** : méthode principale documentée dans `docs/POSTGRES_WINDOWS.md` (installation directe Windows, commandes exactes `psql` pour `migrations/0001_init.sql` puis `0002_phase1.sql`). `docker-compose.yml` ajouté **pour plus tard seulement** : PostgreSQL lié à `127.0.0.1`, mot de passe lu depuis `POSTGRES_PASSWORD` de la machine, jamais écrit dans le fichier.
- Vérifications réelles : `npm test` **14 fichiers / 47 tests réussis**, `npm run check` **0 erreur** (400 fichiers), `npm run build` **réussi**, `npm run test:e2e` **1 réussi** (avec refus de démarrage actif : les secrets de test fournis par Playwright suffisent, le dépôt mémoire n’est pas exempté).

## Test d’intégration PostgreSQL `RepositoryPg` (2026-10-28)

- Ajouté `src/lib/server/repository-pg.integration.test.ts` : suite conditionnelle `describe.skipIf(!process.env[ENV_DATABASE_URL])` (`STUDIO_COUTURE_DATABASE_URL` via `brand.ts`). Sans la variable, aucun pool n’est créé et la suite est ignorée ; avec, elle exerce le vrai `RepositoryPg` (migrations 0001 + 0002 supposées appliquées). Aucun fichier `.env` lu, aucune URL ni aucun secret affiché/journalisé.
- Couverture (6 tests) : création de deux ateliers et de leurs comptes (admin + couturière), session valide/expirée/supprimée, cliente, consentement actif avec `usageEntrainementIa = false`, photo AES-256-GCM stockée chiffrée et relue par déchiffrement, mensuration saisie puis mise à jour par `(cliente, code)`, cloisonnement entre deux ateliers (lecture/modification/suppression croisées sans effet), purge des photos expirées (expirées supprimées, valides conservées). Nettoyage `afterAll` par suppression des ateliers créés (cascade SQL) ; identifiants uniques par exécution. Base dédiée aux tests recommandée : `purgerPhotosExpirees` supprime toute photo expirée de la base.
- **Non exécutée contre PostgreSQL réel dans cette session** (variable absente, comme les jalons précédents) — vérification réelle à lancer par vous, base de test avec migrations appliquées : `STUDIO_COUTURE_DATABASE_URL='<url-base-de-test>' npm test -- src/lib/server/repository-pg.integration.test.ts` (syntaxe Git Bash ; ne collez l’URL que dans votre terminal, jamais dans le dépôt).
- Vérifications réelles ici : `npm test` **14 fichiers réussis / 1 ignoré, 47 tests réussis / 6 ignorés**, `npm run check` **0 erreur / 0 avertissement** (401 fichiers).

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
