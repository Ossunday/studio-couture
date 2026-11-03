import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { definitionMensuration } from '$lib/domain/mensurations-saisie';
import { preparerPiece } from '$lib/patterns/apercu-rendu';
import { exigerEntreeModele, type OptionsModele } from '$lib/patterns/registre';
import {
  estModelePatron,
  genererPiecesPlacees,
  parametresPatron,
  validerMesuresPatron
} from '$lib/patterns/saisie-patron';
import { parametresOptionsModele } from '$lib/patterns/registre';
import { exigerConnexion } from '$lib/server/garde';

export const load: PageServerLoad = async ({ locals, url }) => {
  exigerConnexion(locals.utilisatrice);
  const modele = url.searchParams.get('modele');
  if (!estModelePatron(modele)) throw error(404, 'Modèle indisponible.');
  const entree = exigerEntreeModele(modele);
  const nom = (url.searchParams.get('nom') ?? '').trim().slice(0, 60) || 'sans nom';
  let mesures: Record<string, number>;
  let options: OptionsModele = {};
  try {
    mesures = validerMesuresPatron(modele, (code) => url.searchParams.get(code));
    options = entree.lireOptions((code) => url.searchParams.get(code));
  } catch {
    throw redirect(303, `/patron/mesures?modele=${modele}`);
  }
  const { pieces, largeur, hauteur } = genererPiecesPlacees(modele, mesures, options);
  const paramsPdf = parametresPatron(modele, nom, mesures);
  parametresOptionsModele(paramsPdf, entree, options);
  return {
    modele,
    titre: entree.titre,
    nom,
    mesures: entree.champs.map((code) => ({
      code,
      libelle: definitionMensuration(code).libelle,
      valeur: mesures[code]
    })),
    largeur: Math.ceil(largeur),
    hauteur: Math.ceil(hauteur),
    pieces: pieces.map(preparerPiece),
    formules: entree.formules.map((f) => ({ element: f.element, hypotheses: f.hypotheses, statut: f.statut })),
    hrefPdf: `/patron/pdf?${paramsPdf.toString()}`,
    hrefMesures: `/patron/mesures?modele=${modele}`
  };
};
