import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { normaliserIdentifiant } from '$lib/domain/identifiant';
import { MessageError, t, traduireErreur } from '$lib/i18n';
import { SESSION_COOKIE, expirationSession, genererJetonSession, hacherJeton, hacherMotDePasse, limiteurConnexion, optionsCookieSession, verifierMotDePasse } from '$lib/server/auth';
import { getRepository } from '$lib/server/repository';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.utilisatrice) throw redirect(303, '/clientes');
  const repo = getRepository();
  return { installationRequise: (await repo.compterUtilisatrices()) === 0 };
};

export const actions: Actions = {
  default: async ({ request, cookies, getClientAddress, locals }) => {
    const data = await request.formData();
    const identifiantBrut = String(data.get('identifiant') ?? '');
    const motDePasse = String(data.get('mot_de_passe') ?? '');
    let identifiant: string;
    try {
      identifiant = normaliserIdentifiant(identifiantBrut).valeur;
    } catch (e) {
      return fail(400, {
        erreur: e instanceof MessageError ? traduireErreur(locals.lang, e) : t(locals.lang, 'validation.identifiantInvalide'),
        identifiant: identifiantBrut
      });
    }
    const cle = `${getClientAddress()}:${identifiant}`;
    if (!limiteurConnexion.autoriser(cle)) {
      return fail(429, { erreur: t(locals.lang, 'validation.tropTentatives'), identifiant: identifiantBrut });
    }
    const repo = getRepository();
    const compte = await repo.trouverCompteParIdentifiant(identifiant);
    // Hash fictif pour garder un temps de réponse comparable si le compte n'existe pas.
    const ok = compte
      ? verifierMotDePasse(motDePasse, compte.motDePasseHash)
      : verifierMotDePasse(motDePasse, hacherMotDePasse('mot-de-passe-fictif'));
    if (!compte || !ok) {
      limiteurConnexion.enregistrerEchec(cle);
      return fail(401, { erreur: t(locals.lang, 'validation.identifiantsIncorrects'), identifiant: identifiantBrut });
    }
    limiteurConnexion.reinitialiser(cle);
    const jeton = genererJetonSession();
    await repo.creerSession(compte.id, hacherJeton(jeton), expirationSession());
    cookies.set(SESSION_COOKIE, jeton, optionsCookieSession(process.env.NODE_ENV === 'production'));
    throw redirect(303, '/clientes');
  }
};
