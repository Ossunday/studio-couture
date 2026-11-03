# Robe fourreau — méthode de tracé (BROUILLON NON VALIDÉ)

Statut : **brouillon non validé**. Aucune formule de ce document n'a été
confirmée par un maître tailleur ; chacune est marquée `a_valider` dans
`src/lib/patterns/robe-fourreau/formulas.ts` et dans
`docs/FORMULES_A_VALIDER.md` (section R). Aucune coupe n'est garantie :
essayez d'abord sur un tissu peu coûteux. La référence locale
`docs/references-locales/robe-fourreau.jpg` (photo d'une robe à carreaux,
encolure ronde fendue en V, petites manches courtes, longueur genou, et
demi-devant coté) n'a servi qu'à choisir la silhouette et les options ;
les valeurs écrites sur l'image sont des exemples d'infographie sans
cohérence garantie et ne sont **jamais** codées comme constantes.

## Mesures demandées (6)

| Mesure | Code | Bornes de saisie |
|---|---|---|
| Tour de poitrine | `tour_poitrine_cm` | 50–200 cm |
| Tour de taille | `tour_taille_cm` | 40–200 cm |
| Tour de hanches | `tour_hanches_cm` | 50–220 cm |
| Longueur nuque-taille | `longueur_dos_cm` | 20–80 cm |
| Longueur de robe (depuis la nuque) | `longueur_robe_cm` | 40–180 cm |
| Largeur d'épaules | `largeur_epaules_cm` | 25–70 cm |

## Options

- **Encolure** : ronde, ou ronde fendue en V au milieu devant (fente de 5 cm tracée en trait intérieur).
- **Manches** : sans manches, ou petite manche courte (pièce supplémentaire ×2, longueur finie 18 cm).
- **Fermeture dos à glissière** : case cochée par défaut ; le dos est de toute façon coupé en 2 pièces au milieu dos.

## Méthode par points (demi-patron, x = 0 au milieu, y = 0 à la nuque, y vers le bas)

1. Largeurs (quarts de tour + aisance totale répartie) : poitrine
   `(tour + 6)/4`, taille `(tour + 2)/4`, hanches `(tour + 4)/4` — `a_valider`.
2. Lignes horizontales : poitrine à la profondeur d'emmanchure
   `tour de poitrine / 6 + 7` ; taille à la longueur nuque-taille ;
   hanches 18 cm sous la taille (plafonnée à 12 cm au-dessus de l'ourlet) — `a_valider`.
3. Encolure : demi-largeur `largeur d'épaules × 0,17` ; profondeur devant
   demi-largeur + 2, dos 2 cm ; courbe en Bézier cubique échantillonnée — `a_valider`.
4. Épaule : du point d'encolure `(demi-encolure, 0)` à la pointe
   `(largeur d'épaules/2, 4)` (pente 4 cm) ; **même segment devant et dos** — `a_valider`.
5. Emmanchure : Bézier de la pointe d'épaule au point de poitrine — `a_valider`.
6. Couture de côté **unique, partagée devant/dos** : emmanchure → taille
   (largeur = quart de taille + pince de 3 cm) → hanches → bas élargi de
   1 cm, en Béziers échantillonnées ; les longueurs de côté et d'épaule
   devant/dos sont donc égales par construction — `a_valider`.
7. Pinces de taille en traits intérieurs : 3 cm, centre à 55 % (devant) /
   45 % (dos) du quart de taille, jambes de 10 cm vers le haut et 11 cm
   vers le bas — `a_valider`.
8. Milieu devant au pli (×1) ; milieu dos en 2 pièces (×2), ligne de
   fermeture tracée si l'option glissière est cochée.
9. Marges : trait de coupe = trait de couture + 1 cm, ourlet 2 cm
   (construction commune `construirePiece`) ; fil droit, crans aux
   hanches et à l'emmanchure ; cotes poitrine, taille, hanches,
   nuque-taille, longueur de robe, épaule et encolure portées comme
   données par chaque pièce.

## Séquence de construction (à valider par le tailleur)

1. Assembler les pinces devant et dos, puis les coutures de côté.
2. Monter la fermeture à glissière au milieu dos (si l'option est retenue).
3. Assembler les épaules, puis la parementure d'encolure.
4. Monter les manches courtes (si l'option est retenue), sinon finir les emmanchures.
5. Ourlet de 2 cm, essayage sur toile peu coûteuse, corrections, puis seulement le tissu final.
