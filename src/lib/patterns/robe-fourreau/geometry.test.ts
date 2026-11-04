import { describe, expect, it } from 'vitest';
import { agencerPieces, boite, boitesSeChevauchent, type PieceBrouillon, type Point } from '../brouillon';
import { REGISTRE_MODELES } from '../registre';
import { genererPieces, validerMesuresPatron } from '../saisie-patron';
import { genererPatronRobeFourreau, type MesuresRobeFourreau } from './geometry';

// Valeurs attendues RECALCULÉES ici, à partir des seules mensurations —
// le test ne relit pas les constantes du moteur.
const JEUX: Record<string, MesuresRobeFourreau> = {
  petite: { tourPoitrineCm: 80, tourTailleCm: 64, tourHanchesCm: 88, longueurDosCm: 38, longueurRobeCm: 95, largeurEpaulesCm: 36 },
  moyenne: { tourPoitrineCm: 92, tourTailleCm: 76, tourHanchesCm: 100, longueurDosCm: 40, longueurRobeCm: 100, largeurEpaulesCm: 38 },
  forte: { tourPoitrineCm: 116, tourTailleCm: 96, tourHanchesCm: 124, longueurDosCm: 43, longueurRobeCm: 105, largeurEpaulesCm: 42 }
};

function longueur(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
  return total;
}

function indicePoint(piece: PieceBrouillon, x: number, y: number): number {
  return piece.couture.findIndex((p) => Math.abs(p.x - x) < 0.01 && Math.abs(p.y - y) < 0.01);
}

function angleMin(points: Point[]): number {
  let min = 180;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const c = points[i + 1]!;
    const v1 = { x: a.x - b.x, y: a.y - b.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };
    const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1);
    min = Math.min(min, (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI);
  }
  return min;
}

describe('robe fourreau — géométrie brouillon (valeurs recalculées indépendamment)', () => {
  it.each(Object.entries(JEUX))('jeu %s : côté et épaule devant = dos à 0,3 cm près, courbes sans coude', (_nom, m) => {
    const [devant, dos] = genererPatronRobeFourreau(m, { fermetureDos: 'glissiere' }) as [PieceBrouillon, PieceBrouillon];
    // Épaule attendue : de (épaules × 0,17 ; 0) à (épaules / 2 ; 4).
    const epauleAttendue = Math.hypot(m.largeurEpaulesCm / 2 - m.largeurEpaulesCm * 0.17, 4);
    const pointeX = m.largeurEpaulesCm / 2;
    const iDev = indicePoint(devant, pointeX, 4);
    const iDos = indicePoint(dos, pointeX, 4);
    expect(iDev).toBeGreaterThan(0);
    expect(iDos).toBeGreaterThan(0);
    // De la pointe d'épaule au bas, devant et dos suivent la même couture.
    const coteDevant = longueur(devant.couture.slice(iDev));
    const coteDos = longueur(dos.couture.slice(iDos));
    expect(Math.abs(coteDevant - coteDos)).toBeLessThanOrEqual(0.3);
    const epauleDev = devant.cotes!.find((c) => c.libelleCle === 'cote.epaule')!;
    const epauleDos = dos.cotes!.find((c) => c.libelleCle === 'cote.epaule')!;
    expect(Math.abs(epauleDev.valeurCm - epauleAttendue)).toBeLessThanOrEqual(0.15);
    expect(Math.abs(epauleDev.valeurCm - epauleDos.valeurCm)).toBeLessThanOrEqual(0.3);
    // Courbes échantillonnées : aucun coude (angle intérieur > 100°) sur encolure + emmanchure + côté.
    expect(angleMin(devant.couture.slice(0, iDev + 14))).toBeGreaterThan(100);
    // Devant ≠ dos (encolure devant plus profonde que le dos).
    expect(devant.couture).not.toEqual(dos.couture);
    expect(devant.couture[0]!.y).toBeGreaterThan(dos.couture[0]!.y);
    // Aucun chevauchement une fois agencé.
    const { pieces: placees } = agencerPieces(genererPatronRobeFourreau(m, { manches: 'manche_courte', fermetureDos: 'glissiere' }));
    const boites = placees.map(boite);
    for (let i = 0; i < boites.length; i++)
      for (let j = i + 1; j < boites.length; j++) expect(boitesSeChevauchent(boites[i]!, boites[j]!)).toBe(false);
  });

  it('moyenne : cotes recalculées depuis les mensurations brutes', () => {
    const m = JEUX['moyenne']!;
    const [devant] = genererPatronRobeFourreau(m) as [PieceBrouillon];
    const cote = (libelleCle: string) => devant.cotes!.find((c) => c.libelleCle === libelleCle)!.valeurCm;
    expect(cote('cote.poitrine')).toBeCloseTo((92 + 6) / 4, 5);
    expect(cote('cote.taille')).toBeCloseTo((76 + 2) / 4, 5);
    expect(cote('cote.hanches')).toBeCloseTo((100 + 4) / 4, 5);
    expect(cote('cote.nuqueTaille')).toBe(40);
    expect(cote('cote.longueurRobe')).toBe(100);
    expect(cote('cote.encolure')).toBeGreaterThan(5);
  });

  it('options : manche courte ajoute la pièce ×2, fente en V tracée sur le devant seul', () => {
    const m = JEUX['moyenne']!;
    const sans = genererPatronRobeFourreau(m, {});
    expect(sans.map((p) => p.id)).toEqual(['devant', 'dos']);
    const avec = genererPatronRobeFourreau(m, { encolure: 'fendue_v', manches: 'manche_courte', fermetureDos: 'glissiere' });
    expect(avec.map((p) => p.id)).toEqual(['devant', 'dos', 'manche']);
    expect(avec[2]!.quantite).toBe(2); expect(avec[2]!.nomCle).toBe('piece.manche');
    expect(avec[0]!.traitsInterieurs!.length).toBeGreaterThan(sans[0]!.traitsInterieurs!.length);
  });

  it('refus hors bornes et incohérences, en nommant la mesure', () => {
    expect(() =>
      validerMesuresPatron('robe_fourreau', (code) =>
        ({ tour_poitrine_cm: '300', tour_taille_cm: '76', tour_hanches_cm: '100', longueur_dos_cm: '40', longueur_robe_cm: '100', largeur_epaules_cm: '38' })[code]
      )
    ).toThrow('validation.verifiezMesureNombre');
    expect(() => genererPatronRobeFourreau({ ...JEUX['moyenne']!, longueurRobeCm: 60 })).toThrow(/longueur de robe/);
    expect(() => genererPatronRobeFourreau({ ...JEUX['moyenne']!, tourHanchesCm: 50 })).toThrow(/tour de hanches/);
    expect(REGISTRE_MODELES.robe_fourreau.presets.map((p) => p.id)).toEqual(['petite', 'moyenne', 'forte']);
    expect(genererPieces('robe_fourreau', { tour_poitrine_cm: 92, tour_taille_cm: 76, tour_hanches_cm: 100, longueur_dos_cm: 40, longueur_robe_cm: 100, largeur_epaules_cm: 38 })).toHaveLength(2);
  });
});
