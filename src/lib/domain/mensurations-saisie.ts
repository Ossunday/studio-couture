import { MessageError, type TranslationKey } from '../i18n';

/**
 * Saisie manuelle des mensurations par la couturière (en centimètres).
 * Ce fichier ne contient aucune formule de patron : uniquement une liste de
 * mensurations courantes et des bornes de plausibilité pour éviter les erreurs
 * de saisie (ex. virgule oubliée). Bornes larges, à resserrer avec l’atelier si besoin.
 */
export interface DefinitionMensuration {
  code: string;
  libelleCle: TranslationKey;
  minCm: number;
  maxCm: number;
}

export const DEFINITIONS_MENSURATIONS: readonly DefinitionMensuration[] = [
  { code: 'tour_poitrine_cm', libelleCle: 'mesure.tour_poitrine_cm', minCm: 50, maxCm: 200 },
  { code: 'tour_taille_cm', libelleCle: 'mesure.tour_taille_cm', minCm: 40, maxCm: 200 },
  { code: 'tour_hanches_cm', libelleCle: 'mesure.tour_hanches_cm', minCm: 50, maxCm: 220 },
  { code: 'longueur_dos_cm', libelleCle: 'mesure.longueur_dos_cm', minCm: 20, maxCm: 80 },
  { code: 'largeur_epaules_cm', libelleCle: 'mesure.largeur_epaules_cm', minCm: 25, maxCm: 70 },
  { code: 'longueur_manche_cm', libelleCle: 'mesure.longueur_manche_cm', minCm: 20, maxCm: 90 },
  { code: 'longueur_jupe_cm', libelleCle: 'mesure.longueur_jupe_cm', minCm: 20, maxCm: 150 },
  { code: 'longueur_robe_cm', libelleCle: 'mesure.longueur_robe_cm', minCm: 40, maxCm: 180 },
  { code: 'hauteur_fourche_cm', libelleCle: 'mesure.hauteur_fourche_cm', minCm: 15, maxCm: 45 },
  { code: 'longueur_pantalon_cm', libelleCle: 'mesure.longueur_pantalon_cm', minCm: 40, maxCm: 150 }
] as const;

export function definitionMensuration(code: string): DefinitionMensuration {
  const def = DEFINITIONS_MENSURATIONS.find((d) => d.code === code);
  if (!def) throw new MessageError('validation.mesurationInconnue', { code });
  return def;
}

/** Accepte « 82 », « 82.5 » et « 82,5 » ; refuse tout le reste et les valeurs hors bornes. */
export function validerMensurationSaisie(code: string, brut: string): number {
  const def = definitionMensuration(code);
  const texte = brut.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(texte)) {
    throw new MessageError('validation.mesureNombre', { min: def.minCm, max: def.maxCm }, def.libelleCle);
  }
  const valeur = Number(texte);
  if (!Number.isFinite(valeur) || valeur < def.minCm || valeur > def.maxCm) {
    throw new MessageError('validation.mesureBornes', { min: def.minCm, max: def.maxCm }, def.libelleCle);
  }
  return valeur;
}
