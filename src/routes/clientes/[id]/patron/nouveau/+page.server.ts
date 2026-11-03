import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { validerMensurationSaisie } from '$lib/domain/mensurations-saisie';
import { estModelePatron, MODELES, validerMesuresPatron } from '$lib/patterns/saisie-patron';
import { assertCsrf, exigerConnexion } from '$lib/server/garde';
import { validerPatronEnregistre } from '$lib/server/patron-cliente';
import { getRepository } from '$lib/server/repository';

/**
 * Créer un patron pour une cliente : choix du modèle → mesures préremplies
 * depuis la fiche (formulaire court pour les seules manquantes) → salle
 * d'essayage → enregistrement d'un instantané « brouillon » sur la fiche.
 */
export const load: PageServerLoad = async ({ locals, params, url }) => {
  const u = exigerConnexion(locals.utilisatrice);
  const repo = getRepository();
  const cliente = await repo.trouverCliente(u.atelierId, params.id);
  if (!cliente) throw error(404, 'Cliente introuvable.');
  const prenom = cliente.nom.trim().split(/\s+/)[0] ?? cliente.nom;
  const base = {
    cliente: { id: cliente.id, nom: cliente.nom, prenom },
    csrfToken: locals.csrfToken
  };
  const modeleBrut = url.searchParams.get('modele');
  // Paramètre absent → écran de choix. Paramètre présent mais inconnu →
  // 404 explicite, jamais un autre modèle à la place.
  if (modeleBrut !== null && !estModelePatron(modeleBrut)) throw error(404, 'Modèle indisponible.');
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
  try {
    mesures = validerMesuresPatron(modele, lire);
  } catch {
    mesures = null;
  }
  return {
    ...base,
    modele,
    titreModele: MODELES[modele].titre,
    manquantes: mesures ? [] : manquantes,
    mesuresConnues: MODELES[modele].champs
      .filter((code) => fiche.has(code))
      .map((code) => ({ code, valeurCm: fiche.get(code)! })),
    mesures,
    nomPropose: `${MODELES[modele].titre} — ${new Date().toLocaleDateString('fr-FR')}`
  };
};

export const actions: Actions = {
  completerMesures: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, 'Cliente introuvable.');
    const modele = String(data.get('modele') ?? '');
    if (!estModelePatron(modele)) throw error(404, 'Modèle indisponible.');
    const mensurations = await repo.listerMensurations(cliente.id);
    const fiche = new Map(mensurations.map((m) => [m.code, m.valeurCm]));
    const manquantes = MODELES[modele].champs.filter((code) => !fiche.has(code));
    const enregistrer = data.get('enregistrer_fiche') === 'on';
    const retour = new URLSearchParams({ modele });
    try {
      for (const code of manquantes) {
        const valeurCm = validerMensurationSaisie(code, String(data.get(code) ?? ''));
        if (enregistrer) {
          await repo.enregistrerMensuration({ clienteId: cliente.id, code, valeurCm, saisiePar: u.id });
        } else {
          retour.set(code, String(valeurCm));
        }
      }
    } catch (e) {
      return fail(400, { erreur: e instanceof Error ? e.message : 'Mesures à vérifier.' });
    }
    throw redirect(303, `/clientes/${cliente.id}/patron/nouveau?${retour.toString()}`);
  },

  enregistrerPatron: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, 'Cliente introuvable.');
    const modele = String(data.get('modele') ?? '');
    if (!estModelePatron(modele)) throw error(404, 'Modèle indisponible.');
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
      return fail(400, { erreur: e instanceof Error ? e.message : 'Enregistrement du patron impossible.' });
    }
    throw redirect(303, `/clientes/${cliente.id}?onglet=patrons&patron=enregistre`);
  }
};
