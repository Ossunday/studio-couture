# PostgreSQL sur Windows — méthode principale (sans Docker)

Installation directe de PostgreSQL sur la machine Windows de développement, puis application des migrations du projet. Docker Compose (`docker-compose.yml` à la racine) n’est qu’une alternative **pour plus tard**.

## 1. Installer PostgreSQL

Option A — installateur officiel : télécharger PostgreSQL 17 pour Windows sur postgresql.org, l’installer, retenir le mot de passe du compte `postgres` (le garder dans un gestionnaire de mots de passe, jamais dans le dépôt).

Option B — winget, dans PowerShell :

```powershell
winget install PostgreSQL.PostgreSQL.17
```

Ouvrir un **nouveau** terminal PowerShell (pour recharger le `PATH`), puis vérifier :

```powershell
psql --version
```

Si `psql` n’est pas reconnu, ajouter `C:\Program Files\PostgreSQL\17\bin` au `PATH` utilisateur, ou utiliser le chemin complet `"C:\Program Files\PostgreSQL\17\bin\psql.exe"`.

## 2. Créer la base du projet

```powershell
createdb -U postgres -h 127.0.0.1 studio_couture
```

(`createdb` demandera le mot de passe du compte `postgres`. Base `studio_couture` : voir `BRAND_DATABASE_NAME` dans `src/lib/brand.ts`.)

## 3. Appliquer les migrations (dans l’ordre, depuis la racine du projet)

```powershell
psql -U postgres -h 127.0.0.1 -d studio_couture -f migrations/0001_init.sql
psql -U postgres -h 127.0.0.1 -d studio_couture -f migrations/0002_phase1.sql
```

La migration 0001 crée l’extension `pgcrypto` : le compte utilisé doit avoir les droits suffisants (le compte `postgres` les a).

## 4. Brancher l’application

Dans le fichier `.env` local (jamais commité ; voir `.env.example` pour la liste des noms) :

- `STUDIO_COUTURE_DATABASE_URL` : URL de connexion vers la base `studio_couture` créée ci-dessus (`DATABASE_URL` est accepté en repli).
- `STUDIO_COUTURE_PHOTO_ENCRYPTION_KEY_BASE64` : exactement 32 octets en base64, par exemple générés avec `openssl rand -base64 32` (Git Bash) — l’application refuse de démarrer sinon.
- `STUDIO_COUTURE_SESSION_SECRET` : 32 octets minimum — l’application refuse de démarrer sinon.

Puis :

```powershell
npm run dev
```

et ouvrir `/installation` pour créer le premier atelier (la page se verrouille dès qu’un compte existe).

## 5. Lancer le serveur construit (production)

Après `npm run build`, le serveur se lance avec `node build/index.js`. **Variable indispensable : `BODY_SIZE_LIMIT=6M`.** Sans elle, adapter-node plafonne le corps des requêtes à 512 Ko par défaut et l’envoi d’une photo (jusqu’à 5 Mo acceptés par l’application) échoue en « 413 Payload Too Large » avant même d’atteindre le code. `6M` = 5 Mo de photo + marge pour l’encodage multipart. Ne jamais mettre `Infinity` : la limite reste en place, et le contrôle fin reste côté application — `validerPhoto` (`src/lib/server/crypto.ts`, 5 Mo maximum) refuse avec le message en français « Photo trop lourde : 5 Mo maximum. » (doublé d’un contrôle immédiat dans le navigateur sur la fiche cliente). La limite d’adapter-node est globale (il n’existe pas de réglage par route) : c’est ce contrôle applicatif qui fait foi pour les photos, les autres formulaires n’acceptent aucun fichier.

La variable est lue par adapter-node dans l’environnement du processus au lancement — elle doit donc être posée dans le shell ou le gestionnaire de service qui démarre le serveur, par exemple en PowerShell :

```powershell
$env:BODY_SIZE_LIMIT = '6M'
node build/index.js
```

Même ligne dans `.env.example` (`BODY_SIZE_LIMIT=6M`) pour mémoire, à reporter dans l’environnement réel du serveur.

## Alternative pour plus tard : Docker Compose

`docker-compose.yml` (racine) lance PostgreSQL lié uniquement à `127.0.0.1`, avec un mot de passe lu depuis la variable d’environnement `POSTGRES_PASSWORD` de la machine — jamais écrit dans le fichier. Les mêmes commandes `psql … -f migrations/0001_init.sql` puis `0002_phase1.sql` s’appliquent ensuite, avec `-h 127.0.0.1`.
