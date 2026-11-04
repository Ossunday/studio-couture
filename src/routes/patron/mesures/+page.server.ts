import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { definitionMensuration } from '$lib/domain/mensurations-saisie';
import { exigerEntreeModele, parametresOptionsModele, type OptionsModele } from '$lib/patterns/registre';
import { estModelePatron, parametresPatron, validerMesuresPatron } from '$lib/patterns/saisie-patron';
import { assertCsrf, exigerConnexion } from '$lib/server/garde';
import { t, traduireErreur } from '$lib/i18n';

export const load: PageServerLoad = async ({ locals, url }) => {
  exigerConnexion(locals.utilisatrice);
  const lang = locals.lang;
  const modele = url.searchParams.get('modele');
  if (!estModelePatron(modele)) throw error(404, t(lang, 'erreur.modeleIndisponible'));
  const entree = exigerEntreeModele(modele);
  const defParCode = new Map(entree.mesures.map((m) => [m.code, m]));
  const estimationIa = url.searchParams.get('estimation_ia') === '1';
  // Mesures estimées par l’assistant (phase 12) : préremplies depuis l’URL,
  // modifiables, étiquetées « estimation IA ». Une valeur illisible est
  // ignorée (champ vide), jamais bloquante.
  const valeurDepuisUrl = (code: string): string => {
    const brut = (url.searchParams.get(code) ?? '').replace(',', '.');
    return /^\d+(\.\d{1,2})?$/.test(brut) ? brut : '';
  };
  let optionsInitiales: OptionsModele = {};
  try {
    optionsInitiales = entree.lireOptions((code) => url.searchParams.get(code));
  } catch {
    optionsInitiales = {};
  }
  return {
    lang,
    modele,
    estimationIa,
    titre: t(lang, entree.titreCle),
    champs: entree.champs.map((code) => {
      const def = definitionMensuration(code);
      const defModele = defParCode.get(code);
      const valeur = valeurDepuisUrl(code);
      return {
        code,
        libelle: defModele ? t(lang, defModele.libelleCle) : t(lang, def.libelleCle),
        minCm: def.minCm,
        maxCm: def.maxCm,
        valeur,
        estimee: estimationIa && valeur !== ''
      };
    }),
    options: entree.options.map((o) => ({
      ...o,
      libelle: t(lang, o.libelleCle),
      placeholder: o.placeholderCle ? t(lang, o.placeholderCle) : (o.placeholder ?? ''),
      valeur: optionsInitiales[o.cle] !== undefined ? String(optionsInitiales[o.cle]) : '',
      choix: (o.choix ?? []).map((c) => ({ valeur: c.valeur, libelle: t(lang, c.libelleCle) }))
    })),
    csrfToken: locals.csrfToken
  };
};

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    exigerConnexion(locals.utilisatrice);
    const lang = locals.lang;
    const modele = url.searchParams.get('modele');
    if (!estModelePatron(modele)) throw error(404, t(lang, 'erreur.modeleIndisponible'));
    const entree = exigerEntreeModele(modele);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const nom = String(data.get('nom') ?? '').trim().slice(0, 60) || t(lang, 'patron.mesures.sansNom');
    let mesures: Record<string, number>;
    let suffixeOptions = '';
    try {
      mesures = validerMesuresPatron(modele, (code) => String(data.get(code) ?? ''));
      const options: OptionsModele = entree.lireOptions((code) => String(data.get(code) ?? ''));
      const params = new URLSearchParams();
      parametresOptionsModele(params, entree, options);
      suffixeOptions = params.toString() ? `&${params.toString()}` : '';
    } catch (e) {
      return fail(400, { erreur: traduireErreur(lang, e) });
    }
    throw redirect(303, `/patron/apercu?${parametresPatron(modele, nom, mesures).toString()}${suffixeOptions}`);
  }
};
