# PROMPT MUSE — Phase 7 : préparation du dépôt pour la soumission (hackathon Meta)

À exécuter quand le client te le demande, sans travail simultané sur le dépôt. L'étape 1 est urgente (rendre le dépôt public sans risque) ; les étapes 2 à 4 viennent après son feu vert (« suite »). Règles inchangées : ne lis jamais un fichier .env*, jamais de `git push`, pas de curl ni taskkill, commits locaux en français. Après chaque étape : `npm test`, `npm run check`, `npm run build`, `npm run test:e2e`.

Objectif : le dépôt va devenir PUBLIC sur GitHub (open source obligatoire). Des juges internationaux doivent pouvoir le comprendre et le lancer en 3 commandes, sans PostgreSQL.

## 1. Audit de confidentialité et de droits — À FAIRE EN PREMIER, PUIS ARRÊTE-TOI
Résultat des contrôles faits par le client (déjà exécutés) :
- Fichiers suivis par Git à examiner : `.env.example`, `static/icon-192.png`, `static/icon-512.png`, `static/img/accueil-pantalon.jpg`. Les autres correspondances (scripts, tests, routes « photos ») sont du code, pas des images.
- Dans l'historique, le seul fichier problématique est `static/img/accueil-pantalon.jpg` (image téléchargée, droits non confirmés, ajoutée au commit de la phase 2).
- `docs/references-locales/` et `docs/maquette/` ne sont PAS suivis : ils doivent le rester.

À faire :
1. Vérifie que `.env.example` ne contient AUCUNE valeur secrète (seulement des noms de variables et des exemples évidents comme `change-me`). Tu as le droit de lire ce fichier-là uniquement, pas les autres .env*.
2. Vérifie que `static/icon-192.png` et `static/icon-512.png` sont des icônes de l'application (pas des images téléchargées). Si tu n'en es pas sûr, dis-le.
3. Ajoute à `.gitignore` : `docs/references-locales/`, `docs/maquette/`, `*.env`, `.env*` (sauf `.env.example`), et tout dossier de photos clientes locales. Garde `docs/PROMPT_*.md` suivis : ils montrent comment Muse Code a été piloté.
4. Remplace `static/img/accueil-pantalon.jpg` par une illustration SVG ORIGINALE (inspire-toi du dessin du pantalon dans docs/maquette/Accueil.dc.html, ne copie aucune photo) et mets à jour `docs/A_FAIRE_AVANT_MISE_EN_LIGNE.md`.
5. Retire `accueil-pantalon.jpg` de TOUT l'historique, car le dépôt n'a jamais été poussé. Procédure imposée :
   a. fais d'abord une sauvegarde : `git branch sauvegarde-avant-nettoyage` ;
   b. `git filter-branch --force --index-filter "git rm --cached --ignore-unmatch static/img/accueil-pantalon.jpg" -- --all` ;
   c. supprime les références d'origine de filter-branch (`refs/original`) et lance `git reflog expire --expire=now --all` puis `git gc --prune=now` ;
   d. vérifie : `git log --all --name-only --pretty=format: | sort -u` ne doit plus contenir `accueil-pantalon.jpg`. Les hash de commits changeront : indique les nouveaux.
   Si la commande échoue sous Windows, arrête-toi et explique, ne bricole pas.
6. Cherche des secrets dans les fichiers et dans l'historique (`git log -p --all`, par motifs) : chaînes `postgres://` avec mot de passe, clés base64 de 32 octets, secrets de session, jetons. N'affiche JAMAIS une valeur trouvée : indique seulement fichier, commit et type. S'il y en a, arrête-toi et dis-le-moi.
7. Donne-moi la liste des adresses e-mail d'auteur présentes dans l'historique (`git log --all --format="%an <%ae>"`, sans doublons). Ne les modifie pas.
8. Lance les 4 commandes de test. Commit local : « Audit public : image retirée, .gitignore, illustration originale ».
9. COMPTE RENDU, PUIS ARRÊTE-TOI. Ne commence pas les étapes 2 à 4 avant que je te dise « suite ».

## 2. Lancement par les juges : `npm run demo`
- Ajoute un script `npm run demo` : dépôt en mémoire, secrets temporaires générés au démarrage (jamais écrits sur disque ni journalisés), compte de démonstration prêt à l'emploi (atelier fictif, une cliente fictive avec mesures complètes), ouverture sur http://127.0.0.1:3000.
- Fonctionne sur Windows, macOS et Linux, avec Node uniquement (pas de PostgreSQL, pas de Docker).
- Ajoute `.env.example` : noms de variables, commentaires, AUCUNE valeur secrète.
- Test e2e : `npm run demo` démarre, `/` et `/demo` répondent, le compte de démonstration peut se connecter.

## 3. Fichiers publics
- `LICENSE` : MIT, au nom de « Sunday Oscar AMINTCHI ».
- `README.md` en ANGLAIS (garde une courte section en français) : 
  - ce que fait Studio Couture, pour qui, et pourquoi (une page) ;
  - captures d'écran (génère-les avec Playwright dans `docs/captures/` : accueil, tableau de bord, patron à plat avec cotes, vue 3D, PDF) ;
  - lancement en 3 commandes (`npm install`, `npm run demo`) ;
  - tests : `npm test`, `npm run check`, `npm run build`, `npm run test:e2e`, avec les nombres réels ;
  - architecture en 10 lignes ;
  - limites connues, écrites franchement : patron = brouillon non validé par un maître tailleur, 3D indicative et pas une simulation de drapé, pas de vérification d'e-mail, pas de « mot de passe oublié », limites de débit en mémoire ;
  - « Built with Muse Code » : décris l'usage réel de Muse Code, Meta's coding agent (consignes du projet, HANDOFF.md, docs/PHASE_*.md, phases, tests après chaque phase). Ajoute la ligne : « Product and design briefs were drafted with the help of another AI assistant; the code was written and tested with Muse Code (Meta's coding agent). »
  - n'affirme AUCUN usage d'un modèle Meta à l'exécution si l'application n'en appelle aucun.
- `docs/ARCHITECTURE.md` court et `docs/META_USAGE.md` (usage réel de Muse Code, sans exagération).
- Vérifie qu'aucune mention de chemins personnels (C:\Users\os…), d'e-mails ou de numéros de téléphone réels ne reste dans les fichiers suivis.

## 4. Compte rendu
Pour chaque étape : ce qui est fait, résultats des 4 commandes, hash des commits. Liste séparée de tout ce qui reste à décider par moi. Rappelle que c'est moi qui crée le dépôt GitHub et qui pousse.
