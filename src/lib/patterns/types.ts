export type StatutFormule = 'a_valider' | 'valide_par_tailleur';

export interface FormulePatron {
  id: string;
  garmentId: 'jupe_droite' | 'pantalon_classique';
  /** Ex. "tour_hanches", "pince_taille" — jamais un coefficient inventé ici. */
  element: string;
  /** Source traçable : ouvrage, école, maître tailleur nommé + date. Null tant qu'inconnue. */
  source: string | null;
  hypotheses: string[];
  /** Aisance en cm, uniquement si issue de la source ci-dessus. Vide tant que non validée. */
  aisanceCm: Record<string, number>;
  statut: StatutFormule;
  validePar?: string;
  valideLe?: string;
}

export function formuleEstUtilisableEnProduction(f: FormulePatron): boolean {
  return f.statut === 'valide_par_tailleur' && typeof f.source === 'string' && f.source.length > 0;
}
