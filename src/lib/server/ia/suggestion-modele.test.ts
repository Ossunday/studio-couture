import { describe, expect, it, vi } from 'vitest';
import {
  DELAI_IA_DEFAUT_MS,
  LimiteurSuggestionsIa,
  MAX_TOKENS_IA,
  construirePromptUtilisateur,
  construireSystemeReconnaissance,
  creerClientAnthropique,
  extraireTexteReponse,
  lireConfigIa,
  reconnaitreModele,
  suggererOptionsModele,
  validerReconnaissance,
  validerSuggestionIa,
  type ClientIa,
  type ConfigIa
} from './suggestion-modele';

function fauxClient(reponse: string | Error): ClientIa {
  return {
    genererTexte: vi.fn(async () => {
      if (reponse instanceof Error) throw reponse;
      return reponse;
    })
  };
}

describe('validerSuggestionIa — schéma strict et plages du moteur', () => {
  it('retient les trois options connues dans leur plage', () => {
    expect(validerSuggestionIa('{"largeurBasPieceCm": 32, "profondeurPliCm": 5, "hauteurCeintureFinieCm": 4}')).toEqual({
      largeurBasPieceCm: 32,
      profondeurPliCm: 5,
      hauteurCeintureFinieCm: 4
    });
  });

  it('ramène chaque valeur hors plage dans la plage autorisée', () => {
    expect(validerSuggestionIa({ largeurBasPieceCm: 55, profondeurPliCm: -3, hauteurCeintureFinieCm: 12 })).toEqual({
      largeurBasPieceCm: 40,
      profondeurPliCm: 0,
      hauteurCeintureFinieCm: 6
    });
    expect(validerSuggestionIa({ largeurBasPieceCm: 4 })).toEqual({ largeurBasPieceCm: 18 });
  });

  it('ignore toute clé inconnue (aucune cote ne peut entrer)', () => {
    expect(validerSuggestionIa({ largeurBasPieceCm: 30, tourTailleCm: 82, longueurCeintureCm: 999, points: [1, 2] })).toEqual({
      largeurBasPieceCm: 30
    });
  });

  it('refuse une réponse invalide : texte libre, JSON cassé, mauvais types, aucune option', () => {
    expect(() => validerSuggestionIa('Un pantalon très ample, bien sûr !')).toThrow();
    expect(() => validerSuggestionIa('{"largeurBasPieceCm": ')).toThrow();
    expect(() => validerSuggestionIa({ largeurBasPieceCm: 'ample' })).toThrow();
    expect(() => validerSuggestionIa({ style: 'ample' })).toThrow();
    expect(() => validerSuggestionIa([30, 5, 4])).toThrow();
    expect(() => validerSuggestionIa(null)).toThrow();
  });
});

describe('suggererOptionsModele — faux client, aucun réseau', () => {
  it('renvoie les options validées du faux client', async () => {
    const client = fauxClient('{"largeurBasPieceCm": 45, "profondeurPliCm": 6}');
    const r = await suggererOptionsModele('pantalon très ample avec un pli marqué', { client });
    expect(r).toEqual({ statut: 'ok', options: { largeurBasPieceCm: 40, profondeurPliCm: 6 } });
  });

  it('n’envoie au modèle que le texte du modèle (aucune donnée cliente)', async () => {
    const client = fauxClient('{"largeurBasPieceCm": 30}');
    await suggererOptionsModele('ample et fluide', { client });
    const appels = vi.mocked(client.genererTexte).mock.calls;
    expect(appels).toHaveLength(1);
    expect(appels[0]![1]).toBe(construirePromptUtilisateur('ample et fluide'));
    expect(appels[0]![1]).not.toMatch(/Awa|cliente|tour de taille|cm de taille/i);
  });

  it('réponse invalide du modèle : statut invalide, pas d’exception', async () => {
    const r = await suggererOptionsModele('pantalon ample', { client: fauxClient('voici mon avis : très ample') });
    expect(r).toEqual({ statut: 'invalide' });
  });

  it('panne du modèle : statut echec, pas d’exception (repli manuel possible)', async () => {
    const r = await suggererOptionsModele('pantalon ample', { client: fauxClient(new Error('réseau coupé')) });
    expect(r).toEqual({ statut: 'echec' });
  });

  it('délai dépassé : statut echec sans attendre le modèle', async () => {
    const lent: ClientIa = { genererTexte: () => new Promise((resolve) => setTimeout(() => resolve('{"largeurBasPieceCm": 30}'), 500)) };
    const r = await suggererOptionsModele('pantalon ample', { client: lent, delaiMs: 20 });
    expect(r).toEqual({ statut: 'echec' });
  });

  it('non configuré (aucune variable d’environnement) : statut non_configuree, sans appel', async () => {
    const r = await suggererOptionsModele('pantalon ample', { env: {} });
    expect(r).toEqual({ statut: 'non_configuree' });
  });

  it('texte trop court ou trop long : invalide sans appeler le modèle', async () => {
    const client = fauxClient('{"largeurBasPieceCm": 30}');
    expect(await suggererOptionsModele('ok', { client })).toEqual({ statut: 'invalide' });
    expect(await suggererOptionsModele('a'.repeat(301), { client })).toEqual({ statut: 'invalide' });
    expect(client.genererTexte).not.toHaveBeenCalled();
  });
});

describe('lireConfigIa', () => {
  it('exige clé, endpoint et modèle ; ne renvoie jamais la clé ailleurs que dans la config serveur', () => {
    expect(lireConfigIa({})).toBeNull();
    expect(lireConfigIa({ STUDIO_COUTURE_IA_API_KEY: 'cle-de-test' })).toBeNull();
    const config = lireConfigIa({
      STUDIO_COUTURE_IA_API_KEY: 'cle-de-test',
      STUDIO_COUTURE_IA_BASE_URL: 'https://exemple.invalid/api/',
      STUDIO_COUTURE_IA_MODELE: 'modele-de-test'
    });
    expect(config).toEqual({ apiKey: 'cle-de-test', baseUrl: 'https://exemple.invalid/api', modele: 'modele-de-test' });
    expect(lireConfigIa({ STUDIO_COUTURE_IA_API_KEY: 'x', STUDIO_COUTURE_IA_BASE_URL: 'pas une url', STUDIO_COUTURE_IA_MODELE: 'm' })).toBeNull();
  });
});

describe('creerClientAnthropique — double en-tête d’authentification, échec propre', () => {
  // Clé entièrement fictive, propre à ce fichier de test. Les assertions
  // comparent par booléens pour ne jamais afficher sa valeur en cas d'échec.
  const CLE_TEST = 'cle-fictive-reservee-aux-tests';
  const MARQUEUR_REPONSE_BRUTE = 'marqueur-reponse-brute-a-ne-jamais-afficher';
  const config: ConfigIa = { apiKey: CLE_TEST, baseUrl: 'https://exemple.invalid/api', modele: 'modele-de-test' };

  it('envoie la même clé dans x-api-key ET dans Authorization: Bearer', async () => {
    let urlRecue = '';
    let methodeRecue = '';
    let enTetesRecus: Record<string, string> = {};
    const fauxFetch = vi.fn(async (url: unknown, init?: { method?: string; headers?: Record<string, string> }) => {
      urlRecue = String(url);
      methodeRecue = init?.method ?? '';
      enTetesRecus = init?.headers ?? {};
      return {
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: '{"largeurBasPieceCm": 30}' }] })
      };
    }) as unknown as typeof fetch;

    const client = creerClientAnthropique(config, fauxFetch);
    const texte = await client.genererTexte('système', 'utilisateur', new AbortController().signal);

    expect(texte).toBe('{"largeurBasPieceCm": 30}');
    expect(urlRecue).toBe('https://exemple.invalid/api/v1/messages');
    expect(methodeRecue).toBe('POST');
    // Présence des deux en-têtes, même clé des deux côtés (comparaisons booléennes).
    expect(typeof enTetesRecus['x-api-key'] === 'string' && enTetesRecus['x-api-key'].length > 0).toBe(true);
    expect(enTetesRecus['x-api-key'] === CLE_TEST).toBe(true);
    expect(enTetesRecus['authorization'] === `Bearer ${CLE_TEST}`).toBe(true);
    expect(enTetesRecus['authorization'] === `Bearer ${enTetesRecus['x-api-key']}`).toBe(true);
  });

  it('échec du serveur : ni la clé ni la réponse brute dans le message de repli', async () => {
    const fauxFetchEchec = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ erreur: `${MARQUEUR_REPONSE_BRUTE} ${CLE_TEST}` }),
      text: async () => `${MARQUEUR_REPONSE_BRUTE} ${CLE_TEST}`
    })) as unknown as typeof fetch;

    const client = creerClientAnthropique(config, fauxFetchEchec);
    let messageErreur = '';
    try {
      await client.genererTexte('système', 'utilisateur', new AbortController().signal);
    } catch (e) {
      messageErreur = e instanceof Error ? e.message : String(e);
    }
    expect(messageErreur.length > 0).toBe(true);
    expect(messageErreur.includes(CLE_TEST)).toBe(false);
    expect(messageErreur.includes(MARQUEUR_REPONSE_BRUTE)).toBe(false);

    // De bout en bout : le résultat de repli ne contient ni clé ni réponse brute.
    const r = await suggererOptionsModele('pantalon ample', {
      env: {
        STUDIO_COUTURE_IA_API_KEY: CLE_TEST,
        STUDIO_COUTURE_IA_BASE_URL: 'https://exemple.invalid/api',
        STUDIO_COUTURE_IA_MODELE: 'modele-de-test'
      },
      fetchFn: fauxFetchEchec
    });
    expect(r).toEqual({ statut: 'echec' });
    const serialise = JSON.stringify(r);
    expect(serialise.includes(CLE_TEST)).toBe(false);
    expect(serialise.includes(MARQUEUR_REPONSE_BRUTE)).toBe(false);
  });
});

describe('LimiteurSuggestionsIa — limite par atelier', () => {
  it('bloque après le maximum par atelier, indépendamment des autres ateliers', () => {
    const limiteur = new LimiteurSuggestionsIa(2, 60_000);
    expect(limiteur.autoriser('atelier-a', 1_000)).toBe(true);
    expect(limiteur.autoriser('atelier-a', 2_000)).toBe(true);
    expect(limiteur.autoriser('atelier-a', 3_000)).toBe(false);
    expect(limiteur.autoriser('atelier-b', 3_000)).toBe(true);
    expect(limiteur.autoriser('atelier-a', 62_000)).toBe(true); // fenêtre écoulée
  });
});

describe('réponse du modèle configuré — blocs texte seuls, budget et délai (faits mesurés)', () => {
  it('constantes : max_tokens au moins 1 500 et délai de 30 secondes', () => {
    expect(MAX_TOKENS_IA).toBeGreaterThanOrEqual(1500);
    expect(DELAI_IA_DEFAUT_MS).toBe(30_000);
  });

  it('ignore redacted_thinking / thinking et ne lit que le bloc text', () => {
    const corps = {
      content: [
        { type: 'redacted_thinking', data: 'reflexion-chiffree-sans-texte' },
        { type: 'thinking', thinking: 'réflexion à ne pas lire' },
        { type: 'text', text: '{"modele":"pantalon_large","options":{}}' }
      ]
    };
    expect(extraireTexteReponse(corps)).toBe('{"modele":"pantalon_large","options":{}}');
  });

  it('aucun bloc texte exploitable : erreur générique de repli, jamais de crash ni de réflexion lue', () => {
    expect(() => extraireTexteReponse({ content: [{ type: 'redacted_thinking', data: 'x' }] })).toThrow('Assistant indisponible.');
    expect(() => extraireTexteReponse({ content: [{ type: 'thinking', thinking: 'x' }] })).toThrow('Assistant indisponible.');
    expect(() => extraireTexteReponse({ content: [] })).toThrow('Assistant indisponible.');
    expect(() => extraireTexteReponse(null)).toThrow('Assistant indisponible.');
    expect(() => extraireTexteReponse({})).toThrow('Assistant indisponible.');
  });

  it('le client envoie max_tokens >= 1 500 sur /v1/messages et lit le texte après la réflexion', async () => {
    let corpsRecu: Record<string, unknown> = {};
    const fauxFetch = vi.fn(async (_url: unknown, init?: { body?: string }) => {
      corpsRecu = JSON.parse(init?.body ?? '{}') as Record<string, unknown>;
      return {
        ok: true,
        json: async () => ({
          content: [
            { type: 'redacted_thinking', data: 'consomme-le-budget' },
            { type: 'text', text: '{"largeurBasPieceCm": 30}' }
          ]
        })
      };
    }) as unknown as typeof fetch;
    const client = creerClientAnthropique({ apiKey: 'cle-fictive', baseUrl: 'https://exemple.invalid/api', modele: 'modele-de-test' }, fauxFetch);
    await expect(client.genererTexte('système', 'utilisateur', new AbortController().signal)).resolves.toBe('{"largeurBasPieceCm": 30}');
    expect(typeof corpsRecu['max_tokens'] === 'number' && (corpsRecu['max_tokens'] as number) >= 1500).toBe(true);
  });

  it('réflexion seule, sans bloc texte : suggererOptionsModele répond echec, sans crash', async () => {
    const fauxFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ type: 'redacted_thinking', data: 'que-de-la-reflexion' }] })
    })) as unknown as typeof fetch;
    const r = await suggererOptionsModele('pantalon ample', {
      env: {
        STUDIO_COUTURE_IA_API_KEY: 'cle-fictive',
        STUDIO_COUTURE_IA_BASE_URL: 'https://exemple.invalid/api',
        STUDIO_COUTURE_IA_MODELE: 'modele-de-test'
      },
      fetchFn: fauxFetch
    });
    expect(r).toEqual({ statut: 'echec' });
  });

  it('le client envoie la photo en bloc image base64 (media_type + data), puis le texte', async () => {
    let corpsRecu: { messages?: { content?: unknown }[] } = {};
    const fauxFetch = vi.fn(async (_url: unknown, init?: { body?: string }) => {
      corpsRecu = JSON.parse(init?.body ?? '{}') as typeof corpsRecu;
      return { ok: true, json: async () => ({ content: [{ type: 'text', text: '{"modele":"pantalon_large","options":{}}' }] }) };
    }) as unknown as typeof fetch;
    const client = creerClientAnthropique({ apiKey: 'cle-fictive', baseUrl: 'https://exemple.invalid/api', modele: 'modele-de-test' }, fauxFetch);
    await client.genererAvecImage!('système', 'décris', { mediaType: 'image/jpeg', donneesBase64: 'QUJD' }, new AbortController().signal);
    expect(corpsRecu.messages?.[0]?.content).toEqual([
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' } },
      { type: 'text', text: 'décris' }
    ]);
  });
});

function fauxClientReconnaissance(reponse: string | Error, avecImage = true): ClientIa {
  const generer = vi.fn(async () => {
    if (reponse instanceof Error) throw reponse;
    return reponse;
  });
  const client: ClientIa = { genererTexte: generer };
  if (avecImage) client.genererAvecImage = generer;
  return client;
}

describe('reconnaissance — prompt construit depuis le registre', () => {
  it('expose exactement les trois modèles, leurs options, hors_catalogue et illisible', () => {
    const systeme = construireSystemeReconnaissance();
    expect(systeme).toContain('"pantalon_large"');
    expect(systeme).toContain('"robe_fourreau"');
    expect(systeme).toContain('"jupe_droite"');
    expect(systeme).toContain('"largeurBasPieceCm"');
    expect(systeme).toContain('"encolure"');
    expect(systeme).toContain('"fermetureDos"');
    expect(systeme).toContain('hors_catalogue');
    expect(systeme).toContain('illisible');
    expect(systeme).toContain('aucune option');
  });
});

describe('validerReconnaissance — schéma strict ramené au registre', () => {
  it('pantalon : valeurs ramenées dans les plages, clés inconnues ignorées', () => {
    expect(
      validerReconnaissance('{"modele":"pantalon_large","options":{"largeurBasPieceCm":55,"profondeurPliCm":5,"tourTailleCm":82}}')
    ).toEqual({ modele: 'pantalon_large', options: { largeurBasPieceCm: 40, profondeurPliCm: 5 } });
  });

  it('robe : choix vérifiés dans la liste, case booléenne convertie, choix inconnu ignoré', () => {
    expect(
      validerReconnaissance({ modele: 'robe_fourreau', options: { encolure: 'fendue_v', manches: 'manche_longue', fermetureDos: true } })
    ).toEqual({ modele: 'robe_fourreau', options: { encolure: 'fendue_v', fermetureDos: 'glissiere' } });
    expect(validerReconnaissance({ modele: 'robe_fourreau', options: { fermetureDos: false } })).toEqual({
      modele: 'robe_fourreau',
      options: {}
    });
  });

  it('jupe : aucune option exposée, toujours {} même si le modèle en propose', () => {
    expect(validerReconnaissance({ modele: 'jupe_droite', options: { longueur: 60 } })).toEqual({ modele: 'jupe_droite', options: {} });
  });

  it('hors catalogue et illisible sont explicites ; un modèle inconnu est refusé, jamais substitué', () => {
    expect(validerReconnaissance('{"modele":"hors_catalogue"}')).toEqual({ modele: 'hors_catalogue', options: {} });
    expect(validerReconnaissance('{"modele":"illisible"}')).toEqual({ modele: 'illisible', options: {} });
    expect(() => validerReconnaissance('{"modele":"veste","options":{}}')).toThrow();
    expect(() => validerReconnaissance('{"modele":"chemise"}')).toThrow();
    expect(() => validerReconnaissance('une veste très chic')).toThrow();
    expect(() => validerReconnaissance('{"options":{}}')).toThrow();
  });
});

describe('reconnaitreModele — faux client, aucun réseau', () => {
  it('reconnaît les trois modèles depuis un texte', async () => {
    expect(
      await reconnaitreModele({ type: 'texte', texte: 'un pantalon très ample' }, { client: fauxClientReconnaissance('{"modele":"pantalon_large","options":{"largeurBasPieceCm":36}}') })
    ).toEqual({ statut: 'ok', modele: 'pantalon_large', options: { largeurBasPieceCm: 36 } });
    expect(
      await reconnaitreModele({ type: 'texte', texte: 'une robe près du corps sans manches' }, { client: fauxClientReconnaissance('{"modele":"robe_fourreau","options":{"manches":"sans_manches"}}') })
    ).toEqual({ statut: 'ok', modele: 'robe_fourreau', options: { manches: 'sans_manches' } });
    expect(
      await reconnaitreModele({ type: 'texte', texte: 'une jupe droite simple' }, { client: fauxClientReconnaissance('{"modele":"jupe_droite","options":{}}') })
    ).toEqual({ statut: 'ok', modele: 'jupe_droite', options: {} });
  });

  it('hors catalogue : statut explicite, sans repli vers un autre modèle', async () => {
    const r = await reconnaitreModele({ type: 'texte', texte: 'une veste cintrée' }, { client: fauxClientReconnaissance('{"modele":"hors_catalogue"}') });
    expect(r).toEqual({ statut: 'hors_catalogue' });
  });

  it('illisible : statut explicite', async () => {
    const r = await reconnaitreModele({ type: 'texte', texte: 'photo floue' }, { client: fauxClientReconnaissance('{"modele":"illisible"}') });
    expect(r).toEqual({ statut: 'illisible' });
  });

  it('panne et délai dépassé : statut echec, jamais d’exception', async () => {
    expect(await reconnaitreModele({ type: 'texte', texte: 'un pantalon ample' }, { client: fauxClientReconnaissance(new Error('panne')) })).toEqual({ statut: 'echec' });
    const lent: ClientIa = { genererTexte: () => new Promise((resolve) => setTimeout(() => resolve('{"modele":"jupe_droite"}'), 500)) };
    expect(await reconnaitreModele({ type: 'texte', texte: 'une jupe droite' }, { client: lent, delaiMs: 20 })).toEqual({ statut: 'echec' });
  });

  it('réponse non conforme et non configuré : statuts explicites', async () => {
    expect(await reconnaitreModele({ type: 'texte', texte: 'un pantalon' }, { client: fauxClientReconnaissance('je pense à un pantalon') })).toEqual({ statut: 'invalide' });
    expect(await reconnaitreModele({ type: 'texte', texte: 'un pantalon' }, { env: {} })).toEqual({ statut: 'non_configuree' });
  });

  it('photo : l’image part telle quelle au modèle, la réponse est ramenée au registre', async () => {
    const client = fauxClientReconnaissance('{"modele":"robe_fourreau","options":{"encolure":"ronde"}}');
    const r = await reconnaitreModele({ type: 'photo', image: { mediaType: 'image/png', donneesBase64: 'QUJD' } }, { client });
    expect(r).toEqual({ statut: 'ok', modele: 'robe_fourreau', options: { encolure: 'ronde' } });
    const appels = vi.mocked(client.genererAvecImage!).mock.calls;
    expect(appels).toHaveLength(1);
    expect(appels[0]![2]).toEqual({ mediaType: 'image/png', donneesBase64: 'QUJD' });
  });

  it('photo avec un client sans vision : statut echec, jamais d’exception', async () => {
    const client = fauxClientReconnaissance('{"modele":"pantalon_large"}', false);
    expect(await reconnaitreModele({ type: 'photo', image: { mediaType: 'image/jpeg', donneesBase64: 'QUJD' } }, { client })).toEqual({ statut: 'echec' });
  });
});

