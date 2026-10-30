import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { genererPdfPatron } from '$lib/patterns/pdf';
import { genererPieces, validerMesuresPatron } from '$lib/patterns/saisie-patron';
import { autoriserPdfDemo } from '$lib/server/limite-demo';

/**
 * PDF public de la démo : aucune connexion, aucune écriture, rien d'enregistré.
 * Limité en mémoire à 30 générations/minute/IP ; mesures relues et revalidées ici.
 */
export const GET: RequestHandler = async ({ url, getClientAddress }) => {
  if (!autoriserPdfDemo(getClientAddress())) {
    throw error(429, 'Trop de PDF pour le moment : attendez une minute puis réessayez.');
  }
  let mesures: Record<string, number>;
  try {
    mesures = validerMesuresPatron('pantalon_large', (code) => url.searchParams.get(code));
  } catch (e) {
    throw error(400, e instanceof Error ? e.message : 'Mesures à vérifier.');
  }
  const pdf = genererPdfPatron('Pantalon large', 'Démo guidée', genererPieces('pantalon_large', mesures));
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="patron-pantalon-large-demo-brouillon.pdf"',
      'cache-control': 'private, no-store'
    }
  });
};
