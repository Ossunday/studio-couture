import { describe, expect, it } from 'vitest';
import { RepositoryMemoire } from './repository-memory';
import {
  LimiteurInscriptions,
  inscriptionOuverte,
  inscrireAtelier,
  piegeRempli,
  validerInscription,
  type InscriptionBrute
} from './inscription';

const base: InscriptionBrute = {
  nomAtelier: 'Atelier Awa',
  nom: 'Awa Diallo',
  email: 'Awa@Atelier.COM',
  motDePasse: 'une phrase longue et simple',
  confirmation: 'une phrase longue et simple',
  consentement: true,
  piege: ''
};

describe('validerInscription', () => {
  it('normalise l’e-mail en minuscules et accepte un mot de passe de 12 caractères', () => {
    const v = validerInscription({ ...base, motDePasse: '123456789012', confirmation: '123456789012' });
    expect(v.email).toBe('awa@atelier.com');
    expect(v.nomAtelier).toBe('Atelier Awa');
  });

  it('refuse un nom d’atelier hors 2–80 caractères', () => {
    expect(() => validerInscription({ ...base, nomAtelier: 'A' })).toThrow('validation.nomAtelierBornes');
    expect(() => validerInscription({ ...base, nomAtelier: 'x'.repeat(81) })).toThrow('validation.nomAtelierBornes');
  });

  it('refuse un mot de passe de moins de 12 caractères, sans règle de composition', () => {
    expect(() => validerInscription({ ...base, motDePasse: 'court', confirmation: 'court' })).toThrow('validation.motDePasse12');
    expect(() => validerInscription({ ...base, motDePasse: 'motdepasse1', confirmation: 'motdepasse1' })).toThrow('validation.motDePasse12');
  });

  it('refuse une confirmation différente, un e-mail invalide et l’absence de consentement', () => {
    expect(() => validerInscription({ ...base, confirmation: 'autre phrase longue' })).toThrow('validation.motsDePasseDifferents');
    expect(() => validerInscription({ ...base, email: 'pas-un-email' })).toThrow('validation.identifiantEmail');
    expect(() => validerInscription({ ...base, email: '+22901000000' })).toThrow('validation.identifiantEmail');
    expect(() => validerInscription({ ...base, consentement: false })).toThrow('validation.consentementCoche');
  });

  it('détecte le champ piège rempli', () => {
    expect(piegeRempli(base)).toBe(false);
    expect(piegeRempli({ ...base, piege: 'http://spam.exemple' })).toBe(true);
  });
});

describe('inscriptionOuverte', () => {
  it('est ouverte par défaut et fermée seulement à false', () => {
    expect(inscriptionOuverte({} as NodeJS.ProcessEnv)).toBe(true);
    expect(inscriptionOuverte({ INSCRIPTION_OUVERTE: 'true' } as NodeJS.ProcessEnv)).toBe(true);
    expect(inscriptionOuverte({ INSCRIPTION_OUVERTE: 'false' } as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe('LimiteurInscriptions', () => {
  it('autorise 5 créations par heure et par IP, refuse la 6e, isole les IP', () => {
    const l = new LimiteurInscriptions();
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(l.autoriser('1.2.3.4', t0 + i)).toBe(true);
      l.enregistrer('1.2.3.4', t0 + i);
    }
    expect(l.autoriser('1.2.3.4', t0 + 10)).toBe(false);
    expect(l.autoriser('5.6.7.8', t0 + 10)).toBe(true);
    expect(l.autoriser('1.2.3.4', t0 + 60 * 60 * 1000 + 11)).toBe(true);
  });
});

describe('inscrireAtelier — doublon et isolation entre ateliers', () => {
  it('crée deux ateliers qui ne voient jamais les clientes l’un de l’autre', async () => {
    const repo = new RepositoryMemoire();
    const a = await inscrireAtelier(repo, base);
    const b = await inscrireAtelier(repo, {
      ...base,
      nomAtelier: 'Atelier Binta',
      nom: 'Binta Sarr',
      email: 'binta@atelier.com'
    });
    expect(a.role).toBe('admin');
    expect(a.atelierId).not.toBe(b.atelierId);
    expect(a.identifiant).toBe('awa@atelier.com');

    const clienteA = await repo.creerCliente(a.atelierId, 'Cliente de Awa');
    const clienteB = await repo.creerCliente(b.atelierId, 'Cliente de Binta');

    expect((await repo.listerClientes(a.atelierId)).map((c) => c.id)).toEqual([clienteA.id]);
    expect((await repo.listerClientes(b.atelierId)).map((c) => c.id)).toEqual([clienteB.id]);
    expect(await repo.trouverCliente(a.atelierId, clienteB.id)).toBeUndefined();
    expect(await repo.trouverCliente(b.atelierId, clienteA.id)).toBeUndefined();
  });

  it('refuse un doublon d’adresse avec le seul message autorisé à fuiter', async () => {
    const repo = new RepositoryMemoire();
    await inscrireAtelier(repo, base);
    await expect(inscrireAtelier(repo, { ...base, email: 'AWA@atelier.com', nomAtelier: 'Autre atelier' })).rejects.toThrow(
      'validation.doublon'
    );
    expect(await repo.compterUtilisatrices()).toBe(1);
  });
});
