import type { FormulePatron } from '../types';

/**
 * PANTALON LARGE (brouillon) — registre de formules, règle n°3.
 *
 * Base libre examinée : FreeSewing Titan (@freesewing/titan 4.10.2, licence MIT
 * vérifiée) — NON retenue, voir docs/PATRON_PANTALON.md : c'est un bloc qui
 * exige 13 mensurations d'atelier, incompatible avec le parcours visé
 * (3 à 4 mesures au mètre ruban). Construction ci-dessous : hypothèses simples
 * et explicites, TOUTES « a_valider » par un tailleur, source null.
 * Les valeurs chiffrées vivent dans geometry.ts (BROUILLON_PANTALON_LARGE)
 * et sont listées dans docs/FORMULES_A_VALIDER.md.
 */
export const FORMULES_PANTALON_LARGE: readonly FormulePatron[] = [
  {
    id: 'pantalon_large.aisances',
    garmentId: 'pantalon_large',
    element: 'aisances',
    source: null,
    hypotheses: ['Aisance taille +4 cm et hanches +6 cm (brouillon, pantalon large) — à valider selon tissu'],
    aisanceCm: {},
    statut: 'a_valider'
  },
  {
    id: 'pantalon_large.repartition_devant_dos',
    garmentId: 'pantalon_large',
    element: 'repartition_devant_dos',
    source: null,
    hypotheses: ['Quarts égaux devant et dos (tour ÷ 4) — simplification de brouillon, la répartition réelle diffère'],
    aisanceCm: {},
    statut: 'a_valider'
  },
  {
    id: 'pantalon_large.fourche',
    garmentId: 'pantalon_large',
    element: 'fourche',
    source: null,
    hypotheses: [
      'Extension de fourche devant = (tour de hanches + aisance) ÷ 16 ; dos = devant + 2 cm — à valider',
      'Hauteur des hanches placée à 18 cm sous la taille — à valider'
    ],
    aisanceCm: {},
    statut: 'a_valider'
  },
  {
    id: 'pantalon_large.largeur_bas',
    garmentId: 'pantalon_large',
    element: 'largeur_bas',
    source: null,
    hypotheses: ['Largeur du bas de jambe (par pièce) = quart de hanches + 4 cm (effet « large ») — à valider'],
    aisanceCm: {},
    statut: 'a_valider'
  },
  {
    id: 'pantalon_large.ceinture_et_marges',
    garmentId: 'pantalon_large',
    element: 'ceinture_et_marges',
    source: null,
    hypotheses: [
      'Ceinture : longueur = tour de taille + aisance + 3 cm de croisure, hauteur coupée 8 cm (4 cm fini) — à valider',
      'Marges : 1 cm partout, ourlet 2 cm — valeurs demandées par le produit, à confirmer'
    ],
    aisanceCm: {},
    statut: 'a_valider'
  }
];
