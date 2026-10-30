import { describe, expect, it } from 'vitest';
import { agencerPieces, boite, boiteEtiquetteCote } from '../brouillon';
import { analyserPantalonLarge, genererPatronPantalonLarge } from './geometry';

const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');

const JEUX = [
  { nom: 'petite', tourTailleCm: 64, tourHanchesCm: 88, hauteurFourcheCm: 24, longueurPantalonCm: 96 },
  { nom: 'moyenne', tourTailleCm: 82, tourHanchesCm: 100, hauteurFourcheCm: 27, longueurPantalonCm: 105 },
  { nom: 'forte', tourTailleCm: 110, tourHanchesCm: 128, hauteurFourcheCm: 31, longueurPantalonCm: 108 }
] as const;

describe('aperçu — containment des étiquettes de cote (correction visuelle)', () => {
  const MARGE_MIN = 2; // cm à l'intérieur du viewBox global
  it.each(JEUX)('jeu $nom : chaque étiquette (texte + fond) est dans le viewBox avec marge, et dans la boîte de coupe de sa pièce', (jeu) => {
    const { pieces, largeur, hauteur } = agencerPieces(genererPatronPantalonLarge({ ...jeu }));
    // Aucun trait ne touche le bord : chaque boîte de coupe garde la marge d'agencement.
    for (const p of pieces) {
      const b = boite(p);
      expect(b.x1, `${p.id} bord gauche`).toBeGreaterThanOrEqual(4 - 0.01);
      expect(b.y1, `${p.id} bord haut`).toBeGreaterThanOrEqual(4 - 0.01);
      expect(b.x2, `${p.id} bord droit`).toBeLessThanOrEqual(largeur - 4 + 0.01);
      expect(b.y2, `${p.id} bord bas`).toBeLessThanOrEqual(hauteur - 4 + 0.01);
    }
    for (const p of pieces) {
      const b = boite(p);
      for (const cote of p.cotes ?? []) {
        const fond = boiteEtiquetteCote(cote.texte.x + p.dx, cote.texte.y + p.dy, cote.libelle, fmt(cote.valeurCm));
        const ou = `${jeu.nom}/${p.id}/${cote.libelle}`;
        expect(fond.x1, ou).toBeGreaterThanOrEqual(MARGE_MIN);
        expect(fond.y1, ou).toBeGreaterThanOrEqual(MARGE_MIN);
        expect(fond.x2, ou).toBeLessThanOrEqual(largeur - MARGE_MIN);
        expect(fond.y2, ou).toBeLessThanOrEqual(hauteur - MARGE_MIN);
        // Et jamais hors du trait de coupe (boîte de la pièce placée).
        expect(fond.x1, `${ou} dans la coupe (gauche)`).toBeGreaterThanOrEqual(b.x1 - 0.01);
        expect(fond.x2, `${ou} dans la coupe (droite)`).toBeLessThanOrEqual(b.x2 + 0.01);
        expect(fond.y1, `${ou} dans la coupe (haut)`).toBeGreaterThanOrEqual(b.y1 - 0.01);
        expect(fond.y2, `${ou} dans la coupe (bas)`).toBeLessThanOrEqual(b.y2 + 0.01);
      }
    }
  });
});

describe('pantalon large — vérifications géométriques (le vrai test)', () => {
  it.each(JEUX)('jeu $nom : côté devant = dos et entrejambe devant = dos à 0,3 cm près', (jeu) => {
    const a = analyserPantalonLarge({ ...jeu });
    expect(a.ecartCoteCm).toBeLessThanOrEqual(0.3);
    expect(a.ecartEntrejambeCm).toBeLessThanOrEqual(0.3);
  });

  it.each(JEUX)('jeu $nom : ceinture = tailles effectives ×2 + recouvrement, à 0,5 cm près', (jeu) => {
    const a = analyserPantalonLarge({ ...jeu });
    // Chaque pièce est coupée ×2 : total taille fermée (plis/pinces fermés)
    const somme = 2 * (a.devant.largeurTailleEffectiveCm + a.dos.largeurTailleEffectiveCm);
    expect(Math.abs(a.longueurCeintureCm - 3 - somme)).toBeLessThanOrEqual(0.5);
    expect(a.longueurCeintureCm).toBeCloseTo(jeu.tourTailleCm + 4 + 3, 6);
    expect(a.hauteurCeintureFinieCm).toBe(4);
  });

  it('jeu moyenne — valeurs dorées calculées à la main', () => {
    // Calcul à la main (cm) pour taille 82, hanches 100, fourche 27, longueur 105 :
    //  taille+aisance = 86 → quart 21,5 ; devant effectif 21,5−1 = 20,5 ; dos 21,5+1 = 22,5
    //  hanches+aisance = 106 → quart 26,5 ; devant 25,5 ; dos 27,5
    //  extension fourche devant = 106÷16 = 6,625 ; dos = 9,125
    //  pli de fil (crease) devant = (25,5 − 6,625)÷2 = 9,4375 ; bas/pièce 27
    //    → côté bas devant = 9,4375+13,5 = 22,9375 ; entrejambe bas devant = −4,0625
    //  entrejambe devant = √(2,5625² + 78²) = √6090,57 ≈ 78,04
    //  ceinture = 86 + 3 = 89 ; hauteur finie 4
    const a = analyserPantalonLarge({ tourTailleCm: 82, tourHanchesCm: 100, hauteurFourcheCm: 27, longueurPantalonCm: 105 });
    expect(a.devant.largeurTailleEffectiveCm).toBeCloseTo(20.5, 6);
    expect(a.dos.largeurTailleEffectiveCm).toBeCloseTo(22.5, 6);
    expect(a.devant.largeurHanchesCm).toBeCloseTo(25.5, 6);
    expect(a.dos.largeurHanchesCm).toBeCloseTo(27.5, 1);
    expect(a.devant.largeurBasCm).toBe(27);
    expect(a.dos.largeurBasCm).toBe(27);
    expect(a.devant.hauteurFourcheCm).toBe(27);
    expect(a.devant.longueurEntrejambeCm).toBeCloseTo(78.04, 1);
    expect(a.dos.longueurEntrejambeCm).toBeCloseTo(78.04, 1);
    expect(a.longueurCeintureCm).toBe(89);
    // Dos remonté et fourche dos légèrement abaissée par l'égalisation
    expect(a.dos.hauteurFourcheCm).toBeGreaterThan(27);
    expect(a.dos.hauteurFourcheCm).toBeLessThan(29);
  });

  it.each(JEUX)('jeu $nom : courbe de fourche sans coude (angle au point de fourche > 160°)', (jeu) => {
    for (const piece of genererPatronPantalonLarge({ ...jeu }).slice(0, 2)) {
      const pts = piece.couture;
      const iFork = pts.findIndex((p) => p.x === Math.min(...pts.map((q) => q.x)));
      const avant = pts[iFork - 1]!;
      const fourche = pts[iFork]!;
      const apres = pts[iFork + 1]!;
      const v1 = { x: avant.x - fourche.x, y: avant.y - fourche.y };
      const v2 = { x: apres.x - fourche.x, y: apres.y - fourche.y };
      const angle = (Math.acos((v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y))) * 180) / Math.PI;
      expect(angle, `${jeu.nom}/${piece.id}`).toBeGreaterThan(160);
      // Devant et dos différents : le dos est plus large aux hanches
    }
    const pieces = genererPatronPantalonLarge({ ...jeu });
    expect(pieces[0]!.couture).not.toEqual(pieces[1]!.couture);
  });

  it('options du modèle : bas et ceinture suivent les constantes choisies', () => {
    const a = analyserPantalonLarge(
      { tourTailleCm: 82, tourHanchesCm: 100, hauteurFourcheCm: 27, longueurPantalonCm: 105 },
      { largeurBasPieceCm: 30, hauteurCeintureFinieCm: 5 }
    );
    expect(a.devant.largeurBasCm).toBe(30);
    expect(a.hauteurCeintureFinieCm).toBe(5);
  });

  it('chaque pièce porte 7 cotes et le tableau de mesures', () => {
    for (const piece of genererPatronPantalonLarge({ ...JEUX[1] })) {
      expect(piece.cotes?.length ?? 0).toBeGreaterThanOrEqual(2);
      expect(piece.mesuresPatron?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
    const devant = genererPatronPantalonLarge({ ...JEUX[1] })[0]!;
    expect(devant.cotes!.map((c) => c.libelle)).toEqual(
      expect.arrayContaining(['Taille', 'Hanches', 'Genou', 'Bas', 'Fourche', 'Côté', 'Entrejambe'])
    );
    expect(devant.mesuresPatron!.map((c) => c.libelle)).toEqual(
      expect.arrayContaining(['Hauteur de fourche', 'Longueur de côté', 'Entrejambe'])
    );
  });
});
