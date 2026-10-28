import { describe, expect, it } from 'vitest';
import { normaliserIdentifiant, validerMotDePasse } from './identifiant';

describe('identifiant atelier (e-mail ou téléphone)', () => {
  it('normalise un e-mail en minuscules', () => {
    expect(normaliserIdentifiant('  Awa@Exemple.BJ ')).toEqual({ type: 'email', valeur: 'awa@exemple.bj' });
  });
  it('normalise un téléphone béninois avec séparateurs', () => {
    expect(normaliserIdentifiant('+229 96 00 00 00')).toEqual({ type: 'telephone', valeur: '+22996000000' });
  });
  it('rejette un e-mail et un téléphone invalides', () => {
    expect(() => normaliserIdentifiant('awa@exemple')).toThrow(/e-mail invalide/);
    expect(() => normaliserIdentifiant('123')).toThrow(/téléphone invalide/);
  });
  it('exige 10 caractères minimum pour le mot de passe', () => {
    expect(() => validerMotDePasse('court')).toThrow(/10 caractères/);
    expect(() => validerMotDePasse('mot-de-passe-long')).not.toThrow();
  });
});
