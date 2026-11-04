import { COULEURS_TISSU, MATIERES } from '$lib/demo/tissus';
import {
  exigerEntreeModele,
  parametresOptionsModele,
  type OptionsModele
} from '$lib/patterns/registre';
import { validerMesuresPatron, type ModelePatron } from '$lib/patterns/saisie-patron';
import { MessageError } from '$lib/i18n';

/**
 * Validation serveur d'un patron enregistré depuis la salle d'essayage
 * connectée. Aucune confiance dans le client : le nom est borné, les mesures
 * repassent par les mêmes bornes que la saisie manuelle, les options sont
 * relues dans le REGISTRE du modèle (bornées ou choix fermés), et le tissu
 * doit être une couleur/matière connue. Un modèle inconnu lève
 * « Modèle indisponible » — jamais de substitution.
 */
export interface PatronValide {
  nom: string;
  mesures: Record<string, number>;
  options: OptionsModele;
  tissu: { couleurId: string; matiereId: string };
}

export function validerPatronEnregistre(
  modele: ModelePatron,
  lire: (code: string) => string | null | undefined
): PatronValide {
  const entree = exigerEntreeModele(modele);
  const nom = (lire('nom_patron') ?? '').trim().replace(/\s+/g, ' ');
  if (nom.length < 2 || nom.length > 80) {
    throw new MessageError('validation.nomPatron');
  }
  const mesures = validerMesuresPatron(modele, lire);
  const options = entree.lireOptions(lire);
  const couleurId = (lire('couleur_id') ?? '').trim();
  if (!COULEURS_TISSU.some((c) => c.id === couleurId)) {
    throw new MessageError('validation.couleurTissu');
  }
  const matiereId = (lire('matiere_id') ?? '').trim();
  if (!MATIERES.some((m) => m.id === matiereId)) {
    throw new MessageError('validation.matiereTissu');
  }
  return { nom, mesures, options, tissu: { couleurId, matiereId } };
}

/** Repart d'un patron enregistré vers les paramètres de l'aperçu/PDF existants. */
export function parametresDepuisPatron(modele: ModelePatron, nom: string, mesures: Record<string, number>, options: OptionsModele): URLSearchParams {
  const entree = exigerEntreeModele(modele);
  const params = new URLSearchParams({ modele, nom });
  for (const code of entree.champs) {
    const valeur = mesures[code];
    if (valeur !== undefined) params.set(code, String(valeur));
  }
  parametresOptionsModele(params, entree, options);
  return params;
}
