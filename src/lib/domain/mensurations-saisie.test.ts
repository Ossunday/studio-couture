import { describe, expect, it } from 'vitest';
import { MessageError, t, traduireErreur } from '../i18n';
import { DEFINITIONS_MENSURATIONS, validerMensurationSaisie } from './mensurations-saisie';

function cleDe(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof MessageError) return e.cle;
    throw e;
  }
  throw new Error('aucune erreur');
}

describe('saisie manuelle des mensurations (cm)', () => {
  it('accepte point et virgule, avec 2 décimales maximum', () => {
    expect(validerMensurationSaisie('tour_taille_cm', '82,5')).toBe(82.5);
    expect(validerMensurationSaisie('tour_taille_cm', ' 82.50 ')).toBe(82.5);
    expect(validerMensurationSaisie('tour_hanches_cm', '100')).toBe(100);
  });
  it('refuse les valeurs non numériques ou hors bornes plausibles', () => {
    expect(cleDe(() => validerMensurationSaisie('tour_taille_cm', 'abc'))).toBe('validation.mesureNombre');
    expect(cleDe(() => validerMensurationSaisie('tour_taille_cm', '8'))).toBe('validation.mesureBornes');
    expect(cleDe(() => validerMensurationSaisie('tour_taille_cm', '500'))).toBe('validation.mesureBornes');
    expect(cleDe(() => validerMensurationSaisie('inconnue_cm', '80'))).toBe('validation.mesurationInconnue');
    // Traduction FR à l’affichage (intention historique des regex).
    try {
      validerMensurationSaisie('tour_taille_cm', 'abc');
    } catch (e) {
      expect(traduireErreur('fr', e)).toMatch(/nombre en centimètres/);
      expect(t('fr', 'validation.mesureBornes', { mesure: 'Tour de taille', min: 40, max: 200 })).toMatch(/plausible entre 40 et 200/);
    }
  });
  it('couvre au minimum taille, hanches, poitrine et longueur de jupe', () => {
    const codes = DEFINITIONS_MENSURATIONS.map((d) => d.code);
    for (const code of ['tour_poitrine_cm', 'tour_taille_cm', 'tour_hanches_cm', 'longueur_jupe_cm']) {
      expect(codes).toContain(code);
    }
    for (const d of DEFINITIONS_MENSURATIONS) expect(d.libelleCle).toBe(`mesure.${d.code}`);
  });
});
