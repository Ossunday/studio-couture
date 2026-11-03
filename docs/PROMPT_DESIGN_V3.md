# PROMPT MUSE — Design v3 + inscription + plan coté (à exécuter phase par phase)

Tu travailles sur Studio Couture (SvelteKit SSR, TypeScript strict, PostgreSQL).
Lis d'abord CLAUDE.md, HANDOFF.md et ce fichier en entier. Puis lis le dossier docs/maquette/ :
- `*.png` : captures de la maquette validée par le client (Accueil, Atelier = tableau de bord, Fiche, Salle, Salle3d).
- `*.dc.html` : le même contenu en HTML. Ce sont des fichiers de maquette : ignore les balises <x-dc>, <helmet> et le script support.js. Les styles en ligne donnent les valeurs exactes (couleurs, rayons, espacements, textes). Ne copie pas le HTML tel quel : recrée des composants Svelte propres.
- `trace_patron_reference.py` : tracé du dessin coté. Sert de référence pour le composant PatronCote (voir phase 4).
- `pantalon-bleu.jpg` : image PROVISOIRE de l'accueil. Droits non confirmés : mets-la dans static/img/ et ajoute dans docs/A_FAIRE_AVANT_MISE_EN_LIGNE.md la ligne « remplacer accueil-pantalon.jpg par une image dont nous avons les droits ».

## Règles absolues (inchangées)
- Ne lis jamais un fichier .env*, ne les affiche jamais, n'invente aucun secret.
- Ne fais jamais `git push`. Fais des commits locaux, un par phase, messages en français.
- N'utilise ni curl ni taskkill. Pas de mode automatique.
- Aucune dépendance CDN : polices et icônes en local (voir phase 1). Épingle les versions exactes.
- Après chaque phase : `npm test`, `npm run check`, `npm run build`, `npm run test:e2e` doivent passer. Si un test casse à cause du nouveau design, mets-le à jour en gardant son intention. Ne supprime aucun test pour le faire passer.
- Le patron reste présenté comme « brouillon non validé » tant qu'un maître tailleur ne l'a pas validé. Ne jamais écrire « validé », « prêt à couper garanti » ou équivalent. La 3D reste un aperçu indicatif (« pas une simulation de drapé »).
- Accessibilité : contraste AA, focus visible, libellés de champs, navigation clavier, `prefers-reduced-motion` respecté, cibles tactiles ≥ 44 px.
- Responsive : mobile 360 px, tablette, bureau 1280 px. Aucune barre de défilement horizontale.

## Phase 1 — Fondations du design (à faire en premier)
1. Polices locales : `@fontsource/manrope` (400, 500, 600, 700, 800) pour toute l'interface, `@fontsource/playfair-display` (500, 600, 700) uniquement pour les titres de la page d'accueil publique. Vérifie que la CSP existante les autorise (même origine).
2. Jetons CSS (variables) dans src/lib/design/ :
   - Application : fond `#EFEFF2`, cartes `#FFFFFF` bordure `#E6E6EC` rayon 24–28 px, encre `#1E1E22`, texte secondaire `#5B5B66`, carte sombre `#2A2940`, barre latérale `#25252B`, bleu `#7F9BDB` (pastille `#DCE5FA` texte `#1F2F5C`), lavande `#B8A5FA`, pêche `#FFDFB8` (pastille `#FFE3C2` texte `#6B3A00`), jaune-vert `#E9F74B` (rare : un seul bouton d'action fort par écran), cotes du patron `#C2410C`.
   - Accueil public : bleu nuit `#23223A`, doré `#C9A77C` (texte doré sur fond clair : `#A8845A`), crème `#F7F4EF`.
   - Boutons en pilule (rayon 999), noirs `#1E1E22` texte blanc ; secondaires bordés.
3. Composants (réutilise/étends ceux de src/lib/design/) : Bouton, Puce, Avatar, Carte, ChampTexte, Onglets accessibles, EtatVide, Squelette, BarreProgression, Rail (barre latérale noire arrondie flottante, 76 px, icônes + item actif en pastille blanche ; sur mobile : barre d'onglets en bas).
4. Gabarit connecté : Rail à gauche + contenu. Déconnexion en bas du rail.

## Phase 2 — Inscription « Créer mon atelier » (PRIORITÉ : elle manque aujourd'hui)
Route publique `/inscription` (GET + action POST), rendu fidèle à la maquette « Main » :
- Panneau gauche bleu nuit `#2A2940` : logo, titre « Votre prochaine cliente repart avec un patron sur mesure. », trois puces de bénéfices, mention « Brouillon à valider par un maître tailleur avant toute coupe réelle. »
- Formulaire : titre « Ouvrez votre atelier en 2 minutes », champs Nom de l'atelier (2–80 car.), Votre nom, Adresse e-mail (minuscules, unique), Mot de passe (12 caractères minimum, jamais de règle de composition absurde) + Confirmation, case obligatoire « Je m'engage à recueillir le consentement explicite de mes clientes avant toute photo ou mesure. », bouton « Créer mon atelier », lien « Se connecter », lien « Essayer la démo guidée, sans compte ».
- Comportement : crée l'atelier ET le compte administrateur de cet atelier dans une transaction, mot de passe haché scrypt (même service que /installation : réutilise-le, ne le recopie pas), ouvre la session, redirige vers le tableau de bord avec le message « Votre atelier est prêt. Ajoutez votre première cliente. ».
- Sécurité : contrôle CSRF existant, champ piège (honeypot) invisible, limitation de débit par IP (5 créations/heure, en mémoire comme /demo), messages d'erreur sans fuite d'information sauf « Cette adresse est déjà utilisée. Connectez-vous. », aucun mot de passe journalisé.
- Variable d'environnement optionnelle `INSCRIPTION_OUVERTE` (défaut `true`) : si `false`, /inscription affiche « Les inscriptions sont fermées. » et refuse le POST. Documente-la dans le README sans afficher de valeur secrète.
- Isolation : prouve par un test que deux ateliers créés par inscription ne voient jamais les clientes l'un de l'autre.
- Liens vers /inscription depuis l'accueil public et /connexion. /connexion reprend le même style (panneau gauche + formulaire).
- Pas de vérification par e-mail ni de mot de passe oublié pour l'instant : écris-le dans docs/A_FAIRE_AVANT_MISE_EN_LIGNE.md.
- Tests : unitaires (validation, doublon, honeypot, limite de débit, mot de passe < 12), e2e (inscription → tableau de bord → ajout d'une cliente).

## Phase 3 — Page d'accueil publique « / » (visiteur non connecté)
Un visiteur connecté est redirigé vers le tableau de bord. Rendu fidèle à la maquette « Accueil » :
- En-tête : logo, liens (Fonctionnalités, Comment ça marche, Salle d'essayage, Démo), « Se connecter », bouton doré « Créer mon atelier ».
- Hero bleu nuit. Sur-titre : « Pour les ateliers qui veulent gagner des heures ». Titre (police Playfair) : « Mesurez-la une fois. *Son patron est déjà là.* » (seconde phrase en italique doré). Texte : « Fini les heures de calcul au crayon. Saisissez les mesures de votre cliente, regardez le vêtement prendre forme sur mannequin, puis imprimez son patron à l'échelle, prêt à couper. » Boutons : « Voir mon premier patron » (vers /demo) et « Tester gratuitement, sans compte » (vers /demo).
- À droite du hero : la photo du vêtement (carte blanche arrondie, étiquette « Le vêtement ») ET le patron coté à côté (composant PatronCote, phase 4).
- Section « Ce que vous faisiez en une journée, en dix minutes » : 4 cercles pastel (Fiches clientes, Patron généré, Salle d'essayage, PDF A4 à l'échelle).
- Section « Devant, dos et ceinture. Chaque mesure écrite sur la pièce. » : texte + grand PatronCote dans une carte blanche, avec la légende (cotes en orange, contour et sens du droit-fil, marge de couture 1 cm).
- Section « Trois gestes, et la cliente se voit déjà dans son pantalon » (Mesurez, Essayez, Imprimez) avec aperçu du tableau de bord.
- Bandeau « Nous ne vous promettons pas la magie. Nous vous promettons un vrai point de départ. » + texte d'honnêteté (brouillon à valider, 3D indicative, photos chiffrées supprimées après 7 jours).
- Appel final doré : « Votre prochaine cliente mérite mieux qu'un patron à la main », « Deux minutes pour ouvrir votre atelier. Aucune carte bancaire, aucune installation. » Boutons « Créer mon atelier » et « Voir la démo d'abord ».
- Pied de page. Si une promesse n'est pas vraie dans l'application (par ex. « gratuitement »), signale-la dans ton rapport au lieu de l'inventer.
- Aucun faux témoignage, aucun faux chiffre de clients.

## Phase 4 — Composant PatronCote + tableau de bord + fiche cliente
**PatronCote.svelte** (le cœur visuel) : dessin technique du patron, DEVANT et DOS côte à côte, et la CEINTURE en bande au-dessus.
- Il dessine les VRAIS contours calculés par le moteur (analyserPantalonLarge et pièces existantes), mis à l'échelle dans un viewBox, et non les formes schématiques de la maquette. Les valeurs affichées viennent du moteur (aucun nombre en dur) : Ceinture (longueur × hauteur), Taille, Hanches (à leur hauteur, sur chaque pièce), Fourche, Longueur, Bas (valeur calculée du bas).
- Éléments : contour épais encre `#23223A`, marge de couture 1 cm en pointillés, cotes en orange `#C2410C` avec flèches et étiquettes blanches arrondies, indication « SENS DU DROIT-FIL » avec flèche, légende « = marge de couture 1 cm », titres DEVANT / DOS.
- Variantes : `complet` (toutes les cotes), `mini` (contours seulement, pour les vignettes).
- Accessible : `role="img"` + `aria-label` décrivant les mesures ; texte lisible à 340 px de large.
- Tests : le composant affiche les valeurs du moteur pour un jeu de mesures donné ; changer une mesure change la cote correspondante.
- La page d'accueil publique utilise ce même composant avec les mesures de démonstration (pas de valeurs inventées).

**Tableau de bord connecté** (maquette « Atelier ») : Rail ; « Bonjour, *Prénom* » ; recherche ; bouton « Nouvelle cliente » ; grande carte sombre « À faire en priorité » avec 3 cartes colorées (lavande, pêche, jaune-vert) pour les clientes aux mesures incomplètes (barre de progression « n mesures sur 9 ») ; 3 cartes de chiffres (Clientes, Patrons, Mesures complètes) calculées depuis la base ; liste « Clientes récentes » ; « Derniers patrons » avec vignettes PatronCote mini ; carte « Patrons à valider » ; bouton « Créer un patron » ; carte large « Dernier patron — {cliente} » avec PatronCote complet + liste des mesures + « Ouvrir la salle d'essayage » et « Télécharger le PDF A4 ». Pas de donnée inventée : états vides soignés (EtatVide) quand il n'y a rien.
**Fiche cliente** (maquette « Fiche ») : en-tête, onglets Résumé / Mesures / Photos / Patrons, cartes de patrons avec vignette PatronCote mini, étiquette « Brouillon à valider », boutons Ouvrir et PDF A4, carte « Nouveau patron pour {prénom} ».

## Phase 5 — Salle d'essayage en deux vues
Maquette « Salle » et « Salle3d » :
- Onglets accessibles (role tablist) : « 1 · Patron à plat » (ouvert par défaut) puis « 2 · Vue 3D (aperçu) ».
- Vue 1 : PatronCote complet, grand, + encart « Le patron à plat fait foi » + bouton PDF A4.
- Vue 2 : la 3D actuelle (avec son repli sans WebGL), bandeau « Aperçu indicatif · le patron à plat fait foi », la planche 3 images (Face, Perspective, Dos) conservée, pastille de tissu corrigée (la couleur du tissu doit s'afficher).
- Colonne de droite : mesures (curseurs), tissu, carte « Votre patron » (Devant ×2, Dos ×2, Ceinture ×1). Les curseurs mettent à jour PatronCote en direct.
- La 3D ne doit jamais bloquer : si elle échoue, la vue 1 reste utilisable.

## Phase 6 — Pages d'erreur et finitions
- `+error.svelte` stylée (404 « Page introuvable », 500 « Un problème est survenu ») dans le même style, avec bouton de retour, sans trace technique ni message interne.
- Pages /connexion, /installation, /demo, /profil alignées sur les nouveaux jetons.
- Vérifie à 360 px, 768 px, 1280 px. Vérifie le contraste. Vérifie l'ordre de tabulation.
- Mets à jour HANDOFF.md et le README (nouvelles routes, variable INSCRIPTION_OUVERTE, polices locales).

## Compte rendu final (obligatoire)
Pour chaque phase : ce qui est fait, ce qui ne l'est pas, résultats des 4 commandes de test, hash du commit, et la liste des écarts avec la maquette (écran par écran). Signale tout ce qui n'est pas vrai ou pas encore possible (promesses de la page d'accueil, limites de la 3D, absence de vérification e-mail).
