import { beforeEach, describe, expect, it } from 'vitest';
import { autoriserPdfDemo, FENETRE_PDF_DEMO_MS, LIMITE_PDF_DEMO, reinitialiserLimitePdfDemo } from './limite-demo';

describe('limitation PDF de la démo (en mémoire)', () => {
  beforeEach(() => reinitialiserLimitePdfDemo());

  it('autorise 30 générations par minute puis refuse', () => {
    for (let i = 0; i < LIMITE_PDF_DEMO; i++) expect(autoriserPdfDemo('10.0.0.1', 1_000_000)).toBe(true);
    expect(autoriserPdfDemo('10.0.0.1', 1_000_000)).toBe(false);
  });

  it('isole les IP et rouvre après la fenêtre', () => {
    for (let i = 0; i < LIMITE_PDF_DEMO; i++) autoriserPdfDemo('10.0.0.1', 0);
    expect(autoriserPdfDemo('10.0.0.2', 0)).toBe(true);
    expect(autoriserPdfDemo('10.0.0.1', FENETRE_PDF_DEMO_MS + 1)).toBe(true);
  });
});
