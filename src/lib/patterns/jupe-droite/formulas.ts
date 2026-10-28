import type { FormulePatron } from '../types';

/**
 * JUPE DROITE — registre de formules.
 *
 * ⚠️ AUCUNE formule n'est inventée dans ce fichier (règle produit n°3).
 * Au 2026-10-28, aucune source de patronage vérifiable n'a été fournie
 * par un maître tailleur pour ce projet. Tout est donc "a_valider",
 * aisance vide, et le moteur (engine.ts) refusera de générer un patron
 * de production tant qu'un tailleur nommé n'aura pas validé chaque
 * élément avec sa source.
 *
 * Les images de patrons partagées en amont de la conversation sont des
 * infographies de réseaux sociaux, non à l'échelle, parfois incohérentes :
 * elles ne constituent PAS une source de patronage.
 */
export const FORMULES_JUPE_DROITE: readonly FormulePatron[] = [
  {
    id: 'jupe_droite.largeur_hanches',
    garmentId: 'jupe_droite',
    element: 'largeur_hanches',
    source: null,
    hypotheses: [
      'À définir par le tailleur validateur : répartition devant/dos du tour de hanches',
      'À définir : aisance hanches selon tissu (chaîne et trame vs stretch)'
    ],
    aisanceCm: {},
    statut: 'a_valider'
  },
  {
    id: 'jupe_droite.pince_taille',
    garmentId: 'jupe_droite',
    element: 'pince_taille',
    source: null,
    hypotheses: [
      'À définir : profondeur et longueur de pince devant et dos en fonction de l’écart taille/hanches'
    ],
    aisanceCm: {},
    statut: 'a_valider'
  },
  {
    id: 'jupe_droite.longueur_et_ourlet',
    garmentId: 'jupe_droite',
    element: 'longueur_et_ourlet',
    source: null,
    hypotheses: ['À définir : valeur d’ourlet et marge de couture latérale / milieu dos'],
    aisanceCm: {},
    statut: 'a_valider'
  },
  {
    id: 'jupe_droite.ceinture',
    garmentId: 'jupe_droite',
    element: 'ceinture',
    source: null,
    hypotheses: ['À définir : hauteur de ceinture, croisure et type de fermeture'],
    aisanceCm: {},
    statut: 'a_valider'
  }
];
