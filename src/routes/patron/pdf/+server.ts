import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { genererPdfPatron } from '$lib/patterns/pdf';
import { estModelePatron, genererPieces, validerMesuresPatron } from '$lib/patterns/saisie-patron';
import { exigerEntreeModele, type OptionsModele } from '$lib/patterns/registre';
import { exigerConnexion } from '$lib/server/garde';
import { t, traduireErreur } from '$lib/i18n';

/** PDF A4 1:1 du brouillon (statut « brouillon non validé » imprimé sur chaque page). */
export const GET: RequestHandler = async ({ locals, url }) => {
  exigerConnexion(locals.utilisatrice);
  const lang = locals.lang;
  const modele = url.searchParams.get('modele');
  if (!estModelePatron(modele)) throw error(404, t(lang, 'erreur.modeleIndisponible'));
  const entree = exigerEntreeModele(modele);
  const nom = (url.searchParams.get('nom') ?? '').trim().slice(0, 60) || t(lang, 'patron.mesures.sansNom');
  let mesures: Record<string, number>;
  let options: OptionsModele = {};
  try {
    mesures = validerMesuresPatron(modele, (code) => url.searchParams.get(code));
    options = entree.lireOptions((code) => url.searchParams.get(code));
  } catch (e) {
    throw error(400, traduireErreur(lang, e));
  }
  const pdf = genererPdfPatron(t(lang, entree.titreCle), nom, genererPieces(modele, mesures, options), lang);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="patron-${modele}-brouillon.pdf"`,
      'cache-control': 'private, no-store'
    }
  });
};
