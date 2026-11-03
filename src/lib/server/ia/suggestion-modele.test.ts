import { describe, expect, it, vi } from 'vitest';
import {
  LimiteurSuggestionsIa,
  construirePromptUtilisateur,
  lireConfigIa,
  suggererOptionsModele,
  validerSuggestionIa,
  type ClientIa
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
