import { describe, expect, it } from 'vitest';
import { fr } from './fr';
import { en } from './en';
import { cheminInterneSur, formatCm, formatDate, t } from './index';
import { lireLangue } from './locales';

describe('i18n FR/EN', () => {
  it('dictionnaire anglais complet : mêmes clés que le français, aucune vide', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
    for (const [cle, valeur] of Object.entries(fr)) {
      expect(valeur.trim().length, `fr ${cle}`).toBeGreaterThan(0);
      expect(en[cle as keyof typeof fr]?.trim().length, `en ${cle}`).toBeGreaterThan(0);
    }
  });

  it('t interpole les paramètres et le français est le défaut', () => {
    expect(t('fr', 'tableau.bonjour', { prenom: 'Awa' })).toBe('Bonjour, Awa');
    expect(t('en', 'tableau.bonjour', { prenom: 'Awa' })).toBe('Hello, Awa');
    expect(t(undefined as never, 'commun.ou')).toBe('ou');
  });

  it('langue du cookie : seule « en » active l’anglais', () => {
    expect(lireLangue('en')).toBe('en');
    expect(lireLangue('fr')).toBe('fr');
    expect(lireLangue('xx')).toBe('fr');
    expect(lireLangue(null)).toBe('fr');
    expect(lireLangue(undefined)).toBe('fr');
  });

  it('redirection de retour : chemins internes uniquement', () => {
    expect(cheminInterneSur('/demo?x=1')).toBe('/demo?x=1');
    expect(cheminInterneSur('https://exemple.com')).toBe('/');
    expect(cheminInterneSur('//exemple.com')).toBe('/');
    expect(cheminInterneSur('/\\exemple.com')).toBe('/');
    expect(cheminInterneSur('')).toBe('/');
    expect(cheminInterneSur(null)).toBe('/');
  });

  it('formats nombres et dates selon la langue, centimètres inchangés', () => {
    expect(formatCm('fr', 82.5)).toBe('82,5');
    expect(formatCm('en', 82.5)).toBe('82.5');
    expect(formatDate('fr', '2026-11-04T12:00:00')).toContain('nov');
    expect(formatDate('en', '2026-11-04T12:00:00')).toContain('Nov');
  });

  it('mentions honnêtes : même sens dans les deux langues', () => {
    expect(fr['commun.brouillonNonValide']).toBe('Brouillon non validé');
    expect(en['commun.brouillonNonValide']).toBe('Unvalidated draft');
    expect(en['salle.volumeIndicatif']).toContain('not a drape simulation');
    expect(fr['salle.volumeIndicatif']).toContain('pas une simulation de drapé');
  });
});
