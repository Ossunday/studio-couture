import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { validerMensurationSaisie } from '$lib/domain/mensurations-saisie';
import { estModelePatron, MODELES, validerMesuresPatron } from '$lib/patterns/saisie-patron';
import { REGISTRE_MODELES, parametresOptionsModele } from '$lib/patterns/registre';
import { assertCsrf, exigerConnexion } from '$lib/server/garde';
import { validerPatronEnregistre } from '$lib/server/patron-cliente';
import { getRepository } from '$lib/server/repository';
import { formatDate, t, traduireErreur, type TranslationKey } from '$lib/i18n';

/** Clé pas encore dans fr.ts/en.ts : proposée dans le rapport du lot (clé=FR=EN). */
const cle = (k: string) => k as TranslationKey;

/**
 * Créer un patron pour une cliente : choix du modèle → mesures préremplies
 * depuis la fiche (formulaire court pour les seules manquantes) → salle
 * d'essayage → enregistrement d'un instantané « brouillon » sur la fiche.
 */
export const load: PageServerLoad = async ({ locals, params, url }) => {
  const lang = locals.lang;
  const u = exigerConnexion(locals.utilisatrice);
  const repo = getRepository();
  const cliente = await repo.trouverCliente(u.atelierId, params.id);
  if (!cliente) throw error(404, t(lang, cle('erreur.clienteIntrouvable')));
  const prenom = cliente.nom.trim().split(/\s+/)[0] ?? cliente.nom;
  const base = {
    lang,
    cliente: { id: cliente.id, nom: cliente.nom, prenom },
    csrfToken: locals.csrfToken
    // L’assistant IA (phases 11 et 12) est la boîte flottante du gabarit
    // connecté : il est visible aussi sur cette page, sans carte dédiée.
  };
  const modeleBrut = url.searchParams.get('modele');
  // Paramètre absent → écran de choix. Paramètre présent mais inconnu →
  // 404 explicite, jamais un autre modèle à la place.
  if (modeleBrut !== null && !estModelePatron(modeleBrut)) throw error(404, t(lang, 'erreur.modeleIndisponible'));
  if (!estModelePatron(modeleBrut)) return { ...base, modele: null as null };
  const modele = modeleBrut;

  const mensurations = await repo.listerMensurations(cliente.id);
  const fiche = new Map(mensurations.map((m) => [m.code, m.valeurCm]));
  const manquantes = MODELES[modele].champs.filter((code) => !fiche.has(code));
  // Mesures effectives : fiche d'abord, paramètres d'URL ensuite (formulaire
  // court « sans enregistrer dans la fiche »). Toujours revalidées ici.
  const lire = (code: string) => {
    const depuisUrl = url.searchParams.get(code);
    if (depuisUrl) return depuisUrl;
    const depuisFiche = fiche.get(code);
    return depuisFiche !== undefined ? String(depuisFiche) : null;
  };
  let mesures: Record<string, number> | null = null;
  let erreurMesures: string | null = null;
  try {
    mesures = validerMesuresPatron(modele, lire);
  } catch (e) {
    mesures = null;
    erreurMesures = traduireErreur(lang, e);
  }
  // Deux cas quand les mesures ne valident pas :
  // - il en manque (fiche et URL) → formulaire court des seules manquantes ;
  // - tout est présent mais bornes ou génération du modèle refusent →
  //   formulaire complet de correction, prérempli. Jamais un écran vide,
  //   pour les trois modèles, et les formules « à valider » ne bloquent pas.
  const absentes = MODELES[modele].champs.filter((code) => !lire(code));
  const aCompleter = mesures
    ? []
    : absentes.length > 0
      ? absentes.map((code) => ({ code, valeur: '' }))
      : MODELES[modele].champs.map((code) => ({ code, valeur: lire(code) ?? '' }));
  const erreurAffichee = mesures || absentes.length > 0 ? null : erreurMesures;
  // Options préremplies par l’assistant (paramètres d’URL encodés par code,
  // relus par le registre) : transmises à la salle, modifiables, jamais
  // obligatoires. Une valeur illisible est ignorée, jamais bloquante.
  const entree = REGISTRE_MODELES[modele];
  let optionsInitiales: Record<string, number | string> = {};
  try {
    optionsInitiales = entree.lireOptions((code) => url.searchParams.get(code));
  } catch {
    optionsInitiales = {};
  }
  const optionsParams = entree.options
    .filter((def) => optionsInitiales[def.cle] !== undefined)
    .map((def) => ({ code: def.code, valeur: String(optionsInitiales[def.cle]) }));
  // Mesures estimées par l’assistant (phase 12) : arrivées par l’URL avec
  // estimation_ia=1, préremplies et étiquetées, jamais enregistrées sans
  // validation du formulaire. Celles qui ne sont pas redemandées dans le
  // formulaire court repartent en champs cachés pour ne pas être perdues.
  const codesACompleter = new Set(aCompleter.map((c) => c.code));
  const codesEstimation = MODELES[modele].champs.filter((code) => url.searchParams.get(code));
  return {
    ...base,
    modele,
    estimationIa: url.searchParams.get('estimation_ia') === '1',
    codesEstimation,
    mesuresCachees: codesEstimation
      .filter((code) => !codesACompleter.has(code))
      .map((code) => ({ code, valeur: url.searchParams.get(code)! })),
    optionsInitiales,
    optionsParams,
    titreModele: t(lang, REGISTRE_MODELES[modele].titreCle),
    manquantes: mesures ? [] : manquantes,
    aCompleter,
    erreurMesures: erreurAffichee,
    mesuresConnues: MODELES[modele].champs
      .filter((code) => fiche.has(code))
      .map((code) => ({ code, valeurCm: fiche.get(code)! })),
    mesures,
    nomPropose: `${t(lang, REGISTRE_MODELES[modele].titreCle)} — ${formatDate(lang, new Date())}`
  };
};

export const actions: Actions = {
  completerMesures: async ({ request, locals, params }) => {
    const lang = locals.lang;
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, t(lang, cle('erreur.clienteIntrouvable')));
    const modele = String(data.get('modele') ?? '');
    if (!estModelePatron(modele)) throw error(404, t(lang, 'erreur.modeleIndisponible'));
    const mensurations = await repo.listerMensurations(cliente.id);
    const fiche = new Map(mensurations.map((m) => [m.code, m.valeurCm]));
    const enregistrer = data.get('enregistrer_fiche') === 'on';
    const retour = new URLSearchParams({ modele });
    try {
      // Le formulaire couvre désormais tous les champs du modèle : on lit le
      // formulaire d'abord, la fiche ensuite, puis revalidation complète
      // (bornes + génération) — un refus réaffiche le formulaire, jamais un
      // écran vide, et aucun modèle n'est bloqué par ses formules à valider.
      const valeurs: Record<string, number> = {};
      for (const code of MODELES[modele].champs) {
        const brut = String(data.get(code) ?? '').trim();
        if (brut) valeurs[code] = validerMensurationSaisie(code, brut);
        else if (fiche.has(code)) valeurs[code] = fiche.get(code)!;
        else valeurs[code] = validerMensurationSaisie(code, '');
      }
      validerMesuresPatron(modele, (code) => String(valeurs[code]));
      // Options venues de l’assistant : ré-émises dans l’URL de la salle,
      // pour qu’elles y arrivent préremplies et modifiables.
      try {
        const entree = REGISTRE_MODELES[modele];
        parametresOptionsModele(retour, entree, entree.lireOptions((code) => data.get(code)?.toString()));
      } catch {
        // Option illisible : ignorée, le parcours manuel continue.
      }
      for (const code of MODELES[modele].champs) {
        if (enregistrer) {
          await repo.enregistrerMensuration({ clienteId: cliente.id, code, valeurCm: valeurs[code]!, saisiePar: u.id });
        } else {
          retour.set(code, String(valeurs[code]));
        }
      }
    } catch (e) {
      return fail(400, { erreur: traduireErreur(lang, e, cle('validation.mesuresAVerifier')) });
    }
    throw redirect(303, `/clientes/${cliente.id}/patron/nouveau?${retour.toString()}`);
  },

  enregistrerPatron: async ({ request, locals, params }) => {
    const lang = locals.lang;
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, t(lang, cle('erreur.clienteIntrouvable')));
    const modele = String(data.get('modele') ?? '');
    if (!estModelePatron(modele)) throw error(404, t(lang, 'erreur.modeleIndisponible'));
    try {
      const valide = validerPatronEnregistre(modele, (code) => data.get(code)?.toString());
      await repo.creerPatron(u.atelierId, {
        clienteId: cliente.id,
        modele,
        nom: valide.nom,
        mesures: valide.mesures,
        options: valide.options,
        tissu: valide.tissu,
        creePar: u.id
      });
    } catch (e) {
      return fail(400, { erreur: traduireErreur(lang, e, cle('fiche.patronEnregistrementImpossible')) });
    }
    throw redirect(303, `/clientes/${cliente.id}?onglet=patrons&patron=enregistre`);
  }
};
