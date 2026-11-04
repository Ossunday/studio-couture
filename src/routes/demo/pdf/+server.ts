import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { genererPdfPatron } from '$lib/patterns/pdf';
import { estModelePatron, genererPieces, validerMesuresPatron } from '$lib/patterns/saisie-patron';
import { exigerEntreeModele } from '$lib/patterns/registre';
import { autoriserPdfDemo } from '$lib/server/limite-demo';
import { lireLangue, t, traduireErreur, type TranslationKey } from '$lib/i18n';

/**
 * PDF public de la démo : aucune connexion, aucune écriture, rien d'enregistré.
 * Limité en mémoire à 30 générations/minute/IP ; mesures relues et revalidées ici.
 * Le modèle vient du paramètre `modele` (registre) : un identifiant inconnu
 * donne 404 « Modèle indisponible », jamais un autre modèle à la place.
 * Langue : cookie « lang » (lireLangue), repli français.
 */
export const GET: RequestHandler = async ({ url, getClientAddress, cookies }) => {
  const lang = lireLangue(cookies.get('lang'));
  if (!autoriserPdfDemo(getClientAddress())) {
    throw error(429, t(lang, 'pdf.tropDemandes' as TranslationKey));
  }
  const modeleBrut = url.searchParams.get('modele');
  if (modeleBrut !== null && !estModelePatron(modeleBrut)) throw error(404, t(lang, 'erreur.modeleIndisponible'));
  const modele = estModelePatron(modeleBrut) ? modeleBrut : 'pantalon_large';
  const entree = exigerEntreeModele(modele);
  let mesures: Record<string, number>;
  try {
    mesures = validerMesuresPatron(modele, (code) => url.searchParams.get(code));
  } catch (e) {
    throw error(400, traduireErreur(lang, e));
  }
  const pdf = genererPdfPatron(t(lang, entree.titreCle), t(lang, 'demo.titre'), genererPieces(modele, mesures), lang);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="patron-${modele}-demo-brouillon.pdf"`,
      'cache-control': 'private, no-store'
    }
  });
};
