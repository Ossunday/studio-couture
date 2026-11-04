# Studio Couture

Application web SSR (SvelteKit + TypeScript), installable en PWA, pour couturières et tailleurs au Bénin.
Français d'abord, mobile d'abord, connexion lente.

Parcours : photo du modèle + photo complète de la cliente + tissu → rendu indicatif → mensurations validées par la couturière → patron calculé à l'échelle → tutoriel animé → fiche de montage → métrage et devis. (Aperçu 3D : plus tard.)

## Règles non négociables (résumé)

1. SSR, JS minimal, amélioration progressive. Pas de SPA.
2. Patron **calculé** par un moteur paramétrique — jamais généré librement par une IA.
3. Toute formule vit dans `src/lib/patterns/<modele>/formulas.ts` avec `source`, `hypotheses`, `aisanceCm`, `statut` (`a_valider` | `valide_par_tailleur`). **Aucune formule inventée.**
4. Mensurations photo = estimations avec marge d'erreur, modifiables et validées par la couturière avant patron.
5. Rendu IA toujours étiqueté **« rendu indicatif »**.
6. Français d'abord, i18n prévue. Aucune langue locale publiée sans validation humaine.
7. Mobile d'abord, plein soleil, gros éléments tactiles, budget de poids (`docs/BUDGET.md`).
8. Photos clientes : consentement explicite, chiffrement serveur AES-256-GCM, suppression auto après 7 jours (configurable), jamais pour l'entraînement.
9. IA derrière interfaces : `TryOnProvider`, `SegmentationProvider`, `MeasurementProvider` (`src/lib/ai/`). V1 = fournisseurs manuels.
10. Chaque phase se termine par tests + note + incertitudes. On n'avance qu'avec « suite ».

## Démarrer

```bash
npm install
cp .env.example .env   # renseigner STUDIO_COUTURE_DATABASE_URL (base studio_couture ; DATABASE_URL accepté en repli), STUDIO_COUTURE_PHOTO_ENCRYPTION_KEY_BASE64 (openssl rand -base64 32), STUDIO_COUTURE_SESSION_SECRET
psql "$STUDIO_COUTURE_DATABASE_URL" -f migrations/0001_init.sql
npm run dev
npm test
npm run check
```

## Inscription publique

- Route publique `/inscription` (« Créer mon atelier ») : crée l’atelier et son compte administrateur dans une transaction (mot de passe haché en scrypt, minimum 12 caractères), ouvre la session et redirige vers le tableau de bord. Champ piège anti-robots et limitation à 5 créations par heure et par IP (en mémoire, mono-instance).
- Variable d’environnement optionnelle `INSCRIPTION_OUVERTE` : ouverte par défaut (`true`) ; la passer à `false` affiche « Les inscriptions sont fermées. » sur `/inscription` et refuse toute création. Ce n’est pas un secret.
- Aucune vérification d’e-mail ni réinitialisation de mot de passe pour l’instant : voir `docs/A_FAIRE_AVANT_MISE_EN_LIGNE.md`.
- Polices 100 % locales (`@fontsource/manrope`, `@fontsource/playfair-display` épinglés) : aucun CDN.

## ORIGIN et CSRF (production)

- En production, la protection CSRF de SvelteKit compare l’en-tête `Origin` de chaque POST de formulaire à l’origine du serveur, qu’adapter-node déduit de la variable `ORIGIN`. **Sans `ORIGIN`, adapter-node suppose le schéma `https`** : l’origine attendue devient `https://127.0.0.1:3000` alors que le navigateur, en local, envoie `http://127.0.0.1:3000` — d’où « Cross-site POST form submissions are forbidden » sur `/inscription` et `/connexion`, même si tout le reste est correct. Ce n’est pas un problème de jeton : c’est le schéma (et, le cas échéant, l’hôte ou le port) qui diffère.
- Définissez toujours `ORIGIN` en production, **avec le schéma et l’adresse réellement utilisée dans le navigateur** : `ORIGIN=http://127.0.0.1:3000` en local (build de production lancé à la main), `ORIGIN=https://votre-domaine` derrière un hébergeur. Naviguer via `localhost` quand `ORIGIN` dit `127.0.0.1` (ou l’inverse) provoque le même refus : hôte et port font partie de l’origine comparée.
- Garde-fou : au démarrage d’un serveur de production sans `ORIGIN`, la console affiche un avertissement explicite (sans arrêter le serveur — voir `avertirSiOriginAbsent` dans `src/lib/server/config.ts`). La protection CSRF n’est jamais désactivée.

## Routes principales

- `/` : accueil public (visiteuse non connectée) ou tableau de bord de l’atelier (connectée).
- `/inscription` : « Créer mon atelier » (voir ci-dessus) ; `/connexion` : connexion à l’atelier ; `/installation` : création du tout premier atelier, seulement tant qu’aucun compte n’existe.
- `/demo` (et `/demo/pdf`) : démo guidée publique, sans compte, rien n’est enregistré.
- `/clientes`, `/clientes/nouvelle`, `/clientes/[id]` : fiches clientes (résumé, mesures, photos, patrons).
- `/clientes/[id]/patron/nouveau` et `/clientes/[id]/patron/[patronId]` : salle d’essayage en deux vues — « 1 · Patron à plat » (fait foi) puis « 2 · Vue 3D (aperçu) », toujours « brouillon non validé ». La page de création ouvre sur la carte Assistant (texte/photo) au-dessus du choix du modèle, et pour le pantalon, un assistant de modèle optionnel propose aussi des options dans la salle (voir ci-dessous).
- `/patron/mesures`, `/patron/apercu` : patron rapide sans fiche cliente ; `/profil` : compte connecté ; `/atelier/utilisatrices` : équipe (administratrice).
- Toute route inconnue affiche la page d’erreur stylée (404 « Page introuvable », 500 « Un problème est survenu »), sans détail technique.

## Assistant IA (optionnel, phases 8 et 11)

- **Salle d’essayage du pantalon large (phase 8)** : la couturière décrit le modèle voulu ; l’assistant propose uniquement les **options déjà exposées par le moteur** (largeur du bas 18–40 cm, profondeur du pli 0–8 cm, hauteur de ceinture 3–6 cm), affichées « Suggestion de l’IA, à vérifier » et modifiables avant génération.
- **Page « Créer un patron pour <cliente> » (phase 11)** : au-dessus du choix du modèle, une carte « Assistant » style chat propose trois entrées — **Décrire** (texte libre), **Photo** et **Audio** (visible mais désactivée, « Bientôt disponible »). Texte ou photo : l’IA reconnaît le type parmi les modèles du registre (pantalon large, robe fourreau, jupe droite) et propose uniquement les options exposées pour ce modèle. La bulle de réponse est **construite par l’application à partir du JSON validé** (jamais le texte libre de l’IA) et résume modèle + options ; « Utiliser ces réglages » ouvre la salle du modèle reconnu, options préremplies et modifiables, patron calculé par le moteur avec les mesures de la cliente. La jupe droite n’expose aucune option : l’assistant le dit honnêtement. Un vêtement hors catalogue (veste, chemise…) reçoit « pas encore disponible », **sans repli vers un autre modèle** ; photo illisible ou sans vêtement : message clair.
- **Photo** : JPEG, PNG ou WebP, 5 Mo maximum, type vérifié par la **signature du fichier** (jamais l’extension), traitée **en mémoire**, **jamais enregistrée ni journalisée**, métadonnées retirées avant envoi (segments APPn/COM, blocs texte/EXIF), réencodée sans métadonnées par le navigateur, envoyée uniquement au modèle IA configuré. Une case de consentement doit être cochée avant l’envoi, avec le texte affiché : « La photo est envoyée à un modèle d’IA de Meta pour analyse, elle n’est pas conservée. N’envoyez pas de photo d’une cliente. »
- **Garanties inchangées** : l’IA ne produit **jamais de cote ni de géométrie** et ne valide pas le patron — le moteur calcule, le patron reste un **brouillon non validé**. Schéma JSON strict : valeurs ramenées dans leurs plages, clés inconnues ignorées, modèle inconnu refusé sans substitution. **Aucune donnée cliente n’est envoyée** : seuls le texte ou la photo du vêtement partent au modèle.
- **Réponse du modèle configuré** (mesuré par le propriétaire avec la vraie clé) : l’endpoint compatible répond sur `/v1/messages`, d’abord un bloc `redacted_thinking` sans texte, puis un bloc `text`. Le client ne lit **que les blocs `text`**, envoie `max_tokens` = **1 500** (avec 50, la réflexion consomme tout et le texte n’arrive jamais) et attend **30 secondes** ; aucun bloc texte exploitable → message de repli, jamais de crash.
- **Endpoint** `POST /api/suggestion-modele` (connexion + jeton CSRF exigés, limite de 20 demandes/heure/atelier en mémoire) : flux JSON historique `{ texte }`, flux `{ reconnaissance: true, texte }`, flux photo `multipart/form-data` (`photo` + `consentement`). IA non configurée, en panne ou délai dépassé : la carte affiche « Assistant bientôt disponible », le choix manuel juste dessous prend le relais, **aucune erreur technique**. En mode dépôt mémoire (`STUDIO_COUTURE_REPOSITORY=memoire`, démo et tests), l’assistant est désactivé sans erreur.
- **Configuration côté serveur uniquement** (jamais dans le navigateur, jamais journalisée) : `STUDIO_COUTURE_IA_API_KEY`, `STUDIO_COUTURE_IA_BASE_URL` (endpoint compatible API Messages d’Anthropic, `POST /v1/messages`) et `STUDIO_COUTURE_IA_MODELE`. Les trois noms figurent dans `.env.example`, sans valeur.

## État

Voir `HANDOFF.md` et `docs/PHASE_0.md`. Nom, slug et description vivent dans `src/lib/brand.ts` (source unique, à modifier là pour un futur renommage ; `package.json`, `static/manifest.webmanifest` et `src/app.html`, statiques, en reprennent les valeurs). Premier patron visé : **jupe droite** (formules `a_valider` — bloquées tant qu'un maître tailleur ne les a pas validées), puis pantalon classique.
