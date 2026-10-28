# Formules à valider par un maître tailleur

Statut au 2026-10-28 : **tout est `a_valider`, aucune source tailleur, aucun patron de production.**
L'application montre ces hypothèses à l'utilisatrice (écran patron, mention « à valider »),
chaque aperçu et chaque PDF portent « Brouillon non validé », et le moteur de production
(`src/lib/patterns/engine.ts`) refuse toujours de générer.

Pour valider : répondre à la question de chaque ligne, dater et signer — la réponse devient
la `source` dans les fichiers `formulas.ts` et le statut passe à `valide_par_tailleur`.

## Pantalon large (`src/lib/patterns/pantalon-large/`)

| # | Formule (hypothèse actuelle) | Code | Question pour le tailleur |
|---|---|---|---|
| P1 | Aisance taille **+4 cm**, hanches **+6 cm** | `BROUILLON_PANTALON_LARGE.aisance*` | Quelles aisances pour un pantalon large en tissu chaîne et trame ? Et en tissu extensible ? |
| P2 | Devant et dos = **quarts égaux** (tour ÷ 4) | `geometry.ts: jambe()` | Quelle répartition devant/dos pour la taille et pour les hanches ? |
| P3 | Extension de fourche devant = **(hanches + aisance) ÷ 16**, dos = devant **+2 cm** | `geometry.ts: jambe()` | Quelle extension de fourche devant et dos (en cm ou en fraction du tour de hanches) ? |
| P4 | Ligne de hanches à **18 cm** sous la taille (plafonnée à 70 % de la fourche) | `hauteurHanchesCm` | À quelle hauteur placer la ligne de hanches par rapport à la taille et à la fourche ? |
| P5 | Largeur du bas de jambe par pièce = **quart de hanches + 4 cm**, côté bas décalé de **+1 cm** | `elargissementBasCm` | Quelle largeur de bas pour un « pantalon large » ? Le bas doit-il être droit, évasé, resserré ? |
| P6 | Dos : taille relevée de **1 cm**, fourche abaissée de **0,5 cm** | `geometry.ts: jambe(dos)` | Quels relevés/abaissements dos appliquer ? Faut-il une pince dos, et de quelle profondeur ? |
| P7 | Ceinture : longueur = taille + aisance **+ 3 cm de croisure**, hauteur coupée **8 cm** (4 cm fini) | `croisureCeintureCm`, `hauteurCeintureCoupeeCm` | Hauteur de ceinture finie ? Croisure et fermeture (bouton, crochet, élastique dos) ? |
| P8 | Marges **1 cm**, ourlet **2 cm** (imposées par le produit) | `brouillon.ts: construirePiece()` | Confirmez-vous 1 cm / 2 cm partout, y compris fourche et ceinture ? |
| P9 | Aucune pince au pantalon brouillon | — | Faut-il des pinces (devant/dos) quand l'écart taille/hanches dépasse un seuil ? Lequel ? |

## Jupe droite (`src/lib/patterns/jupe-droite/`)

| # | Formule (hypothèse actuelle) | Code | Question pour le tailleur |
|---|---|---|---|
| J1 | Aisance taille **+2 cm**, hanches **+4 cm** | `BROUILLON_JUPE_DROITE.aisance*` | Quelles aisances pour une jupe droite selon tissu ? |
| J2 | Devant et dos = **quarts égaux** | `geometry.ts: moitie()` | Quelle répartition devant/dos ? Le dos doit-il être plus étroit ? |
| J3 | Pince : largeur **3 cm**, longueur **12 cm devant / 14 cm dos**, placée à 55 % du quart de taille | `largeurPinceCm`, `longueurPince*` | Largeur, longueur et position des pinces devant et dos ? Une ou deux pinces dos ? |
| J4 | Ligne de hanches à **18 cm** sous la taille ; bas élargi de **+2 cm** par côté | `hauteurHanchesCm`, `elargissementBasCm` | Hauteur de hanches ? La jupe droite doit-elle être droite, crayon (resserrée) ou évasée en bas ? Fente dos nécessaire ? |
| J5 | Ceinture : taille + aisance **+ 3 cm**, hauteur coupée **8 cm** | `croisureCeintureCm`, `hauteurCeintureCoupeeCm` | Même question que P7 (ceinture commune jupe/pantalon ?). |
| J6 | Marges **1 cm**, ourlet **2 cm** | `brouillon.ts` | Même question que P8. Fermeture : longueur de fermeture éclair dos ? |

## Bornes de saisie (`src/lib/domain/mensurations-saisie.ts`)

Les bornes actuelles (ex. tour de taille 40–200 cm, hauteur de fourche 15–45 cm) sont des
garde-fous de saisie, pas des formules. Question : faut-il resserrer/élargir certaines bornes
pour vos clientes, et ajouter un contrôle d'écart taille/hanches maximal ?
