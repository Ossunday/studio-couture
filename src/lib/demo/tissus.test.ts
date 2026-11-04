import { describe, expect, it } from 'vitest';
import { t } from '../i18n';
import { COULEURS_TISSU, MATIERES, couleurTissu } from './tissus';

describe('tissus de la salle d’essayage', () => {
  it('propose 6 couleurs et 3 matières, sans image externe', () => {
    expect(COULEURS_TISSU.map((c) => t('fr', c.libelleCle))).toEqual(['Ivoire', 'Sable', 'Terracotta', 'Vert profond', 'Bleu denim', 'Noir']);
    expect(COULEURS_TISSU.map((c) => c.libelleCle)).toEqual(['tissu.ivoire', 'tissu.sable', 'tissu.terracotta', 'tissu.vert-profond', 'tissu.bleu-denim', 'tissu.noir']);
    expect(MATIERES.map((m) => m.id)).toEqual(['denim', 'lin', 'satin']);
    expect(MATIERES.map((m) => m.libelleCle)).toEqual(['matiere.denim', 'matiere.lin', 'matiere.satin']);
    for (const c of COULEURS_TISSU) expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it('retombe sur la première couleur si l’identifiant est inconnu', () => {
    expect(couleurTissu('inconnue').id).toBe('ivoire');
    expect(couleurTissu('noir').hex).toBe('#23201d');
  });
});
