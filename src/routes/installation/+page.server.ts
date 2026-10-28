import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { normaliserIdentifiant, validerMotDePasse } from '$lib/domain/identifiant';
import { hacherMotDePasse } from '$lib/server/auth';
import { getRepository } from '$lib/server/repository';

/** Installation unique : accessible seulement tant qu’aucune utilisatrice n’existe. */
export const load: PageServerLoad = async () => {
  if ((await getRepository().compterUtilisatrices()) > 0) throw redirect(303, '/connexion');
  return {};
};

export const actions: Actions = {
  default: async ({ request }) => {
    const repo = getRepository();
    if ((await repo.compterUtilisatrices()) > 0) throw redirect(303, '/connexion');
    const data = await request.formData();
    const nomAtelier = String(data.get('nom_atelier') ?? '').trim();
    const nom = String(data.get('nom') ?? '').trim();
    const identifiantBrut = String(data.get('identifiant') ?? '');
    const motDePasse = String(data.get('mot_de_passe') ?? '');
    try {
      if (!nomAtelier || !nom) throw new Error('Nom de l’atelier et votre nom sont requis.');
      const identifiant = normaliserIdentifiant(identifiantBrut).valeur;
      validerMotDePasse(motDePasse);
      await repo.creerAtelierEtAdmin({ nomAtelier, nom, identifiant, motDePasseHash: hacherMotDePasse(motDePasse) });
    } catch (e) {
      return fail(400, { erreur: e instanceof Error ? e.message : 'Installation impossible.' });
    }
    throw redirect(303, '/connexion');
  }
};
