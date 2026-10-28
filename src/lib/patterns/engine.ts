import { assertMensurationsPretesPourPatron } from '../domain/measurements';
import type { Mensuration } from '../domain/types';
import { formuleEstUtilisableEnProduction, type FormulePatron } from './types';

export type ResultatGeneration =
  | { ok: true; garmentId: string; note: 'géométrie à implémenter après validation tailleur' }
  | { ok: false; raisons: string[] };

/**
 * Moteur paramétrique — garde-fou central (règles n°2 et n°3).
 * - Jamais de génération libre par IA.
 * - Refuse toute formule non "valide_par_tailleur" avec source.
 * - Refuse toute mensuration photo non validée par la couturière.
 * En Phase 0, aucune formule n'est validée : la génération échoue donc
 * volontairement, et ce comportement est couvert par un test.
 */
export function tenterGenerationPatron(
  garmentId: 'jupe_droite' | 'pantalon_classique',
  formules: readonly FormulePatron[],
  mensurations: Mensuration[]
): ResultatGeneration {
  const raisons: string[] = [];

  try {
    assertMensurationsPretesPourPatron(mensurations);
  } catch (e) {
    raisons.push(e instanceof Error ? e.message : 'Mensurations non prêtes.');
  }

  for (const f of formules.filter((x) => x.garmentId === garmentId)) {
    if (!formuleEstUtilisableEnProduction(f)) {
      raisons.push(`Formule « ${f.element} » (${f.id}) : statut=${f.statut}, source absente ou non validée.`);
    }
  }

  if (raisons.length > 0) return { ok: false, raisons };
  return { ok: true, garmentId, note: 'géométrie à implémenter après validation tailleur' };
}
