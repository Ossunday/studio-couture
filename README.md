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

## Routes principales

- `/` : accueil public (visiteuse non connectée) ou tableau de bord de l’atelier (connectée).
- `/inscription` : « Créer mon atelier » (voir ci-dessus) ; `/connexion` : connexion à l’atelier ; `/installation` : création du tout premier atelier, seulement tant qu’aucun compte n’existe.
- `/demo` (et `/demo/pdf`) : démo guidée publique, sans compte, rien n’est enregistré.
- `/clientes`, `/clientes/nouvelle`, `/clientes/[id]` : fiches clientes (résumé, mesures, photos, patrons).
- `/clientes/[id]/patron/nouveau` et `/clientes/[id]/patron/[patronId]` : salle d’essayage en deux vues — « 1 · Patron à plat » (fait foi) puis « 2 · Vue 3D (aperçu) », toujours « brouillon non validé ».
- `/patron/mesures`, `/patron/apercu` : patron rapide sans fiche cliente ; `/profil` : compte connecté ; `/atelier/utilisatrices` : équipe (administratrice).
- Toute route inconnue affiche la page d’erreur stylée (404 « Page introuvable », 500 « Un problème est survenu »), sans détail technique.

## État

Voir `HANDOFF.md` et `docs/PHASE_0.md`. Nom, slug et description vivent dans `src/lib/brand.ts` (source unique, à modifier là pour un futur renommage ; `package.json`, `static/manifest.webmanifest` et `src/app.html`, statiques, en reprennent les valeurs). Premier patron visé : **jupe droite** (formules `a_valider` — bloquées tant qu'un maître tailleur ne les a pas validées), puis pantalon classique.
