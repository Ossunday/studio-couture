import { describe, expect, it } from 'vitest';
import { preparerCartePatron, preparerPatronGenerique } from '$lib/design/patron-cote';
import { t } from '$lib/i18n';
import { nomPiece } from './brouillon';
import { genererPdfPatron } from './pdf';
import {
  LISTE_MODELES,
  ModeleIndisponibleError,
  REGISTRE_MODELES,
  estModelePatron,
  exigerEntreeModele,
  texteResumeMesures,
  type ModelePatron
} from './registre';
import { genererPieces, validerMesuresPatron } from './saisie-patron';

const CLES_PANTALON_INTERDITES = ['cote.fourche', 'cote.entrejambe', 'cote.genou'];

describe('registre des modèles — paramétré par modèle', () => {
  it.each(LISTE_MODELES.map((e) => [e.id, e] as const))('%s : création, titre, pièces, cotes, vignette et PDF', (_id, entree) => {
    const preset = entree.presets.find((p) => p.id === 'moyenne') ?? entree.presets[0]!;
    const mesures = { ...preset.valeurs };

    expect(t('fr', entree.titreCle).length).toBeGreaterThan(2);
    expect(entree.mesures.length).toBe(entree.champs.length);

    const pieces = genererPieces(entree.id, mesures);
    expect(pieces.length).toBeGreaterThanOrEqual(2);
    for (const piece of pieces) {
      expect(nomPiece('fr', piece)).toMatch(/×\d/);
      expect(piece.cotes?.length ?? 0).toBeGreaterThan(0);
      expect(piece.mesuresPatron?.length ?? 0).toBeGreaterThan(0);
      for (const pt of [...piece.couture, ...piece.coupe]) {
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
      }
    }

    const vignette = preparerPatronGenerique(entree, mesures);
    expect(vignette.pieces).toHaveLength(pieces.length);
    expect(vignette.largeur).toBeGreaterThan(0);
    expect(vignette.hauteur).toBeGreaterThan(0);
    expect(vignette.titre.toLowerCase()).toContain(t('fr', entree.titreCle).toLowerCase());

    const pdf = genererPdfPatron(t('fr', entree.titreCle), 'Test registre', pieces).toString('latin1');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('BROUILLON NON VALIDE');

    const carte = preparerCartePatron(entree, mesures);
    expect(carte.lignes.length).toBeGreaterThan(0);
  });

  it('la jupe droite est une jupe partout : aucun libellé de pantalon', () => {
    const entree = REGISTRE_MODELES.jupe_droite;
    const preset = entree.presets.find((p) => p.id === 'moyenne')!;
    const pieces = genererPieces('jupe_droite', { ...preset.valeurs });
    const cles = pieces.flatMap((p) => [...(p.cotes ?? []).map((c) => c.libelleCle), ...(p.mesuresPatron ?? []).map((m) => m.libelleCle)]);
    for (const interdit of CLES_PANTALON_INTERDITES) expect(cles).not.toContain(interdit);
    expect(pieces.map((p) => nomPiece('fr', p)).join(' ')).not.toMatch(/pantalon/i);
    expect(texteResumeMesures(entree, { ...preset.valeurs })).toBe('Taille 76 · Hanches 100 · Long. 60');
    const carte = preparerCartePatron(entree, { ...preset.valeurs });
    expect(carte.mesuresPantalon).toBeNull();
    expect(carte.generique).not.toBeNull();
  });

  it('le pantalon garde son dessin spécialisé, sans contaminer les autres modèles', () => {
    const entree = REGISTRE_MODELES.pantalon_large;
    const preset = entree.presets.find((p) => p.id === 'moyenne')!;
    const carte = preparerCartePatron(entree, { ...preset.valeurs });
    expect(carte.mesuresPantalon).not.toBeNull();
    expect(carte.generique).toBeNull();
  });

  it('un identifiant inconnu est refusé, jamais remplacé par un autre modèle', () => {
    expect(estModelePatron('veste')).toBe(false);
    expect(estModelePatron('')).toBe(false);
    expect(estModelePatron(null)).toBe(false);
    expect(() => exigerEntreeModele('veste')).toThrow(ModeleIndisponibleError);
    expect(() => exigerEntreeModele('veste')).toThrow('validation.modeleIndisponibleDetail');
    expect(() => validerMesuresPatron('veste' as ModelePatron, () => '90')).toThrow('validation.modeleIndisponibleDetail');
    expect(() => genererPieces('veste' as ModelePatron, {})).toThrow('validation.modeleIndisponibleDetail');
  });
});
