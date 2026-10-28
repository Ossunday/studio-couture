import { describe, expect, it } from 'vitest';
import { DEFINITIONS_MENSURATIONS, validerMensurationSaisie } from './mensurations-saisie';

describe('saisie manuelle des mensurations (cm)', () => {
  it('accepte point et virgule, avec 2 décimales maximum', () => {
    expect(validerMensurationSaisie('tour_taille_cm', '82,5')).toBe(82.5);
    expect(validerMensurationSaisie('tour_taille_cm', ' 82.50 ')).toBe(82.5);
    expect(validerMensurationSaisie('tour_hanches_cm', '100')).toBe(100);
  });
  it('refuse les valeurs non numériques ou hors bornes plausibles', () => {
    expect(() => validerMensurationSaisie('tour_taille_cm', 'abc')).toThrow(/nombre en centimètres/);
    expect(() => validerMensurationSaisie('tour_taille_cm', '8')).toThrow(/plausible entre 40 et 200/);
    expect(() => validerMensurationSaisie('tour_taille_cm', '500')).toThrow(/plausible entre 40 et 200/);
    expect(() => validerMensurationSaisie('inconnue_cm', '80')).toThrow(/inconnue/);
  });
  it('couvre au minimum taille, hanches, poitrine et longueur de jupe', () => {
    const codes = DEFINITIONS_MENSURATIONS.map((d) => d.code);
    for (const code of ['tour_poitrine_cm', 'tour_taille_cm', 'tour_hanches_cm', 'longueur_jupe_cm']) {
      expect(codes).toContain(code);
    }
  });
});
