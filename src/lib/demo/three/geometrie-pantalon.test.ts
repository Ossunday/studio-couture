import { describe, expect, it } from 'vitest';
import { analyserPantalonLarge, type MesuresPantalonLarge } from '$lib/patterns/pantalon-large/geometry';
import { circonferenceEllipse, construireSectionsPantalon } from './geometrie-pantalon';

const JEUX: Array<{ nom: string; mesures: MesuresPantalonLarge }> = [
  { nom: 'petite', mesures: { tourTailleCm: 64, tourHanchesCm: 88, hauteurFourcheCm: 24, longueurPantalonCm: 96 } },
  { nom: 'moyenne', mesures: { tourTailleCm: 82, tourHanchesCm: 100, hauteurFourcheCm: 27, longueurPantalonCm: 105 } },
  { nom: 'forte', mesures: { tourTailleCm: 110, tourHanchesCm: 128, hauteurFourcheCm: 31, longueurPantalonCm: 108 } }
];

describe('géométrie 3D du pantalon (mêmes cotes que le patron 2D)', () => {
  for (const jeu of JEUX) {
    it(`${jeu.nom} : longueur totale, hanches, genou et bas conformes à l’analyse`, () => {
      const analyse = analyserPantalonLarge(jeu.mesures);
      const s = construireSectionsPantalon(jeu.mesures, analyse);
      // Longueur totale = longueur du pantalon ± 0,1 cm
      const ys = [...s.tronc, ...s.jambeGauche].map((a) => a.y);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(jeu.mesures.longueurPantalonCm, 1);
      expect(Math.abs(Math.max(...ys) - Math.min(...ys) - jeu.mesures.longueurPantalonCm)).toBeLessThanOrEqual(0.1);
      // Hanches = tour de hanches + aisance ± 0,5 cm (anneau le plus proche de la ligne de hanches)
      const yHanches = jeu.mesures.longueurPantalonCm - Math.min(18, jeu.mesures.hauteurFourcheCm * 0.7);
      const anneauHanches = s.tronc.reduce((p, a) => (Math.abs(a.y - yHanches) < Math.abs(p.y - yHanches) ? a : p), s.tronc[0]!);
      expect(Math.abs(circonferenceEllipse(anneauHanches.rayonX, anneauHanches.rayonZ) - (jeu.mesures.tourHanchesCm + 6))).toBeLessThanOrEqual(0.5);
      expect(Math.abs(s.circonferenceHanchesCm - (jeu.mesures.tourHanchesCm + 6))).toBeLessThanOrEqual(0.5);
      // Genou et bas par jambe = devant + dos de l'analyse ± 0,5 cm
      // (une pièce devant + une pièce dos cousues forment le tube de la jambe)
      const attenduGenou = analyse.devant.largeurGenouCm + analyse.dos.largeurGenouCm;
      const attenduBas = analyse.devant.largeurBasCm + analyse.dos.largeurBasCm;
      expect(Math.abs(s.circonferenceGenouCm - attenduGenou)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(s.circonferenceBasCm - attenduBas)).toBeLessThanOrEqual(0.5);
      // Haut de jambe à la fourche = devant + dos aux hanches (moitié du tronc)
      const attenduHaut = analyse.devant.largeurHanchesCm + analyse.dos.largeurHanchesCm;
      expect(Math.abs(s.circonferenceHautJambeCm - attenduHaut)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(2 * s.circonferenceHautJambeCm - s.circonferenceHanchesCm)).toBeLessThanOrEqual(1);
      expect(Math.abs(s.circonferenceGenouCm - attenduGenou)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(s.circonferenceBasCm - attenduBas)).toBeLessThanOrEqual(0.5);
      const anneauBas = s.jambeGauche[s.jambeGauche.length - 1]!;
      expect(Math.abs(circonferenceEllipse(anneauBas.rayonX, anneauBas.rayonZ) - attenduBas)).toBeLessThanOrEqual(0.5);
      // Pas d'interpénétration au bas : écart des centres ≥ somme des rayons − 0,5 cm
      const basDroit = s.jambeDroite[s.jambeDroite.length - 1]!;
      expect(Math.abs(basDroit.centreX - anneauBas.centreX)).toBeGreaterThanOrEqual(anneauBas.rayonX + basDroit.rayonX - 0.5);
      // Taille = tour de taille + aisance
      expect(s.circonferenceTailleCm).toBeCloseTo(jeu.mesures.tourTailleCm + 4, 5);
    });
  }
});
