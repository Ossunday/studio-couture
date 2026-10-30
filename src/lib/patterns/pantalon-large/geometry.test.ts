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

describe('courbe de fourche en J et jambe large (correction après captures)', () => {
  it.each(JEUX)('jeu $nom : hauteur de courbe ≥ 8 cm, dos plus profonde, tangente finale non verticale, raccord > 160°', (jeu) => {
    const a = analyserPantalonLarge({ ...jeu });
    for (const piece of [a.devant, a.dos]) {
      expect(piece.hauteurCourbeFourcheCm).toBeGreaterThanOrEqual(8);
      // Non verticale : nettement inclinée, mais assez proche de l'entrejambe pour rester > 160°.
      expect(piece.tangenteFinaleFourcheDegres).toBeGreaterThan(8);
      expect(piece.tangenteFinaleFourcheDegres).toBeLessThan(30);
      expect(piece.angleRaccordFourcheDegres).toBeGreaterThan(160);
    }
    expect(a.devant.hauteurCourbeFourcheCm).toBe(9);
    expect(a.dos.hauteurCourbeFourcheCm).toBe(11);
    expect(a.dos.hauteurCourbeFourcheCm).toBeGreaterThan(a.devant.hauteurCourbeFourcheCm);
    // Vérification indépendante sur les points échantillonnés de la couture.
    const pieces = genererPatronPantalonLarge({ ...jeu });
    for (const [i, piece] of pieces.slice(0, 2).entries()) {
      const analyse = i === 0 ? a.devant : a.dos;
      const pts = piece.couture;
      const iFork = pts.findIndex((p) => Math.abs(p.x - analyse.pointFourche.x) < 1e-9 && Math.abs(p.y - analyse.pointFourche.y) < 1e-9);
      expect(iFork, `${jeu.nom}/${piece.id} point de fourche retrouvé`).toBeGreaterThan(0);
      const fourche = pts[iFork]!;
      const apres = pts[iFork + 1]!; // premier point de courbe après la fourche dans le tracé
      const avant = pts[iFork - 1]!; // point d'entrejambe (bas)
      const v1 = { x: avant.x - fourche.x, y: avant.y - fourche.y };
      const v2 = { x: apres.x - fourche.x, y: apres.y - fourche.y };
      const angle = (Math.acos((v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y))) * 180) / Math.PI;
      expect(angle, `${jeu.nom}/${piece.id} angle échantillonné`).toBeGreaterThan(160);
      const J = pts[pts.length - 1]!;
      expect(fourche.y - J.y).toBeCloseTo(analyse.hauteurCourbeFourcheCm, 6);
    }
  });

  it.each(JEUX)('jeu $nom : bas par défaut ≥ genou (jambe droite ou évasée), devant et dos', (jeu) => {
    const a = analyserPantalonLarge({ ...jeu });
    expect(a.devant.largeurBasCm).toBeGreaterThanOrEqual(a.devant.largeurGenouCm - 0.05);
    expect(a.dos.largeurBasCm).toBeGreaterThanOrEqual(a.dos.largeurGenouCm - 0.05);
    expect(a.devant.largeurBasCm).toBe(a.dos.largeurBasCm);
  });

  it('jeu moyenne : le défaut n’est plus la constante 27 cm', () => {
    const a = analyserPantalonLarge({ tourTailleCm: 82, tourHanchesCm: 100, hauteurFourcheCm: 27, longueurPantalonCm: 105 });
    expect(a.devant.largeurBasCm).toBeGreaterThan(30);
  });
});

describe('étiquettes de cote : aucun recouvrement, Hanches loin des crans et des bords', () => {
  it.each(JEUX)('jeu $nom : étiquettes deux à deux disjointes', (jeu) => {
    const { pieces } = agencerPieces(genererPatronPantalonLarge({ ...jeu }));
    const fonds = pieces.flatMap((p) =>
      (p.cotes ?? []).map((c) => ({ piece: p.id, libelle: c.libelle, boite: boiteEtiquetteCote(c.texte.x + p.dx, c.texte.y + p.dy, c.libelle, fmt(c.valeurCm)) }))
    );
    for (let i = 0; i < fonds.length; i++)
      for (let j = i + 1; j < fonds.length; j++) {
        const a = fonds[i]!.boite;
        const b = fonds[j]!.boite;
        const seTouchent = a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
        expect(seTouchent, `${fonds[i]!.piece}/${fonds[i]!.libelle} × ${fonds[j]!.piece}/${fonds[j]!.libelle}`).toBe(false);
      }
  });

  it.each(JEUX)('jeu $nom : « Hanches » ne touche ni cran (carré ±1 cm) ni bord de coupe de sa pièce', (jeu) => {
    const { pieces } = agencerPieces(genererPatronPantalonLarge({ ...jeu }));
    for (const p of pieces.slice(0, 2)) {
      const cote = p.cotes!.find((c) => c.libelle === 'Hanches')!;
      const fond = boiteEtiquetteCote(cote.texte.x + p.dx, cote.texte.y + p.dy, cote.libelle, fmt(cote.valeurCm));
      for (const cran of p.crans) {
        const cx = cran.x + p.dx;
        const cy = cran.y + p.dy;
        const touche = fond.x1 < cx + 1 && cx - 1 < fond.x2 && fond.y1 < cy + 1 && cy - 1 < fond.y2;
        expect(touche, `${jeu.nom}/${p.id} Hanches × cran (${cx.toFixed(1)},${cy.toFixed(1)})`).toBe(false);
      }
      const b = boite(p);
      expect(fond.x1 - b.x1).toBeGreaterThanOrEqual(2);
      expect(b.x2 - fond.x2).toBeGreaterThanOrEqual(0.5);
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
    //  bas par défaut : jambe droite résolue (bas = plus grand genou) ≈ 35,8 ;
    //    entrejambe bas devant = 9,4375 − 35,8÷2 ≈ −8,46
    //  entrejambe devant = √((−8,46+6,625)² + 78²) ≈ 78,0
    //  ceinture = 86 + 3 = 89 ; hauteur finie 4
    const a = analyserPantalonLarge({ tourTailleCm: 82, tourHanchesCm: 100, hauteurFourcheCm: 27, longueurPantalonCm: 105 });
    expect(a.devant.largeurTailleEffectiveCm).toBeCloseTo(20.5, 6);
    expect(a.dos.largeurTailleEffectiveCm).toBeCloseTo(22.5, 6);
    expect(a.devant.largeurHanchesCm).toBeCloseTo(25.5, 6);
    expect(a.dos.largeurHanchesCm).toBeCloseTo(27.5, 1);
    expect(a.devant.largeurBasCm).toBeCloseTo(35.8, 1);
    expect(a.dos.largeurBasCm).toBeCloseTo(35.8, 1);
    expect(a.devant.hauteurFourcheCm).toBe(27);
    expect(a.devant.longueurEntrejambeCm).toBeCloseTo(78.04, 1);
    expect(a.dos.longueurEntrejambeCm).toBeCloseTo(78.04, 1);
    expect(a.longueurCeintureCm).toBe(89);
    // Avec la jambe droite large, l'égalisation donne une fourche dos quasi au même niveau (≈ 27,0).
    expect(a.dos.hauteurFourcheCm).toBeGreaterThan(26.5);
    expect(a.dos.hauteurFourcheCm).toBeLessThan(27.5);
  });

  it.each(JEUX)('jeu $nom : courbe de fourche sans coude (angle au point de fourche > 160°)', (jeu) => {
    const a = analyserPantalonLarge({ ...jeu });
    for (const [i, piece] of genererPatronPantalonLarge({ ...jeu }).slice(0, 2).entries()) {
      const analyse = i === 0 ? a.devant : a.dos;
      const pts = piece.couture;
      const iFork = pts.findIndex((p) => Math.abs(p.x - analyse.pointFourche.x) < 1e-9 && Math.abs(p.y - analyse.pointFourche.y) < 1e-9);
      const avant = pts[iFork - 1]!;
      const fourche = pts[iFork]!;
      const apres = pts[iFork + 1]!;
      const v1 = { x: avant.x - fourche.x, y: avant.y - fourche.y };
      const v2 = { x: apres.x - fourche.x, y: apres.y - fourche.y };
      const angle = (Math.acos((v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y))) * 180) / Math.PI;
      expect(angle, `${jeu.nom}/${piece.id}`).toBeGreaterThan(160);
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
