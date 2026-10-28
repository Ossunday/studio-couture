import type { Mensuration } from './types';

export function estUtilisablePourPatron(m: Mensuration): boolean {
  return m.source === 'saisie_couturiere' || m.valideeParCouturiere === true;
}

/**
 * Règle n°4 : une estimation photo sans marge d'erreur affichée,
 * ou non validée par la couturière, ne peut pas alimenter le patron.
 */
export function assertMensurationsPretesPourPatron(ms: Mensuration[]): void {
  for (const m of ms) {
    if (m.source === 'estimation_photo' && (m.margeErreurCm === undefined || m.margeErreurCm < 0)) {
      throw new Error(`Marge d'erreur manquante pour l'estimation « ${m.code} ».`);
    }
    if (!estUtilisablePourPatron(m)) {
      throw new Error(`Mensuration « ${m.code} » non validée par la couturière.`);
    }
    if (!Number.isFinite(m.valeurCm) || m.valeurCm <= 0) {
      throw new Error(`Mensuration « ${m.code} » invalide.`);
    }
  }
}
