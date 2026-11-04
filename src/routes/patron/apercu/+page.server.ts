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
import { t } from '$lib/i18n';

export const load: PageServerLoad = async ({ locals, url }) => {
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
  } catch {
    throw redirect(303, `/patron/mesures?modele=${modele}`);
  }
  const { pieces, largeur, hauteur } = genererPiecesPlacees(modele, mesures, options);
  const paramsPdf = parametresPatron(modele, nom, mesures);
  parametresOptionsModele(paramsPdf, entree, options);
  const defParCode = new Map(entree.mesures.map((m) => [m.code, m]));
  return {
    lang,
    modele,
    titre: t(lang, entree.titreCle),
    nom,
    mesures: entree.champs.map((code) => ({
      code,
      libelle: defParCode.has(code) ? t(lang, defParCode.get(code)!.libelleCle) : t(lang, definitionMensuration(code).libelleCle),
      valeur: mesures[code]!
    })),
    largeur: Math.ceil(largeur),
    hauteur: Math.ceil(hauteur),
    pieces: pieces.map((p) => preparerPiece(p, lang)),
    formules: entree.formules.map((f) => ({ element: f.element, hypotheses: f.hypotheses, statut: f.statut })),
    hrefPdf: `/patron/pdf?${paramsPdf.toString()}`,
    hrefMesures: `/patron/mesures?modele=${modele}`
  };
};
