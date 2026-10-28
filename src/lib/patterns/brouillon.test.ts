import { describe, expect, it } from 'vitest';
import { agencerPieces, boite, boitesSeChevauchent, largeurPiece } from './brouillon';
import { genererPdfPatron } from './pdf';
import { genererPatronJupeDroite } from './jupe-droite/geometry';
import { FORMULES_PANTALON_LARGE } from './pantalon-large/formulas';
import { genererPatronPantalonLarge } from './pantalon-large/geometry';
import { validerMesuresPatron } from './saisie-patron';

const JEUX = [
  { nom: 'petite', tourTailleCm: 64, tourHanchesCm: 88, hauteurFourcheCm: 24, longueurPantalonCm: 96 },
  { nom: 'moyenne', tourTailleCm: 82, tourHanchesCm: 100, hauteurFourcheCm: 27, longueurPantalonCm: 105 },
  { nom: 'forte', tourTailleCm: 110, tourHanchesCm: 128, hauteurFourcheCm: 31, longueurPantalonCm: 108 }
] as const;

describe('patron brouillon pantalon large — géométrie', () => {
  it('toutes les formules sont a_valider, sans source inventée', () => {
    for (const f of FORMULES_PANTALON_LARGE) {
      expect(f.statut).toBe('a_valider');
      expect(f.source).toBeNull();
    }
  });

  it.each(JEUX)('jeu $nom : 3 pièces, aucune ne chevauche une autre, dimensions croissantes', (jeu) => {
    const pieces = genererPatronPantalonLarge({ ...jeu });
    expect(pieces.map((p) => p.id)).toEqual(['devant', 'dos', 'ceinture']);
    for (const piece of pieces) {
      // Marges comprises : le trait de coupe est plus grand que le trait de couture.
      expect(Math.max(...piece.coupe.map((p) => p.x))).toBeGreaterThan(Math.max(...piece.couture.map((p) => p.x)));
      for (const pt of [...piece.coupe, ...piece.couture]) {
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
      }
    }
    const { pieces: placees } = agencerPieces(pieces);
    const boites = placees.map(boite);
    for (let i = 0; i < boites.length; i++) {
      for (let j = i + 1; j < boites.length; j++) {
        expect(boitesSeChevauchent(boites[i]!, boites[j]!), `pièces ${i}/${j} (${jeu.nom})`).toBe(false);
      }
    }
    const devant = pieces[0]!;
    expect(largeurPiece(devant)).toBeGreaterThan(jeu.tourHanchesCm / 4); // aisance + marges
  });

  it('les largeurs croissent de la petite à la forte morphologie', () => {
    const largeurs = JEUX.map((jeu) => largeurPiece(genererPatronPantalonLarge({ ...jeu })[0]!));
    expect(largeurs[0]!).toBeLessThan(largeurs[1]!);
    expect(largeurs[1]!).toBeLessThan(largeurs[2]!);
  });

  it('jupe droite : 3 pièces sans chevauchement', () => {
    const pieces = genererPatronJupeDroite({ tourTailleCm: 82, tourHanchesCm: 100, longueurJupeCm: 60 });
    expect(pieces).toHaveLength(3);
    const { pieces: placees } = agencerPieces(pieces);
    const boites = placees.map(boite);
    for (let i = 0; i < boites.length; i++)
      for (let j = i + 1; j < boites.length; j++) expect(boitesSeChevauchent(boites[i]!, boites[j]!)).toBe(false);
  });
});

describe('validation des mesures du patron (message nommant la mesure)', () => {
  it('refuse une valeur hors bornes en nommant la mesure', () => {
    expect(() =>
      validerMesuresPatron('pantalon_large', (code) => ({ tour_taille_cm: '300', tour_hanches_cm: '100', hauteur_fourche_cm: '27', longueur_pantalon_cm: '105' })[code])
    ).toThrow(/Vérifiez : tour de taille/);
  });
  it('refuse une mesure manquante en la nommant', () => {
    expect(() => validerMesuresPatron('jupe_droite', (code) => (code === 'longueur_jupe_cm' ? '' : '90'))).toThrow(/longueur de jupe/);
  });
  it('refuse une fourche incohérente avec la longueur', () => {
    expect(() =>
      validerMesuresPatron('pantalon_large', (code) =>
        ({ tour_taille_cm: '82', tour_hanches_cm: '100', hauteur_fourche_cm: '40', longueur_pantalon_cm: '50' })[code]
      )
    ).toThrow(/hauteur de fourche/);
  });
});

describe('PDF A4 1:1 du brouillon', () => {
  it('produit un PDF multipage avec carré de contrôle de 10 cm (283,5 pt)', () => {
    const pieces = genererPatronPantalonLarge({ ...JEUX[1] });
    const pdf = genererPdfPatron('Pantalon large', 'sans nom', pieces).toString('latin1');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('/Type /Page');
    expect(pdf).toContain('283.46'); // 10 cm en points dans le carré de contrôle
    expect(pdf).toContain('BROUILLON NON VALIDE');
    expect(pdf).toContain('%%EOF');
  });
});
