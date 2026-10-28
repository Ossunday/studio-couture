import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { genererPdfPatron } from '$lib/patterns/pdf';
import { estModelePatron, genererPieces, MODELES, validerMesuresPatron } from '$lib/patterns/saisie-patron';
import { exigerConnexion } from '$lib/server/garde';

/** PDF A4 1:1 du brouillon (statut « brouillon non validé » imprimé sur chaque page). */
export const GET: RequestHandler = async ({ locals, url }) => {
  exigerConnexion(locals.utilisatrice);
  const modele = url.searchParams.get('modele');
  if (!estModelePatron(modele)) throw error(404, 'Modèle inconnu.');
  const nom = (url.searchParams.get('nom') ?? '').trim().slice(0, 60) || 'sans nom';
  let mesures: Record<string, number>;
  try {
    mesures = validerMesuresPatron(modele, (code) => url.searchParams.get(code));
  } catch (e) {
    throw error(400, e instanceof Error ? e.message : 'Mesures à vérifier.');
  }
  const pdf = genererPdfPatron(MODELES[modele].titre, nom, genererPieces(modele, mesures));
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="patron-${modele}-brouillon.pdf"`,
      'cache-control': 'private, no-store'
    }
  });
};
