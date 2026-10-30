# Formules à valider par un maître tailleur

Statut au 2026-10-28 : **tout est `a_valider`, aucune source tailleur, aucun patron de production.**
L'application montre ces hypothèses à l'utilisatrice (écran patron, mention « à valider »),
chaque aperçu et chaque PDF portent « Brouillon non validé », et le moteur de production
(`src/lib/patterns/engine.ts`) refuse toujours de générer.

Pour valider : répondre à la question de chaque ligne, dater et signer — la réponse devient
la `source` dans les fichiers `formulas.ts` et le statut passe à `valide_par_tailleur`.

## Pantalon large (`src/lib/patterns/pantalon-large/`) — tracé refait le 2026-10-30

Méthode complète : `docs/PATRON_PANTALON.md` (points A, B, B2, B3, C, O, X).

| # | Formule (hypothèse actuelle) | Code | Question exacte pour le tailleur |
|---|---|---|---|
| P1 | Aisance taille **+4 cm**, hanches **+6 cm** | `BROUILLON_PANTALON_LARGE.aisance*` | Quelles aisances pour un pantalon large en tissu chaîne et trame ? Et en tissu extensible ? |
| P2 | Répartition devant/dos : **quart − 1 cm devant, quart + 1 cm dos** (taille et hanches) | `ecartDevantDosCm` | La répartition devant/dos est-elle bien −1/+1 cm par quart, à la taille comme aux hanches ? Sinon, quels écarts ? |
| P3 | Extension de fourche devant = **(hanches + aisance) ÷ 16**, dos = devant **+2,5 cm** | `diviseurExtensionFourche`, `supplementExtensionDosCm` | L'extension de fourche devant vaut-elle (tour de hanches)÷16 ? Le dos doit-il dépasser le devant de 2,5 cm, plus, moins ? |
| P4 | Ligne de hanches à **18 cm** sous la taille (plafonnée à 70 % de la fourche) ; genou à **mi-chemin fourche→bas** | `hauteurHanchesCm`, genou calculé | À quelle hauteur placer la ligne de hanches ? Le genou se place-t-il à mi-chemin entre fourche et bas ? |
| P5 | Largeur du bas **par défaut calculée à partir du genou** : jambe droite résolue par itération (bas = plus grand genou devant/dos ; 32,0 / 35,8 / 44,6 cm sur petite/moyenne/forte), option explicite toujours **18 à 40 cm** | `geometry.ts: largeurBasJambeDroite` (défaut), `saisie-patron.ts: lireOptionsPantalon` (option) | Le bas par défaut doit-il égaler le genou (jambe droite), ou être évasé d'un supplément (lequel) ? La plage d'option 18–40 cm suffit-elle alors que le défaut calculé dépasse 40 cm sur la forte morphologie ? |
| P6 | Dos : milieu **remonté de 2 cm**, milieu incliné de **1,5 cm** à la fourche, point de fourche dos **abaissé par calcul** pour égaliser l'entrejambe devant/dos (avec le bas large calculé, l'écart résolu est quasi nul : ≈ 0,0 cm sur les 3 jeux) | `remonteeMilieuDosCm`, `inclinaisonMilieuDosCm`, calcul entrejambe | La remontée du milieu dos vaut-elle 2 cm et son inclinaison 1,5 cm ? L'égalisation calculée de l'entrejambe donne un abaissement dos quasi nul avec la jambe droite large : est-ce la bonne façon, ou faut-il un abaissement fixe (lequel) quitte à reprendre l'entrejambe à la couture ? |
| P7 | Ceinture : longueur = taille + aisance **+ 3 cm de recouvrement**, hauteur **finie 4 cm** (coupée 8 cm) | `croisureCeintureCm`, `hauteurCeintureFinieCm` (option) | Hauteur de ceinture finie de 4 cm et recouvrement de 3 cm conviennent-ils ? Fermeture : bouton + braguette, crochets, ou élastique dos ? |
| P8 | Marges **1 cm**, ourlet **2 cm**, incluses au trait de coupe | `brouillon.ts: construirePiece()` | Confirmez-vous 1 cm / 2 cm partout, y compris fourche, entrejambe et ceinture ? |
| P9 | Courbe de fourche **en J** : tangente verticale au milieu, hauteur **9 cm devant / 11 cm dos**, tangente finale inclinée de **15°** par rapport à la verticale (diagonale, jamais verticale aux deux bouts) | `geometry.ts: hauteurCourbeFourcheDevantCm`, `hauteurCourbeFourcheDosCm`, `inclinaisonTangenteFourcheDegres` | Les hauteurs de courbe 9 cm (devant) et 11 cm (dos, plus profonde et plus longue) sont-elles justes à l'essayage ? La tangente finale inclinée donne-t-elle un raccord assez doux à l'entrejambe, faut-il creuser davantage le dos ? |
| P10 | **Un pli devant** sur le fil droit, profondeur **4 cm** (option), lignes jusqu'aux hanches + 6 cm | `profondeurPliCm` (option) | Un pli ou deux plis par devant pour ce modèle ? Profondeur de 4 cm juste ? Sur quelle longueur le pli est-il cousu/repassé ? |
| P11 | **Pince dos** : largeur **3 cm**, longueur **12 cm**, au milieu du dos | `largeurPinceDosCm`, `longueurPinceDosCm` | La pince dos de 3 × 12 cm au milieu du dos est-elle juste ? Une ou deux pinces dos selon l'écart taille/hanches, et à partir de quel écart ? |
| P12 | **Poche non tracée** (« bientôt ») | mention aperçu | Quelle poche pour ce modèle (italienne, passepoilée) ? Position et profondeur d'ouverture à tracer ? |

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
