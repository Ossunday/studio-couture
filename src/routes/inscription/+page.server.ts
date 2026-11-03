import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { SESSION_COOKIE, expirationSession, genererJetonSession, hacherJeton, optionsCookieSession } from '$lib/server/auth';
import { MESSAGE_DOUBLON, inscriptionOuverte, inscrireAtelier, limiteurInscriptions, piegeRempli } from '$lib/server/inscription';
import { getRepository } from '$lib/server/repository';

/**
 * Inscription publique : crée l'atelier + son compte administrateur dans une
 * transaction, ouvre la session, redirige vers le tableau de bord.
 * CSRF : vérification d'origine SvelteKit (même contrôle que /connexion et
 * /installation, aucun jeton de session n'existant avant l'inscription).
 */
export const load: PageServerLoad = async ({ locals }) => {
  if (locals.utilisatrice) throw redirect(303, '/');
  return { fermee: !inscriptionOuverte() };
};

export const actions: Actions = {
  default: async ({ request, cookies, getClientAddress }) => {
    if (!inscriptionOuverte()) {
      return fail(403, { erreur: 'Les inscriptions sont fermées.', nomAtelier: '', nom: '', email: '' });
    }
    const data = await request.formData();
    const brut = {
      nomAtelier: String(data.get('nom_atelier') ?? ''),
      nom: String(data.get('nom') ?? ''),
      email: String(data.get('email') ?? ''),
      motDePasse: String(data.get('mot_de_passe') ?? ''),
      confirmation: String(data.get('mot_de_passe_confirmation') ?? ''),
      consentement: data.get('consentement') === 'on',
      piege: String(data.get('site_web') ?? '')
    };
    const retour = { nomAtelier: brut.nomAtelier, nom: brut.nom, email: brut.email };

    // Champ piège : un robot qui le remplit part sans rien créer ni apprendre.
    if (piegeRempli(brut)) throw redirect(303, '/connexion');

    const ip = getClientAddress();
    if (!limiteurInscriptions.autoriser(ip)) {
      return fail(429, { ...retour, erreur: 'Trop de créations depuis cette connexion. Réessayez dans une heure.' });
    }

    const repo = getRepository();
    let compte;
    try {
      compte = await inscrireAtelier(repo, brut);
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      // Seul le doublon est nommé ; tout le reste reste générique, sans fuite.
      if (message === MESSAGE_DOUBLON) return fail(400, { ...retour, erreur: MESSAGE_DOUBLON });
      if (message.startsWith('Nom de l’atelier') || message.startsWith('Votre nom') || message.startsWith('Adresse e-mail') || message.startsWith('Mot de passe') || message.startsWith('Les deux mots') || message.startsWith('Cochez')) {
        return fail(400, { ...retour, erreur: message });
      }
      return fail(400, { ...retour, erreur: 'Création impossible. Réessayez.' });
    }

    limiteurInscriptions.enregistrer(ip);
    const jeton = genererJetonSession();
    await repo.creerSession(compte.id, hacherJeton(jeton), expirationSession());
    cookies.set(SESSION_COOKIE, jeton, optionsCookieSession(process.env.NODE_ENV === 'production'));
    throw redirect(303, '/?bienvenue=atelier');
  }
};
