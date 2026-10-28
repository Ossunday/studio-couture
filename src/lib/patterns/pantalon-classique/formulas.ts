import type { FormulePatron } from '../types';

/**
 * PANTALON CLASSIQUE — prévu après la jupe droite (ordre validé par la cliente).
 * Aucune formule ici en Phase 0 : fichier créé pour verrouiller la règle n°3
 * dès le départ. Tout restera "a_valider" jusqu'à source tailleur nommée.
 */
export const FORMULES_PANTALON_CLASSIQUE: readonly FormulePatron[] = [
  {
    id: 'pantalon_classique.non_defini',
    garmentId: 'pantalon_classique',
    element: 'non_defini',
    source: null,
    hypotheses: ['Patron non encore spécifié — démarrera après validation de la jupe droite.'],
    aisanceCm: {},
    statut: 'a_valider'
  }
];
