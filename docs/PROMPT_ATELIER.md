\# PROMPT\_ATELIER — parties 1 et 2 (à exécuter par Muse)



Objectif : relier la démo à l'atelier et rendre l'application moderne. Constat de l'utilisateur après test réel : (1) le design de l'espace atelier (fiche cliente, liste) est resté « ancien », formulaires empilés, serif, pas moderne ; (2) après avoir enregistré une cliente, ses mesures et sa photo, on ne peut RIEN faire : pas de patron, pas de 3D, pas d'historique. Cela ressemble à une démo qui collecte des informations.



Livre en 3 parties, commit après chacune, et ARRÊTE-TOI après la partie 2 pour faire ton rapport (la partie 3 seulement si je te le dis). Bannière « Brouillon non validé » et a\_valider inchangés. Pas de git push, pas de curl, pas de taskkill, pas de .env\*. Si une valeur te manque, arrête-toi et dis laquelle.



\## PARTIE 1 — Design v2 moderne → commit



\- Direction : application moderne, claire, aérée, façon app produit (inspirée de salles d'essayage et d'apps de mode : grandes cartes 20 px, puces arrondies, avatars à initiales, beaucoup de blanc, un seul accent). Abandonne le serif des titres : pile sans-serif moderne système (« Segoe UI Variable », system-ui, sans-serif), titres en 600–700, tailles fluides.

\- Mets à jour src/lib/design/tokens.css (source unique) : fond #F6F4F0, cartes #FFFFFF, encre #14110F, primaire = encre pour les boutons principaux (noir doux, arrondi 14 px), accent terracotta #B5532F réservé aux actions clés et aux états actifs, vert profond #1F3D36 en secondaire, laiton en détails fins. Contrastes AA.

\- Coque d'application pour l'espace connecté : barre latérale fixe à gauche sur ≥ 1024 px (logo, Accueil, Clientes, Patrons, Équipe pour l'admin, utilisatrice et déconnexion en bas) ; sur mobile, barre d'onglets en bas (Accueil, Clientes, + Nouveau patron, Équipe/Profil) et en-tête simple. Pages publiques (accueil, démo, connexion) : en-tête léger avec CTA, même langage visuel.

\- Composants réutilisables dans src/lib/design/ : Carte, Puce, Avatar (initiales, couleur stable par nom), BoutonPrimaire/Secondaire/Discret, ChampTexte (label au-dessus, erreur claire), EtatVide (illustration SVG simple + action), Onglets accessibles, Squelette de chargement.

\- Restyle : accueil, démo (4 étapes), connexion, liste des clientes (cartes avec avatar, téléphone, nombre de patrons, dernière activité, bouton Nouvelle cliente, recherche), formulaire cliente. Micro-animations 200–300 ms, prefers-reduced-motion respecté, cibles ≥ 48 px, aucun débordement à 360/768/1280.

\- Tests e2e existants adaptés, captures 360/768/1280 de : accueil, démo étape 3, liste clientes, fiche cliente.



\## PARTIE 2 — Fiche cliente comme espace de travail + patrons enregistrés → commit



1\. Données : nouvelle table patrons\_clientes (id uuid, cliente\_id FK ON DELETE CASCADE, atelier/propriétaire selon le modèle d'accès existant, modele, nom, mesures JSON (instantané des 4 mesures du patron), options JSON (bas, pli, ceinture), tissu JSON (couleur, matière), statut 'brouillon', cree\_par FK ON DELETE SET NULL, created\_at, updated\_at). Migration numérotée 0004 (comme 0003), implémentation dans les deux dépôts (mémoire et Postgres) selon le motif existant, mêmes contrôles d'autorisation que les clientes : une utilisatrice ne voit que les patrons des clientes auxquelles elle a accès. Supprimer la cliente supprime ses patrons. Tests d'intégration/unitaires pour l'accès et la suppression en cascade.

2\. Fiche cliente (/clientes/\[id]) : en-tête avec avatar, nom, téléphone, bouton principal « Créer un patron pour <prénom> ». Onglets : Résumé (mesures clés, derniers patrons, prochaine action suggérée), Mesures (la saisie existante, plus claire : groupes Haut du corps / Taille-bassin / Jambes, indication des mesures manquantes), Photos (consentement et photos existants), Patrons (liste). Garde la suppression de la cliente dans une zone « Danger » repliée avec confirmation.

3\. Créer un patron pour une cliente : route /clientes/\[id]/patron/nouveau → choix du modèle (cartes) → les mesures nécessaires sont PRÉREMPLIES depuis la fiche ; si une mesure manque, un formulaire court ne demande QUE celles-là et propose de les enregistrer dans la fiche → salle d'essayage (réutilise les composants de la démo : mesures en direct, tissu, patron à plat, 3D, 3 vues) avec les mesures de la cliente → bouton « Enregistrer ce patron » (nom proposé : « Pantalon large — <date> ») → retour à l'onglet Patrons avec un message de confirmation.

4\. Onglet Patrons : cartes avec miniature SVG du patron à plat (générée à la volée avec preparerPiece, sans stockage d'image), nom, date, mesures utilisées, étiquette « Brouillon ». Actions : Ouvrir dans la salle d'essayage, Télécharger le PDF A4 1:1 (route PDF connectée existante), Dupliquer, Renommer, Supprimer (confirmation).

5\. Sécurité : CSRF sur tous les POST, validation serveur de toutes les mesures (mêmes bornes), aucune mesure arbitraire acceptée, pas de fuite d'une cliente à une autre utilisatrice, journaux sans données personnelles.

6\. Tests : e2e Playwright du parcours complet connecté (se connecter → ouvrir une cliente → Créer un patron → mesures préremplies → salle d'essayage → Enregistrer → patron listé avec miniature → télécharger le PDF %PDF → dupliquer → supprimer) ; test d'accès entre deux utilisatrices ; cascade à la suppression de la cliente ; npm test, check, build, test:e2e. Captures 360/768/1280 de la fiche cliente (4 onglets) et de la salle d'essayage connectée.

7\. Dis-moi ENFIN : quel dépôt est utilisé par défaut en local (mémoire ou Postgres) et ce que l'on perd au redémarrage dans chaque cas, et la commande psql PowerShell exacte pour appliquer la migration 0004 (sans mot de passe, noms seuls).



\## À LA FIN DE LA PARTIE 2



Chiffres réels des vérifications, HANDOFF.md mis à jour, commits faits, puis STOP (pas de partie 3 tant que je ne l'ai pas demandée).

