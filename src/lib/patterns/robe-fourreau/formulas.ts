import type { FormulePatron } from '../types';

/**
 * ROBE FOURREAU — registre de formules.
 *
 * ⚠️ AUCUNE formule n'est validée (règle produit n°3) : tout est
 * « a_valider », source null, tant qu'un maître tailleur n'a pas confirmé
 * chaque hypothèse (voir docs/modeles/robe-fourreau.md et
 * docs/FORMULES_A_VALIDER.md, section R). Les valeurs de la référence
 * locale (docs/references-locales/robe-fourreau.jpg) sont des exemples
 * d'infographie sans cohérence garantie : elles ne sont JAMAIS codées ici.
 */
export const FORMULES_ROBE_FOURREAU: readonly FormulePatron[] = [
  {
    id: 'robe_fourreau.largeurs',
    garmentId: 'robe_fourreau',
    element: 'largeurs_poitrine_taille_hanches',
    source: null,
    hypotheses: [
      'Quart de tour + aisance totale 6 cm poitrine, 2 cm taille, 4 cm hanches (à valider)',
      'Répartition devant/dos égale (quart strict) : à valider, un dos plus étroit est fréquent'
    ],
    aisanceCm: {},
    statut: 'a_valider'
  },
  {
    id: 'robe_fourreau.encolure_epaule',
    garmentId: 'robe_fourreau',
    element: 'encolure_et_epaule',
    source: null,
    hypotheses: [
      'Demi-encolure = largeur d’épaules × 0,17 ; profondeur devant = demi-encolure + 2 cm, dos = 2 cm (à valider)',
      'Pente d’épaule fixe de 4 cm ; épaule devant = épaule dos par construction (à valider)'
    ],
    aisanceCm: {},
    statut: 'a_valider'
  },
  {
    id: 'robe_fourreau.emmanchure',
    garmentId: 'robe_fourreau',
    element: 'emmanchure',
    source: null,
    hypotheses: ['Profondeur d’emmanchure = tour de poitrine / 6 + 7 cm (à valider)'],
    aisanceCm: {},
    statut: 'a_valider'
  },
  {
    id: 'robe_fourreau.pinces_et_galbe',
    garmentId: 'robe_fourreau',
    element: 'pinces_et_galbe_hanches',
    source: null,
    hypotheses: [
      'Pince de taille unique de 3 cm par demi-patron, position 55 % devant / 45 % dos (à valider)',
      'Ligne de hanches à 18 cm sous la taille ; élargissement du bas de 1 cm (à valider)'
    ],
    aisanceCm: {},
    statut: 'a_valider'
  },
  {
    id: 'robe_fourreau.longueurs',
    garmentId: 'robe_fourreau',
    element: 'longueurs_et_ourlet',
    source: null,
    hypotheses: ['Longueur de robe mesurée depuis la nuque ; marge 1 cm, ourlet 2 cm (marges communes du brouillon, à valider)'],
    aisanceCm: {},
    statut: 'a_valider'
  },
  {
    id: 'robe_fourreau.manche_courte',
    garmentId: 'robe_fourreau',
    element: 'manche_courte',
    source: null,
    hypotheses: ['Tête de manche = 60 % de la profondeur d’emmanchure ; longueur finie 18 cm (à valider)'],
    aisanceCm: {},
    statut: 'a_valider'
  },
  {
    id: 'robe_fourreau.fermeture_dos',
    garmentId: 'robe_fourreau',
    element: 'fermeture_dos',
    source: null,
    hypotheses: ['Fermeture à glissière au milieu dos, dos coupé en 2 pièces (à valider : longueur et type de glissière)'],
    aisanceCm: {},
    statut: 'a_valider'
  }
];
