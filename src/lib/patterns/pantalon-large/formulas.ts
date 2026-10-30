import type { FormulePatron } from '../types';

/**
 * PANTALON LARGE (brouillon) — registre règle n°3. Tracé classique par
 * lignes de construction (docs/PATRON_PANTALON.md), inspiré dans sa
 * STRUCTURE des références locales (devant/dos, courbe de fourche, cotes,
 * points A/B/B2/B3/C/O/X) — aucun chiffre copié de ces images générées
 * par IA. TOUTES les formules : statut a_valider, source null.
 * Valeurs dans geometry.ts (BROUILLON_PANTALON_LARGE) et
 * docs/FORMULES_A_VALIDER.md.
 */
const f = (id: string, element: string, hypotheses: string[]): FormulePatron => ({
  id: `pantalon_large.${id}`,
  garmentId: 'pantalon_large',
  element,
  source: null,
  hypotheses,
  aisanceCm: {},
  statut: 'a_valider'
});

export const FORMULES_PANTALON_LARGE: readonly FormulePatron[] = [
  f('aisances', 'aisances', ['Aisance taille +4 cm, hanches +6 cm — a_valider selon tissu']),
  f('repartition_devant_dos', 'repartition_devant_dos', ['Devant = quart − 1 cm, dos = quart + 1 cm (taille et hanches) — a_valider']),
  f('lignes_construction', 'lignes_construction', [
    'Ligne de hanches à 18 cm sous la taille, plafonnée à 70 % de la hauteur de fourche — a_valider',
    'Ligne de genou à mi-chemin entre fourche et bas — a_valider'
  ]),
  f('fourche', 'fourche', [
    'Extension fourche devant = (hanches + aisance) ÷ 16 ; dos = devant + 2,5 cm — a_valider',
    'Courbe de fourche en J : tangente verticale au milieu, hauteur 9 cm devant / 11 cm dos, tangente finale inclinée de 15° par rapport à la verticale ; milieu dos incliné de 1,5 cm et remonté de 2 cm — a_valider',
    'Point de fourche dos abaissé par calcul pour égaliser la longueur d’entrejambe devant/dos — a_valider'
  ]),
  f('plis_et_pince', 'plis_et_pince', [
    'Un pli devant sur le fil droit, profondeur 4 cm (option), fermé il ramène la taille à la largeur effective — a_valider',
    'Pince dos : largeur 3 cm, longueur 12 cm, au milieu du dos — a_valider'
  ]),
  f('largeur_bas', 'largeur_bas', ['Largeur du bas par pièce : par défaut calculée pour une jambe droite (bas = plus grand genou devant/dos, résolu par itération), option explicite 18 à 40 cm — a_valider']),
  f('ceinture_et_marges', 'ceinture_et_marges', [
    'Ceinture : longueur = taille + aisance + 3 cm de recouvrement, hauteur finie 4 cm (coupée 8 cm) — a_valider',
    'Marges : 1 cm partout, ourlet 2 cm en bas, incluses dans le trait de coupe — a_valider'
  ]),
  f('poche', 'poche', ['Poche : non incluse dans ce brouillon, mention « bientôt » affichée — forme et position a_valider'])
];
