/**
 * Saisie manuelle des mensurations par la couturière (en centimètres).
 * Ce fichier ne contient aucune formule de patron : uniquement une liste de
 * mensurations courantes et des bornes de plausibilité pour éviter les erreurs
 * de saisie (ex. virgule oubliée). Bornes larges, à resserrer avec l’atelier si besoin.
 */
export interface DefinitionMensuration {
  code: string;
  libelle: string;
  minCm: number;
  maxCm: number;
}

export const DEFINITIONS_MENSURATIONS: readonly DefinitionMensuration[] = [
  { code: 'tour_poitrine_cm', libelle: 'Tour de poitrine (cm)', minCm: 50, maxCm: 200 },
  { code: 'tour_taille_cm', libelle: 'Tour de taille (cm)', minCm: 40, maxCm: 200 },
  { code: 'tour_hanches_cm', libelle: 'Tour de hanches (cm)', minCm: 50, maxCm: 220 },
  { code: 'longueur_dos_cm', libelle: 'Longueur dos (cm)', minCm: 20, maxCm: 80 },
  { code: 'largeur_epaules_cm', libelle: 'Largeur d’épaules (cm)', minCm: 25, maxCm: 70 },
  { code: 'longueur_manche_cm', libelle: 'Longueur de manche (cm)', minCm: 20, maxCm: 90 },
  { code: 'longueur_jupe_cm', libelle: 'Longueur de jupe (cm)', minCm: 20, maxCm: 150 },
  { code: 'longueur_pantalon_cm', libelle: 'Longueur de pantalon (cm)', minCm: 40, maxCm: 150 }
] as const;

export function definitionMensuration(code: string): DefinitionMensuration {
  const def = DEFINITIONS_MENSURATIONS.find((d) => d.code === code);
  if (!def) throw new Error(`Mensuration inconnue : « ${code} ».`);
  return def;
}

/** Accepte « 82 », « 82.5 » et « 82,5 » ; refuse tout le reste et les valeurs hors bornes. */
export function validerMensurationSaisie(code: string, brut: string): number {
  const def = definitionMensuration(code);
  const texte = brut.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(texte)) {
    throw new Error(`${def.libelle} : entrez un nombre en centimètres (ex. 82,5).`);
  }
  const valeur = Number(texte);
  if (!Number.isFinite(valeur) || valeur < def.minCm || valeur > def.maxCm) {
    throw new Error(`${def.libelle} : valeur plausible entre ${def.minCm} et ${def.maxCm} cm.`);
  }
  return valeur;
}
