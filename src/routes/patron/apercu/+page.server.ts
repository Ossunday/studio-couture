import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { definitionMensuration } from '$lib/domain/mensurations-saisie';
import { preparerPiece } from '$lib/patterns/apercu-rendu';
import { FORMULES_PANTALON_LARGE } from '$lib/patterns/pantalon-large/formulas';
import { FORMULES_JUPE_DROITE } from '$lib/patterns/jupe-droite/formulas';
import {
  estModelePatron,
  genererPiecesPlacees,
  lireOptionsPantalon,
  MODELES,
  parametresOptionsPantalon,
  parametresPatron,
  validerMesuresPatron
} from '$lib/patterns/saisie-patron';
import { exigerConnexion } from '$lib/server/garde';

export const load: PageServerLoad = async ({ locals, url }) => {
  exigerConnexion(locals.utilisatrice);
  const modele = url.searchParams.get('modele');
  if (!estModelePatron(modele)) throw redirect(303, '/');
  const nom = (url.searchParams.get('nom') ?? '').trim().slice(0, 60) || 'sans nom';
  let mesures: Record<string, number>;
  let options = {};
  try {
    mesures = validerMesuresPatron(modele, (code) => url.searchParams.get(code));
    if (modele === 'pantalon_large') options = lireOptionsPantalon((code) => url.searchParams.get(code));
  } catch {
    throw redirect(303, `/patron/mesures?modele=${modele}`);
  }
  const { pieces, largeur, hauteur } = genererPiecesPlacees(modele, mesures, options);
  const formules = modele === 'pantalon_large' ? FORMULES_PANTALON_LARGE : FORMULES_JUPE_DROITE;
  const paramsPdf = parametresPatron(modele, nom, mesures);
  parametresOptionsPantalon(paramsPdf, options);
  return {
    modele,
    titre: MODELES[modele].titre,
    nom,
    mesures: MODELES[modele].champs.map((code) => ({
      code,
      libelle: definitionMensuration(code).libelle,
      valeur: mesures[code]
    })),
    largeur: Math.ceil(largeur),
    hauteur: Math.ceil(hauteur),
    pieces: pieces.map(preparerPiece),
    formules: formules.map((f) => ({ element: f.element, hypotheses: f.hypotheses, statut: f.statut })),
    hrefPdf: `/patron/pdf?${paramsPdf.toString()}`,
    hrefMesures: `/patron/mesures?modele=${modele}`
  };
};
