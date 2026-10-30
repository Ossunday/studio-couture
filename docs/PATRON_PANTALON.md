# Patron du pantalon large — méthode de tracé (brouillon, 2026-10-30)

Statut : **brouillon non validé**. Toutes les formules sont `a_valider`,
`source: null` dans `src/lib/patterns/pantalon-large/formulas.ts`
(règle n°3). Aucune ne devient production sans réponse datée et signée
d'un maître tailleur (voir `docs/FORMULES_A_VALIDER.md`).

## Origine de la méthode

Structure classique de tracé de pantalon, observée sur les références
locales de l'atelier (`docs/references-locales/`, usage local, jamais
committées ni copiées dans l'application) : pièces **devant** et **dos**
distinctes, lignes de construction horizontales, courbe de fourche,
cotes chiffrées, tracé par points nommés (A, B, B2, B3, C, O, X) et
formules proportionnelles aux tours du corps. Ces images de présentation
contiennent des chiffres incohérents (générés par IA) : **aucun chiffre
n'en est repris** — seuls la structure et le principe de proportions le
sont. Le modèle visé : pantalon large marron, taille haute, à plis,
ceinture à bouton (photo du modèle, même dossier).

Base libre FreeSewing Titan (MIT) : examinée et écartée en phase
précédente (13 mensurations d'atelier, bloc sans style) — décision
réversible déjà tracée, inchangée.

## Entrées

Cliente (4 champs obligatoires, écran mesures) : tour de taille `T`,
tour de hanches `H`, hauteur de fourche `F` (assise, taille→chaise),
longueur de pantalon `L` (taille→sol/cheville).

Options du modèle (section repliée « Options », jamais obligatoires,
constantes dans `BROUILLON_PANTALON_LARGE`) : largeur du bas par pièce
**calculée par défaut** (jambe droite, voir ci-dessous ; option explicite
18 à 40 cm), profondeur du pli devant 4 cm, hauteur finie de ceinture 4 cm.

## Lignes de construction (y vers le bas, origine = milieu devant à la taille)

| Ligne | Hauteur | Formule | Statut |
|---|---|---|---|
| Taille | 0 | — | — |
| Hanches | `min(18 ; 0,70×F)` | P4 | a_valider |
| Fourche | `F` (devant) | mesure cliente | — |
| Genou | `F + (L−F)/2` | mi-fourche/bas | a_valider |
| Bas | `L` | mesure cliente | — |

## Points (devant ; dos = mêmes lettres, valeurs dos)

| Point | Définition | Formule |
|---|---|---|
| A | milieu à la taille | devant (0 ; 0) ; dos (0 ; −2) : milieu dos **remonté de 2 cm** |
| B | côté à la taille | x = largeur de taille tracée (voir ci-dessous), y = 0 |
| B2 | côté aux hanches | x = largeur de hanches, sur la ligne de hanches |
| B3 | point de fourche | x = −extension de fourche, sur la ligne de fourche (dos : abaissé par calcul, ci-dessous) |
| C | genou | sur les droites côté et entrejambe, ligne de genou |
| O | milieu du bas | milieu de X1–X2 ; le **fil droit** passe par O |
| X1 / X2 | bas côté / bas entrejambe | O ± largeur du bas ÷ 2 |

## Formules (toutes a_valider, source : aucune — à confirmer)

- Aisances : taille `T+4`, hanches `H+6` (P1).
- Répartition : devant = quart − 1 cm, dos = quart + 1 cm, à la taille
  comme aux hanches (P2). Largeurs effectives devant/dos différentes.
- Taille tracée : devant = effective + profondeur du pli (le pli fermé
  ramène à l'effective) ; dos = effective + largeur de pince 3 cm (P10).
- Extension de fourche : devant `(H+6) ÷ 16` ; dos = devant + 2,5 cm (P3).
- Courbe de fourche **en J** : Bézier cubique du point J (milieu, à
  **9 cm devant / 11 cm dos** au-dessus de la fourche ; dos : milieu
  incliné de 1,5 cm vers l'extérieur) vers B3. Tangente **verticale au
  milieu** (premier contrôle sous J), puis courbe progressive : tangente
  finale **inclinée de 15° par rapport à la verticale** (diagonale, jamais
  verticale aux deux bouts — pas de marche en S). Raccord à l'entrejambe
  vérifié par test (angle > 160° et tangente finale non verticale, 3
  morphologies). Structure (devant/dos, courbe en J) observée sur la
  référence locale de pantalon femme du dossier `references-locales/`
  (fichier cité « patron-femme.jpg » dans la consigne, présent ici sous
  le nom « exemple de patron pantalon femme généré avec ia.jpg ») :
  **aucun chiffre copié**.
- Côté : Bézier quadratique B→B2 décalée de 0,4 cm vers l'extérieur
  (galbe des hanches), puis droite B2→X1 ; le genou C est sur cette
  droite. Le côté dos est la **translation** du côté devant (même suite
  de déplacements) : longueurs de côté devant = dos par construction,
  testées à 0,3 cm près.
- Entrejambe : droite B3→X2 (« entrejambe droit »). La hauteur de B3 dos
  est **résolue par calcul** (`L − √(entrejambe_devant² − dx_dos²)`)
  pour que les longueurs d'entrejambe devant/dos soient égales ;
  testées à 0,3 cm près. Avec le bas large calculé ci-dessous,
  l'abaissement dos qui en résulte est quasi nul (≈ 0,0 cm sur les
  3 jeux) ; il remplace l'ancien « +0,5 cm » arbitraire.
- Largeur du bas par défaut : **calculée à partir du genou**, plus de
  constante 27 cm (qui rendait la jambe plus étroite en bas qu'au genou).
  Le genou étant sur les droites côté/entrejambe, on résout par itération
  la jambe droite `bas = plus grand genou (devant, dos)` : 32,0 cm
  (petite), 35,8 cm (moyenne), 44,6 cm (forte). L'option explicite
  « largeur du bas » reste bornée à 18–40 cm (P5, a_valider).
- Pli devant : sur le fil droit O, profondeur = option (4 cm), lignes
  dessinées de la taille aux hanches + 6 cm (P10, longueur a_valider).
- Pince dos : largeur 3 cm, longueur 12 cm, centrée au milieu du dos (P11).
- Ceinture : longueur = `T + 4 (aisance) + 3 (recouvrement)`, hauteur
  finie 4 cm coupée 8 cm (pliée en deux) (P7). Test : longueur −
  recouvrement = somme des tailles effectives ×2, à 0,5 cm près.
- Poche : **non tracée** — mention « bientôt » dans l'aperçu (P12).
- Marges incluses : coupe = couture + 1 cm, ourlet 2 cm en bas (P8).

## Cotes et rendu

Chaque pièce (devant, dos, ceinture) porte ses cotes avec flèches et
valeurs en cm : taille (pli/pince fermé), hanches, genou, bas, hauteur
de fourche, longueur de côté, longueur d'entrejambe ; ceinture :
longueur et hauteur finie. Étiquettes centrées **sur fond clair** à
l'intérieur des pièces (jamais sur un bord ni une flèche), nom +
quantité (×2, ×1), fil droit, crans (taille, hanches, genou), mention
« marge de couture incluse », bannière brouillon. Tableau « Mesures du
patron » sous l'aperçu avec les mêmes valeurs. Le PDF A4 1:1 reprend
les mêmes cotes (texte écrit une seule fois, sur la page qui contient
l'étiquette).

## Vérification

`src/lib/patterns/pantalon-large/geometry.test.ts` : égalités de
coutures (côté, entrejambe), ceinture, courbe de fourche en J (hauteur
≥ 8 cm, tangente finale non verticale, angle de raccord > 160°), bas
par défaut ≥ genou, étiquettes de cote deux à deux disjointes et
« Hanches » loin des crans, et **test doré** du jeu moyenne
(82/100/27/105) dont chaque valeur attendue est recalculée à la main en
commentaire du test. Jeux petite (64/88/24/96) et forte (110/128/31/108)
soumis aux mêmes égalités. Playwright 360 px : aucun débordement
horizontal de page (accueil, mesures, aperçu), dessin dans un conteneur
défilant d'environ 700 px. Captures 360 px / 768 px des trois jeux :
Playwright, `test-results/` (non commité).

## Décisions réversibles (autonomie, 2026-10-30)

1. Répartition −1/+1 cm et extension ÷16 conservées des hypothèses
   précédentes, faute de source — questions tailleur inchangées.
2. Abaissement de fourche dos **calculé** (égalisation d'entrejambe)
   plutôt que constant : réversible si le tailleur impose une valeur.
3. Ceinture coupée à 2× la hauteur finie (8 cm pour 4 cm fini), comme
   avant ; la cote affichée donne la hauteur finie demandée (4 cm).
4. Options du modèle en paramètres d'URL facultatifs, rien en base.
