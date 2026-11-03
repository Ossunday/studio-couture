import { definitionMensuration, validerMensurationSaisie } from '../domain/mensurations-saisie';
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
 * ce fichier ne connaît plus aucun modèle en particulier. Il conserve les
 * signatures utilisées par les écrans et les tests ; toute la connaissance
 * (champs, bornes, options, générateur) vit dans le registre.
 */
export const MODELES: Record<ModelePatron, { titre: string; champs: readonly string[] }> = Object.fromEntries(
  Object.values(REGISTRE_MODELES).map((e) => [e.id, { titre: e.titre, champs: e.champs }])
) as Record<ModelePatron, { titre: string; champs: readonly string[] }>;

/** Libellé court pour les messages « Vérifiez … » (sans le « (cm) » final). */
export function libelleMesure(code: string): string {
  return definitionMensuration(code).libelle.replace(' (cm)', '');
}

/**
 * Valide les mesures d'un modèle depuis des paramètres texte (formulaire ou URL).
 * Message en français nommant la mesure à vérifier (consigne produit n°5).
 * Un modèle inconnu lève « Modèle indisponible » (registre), jamais de repli.
 */
export function validerMesuresPatron(
  modele: ModelePatron,
  lire: (code: string) => string | null | undefined
): Record<string, number> {
  const entree = exigerEntreeModele(modele);
  const mesures: Record<string, number> = {};
  for (const code of entree.champs) {
    const brut = (lire(code) ?? '').toString().trim();
    if (!brut) throw new Error(`Vérifiez : ${libelleMesure(code).toLowerCase()} — mesure manquante.`);
    try {
      mesures[code] = validerMensurationSaisie(code, brut);
    } catch {
      const def = definitionMensuration(code);
      throw new Error(
        `Vérifiez : ${libelleMesure(code).toLowerCase()} — entrez un nombre entre ${def.minCm} et ${def.maxCm} cm (ex. 82,5).`
      );
    }
  }
  // Contrôles de cohérence du moteur brouillon (messages nommant la mesure).
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
