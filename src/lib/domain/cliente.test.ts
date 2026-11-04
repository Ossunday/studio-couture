import { describe, expect, it } from 'vitest';
import { validerNomCliente } from './cliente';
import { assertConsentementPhoto } from '../privacy/retention';
import type { Consentement } from './types';

describe('fiche cliente', () => {
  it('valide et nettoie le nom', () => {
    expect(validerNomCliente('  Awa Diop  ')).toBe('Awa Diop');
    expect(() => validerNomCliente('A')).toThrowError(expect.objectContaining({ cle: 'validation.nomClienteBornes' }));
    expect(() => validerNomCliente('   ')).toThrowError(expect.objectContaining({ cle: 'validation.nomClienteBornes' }));
  });
});

describe('consentement photo signé (règle n°8)', () => {
  const actif: Consentement = { id: 'co1', clienteId: 'c1', donneLe: new Date(), usageRenduIa: true, usageEntrainementIa: false };
  it('accepte un consentement actif signé', () => {
    expect(() => assertConsentementPhoto(actif)).not.toThrow();
  });
  it('refuse absent ou révoqué', () => {
    expect(() => assertConsentementPhoto(undefined)).toThrowError(expect.objectContaining({ cle: 'validation.consentementRequis' }));
    expect(() => assertConsentementPhoto({ ...actif, revoqueLe: new Date() })).toThrowError(expect.objectContaining({ cle: 'validation.consentementRevoque' }));
  });
});
