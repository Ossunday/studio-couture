import { ENV_IA_API_KEY, ENV_IA_BASE_URL, ENV_IA_MODELE } from '$lib/brand';
import { t } from '$lib/i18n';
import type { OptionsPantalonLarge } from '$lib/patterns/pantalon-large/geometry';
import { LISTE_MODELES, REGISTRE_MODELES, type ModelePatron, type OptionsModele } from '$lib/patterns/registre';
import type { TypeImageIa } from './photo';

/**
 * Assistant de modèle par IA — traduction d'une description libre en OPTIONS
 * du pantalon large, rien d'autre.
 *
 * Garanties (règles produit de la phase 8) :
 * - l'IA ne produit JAMAIS de cote ni de géométrie : la réponse attendue ne
 *   contient que les trois options déjà exposées par le moteur
 *   (`largeurBasPieceCm`, `profondeurPliCm`, `hauteurCeintureFinieCm`),
 *   chacune ramenée dans la plage autorisée du moteur, toute clé inconnue
 *   ignorée, et une réponse non conforme est refusée ;
 * - on n'envoie au modèle que le texte du modèle saisi par la couturière :
 *   aucune mesure, aucun nom, aucune donnée cliente ;
 * - la clé est lue dans l'environnement du serveur, jamais journalisée,
 *   jamais renvoyée au navigateur ;
 * - toute panne (non configuré, délai dépassé, réseau, réponse invalide)
 *   donne un résultat explicite et le formulaire manuel reste utilisable.
 * La suggestion ne valide ni ne garantit le patron : il reste un brouillon
 * non validé, à vérifier par la couturière puis par un maître tailleur.
 */

/** Plages autorisées : les mêmes que `lireOptionsPantalon` (saisie-patron.ts). */
export const PLAGES_OPTIONS_IA = {
  largeurBasPieceCm: { min: 18, max: 40 },
  profondeurPliCm: { min: 0, max: 8 },
  hauteurCeintureFinieCm: { min: 3, max: 6 }
} as const;

export type CleOptionIa = keyof typeof PLAGES_OPTIONS_IA;

export const LIBELLES_OPTIONS_IA: Record<CleOptionIa, string> = {
  largeurBasPieceCm: 'Largeur du bas par pièce',
  profondeurPliCm: 'Profondeur du pli devant',
  hauteurCeintureFinieCm: 'Hauteur finie de la ceinture'
};

/** Longueur maximale du texte envoyé au modèle (texte du modèle uniquement). */
export const LONGUEUR_MAX_TEXTE_MODELE = 300;
/**
 * Délai d'attente par défaut pour l'appel au modèle : 30 secondes.
 * L'endpoint compatible peut réfléchir avant de répondre ; un délai court
 * couperait des réponses pourtant valides.
 */
export const DELAI_IA_DEFAUT_MS = 30_000;
/**
 * Jetons de réponse : 1 500 minimum. Mesuré avec le modèle configuré : la
 * réponse commence par un bloc de réflexion sans texte, qui consomme le
 * budget — avec 50 jetons, le bloc texte n'arrive jamais ; avec 1 000, il
 * arrive. 1 500 laisse la réflexion ET le JSON final.
 */
export const MAX_TOKENS_IA = 1_500;

export class SuggestionInvalideError extends Error {}

function ramenerDansPlage(cle: CleOptionIa, valeur: number): number {
  const { min, max } = PLAGES_OPTIONS_IA[cle];
  const borne = Math.min(max, Math.max(min, valeur));
  return Math.round(borne * 10) / 10;
}

/**
 * Valide la réponse du modèle selon un schéma strict : un objet JSON dont
 * seules les trois options connues sont retenues. Une valeur présente doit
 * être un nombre fini (sinon la réponse entière est refusée) ; elle est
 * ramenée dans sa plage. Aucune option connue = réponse refusée.
 */
export function validerSuggestionIa(brut: unknown): OptionsPantalonLarge {
  let valeur: unknown = brut;
  if (typeof brut === 'string') {
    const texte = brut.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      valeur = JSON.parse(texte);
    } catch {
      throw new SuggestionInvalideError('suggestion_illisible');
    }
  }
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) {
    throw new SuggestionInvalideError('suggestion_format_invalide');
  }
  const enregistrement = valeur as Record<string, unknown>;
  const options: OptionsPantalonLarge = {};
  let trouvees = 0;
  for (const cle of Object.keys(PLAGES_OPTIONS_IA) as CleOptionIa[]) {
    const v = enregistrement[cle];
    if (v === undefined) continue;
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new SuggestionInvalideError(`suggestion_option_non_numerique:${cle}`);
    }
    options[cle] = ramenerDansPlage(cle, v);
    trouvees += 1;
  }
  if (trouvees === 0) {
    throw new SuggestionInvalideError('suggestion_aucune_option');
  }
  return options;
}

export const SYSTEME_SUGGESTION = [
  'Tu aides une couturière à régler un patron de pantalon large déjà calculé par un moteur de patronage.',
  'À partir de sa description du modèle voulu, choisis uniquement les options suivantes, en centimètres :',
  '- "largeurBasPieceCm" : largeur du bas de chaque pièce, entre 18 (jambe plutôt droite) et 40 (très ample) ;',
  '- "profondeurPliCm" : profondeur du pli devant, entre 0 (aucun pli marqué) et 8 (pli très marqué) ;',
  '- "hauteurCeintureFinieCm" : hauteur finie de la ceinture, entre 3 (fine) et 6 (haute).',
  'Réponds UNIQUEMENT par un objet JSON contenant une à trois de ces clés avec des nombres, sans texte autour, sans mesure de personne, sans cote de patron : le moteur calcule toutes les cotes lui-même.',
  'Si la description ne dit rien d’une option, omets sa clé.',
  'La description peut être en français ou en anglais : comprends-la dans l’une ou l’autre langue.'
].join('\n');

export function construirePromptUtilisateur(texteModele: string): string {
  return `Description du modèle de pantalon large voulu : « ${texteModele.trim()} »`;
}

export interface ImageIa {
  mediaType: TypeImageIa;
  /** Image encodée en base64, métadonnées déjà retirées (voir photo.ts). */
  donneesBase64: string;
}

export interface ClientIa {
  /** Renvoie le texte brut de la réponse du modèle (JSON attendu). */
  genererTexte(systeme: string, utilisateur: string, signal: AbortSignal): Promise<string>;
  /** Même chose avec une photo de vêtement jointe au message. */
  genererAvecImage?(systeme: string, utilisateur: string, image: ImageIa, signal: AbortSignal): Promise<string>;
}

export interface ConfigIa {
  apiKey: string;
  baseUrl: string;
  modele: string;
}

/**
 * Configuration depuis l'environnement serveur : les trois variables doivent
 * être présentes, sinon l'assistant est simplement désactivé (repli manuel),
 * sans erreur. La clé n'est jamais journalisée ni renvoyée.
 */
export function lireConfigIa(env: NodeJS.ProcessEnv = process.env): ConfigIa | null {
  const apiKey = (env[ENV_IA_API_KEY] ?? '').trim();
  const baseBrute = (env[ENV_IA_BASE_URL] ?? '').trim().replace(/\/+$/, '');
  const modele = (env[ENV_IA_MODELE] ?? '').trim();
  if (!apiKey || !baseBrute || !modele) return null;
  let baseUrl: URL;
  try {
    baseUrl = new URL(baseBrute);
  } catch {
    return null;
  }
  if (baseUrl.protocol !== 'https:' && baseUrl.protocol !== 'http:') return null;
  return { apiKey, baseUrl: baseUrl.toString().replace(/\/+$/, ''), modele };
}

/**
 * Client HTTP Messages-compatible (POST /v1/messages) de l’API Meta.
 * La même clé est envoyée dans les deux en-têtes que ces endpoints peuvent
 * accepter (`x-api-key` et `Authorization: Bearer`) ; elle n'est jamais
 * journalisée et n'apparaît dans aucun message d'erreur.
 */
/**
 * Extrait le texte exploitable d'une réponse Messages : SEULS les blocs
 * `text` comptent. L'endpoint configuré renvoie d'abord un bloc
 * `redacted_thinking` (ou `thinking`) sans texte, puis le bloc `text` :
 * tout autre bloc est ignoré. Aucun bloc texte → erreur générique, jamais
 * de crash, et l'appelant affiche son message de repli.
 */
export function extraireTexteReponse(corps: unknown): string {
  const contenu = (corps as { content?: unknown } | null)?.content;
  if (!Array.isArray(contenu)) throw new Error('Assistant indisponible.');
  const texte = contenu
    .filter((bloc): bloc is { type: string; text: string } => !!bloc && typeof bloc === 'object' && (bloc as { type?: unknown }).type === 'text' && typeof (bloc as { text?: unknown }).text === 'string')
    .map((bloc) => bloc.text)
    .join('');
  if (!texte.trim()) throw new Error('Assistant indisponible.');
  return texte;
}

export function creerClientAnthropique(config: ConfigIa, fetchFn: typeof fetch = fetch): ClientIa {
  async function appeler(systeme: string, contenuUtilisateur: unknown, signal: AbortSignal): Promise<string> {
    const reponse = await fetchFn(`${config.baseUrl}/v1/messages`, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        authorization: `Bearer ${config.apiKey}`,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.modele,
        max_tokens: MAX_TOKENS_IA,
        system: systeme,
        messages: [{ role: 'user', content: contenuUtilisateur }]
      })
    });
    // Échec : message générique, le corps de réponse n'est ni lu ni recopié
    // (il ne doit jamais fuiter — ni lui, ni la clé — vers l'utilisatrice).
    if (!reponse.ok) throw new Error('Assistant indisponible.');
    const corps: unknown = await reponse.json().catch(() => null);
    return extraireTexteReponse(corps);
  }
  return {
    genererTexte: (systeme, utilisateur, signal) => appeler(systeme, utilisateur, signal),
    genererAvecImage: (systeme, utilisateur, image, signal) =>
      appeler(
        systeme,
        [
          { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.donneesBase64 } },
          { type: 'text', text: utilisateur }
        ],
        signal
      )
  };
}

export type ResultatSuggestion =
  | { statut: 'ok'; options: OptionsPantalonLarge }
  | { statut: 'non_configuree' }
  | { statut: 'invalide' }
  | { statut: 'echec' };

export interface DependancesSuggestion {
  /** Client injectable (tests : faux client, aucun réseau). Défaut : client Messages-compatible de l’API Meta si configuré. */
  client?: ClientIa;
  env?: NodeJS.ProcessEnv;
  delaiMs?: number;
  fetchFn?: typeof fetch;
}

/**
 * Demande une suggestion d'options. Ne lève jamais : tout échec devient un
 * résultat explicite, et la couturière garde le formulaire manuel.
 */
export async function suggererOptionsModele(texteModele: string, deps: DependancesSuggestion = {}): Promise<ResultatSuggestion> {
  const texte = (texteModele ?? '').trim();
  if (texte.length < 3 || texte.length > LONGUEUR_MAX_TEXTE_MODELE) return { statut: 'invalide' };

  let client = deps.client;
  if (!client) {
    const config = lireConfigIa(deps.env);
    if (!config) return { statut: 'non_configuree' };
    client = creerClientAnthropique(config, deps.fetchFn);
  }

  const delaiMs = deps.delaiMs ?? DELAI_IA_DEFAUT_MS;
  const controleur = new AbortController();
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  try {
    const expiration = new Promise<never>((_, rejeter) => {
      minuteur = setTimeout(() => {
        controleur.abort();
        rejeter(new Error('Délai dépassé.'));
      }, delaiMs);
    });
    const reponseTexte = await Promise.race([client.genererTexte(SYSTEME_SUGGESTION, construirePromptUtilisateur(texte), controleur.signal), expiration]);
    try {
      return { statut: 'ok', options: validerSuggestionIa(reponseTexte) };
    } catch {
      return { statut: 'invalide' };
    }
  } catch {
    return { statut: 'echec' };
  } finally {
    if (minuteur) clearTimeout(minuteur);
  }
}

/** Limitation par atelier, en mémoire (mono-instance, comme les autres limites du projet). */
export class ReconnaissanceInvalideError extends Error {}

/**
 * Prompt système de reconnaissance, CONSTRUIT DEPUIS LE REGISTRE : seuls les
 * modèles et les options que le moteur expose y figurent, avec leurs plages
 * et leurs choix. L'IA reconnaît un type de vêtement et propose des options ;
 * elle ne produit jamais de cote ni de géométrie, et ne remplace jamais un
 * vêtement hors catalogue par un modèle du catalogue.
 */
export type CorpulenceIa = 'petite' | 'moyenne' | 'forte';
export const CORPULENCES_IA: readonly CorpulenceIa[] = ['petite', 'moyenne', 'forte'];

export function estCorpulenceIa(valeur: unknown): valeur is CorpulenceIa {
  return valeur === 'petite' || valeur === 'moyenne' || valeur === 'forte';
}

/** Taille de personne plausible pour une estimation (cm). */
export function validerTailleIa(valeur: unknown): number | undefined {
  const n = typeof valeur === 'number' ? valeur : typeof valeur === 'string' ? Number(valeur.replace(',', '.')) : NaN;
  return Number.isFinite(n) && n >= 100 && n <= 230 ? Math.round(n * 10) / 10 : undefined;
}

export function construireSystemeReconnaissance(): string {
  const lignes: string[] = [
    'Tu aides une couturière à choisir un modèle de patron parmi un catalogue fermé, à partir d’une description ou d’une photo de vêtement.',
    'Catalogue (identifiants exacts à utiliser) :'
  ];
  for (const entree of LISTE_MODELES) {
    lignes.push(`- "${entree.id}" : ${t('fr', entree.titreCle)}.`);
    lignes.push(
      `  Mesures de ce modèle (clés exactes, en centimètres) : ${entree.mesures.map((m) => `"${m.code}" entre ${m.minCm} et ${m.maxCm}`).join(', ')}.`
    );
    if (entree.options.length === 0) {
      lignes.push('  Ce modèle n’expose aucune option réglable : réponds "options": {}.');
    } else {
      lignes.push('  Options exposées par le moteur (clés exactes) :');
      for (const def of entree.options) {
        if (def.type === 'nombre') {
          lignes.push(`  - "${def.cle}" : nombre en centimètres entre ${def.min} et ${def.max} (${t('fr', def.libelleCle)}).`);
        } else if (def.type === 'choix') {
          const choix = (def.choix ?? []).map((c) => `"${c.valeur}" (${t('fr', c.libelleCle)})`).join(' ou ');
          lignes.push(`  - "${def.cle}" : un seul choix parmi ${choix} (${t('fr', def.libelleCle)}).`);
        } else {
          lignes.push(`  - "${def.cle}" : booléen, true seulement si la description ou la photo le montre (${t('fr', def.libelleCle)}).`);
        }
      }
    }
  }
  lignes.push(
    'ÉTAPE 1 — DÉCRIS D’ABORD : remplis toujours "vetement_vu" par une courte description du vêtement réellement visible ou décrit (ex. "pantalon ample à taille haute"). C’est ce vêtement-là, et lui seul, que tu dois classer ensuite.',
    'ÉTAPE 2 — DÉCIDE avec ces règles explicites :',
    '- tout pantalon (large, ample, droit, fluide, à pinces…) → "pantalon_large" ;',
    '- toute robe moulante, droite ou fourreau → "robe_fourreau" ;',
    '- toute jupe droite ou crayon → "jupe_droite" ;',
    '- "hors_catalogue" SEULEMENT si c’est clairement une AUTRE catégorie (veste, chemise, manteau, combinaison, haut…) — jamais par incertitude, jamais pour un pantalon, une robe droite ou une jupe droite ;',
    '- si plusieurs vêtements sont visibles, classe le plus visible ; si tu hésites entre deux modèles du catalogue, réponds "illisible" avec "candidats" listant ces modèles au lieu de trancher au hasard.',
    'Réponds UNIQUEMENT par un objet JSON, sans texte autour, dans l’un de ces formats :',
    '1. Vêtement du catalogue : {"vetement_vu":"<ce que tu vois>","modele":"<identifiant du catalogue>","options":{...},"estimations":{...},"conseil":"<une courte phrase, 200 caractères maximum>"} — options : uniquement les clés exposées pour CE modèle, seulement si indiquées, sinon {}. estimations : uniquement les clés de mesures de CE modèle, en centimètres, seulement si une taille et une corpulence de la personne sont fournies dans le message ou si la photo montre une personne dont tu peux estimer les mesures ; sinon {}. Ces estimations sont indicatives, jamais des cotes de patron.',
    '2. Vêtement réel mais hors catalogue : {"vetement_vu":"<ce que tu vois>","modele":"hors_catalogue"} — ne le remplace JAMAIS par un modèle du catalogue.',
    '3. Impossible à identifier, aucun vêtement visible, image illisible ou description trop vague : {"vetement_vu":"<ce que tu vois, ou vide>","modele":"illisible"} ; si tu hésites entre des modèles du catalogue, ajoute "candidats":["<identifiant>",...].',
    '4. Question de couture ou de mesures (pas de vêtement à reconnaître) : {"modele":"question","conseil":"<réponse courte et concrète, 200 caractères maximum>"}.',
    'Le champ "conseil" est facultatif partout : une seule phrase courte, sans promesse, sans cote de patron.',
    'Ne produis jamais de géométrie de patron : le moteur calcule tout lui-même.',
    'La description peut être en français ou en anglais : comprends-la dans l’une ou l’autre langue, et rédige "vetement_vu" et "conseil" en français.'
  );
  return lignes.join('\n');
}

export interface ContextePersonneIa {
  tailleCm?: number;
  corpulence?: CorpulenceIa;
}

function suffixeContexte(contexte?: ContextePersonneIa): string {
  const morceaux: string[] = [];
  if (contexte?.tailleCm !== undefined) morceaux.push(`taille de la personne : environ ${contexte.tailleCm} cm`);
  if (contexte?.corpulence) morceaux.push(`corpulence : ${contexte.corpulence}`);
  return morceaux.length > 0 ? ` (${morceaux.join(', ')})` : '';
}

export function construirePromptReconnaissanceTexte(texteModele: string, contexte?: ContextePersonneIa): string {
  return `Description du vêtement voulu : « ${texteModele.trim()} »${suffixeContexte(contexte)}`;
}

export const PROMPT_RECONNAISSANCE_PHOTO =
  'Voici une photo. Étape 1 : décris le vêtement le plus visible dans "vetement_vu". Étape 2 : classe-le avec les règles du catalogue (tout pantalon → "pantalon_large", robe moulante ou droite → "robe_fourreau", jupe droite ou crayon → "jupe_droite", "hors_catalogue" seulement pour une autre catégorie claire). Si la photo montre une personne portant le vêtement, tu peux aussi proposer des "estimations" de mesures indicatives.';

export function construirePromptReconnaissancePhoto(contexte?: ContextePersonneIa): string {
  return `${PROMPT_RECONNAISSANCE_PHOTO}${suffixeContexte(contexte)}`;
}

export type EstimationsIa = Record<string, number>;

export type ReconnaissanceValidee =
  | { modele: ModelePatron; options: OptionsModele; estimations: EstimationsIa; conseil?: string }
  | { modele: 'hors_catalogue'; options: OptionsModele }
  | { modele: 'illisible'; options: OptionsModele; candidats: ModelePatron[] }
  | { modele: 'question'; options: OptionsModele; conseil: string };

/**
 * Conseil libre du modèle, filtré avant tout affichage : une seule ligne,
 * sans balise ni lien, 200 caractères maximum. Vide → undefined.
 */
export function filtrerConseilIa(brut: unknown): string | undefined {
  if (typeof brut !== 'string') return undefined;
  const propre = brut.replace(/<[^>]*>/g, ' ').replace(/https?:\/\/\S+/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 200).trim();
  return propre || undefined;
}

/** Estimations ramenées aux seules mesures du modèle, chacune dans la plage de sa définition. */
export function validerEstimationsIa(brut: unknown, entree: (typeof LISTE_MODELES)[number]): EstimationsIa {
  const estimations: EstimationsIa = {};
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return estimations;
  const source = brut as Record<string, unknown>;
  for (const def of entree.mesures) {
    const v = source[def.code];
    if (typeof v === 'number' && Number.isFinite(v)) {
      estimations[def.code] = Math.round(Math.min(def.maxCm, Math.max(def.minCm, v)) * 10) / 10;
    }
  }
  return estimations;
}

function validerCandidatsIa(brut: unknown): ModelePatron[] {
  if (!Array.isArray(brut)) return [];
  const candidats: ModelePatron[] = [];
  for (const v of brut) {
    if (typeof v === 'string' && v in REGISTRE_MODELES && !candidats.includes(v as ModelePatron)) candidats.push(v as ModelePatron);
  }
  return candidats;
}

/**
 * Valide la réponse de reconnaissance selon un schéma strict : le modèle
 * doit être un identifiant du registre (ou hors_catalogue / illisible /
 * question — jamais de substitution silencieuse) ; les options sont filtrées
 * par les définitions du registre : nombres ramenés dans leur plage, choix
 * vérifiés dans la liste, clés inconnues ou mal formées ignorées. Le champ
 * libre "vetement_vu" (description préalable du vêtement, jamais affichée)
 * est simplement ignoré. Les estimations sont ramenées aux mesures du
 * modèle reconnu et à leurs plages ; le conseil est filtré. La jupe droite
 * n'expose aucune option : le résultat porte donc toujours {} pour elle.
 */
export function validerReconnaissance(brut: unknown): ReconnaissanceValidee {
  let valeur: unknown = brut;
  if (typeof brut === 'string') {
    const texte = brut.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      valeur = JSON.parse(texte);
    } catch {
      throw new ReconnaissanceInvalideError('reconnaissance_illisible');
    }
  }
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) {
    throw new ReconnaissanceInvalideError('reconnaissance_format_invalide');
  }
  const enregistrement = valeur as Record<string, unknown>;
  const modeleBrut = enregistrement['modele'];
  if (modeleBrut === 'hors_catalogue') return { modele: 'hors_catalogue', options: {} };
  if (modeleBrut === 'illisible') return { modele: 'illisible', options: {}, candidats: validerCandidatsIa(enregistrement['candidats']) };
  if (modeleBrut === 'question') {
    const conseil = filtrerConseilIa(enregistrement['conseil']);
    if (!conseil) throw new ReconnaissanceInvalideError('reconnaissance_conseil_vide');
    return { modele: 'question', options: {}, conseil };
  }
  if (typeof modeleBrut !== 'string' || !(modeleBrut in REGISTRE_MODELES)) {
    throw new ReconnaissanceInvalideError('reconnaissance_modele_inconnu');
  }
  const entree = REGISTRE_MODELES[modeleBrut as ModelePatron];
  const optionsBrutes =
    enregistrement['options'] && typeof enregistrement['options'] === 'object' && !Array.isArray(enregistrement['options'])
      ? (enregistrement['options'] as Record<string, unknown>)
      : {};
  const options: OptionsModele = {};
  for (const def of entree.options) {
    const v = optionsBrutes[def.cle];
    if (v === undefined) continue;
    if (def.type === 'nombre') {
      if (typeof v === 'number' && Number.isFinite(v)) {
        const borne = Math.min(def.max ?? v, Math.max(def.min ?? v, v));
        options[def.cle] = Math.round(borne * 10) / 10;
      }
    } else if (def.type === 'choix') {
      if (typeof v === 'string' && (def.choix ?? []).some((c) => c.valeur === v)) options[def.cle] = v;
    } else {
      if (v === true || v === def.defaut) options[def.cle] = def.defaut ?? 'oui';
    }
  }
  const conseil = filtrerConseilIa(enregistrement['conseil']);
  return {
    modele: entree.id,
    options,
    estimations: validerEstimationsIa(enregistrement['estimations'], entree),
    ...(conseil ? { conseil } : {})
  };
}

export type EntreeReconnaissance =
  | { type: 'texte'; texte: string; tailleCm?: number; corpulence?: CorpulenceIa }
  | { type: 'photo'; image: ImageIa; tailleCm?: number; corpulence?: CorpulenceIa };

export type ResultatReconnaissance =
  | { statut: 'ok'; modele: ModelePatron; options: OptionsModele; estimations: EstimationsIa; conseil?: string }
  | { statut: 'hors_catalogue' }
  | { statut: 'illisible' }
  | { statut: 'candidats'; candidats: ModelePatron[] }
  | { statut: 'conseil'; conseil: string }
  | { statut: 'non_configuree' }
  | { statut: 'invalide' }
  | { statut: 'echec' };

async function appelerAvecDelai<T>(delaiMs: number, appeler: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controleur = new AbortController();
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  try {
    const expiration = new Promise<never>((_, rejeter) => {
      minuteur = setTimeout(() => {
        controleur.abort();
        rejeter(new Error('Délai dépassé.'));
      }, delaiMs);
    });
    return await Promise.race([appeler(controleur.signal), expiration]);
  } finally {
    if (minuteur) clearTimeout(minuteur);
  }
}

/**
 * Reconnaît un modèle du registre à partir d'un texte ou d'une photo.
 * Ne lève jamais : non configuré, panne, délai dépassé, réponse non conforme
 * — tout devient un statut explicite, et le choix manuel reste le repli.
 * Seuls le texte ou la photo du vêtement sont envoyés : aucune donnée cliente.
 */
export async function reconnaitreModele(entree: EntreeReconnaissance, deps: DependancesSuggestion = {}): Promise<ResultatReconnaissance> {
  if (entree.type === 'texte') {
    const texte = (entree.texte ?? '').trim();
    if (texte.length < 3 || texte.length > LONGUEUR_MAX_TEXTE_MODELE) return { statut: 'invalide' };
  } else if (!entree.image.donneesBase64) {
    return { statut: 'invalide' };
  }

  let client = deps.client;
  if (!client) {
    const config = lireConfigIa(deps.env);
    if (!config) return { statut: 'non_configuree' };
    client = creerClientAnthropique(config, deps.fetchFn);
  }

  try {
    const contexte: ContextePersonneIa = {
      tailleCm: validerTailleIa(entree.tailleCm),
      corpulence: estCorpulenceIa(entree.corpulence) ? entree.corpulence : undefined
    };
    const reponseTexte = await appelerAvecDelai(deps.delaiMs ?? DELAI_IA_DEFAUT_MS, (signal) =>
      entree.type === 'texte'
        ? client!.genererTexte(construireSystemeReconnaissance(), construirePromptReconnaissanceTexte(entree.texte, contexte), signal)
        : client!.genererAvecImage
          ? client!.genererAvecImage(construireSystemeReconnaissance(), construirePromptReconnaissancePhoto(contexte), entree.image, signal)
          : Promise.reject(new Error('Assistant indisponible.'))
    );
    let validee: ReconnaissanceValidee;
    try {
      validee = validerReconnaissance(reponseTexte);
    } catch {
      return { statut: 'invalide' };
    }
    if (validee.modele === 'hors_catalogue') return { statut: 'hors_catalogue' };
    if (validee.modele === 'question') return { statut: 'conseil', conseil: validee.conseil };
    if (validee.modele === 'illisible') {
      return validee.candidats.length > 0 ? { statut: 'candidats', candidats: validee.candidats } : { statut: 'illisible' };
    }
    return {
      statut: 'ok',
      modele: validee.modele,
      options: validee.options,
      estimations: validee.estimations,
      ...(validee.conseil ? { conseil: validee.conseil } : {})
    };
  } catch {
    return { statut: 'echec' };
  }
}

/** Prompt d’estimation des mesures d’un modèle déjà reconnu, depuis taille et corpulence. */
export function construireSystemeEstimation(modele: ModelePatron): string {
  const entree = REGISTRE_MODELES[modele];
  const lignes: string[] = [
    `Tu aides une couturière à estimer les mesures d’une personne pour le modèle "${entree.id}" (${t('fr', entree.titreCle)}), à partir de sa taille en centimètres et de sa corpulence (petite, moyenne ou forte).`,
    'Mesures à estimer (clés exactes, en centimètres, chacune dans sa plage) :'
  ];
  for (const def of entree.mesures) {
    lignes.push(`- "${def.code}" entre ${def.minCm} et ${def.maxCm} (${t('fr', def.libelleCle)}).`);
  }
  lignes.push('Repères par corpulence (mesures usuelles du registre, à ajuster selon la taille fournie) :');
  for (const preset of entree.presets) {
    lignes.push(`- ${preset.id} : ${Object.entries(preset.valeurs).map(([code, v]) => `${code}=${v}`).join(', ')}.`);
  }
  lignes.push(
    'Réponds UNIQUEMENT par un objet JSON, sans texte autour : {"estimations":{...},"conseil":"<une courte phrase, 200 caractères maximum>"}.',
    'Toutes les mesures du modèle doivent être estimées. Ce sont des estimations indicatives à vérifier au mètre ruban : jamais des cotes de patron, jamais de géométrie.'
  );
  return lignes.join('\n');
}

export function construirePromptEstimation(contexte: ContextePersonneIa): string {
  const morceaux: string[] = [];
  if (contexte.tailleCm !== undefined) morceaux.push(`taille : environ ${contexte.tailleCm} cm`);
  if (contexte.corpulence) morceaux.push(`corpulence : ${contexte.corpulence}`);
  return `Personne à estimer — ${morceaux.join(', ') || 'corpulence moyenne supposée'}.`;
}

/** Valide une réponse d’estimation : toutes les mesures du modèle, ramenées à leurs plages. */
export function validerEstimationMesures(brut: unknown, modele: ModelePatron): { estimations: EstimationsIa; conseil?: string } {
  let valeur: unknown = brut;
  if (typeof brut === 'string') {
    const texte = brut.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      valeur = JSON.parse(texte);
    } catch {
      throw new ReconnaissanceInvalideError('estimation_illisible');
    }
  }
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) throw new ReconnaissanceInvalideError('estimation_format_invalide');
  const enregistrement = valeur as Record<string, unknown>;
  const estimations = validerEstimationsIa(enregistrement['estimations'], REGISTRE_MODELES[modele]);
  if (Object.keys(estimations).length === 0) throw new ReconnaissanceInvalideError('estimation_vide');
  const conseil = filtrerConseilIa(enregistrement['conseil']);
  return { estimations, ...(conseil ? { conseil } : {}) };
}

export type ResultatEstimation =
  | { statut: 'ok'; estimations: EstimationsIa; conseil?: string }
  | { statut: 'non_configuree' }
  | { statut: 'invalide' }
  | { statut: 'echec' };

/**
 * Estime les mesures d’un modèle reconnu depuis la taille et la corpulence
 * déclarées dans le chat. Ne lève jamais ; aucune donnée cliente enregistrée
 * n’est envoyée — seulement la taille et la corpulence saisies à l’instant.
 */
export async function estimerMesuresModele(
  modele: ModelePatron,
  contexte: ContextePersonneIa,
  deps: DependancesSuggestion = {}
): Promise<ResultatEstimation> {
  const tailleCm = validerTailleIa(contexte.tailleCm);
  const corpulence = estCorpulenceIa(contexte.corpulence) ? contexte.corpulence : undefined;
  if (tailleCm === undefined && corpulence === undefined) return { statut: 'invalide' };

  let client = deps.client;
  if (!client) {
    const config = lireConfigIa(deps.env);
    if (!config) return { statut: 'non_configuree' };
    client = creerClientAnthropique(config, deps.fetchFn);
  }

  try {
    const reponseTexte = await appelerAvecDelai(deps.delaiMs ?? DELAI_IA_DEFAUT_MS, (signal) =>
      client!.genererTexte(construireSystemeEstimation(modele), construirePromptEstimation({ tailleCm, corpulence }), signal)
    );
    try {
      const validee = validerEstimationMesures(reponseTexte, modele);
      return { statut: 'ok', estimations: validee.estimations, ...(validee.conseil ? { conseil: validee.conseil } : {}) };
    } catch {
      return { statut: 'invalide' };
    }
  } catch {
    return { statut: 'echec' };
  }
}

/** Limitation par atelier, en mémoire (mono-instance, comme les autres limites du projet). */
export class LimiteurSuggestionsIa {
  private demandes = new Map<string, number[]>();

  constructor(
    private readonly maxParFenetre = 20,
    private readonly fenetreMs = 60 * 60 * 1000
  ) {}

  /** Autorise et enregistre une demande pour cet atelier. */
  autoriser(atelierId: string, maintenant = Date.now()): boolean {
    const borne = maintenant - this.fenetreMs;
    const recentes = (this.demandes.get(atelierId) ?? []).filter((t) => t > borne);
    if (recentes.length >= this.maxParFenetre) {
      this.demandes.set(atelierId, recentes);
      return false;
    }
    recentes.push(maintenant);
    this.demandes.set(atelierId, recentes);
    return true;
  }

  reinitialiser(): void {
    this.demandes.clear();
  }
}

export const limiteurSuggestionsIa = new LimiteurSuggestionsIa();
