import { definitionMensuration, validerMensurationSaisie } from '../domain/mensurations-saisie';
import { MessageError, type TranslationKey } from '../i18n';
import { agencerPieces, type PieceBrouillon, type PiecePlacee } from './brouillon';
import type { OptionsPantalonLarge } from './pantalon-large/geometry';
import {
  exigerEntreeModele,
  lireOptionsDepuisDefs,
  parametresOptionsModele,
  REGISTRE_MODELES,
  type ModelePatron,
  type OptionsModele
} from './registre';

export { estModelePatron, type ModelePatron } from './registre';

/**
 * Adaptateur historique au-dessus du REGISTRE des modèles (`registre.ts`) :
 * ce fichier ne connaît plus aucun modèle en particulier.
 */
export const MODELES: Record<ModelePatron, { titreCle: TranslationKey; champs: readonly string[] }> = Object.fromEntries(
  Object.values(REGISTRE_MODELES).map((e) => [e.id, { titreCle: e.titreCle, champs: e.champs }])
) as Record<ModelePatron, { titreCle: TranslationKey; champs: readonly string[] }>;

/** Clé de traduction d’une mesure (pour les messages « Vérifiez … »). */
export function cleMesure(code: string): TranslationKey {
  return definitionMensuration(code).libelleCle;
}

export function validerMesuresPatron(
  modele: ModelePatron,
  lire: (code: string) => string | null | undefined
): Record<string, number> {
  const entree = exigerEntreeModele(modele);
  const mesures: Record<string, number> = {};
  for (const code of entree.champs) {
    const brut = (lire(code) ?? '').toString().trim();
    if (!brut) throw new MessageError('validation.verifiezMesureManquante', {}, cleMesure(code));
    try {
      mesures[code] = validerMensurationSaisie(code, brut);
    } catch {
      const def = definitionMensuration(code);
      throw new MessageError('validation.verifiezMesureNombre', { min: def.minCm, max: def.maxCm }, cleMesure(code));
    }
  }
  entree.genererPieces(mesures, {});
  return mesures;
}

export function genererPieces(modele: ModelePatron, mesures: Record<string, number>, options: OptionsModele = {}): PieceBrouillon[] {
  return exigerEntreeModele(modele).genererPieces(mesures, options);
}

/** Options facultatives du pantalon (section repliée, jamais obligatoires). */
export function lireOptionsPantalon(lire: (code: string) => string | null | undefined): OptionsPantalonLarge {
  const lues = lireOptionsDepuisDefs(REGISTRE_MODELES.pantalon_large.options, lire);
  const num = (cle: string) => (typeof lues[cle] === 'number' ? (lues[cle] as number) : undefined);
  return {
    largeurBasPieceCm: num('largeurBasPieceCm'),
    profondeurPliCm: num('profondeurPliCm'),
    hauteurCeintureFinieCm: num('hauteurCeintureFinieCm')
  };
}

export function parametresOptionsPantalon(params: URLSearchParams, options: OptionsPantalonLarge): void {
  parametresOptionsModele(params, REGISTRE_MODELES.pantalon_large, options as OptionsModele);
}

export function genererPiecesPlacees(
  modele: ModelePatron,
  mesures: Record<string, number>,
  options: OptionsModele = {}
): { pieces: PiecePlacee[]; largeur: number; hauteur: number } {
  return agencerPieces(genererPieces(modele, mesures, options));
}

/** Paramètres d'URL partagés entre l'aperçu et le PDF (patron sans cliente obligatoire). */
export function parametresPatron(modele: ModelePatron, nom: string, mesures: Record<string, number>): URLSearchParams {
  const params = new URLSearchParams({ modele, nom });
  for (const [code, valeur] of Object.entries(mesures)) params.set(code, String(valeur));
  return params;
}
