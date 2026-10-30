import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { genererPdfPatron } from '$lib/patterns/pdf';
import { estModelePatron, genererPieces, lireOptionsPantalon, MODELES, validerMesuresPatron } from '$lib/patterns/saisie-patron';
import { exigerConnexion } from '$lib/server/garde';

/** PDF A4 1:1 du brouillon (statut « brouillon non validé » imprimé sur chaque page). */
export const GET: RequestHandler = async ({ locals, url }) => {
  exigerConnexion(locals.utilisatrice);
  const modele = url.searchParams.get('modele');
  if (!estModelePatron(modele)) throw error(404, 'Modèle inconnu.');
  const nom = (url.searchParams.get('nom') ?? '').trim().slice(0, 60) || 'sans nom';
  let mesures: Record<string, number>;
  let options = {};
  try {
    mesures = validerMesuresPatron(modele, (code) => url.searchParams.get(code));
    if (modele === 'pantalon_large') options = lireOptionsPantalon((code) => url.searchParams.get(code));
  } catch (e) {
    throw error(400, e instanceof Error ? e.message : 'Mesures à vérifier.');
  }
  const pdf = genererPdfPatron(MODELES[modele].titre, nom, genererPieces(modele, mesures, options));
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="patron-${modele}-brouillon.pdf"`,
      'cache-control': 'private, no-store'
    }
  });
};
