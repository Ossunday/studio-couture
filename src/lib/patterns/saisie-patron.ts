import { definitionMensuration, validerMensurationSaisie } from '../domain/mensurations-saisie';
import { genererPatronJupeDroite, type MesuresJupeDroite } from './jupe-droite/geometry';
import { genererPatronPantalonLarge, type MesuresPantalonLarge } from './pantalon-large/geometry';
import { agencerPieces, type PieceBrouillon, type PiecePlacee } from './brouillon';

export type ModelePatron = 'pantalon_large' | 'jupe_droite';

export const MODELES: Record<
  ModelePatron,
  { titre: string; champs: readonly string[] }
> = {
  pantalon_large: {
    titre: 'Pantalon large',
    champs: ['tour_taille_cm', 'tour_hanches_cm', 'hauteur_fourche_cm', 'longueur_pantalon_cm']
  },
  jupe_droite: {
    titre: 'Jupe droite',
    champs: ['tour_taille_cm', 'tour_hanches_cm', 'longueur_jupe_cm']
  }
};

export function estModelePatron(valeur: string | null | undefined): valeur is ModelePatron {
  return valeur === 'pantalon_large' || valeur === 'jupe_droite';
}

/** Libellé court pour les messages « Vérifiez … » (sans le « (cm) » final). */
export function libelleMesure(code: string): string {
  return definitionMensuration(code).libelle.replace(' (cm)', '');
}

/**
 * Valide les mesures d'un modèle depuis des paramètres texte (formulaire ou URL).
 * Message en français nommant la mesure à vérifier (consigne produit n°5).
 */
export function validerMesuresPatron(
  modele: ModelePatron,
  lire: (code: string) => string | null | undefined
): Record<string, number> {
  const mesures: Record<string, number> = {};
  for (const code of MODELES[modele].champs) {
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
  genererPieces(modele, mesures);
  return mesures;
}

function requis(mesures: Record<string, number>, code: string): number {
  const valeur = mesures[code];
  if (valeur === undefined) throw new Error(`Vérifiez : ${libelleMesure(code).toLowerCase()} — mesure manquante.`);
  return valeur;
}

function versMesuresPantalon(mesures: Record<string, number>): MesuresPantalonLarge {
  return {
    tourTailleCm: requis(mesures, 'tour_taille_cm'),
    tourHanchesCm: requis(mesures, 'tour_hanches_cm'),
    hauteurFourcheCm: requis(mesures, 'hauteur_fourche_cm'),
    longueurPantalonCm: requis(mesures, 'longueur_pantalon_cm')
  };
}

function versMesuresJupe(mesures: Record<string, number>): MesuresJupeDroite {
  return {
    tourTailleCm: requis(mesures, 'tour_taille_cm'),
    tourHanchesCm: requis(mesures, 'tour_hanches_cm'),
    longueurJupeCm: requis(mesures, 'longueur_jupe_cm')
  };
}

export function genererPieces(modele: ModelePatron, mesures: Record<string, number>): PieceBrouillon[] {
  return modele === 'pantalon_large' ? genererPatronPantalonLarge(versMesuresPantalon(mesures)) : genererPatronJupeDroite(versMesuresJupe(mesures));
}

export function genererPiecesPlacees(
  modele: ModelePatron,
  mesures: Record<string, number>
): { pieces: PiecePlacee[]; largeur: number; hauteur: number } {
  return agencerPieces(genererPieces(modele, mesures));
}

/** Paramètres d'URL partagés entre l'aperçu et le PDF (patron sans cliente obligatoire). */
export function parametresPatron(modele: ModelePatron, nom: string, mesures: Record<string, number>): URLSearchParams {
  const params = new URLSearchParams({ modele, nom });
  for (const [code, valeur] of Object.entries(mesures)) params.set(code, String(valeur));
  return params;
}
