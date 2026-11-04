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
 * Client HTTP compatible API Messages d’Anthropic (POST /v1/messages).
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
  /** Client injectable (tests : faux client, aucun réseau). Défaut : client Anthropic-compatible si configuré. */
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
export function construireSystemeReconnaissance(): string {
  const lignes: string[] = [
    'Tu aides une couturière à choisir un modèle de patron parmi un catalogue fermé, à partir d’une description ou d’une photo de vêtement.',
    'Catalogue (identifiants exacts à utiliser) :'
  ];
  for (const entree of LISTE_MODELES) {
    lignes.push(`- "${entree.id}" : ${t('fr', entree.titreCle)}.`);
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
    'Réponds UNIQUEMENT par un objet JSON, sans texte autour, dans l’un de ces trois formats :',
    '1. Vêtement du catalogue : {"modele":"<identifiant du catalogue>","options":{...}} — uniquement les clés d’options exposées pour CE modèle, seulement si la description ou la photo les indique ; sinon "options": {}.',
    '2. Vêtement réel mais hors catalogue (veste, chemise, robe d’un autre type, etc.) : {"modele":"hors_catalogue"} — ne le remplace JAMAIS par un modèle du catalogue.',
    '3. Impossible à identifier, aucun vêtement visible, image illisible ou description trop vague : {"modele":"illisible"}.',
    'Ne mets jamais de mesure de personne, de cote ni de géométrie : le moteur calcule tout lui-même.',
    'La description peut être en français ou en anglais : comprends-la dans l’une ou l’autre langue.'
  );
  return lignes.join('\n');
}

export function construirePromptReconnaissanceTexte(texteModele: string): string {
  return `Description du vêtement voulu : « ${texteModele.trim()} »`;
}

export const PROMPT_RECONNAISSANCE_PHOTO =
  'Voici la photo d’un vêtement. Identifie son type parmi le catalogue, ou réponds "hors_catalogue" s’il n’y figure pas, ou "illisible" si aucun vêtement n’est reconnaissable.';

export type ReconnaissanceValidee =
  | { modele: ModelePatron; options: OptionsModele }
  | { modele: 'hors_catalogue'; options: OptionsModele }
  | { modele: 'illisible'; options: OptionsModele };

/**
 * Valide la réponse de reconnaissance selon un schéma strict : le modèle
 * doit être un identifiant du registre (ou hors_catalogue / illisible —
 * jamais de substitution silencieuse) ; les options sont filtrées par les
 * définitions du registre : nombres ramenés dans leur plage, choix vérifiés
 * dans la liste, clés inconnues ou mal formées ignorées. La jupe droite
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
  if (modeleBrut === 'illisible') return { modele: 'illisible', options: {} };
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
  return { modele: entree.id, options };
}

export type EntreeReconnaissance =
  | { type: 'texte'; texte: string }
  | { type: 'photo'; image: ImageIa };

export type ResultatReconnaissance =
  | { statut: 'ok'; modele: ModelePatron; options: OptionsModele }
  | { statut: 'hors_catalogue' }
  | { statut: 'illisible' }
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
    const reponseTexte = await appelerAvecDelai(deps.delaiMs ?? DELAI_IA_DEFAUT_MS, (signal) =>
      entree.type === 'texte'
        ? client!.genererTexte(construireSystemeReconnaissance(), construirePromptReconnaissanceTexte(entree.texte), signal)
        : client!.genererAvecImage
          ? client!.genererAvecImage(construireSystemeReconnaissance(), PROMPT_RECONNAISSANCE_PHOTO, entree.image, signal)
          : Promise.reject(new Error('Assistant indisponible.'))
    );
    let validee: ReconnaissanceValidee;
    try {
      validee = validerReconnaissance(reponseTexte);
    } catch {
      return { statut: 'invalide' };
    }
    if (validee.modele === 'hors_catalogue') return { statut: 'hors_catalogue' };
    if (validee.modele === 'illisible') return { statut: 'illisible' };
    return { statut: 'ok', modele: validee.modele, options: validee.options };
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
