import { COULEURS_TISSU, MATIERES } from '$lib/demo/tissus';
import {
  lireOptionsPantalon,
  MODELES,
  validerMesuresPatron,
  type ModelePatron
} from '$lib/patterns/saisie-patron';
import type { OptionsPantalonLarge } from '$lib/patterns/pantalon-large/geometry';

/**
 * Validation serveur d'un patron enregistré depuis la salle d'essayage
 * connectée. Aucune confiance dans le client : le nom est borné, les mesures
 * repassent par les mêmes bornes que la saisie manuelle, les options par
 * lireOptionsPantalon, et le tissu doit être une couleur/matière connue.
 */
export interface PatronValide {
  nom: string;
  mesures: Record<string, number>;
  options: Record<string, number>;
  tissu: { couleurId: string; matiereId: string };
}

export function validerPatronEnregistre(
  modele: ModelePatron,
  lire: (code: string) => string | null | undefined
): PatronValide {
  const nom = (lire('nom_patron') ?? '').trim().replace(/\s+/g, ' ');
  if (nom.length < 2 || nom.length > 80) {
    throw new Error('Vérifiez : le nom du patron doit faire entre 2 et 80 caractères.');
  }
  const mesures = validerMesuresPatron(modele, lire);
  let options: Record<string, number> = {};
  if (modele === 'pantalon_large') {
    const lues: OptionsPantalonLarge = lireOptionsPantalon(lire);
    options = Object.fromEntries(Object.entries(lues).filter(([, v]) => v !== undefined));
  }
  const couleurId = (lire('couleur_id') ?? '').trim();
  if (!COULEURS_TISSU.some((c) => c.id === couleurId)) {
    throw new Error('Vérifiez : choisissez une couleur de tissu proposée.');
  }
  const matiereId = (lire('matiere_id') ?? '').trim();
  if (!MATIERES.some((m) => m.id === matiereId)) {
    throw new Error('Vérifiez : choisissez une matière proposée (denim, lin ou satin).');
  }
  return { nom, mesures, options, tissu: { couleurId, matiereId } };
}

/** Repart d'un patron enregistré vers les paramètres de l'aperçu/PDF existants. */
export function parametresDepuisPatron(modele: ModelePatron, nom: string, mesures: Record<string, number>, options: Record<string, number>): URLSearchParams {
  const params = new URLSearchParams({ modele, nom });
  for (const code of MODELES[modele].champs) {
    const valeur = mesures[code];
    if (valeur !== undefined) params.set(code, String(valeur));
  }
  if (options.largeurBasPieceCm !== undefined) params.set('largeur_bas_cm', String(options.largeurBasPieceCm));
  if (options.profondeurPliCm !== undefined) params.set('profondeur_pli_cm', String(options.profondeurPliCm));
  if (options.hauteurCeintureFinieCm !== undefined) params.set('hauteur_ceinture_cm', String(options.hauteurCeintureFinieCm));
  return params;
}
