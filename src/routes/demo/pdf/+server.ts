import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { genererPdfPatron } from '$lib/patterns/pdf';
import { estModelePatron, genererPieces, validerMesuresPatron } from '$lib/patterns/saisie-patron';
import { exigerEntreeModele } from '$lib/patterns/registre';
import { autoriserPdfDemo } from '$lib/server/limite-demo';

/**
 * PDF public de la démo : aucune connexion, aucune écriture, rien d'enregistré.
 * Limité en mémoire à 30 générations/minute/IP ; mesures relues et revalidées ici.
 * Le modèle vient du paramètre `modele` (registre) : un identifiant inconnu
 * donne 404 « Modèle indisponible », jamais un autre modèle à la place.
 */
export const GET: RequestHandler = async ({ url, getClientAddress }) => {
  if (!autoriserPdfDemo(getClientAddress())) {
    throw error(429, 'Trop de PDF pour le moment : attendez une minute puis réessayez.');
  }
  const modeleBrut = url.searchParams.get('modele');
  if (modeleBrut !== null && !estModelePatron(modeleBrut)) throw error(404, 'Modèle indisponible.');
  const modele = estModelePatron(modeleBrut) ? modeleBrut : 'pantalon_large';
  const entree = exigerEntreeModele(modele);
  let mesures: Record<string, number>;
  try {
    mesures = validerMesuresPatron(modele, (code) => url.searchParams.get(code));
  } catch (e) {
    throw error(400, e instanceof Error ? e.message : 'Mesures à vérifier.');
  }
  const pdf = genererPdfPatron(entree.titre, 'Démo guidée', genererPieces(modele, mesures));
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="patron-${modele}-demo-brouillon.pdf"`,
      'cache-control': 'private, no-store'
    }
  });
};
