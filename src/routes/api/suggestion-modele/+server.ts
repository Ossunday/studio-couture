import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ENV_SESSION_SECRET } from '$lib/brand';
import { SESSION_COOKIE, verifierCsrf } from '$lib/server/auth';
import {
  LONGUEUR_MAX_TEXTE_MODELE,
  estCorpulenceIa,
  estimerMesuresModele,
  limiteurSuggestionsIa,
  lireConfigIa,
  reconnaitreModele,
  suggererOptionsModele,
  validerTailleIa,
  type CorpulenceIa
} from '$lib/server/ia/suggestion-modele';
import { estModelePatron } from '$lib/patterns/registre';
import { PhotoInvalideError, validerPhoto, versBase64 } from '$lib/server/ia/photo';

/**
 * Assistant IA (phases 8 et 11) — trois flux, mêmes garde-fous :
 * session connectée, CSRF exigé, limite par atelier, mode démo mémoire
 * désactivé sans erreur, aucune erreur technique affichée.
 *
 * 1. `{ texte }` (phase 8, salle d'essayage) : options du pantalon large.
 * 2. `{ reconnaissance: true, texte }` (phase 11) : le modèle du registre
 *    reconnu d'après la description, avec ses seules options exposées.
 * 3. `multipart/form-data` (phase 11) : champ `photo` (JPEG/PNG/WebP, 5 Mo
 *    max, type vérifié par signature, métadonnées retirées, traitée en
 *    mémoire, jamais enregistrée ni journalisée) + champ `consentement`
 *    obligatoire. La photo ne part qu'au modèle IA configuré.
 *
 * Aucune donnée cliente n'est acceptée ni transmise : seuls le texte ou la
 * photo du vêtement sont lus. La clé n'est jamais journalisée.
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  if (!locals.utilisatrice) {
    return json({ statut: 'refuse', cle: 'ia.connectez' }, { status: 401 });
  }
  const jetonSession = cookies.get(SESSION_COOKIE);
  if (!verifierCsrf(jetonSession, request.headers.get('x-csrf-token'), process.env[ENV_SESSION_SECRET])) {
    return json({ statut: 'refuse', cle: 'erreur.csrf' }, { status: 403 });
  }
  const atelierId = locals.utilisatrice.atelierId;

  /** Garde-fous communs : démo mémoire, configuration, limite par atelier. */
  const porteIa = (): Response | null => {
    // Mode démo mémoire (tests, démonstration locale) : IA désactivée, sans erreur.
    if ((process.env.STUDIO_COUTURE_REPOSITORY ?? '').trim().toLowerCase() === 'memoire') {
      return json({ statut: 'indisponible', cle: 'assistant.bientot' });
    }
    if (!lireConfigIa()) {
      return json({ statut: 'indisponible', cle: 'assistant.bientot' });
    }
    if (!limiteurSuggestionsIa.autoriser(atelierId)) {
      return json({ statut: 'limite', cle: 'assistant.limite' }, { status: 429 });
    }
    return null;
  };

  const typeContenu = request.headers.get('content-type') ?? '';

  // --- Flux photo (multipart) ---------------------------------------------
  if (typeContenu.includes('multipart/form-data')) {
    const formulaire = await request.formData().catch(() => null);
    if (!formulaire) {
      return json({ statut: 'invalide', cle: 'assistant.photoIllisible' }, { status: 400 });
    }
    const consentement = String(formulaire.get('consentement') ?? '');
    if (!['on', 'true', 'oui', '1'].includes(consentement)) {
      return json({ statut: 'consentement_requis', cle: 'assistant.consentementRequis' }, { status: 400 });
    }
    const photoBrute = formulaire.get('photo');
    if (!(photoBrute instanceof File) || photoBrute.size === 0) {
      return json({ statut: 'invalide', cle: 'assistant.photoIllisible' }, { status: 400 });
    }
    let photo;
    try {
      // En mémoire uniquement : aucun enregistrement, aucun journal.
      photo = validerPhoto(new Uint8Array(await photoBrute.arrayBuffer()));
    } catch (e) {
      if (e instanceof PhotoInvalideError && e.raison === 'trop_grande') {
        return json({ statut: 'photo_trop_grande', cle: 'assistant.photoTropGrande' }, { status: 400 });
      }
      return json({ statut: 'photo_invalide', cle: 'assistant.photoTypeRefuse' }, { status: 400 });
    }
    const porte = porteIa();
    if (porte) return porte;
    const resultat = await reconnaitreModele({
      type: 'photo',
      image: { mediaType: photo.mediaType, donneesBase64: versBase64(photo.donnees) },
      tailleCm: validerTailleIa(String(formulaire.get('tailleCm') ?? '')),
      corpulence: corpulenceDepuis(formulaire.get('corpulence'))
    });
    return reponseReconnaissance(resultat);
  }

  // --- Flux JSON : reconnaissance texte ou suggestion historique ----------
  const corps: unknown = await request.json().catch(() => null);

  // Estimation des mesures d’un modèle déjà reconnu (chat, phase 12) :
  // taille et corpulence déclarées à l’instant, aucune donnée cliente.
  if ((corps as { estimation?: unknown } | null)?.estimation === true) {
    const modeleBrut = (corps as { modele?: unknown }).modele;
    if (typeof modeleBrut !== 'string' || !estModelePatron(modeleBrut)) {
      return json({ statut: 'invalide', cle: 'assistant.reponseInvalide' }, { status: 400 });
    }
    const porte = porteIa();
    if (porte) return porte;
    const estimation = await estimerMesuresModele(modeleBrut, {
      tailleCm: validerTailleIa((corps as { tailleCm?: unknown }).tailleCm),
      corpulence: corpulenceDepuis((corps as { corpulence?: unknown }).corpulence)
    });
    if (estimation.statut === 'ok') {
      return json({ statut: 'ok', modele: modeleBrut, estimations: estimation.estimations, ...(estimation.conseil ? { conseil: estimation.conseil } : {}) });
    }
    if (estimation.statut === 'invalide') return json({ statut: 'invalide', cle: 'assistant.reponseInvalide' });
    return json({ statut: 'indisponible', cle: 'assistant.bientot' });
  }

  const texte = (corps as { texte?: unknown } | null)?.texte;
  if (typeof texte !== 'string' || texte.trim().length < 3 || texte.trim().length > LONGUEUR_MAX_TEXTE_MODELE) {
    return json({ statut: 'invalide', cle: 'ia.decrivez' }, { status: 400 });
  }
  const reconnaissance = (corps as { reconnaissance?: unknown } | null)?.reconnaissance === true;

  if (reconnaissance) {
    const porte = porteIa();
    if (porte) return porte;
    const resultat = await reconnaitreModele({
      type: 'texte',
      texte,
      tailleCm: validerTailleIa((corps as { tailleCm?: unknown }).tailleCm),
      corpulence: corpulenceDepuis((corps as { corpulence?: unknown }).corpulence)
    });
    return reponseReconnaissance(resultat);
  }

  // Suggestion historique de la salle (pantalon large uniquement).
  if ((process.env.STUDIO_COUTURE_REPOSITORY ?? '').trim().toLowerCase() === 'memoire') {
    return json({ statut: 'indisponible', cle: 'ia.desactiveDemo' });
  }
  if (!lireConfigIa()) {
    return json({ statut: 'indisponible', cle: 'ia.nonConfigure' });
  }
  if (!limiteurSuggestionsIa.autoriser(atelierId)) {
    return json({ statut: 'limite', cle: 'ia.limite' }, { status: 429 });
  }
  const resultat = await suggererOptionsModele(texte);
  if (resultat.statut === 'ok') {
    return json({ statut: 'ok', options: resultat.options });
  }
  if (resultat.statut === 'invalide') {
    return json({ statut: 'invalide', cle: 'ia.invalide' });
  }
  return json({ statut: 'indisponible', cle: 'ia.indisponible' });
};

function corpulenceDepuis(valeur: unknown): CorpulenceIa | undefined {
  return estCorpulenceIa(valeur) ? valeur : undefined;
}

function reponseReconnaissance(resultat: Awaited<ReturnType<typeof reconnaitreModele>>): Response {
  switch (resultat.statut) {
    case 'ok':
      // Seul le JSON validé (modèle du registre + options ramenées aux
      // plages + estimations bornées) repart au navigateur ; la bulle est
      // construite par l'app.
      return json({
        statut: 'ok',
        modele: resultat.modele,
        options: resultat.options,
        estimations: resultat.estimations,
        ...(resultat.conseil ? { conseil: resultat.conseil } : {})
      });
    case 'candidats':
      return json({ statut: 'candidats', candidats: resultat.candidats });
    case 'conseil':
      return json({ statut: 'conseil', conseil: resultat.conseil });
    case 'hors_catalogue':
      return json({ statut: 'hors_catalogue', cle: 'assistant.horsCatalogue' });
    case 'illisible':
      return json({ statut: 'illisible', cle: 'assistant.illisible' });
    case 'invalide':
      return json({ statut: 'invalide', cle: 'assistant.reponseInvalide' });
    case 'non_configuree':
      return json({ statut: 'indisponible', cle: 'assistant.bientot' });
    default:
      // Panne ou délai dépassé : repli silencieux, aucune erreur technique.
      return json({ statut: 'indisponible', cle: 'assistant.bientot' });
  }
}
