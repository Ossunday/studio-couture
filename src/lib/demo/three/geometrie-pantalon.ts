import {
  BROUILLON_PANTALON_LARGE,
  type AnalysePantalon,
  type MesuresPantalonLarge
} from '$lib/patterns/pantalon-large/geometry';

/** Anneau de coupe elliptique (cm, y croissant du bas vers la taille). */
export interface Anneau {
  y: number;
  centreX: number;
  rayonX: number;
  rayonZ: number;
  circonferenceCm: number;
}

export interface SectionsPantalon {
  hauteurTotaleCm: number;
  tronc: Anneau[];
  jambeGauche: Anneau[];
  jambeDroite: Anneau[];
  circonferenceHanchesCm: number;
  circonferenceGenouCm: number;
  circonferenceBasCm: number;
  circonferenceTailleCm: number;
}

/** Circonférence d'ellipse (approximation de Ramanujan II, erreur < 0,01 %). */
export function circonferenceEllipse(rayonX: number, rayonZ: number): number {
  const h = ((rayonX - rayonZ) / (rayonX + rayonZ)) ** 2;
  return Math.PI * (rayonX + rayonZ) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

/** Rayons elliptiques (profondeur/largeur = ratio) donnant la circonférence visée. */
export function rayonsDepuisCirconference(circonferenceCm: number, ratio = 0.72): { rayonX: number; rayonZ: number } {
  let bas = 0.1;
  let haut = circonferenceCm;
  for (let i = 0; i < 48; i++) {
    const milieu = (bas + haut) / 2;
    if (circonferenceEllipse(milieu, milieu * ratio) < circonferenceCm) bas = milieu;
    else haut = milieu;
  }
  const rayonX = (bas + haut) / 2;
  return { rayonX, rayonZ: rayonX * ratio };
}

function anneau(y: number, centreX: number, circonferenceCm: number): Anneau {
  const { rayonX, rayonZ } = rayonsDepuisCirconference(circonferenceCm);
  return { y, centreX, rayonX, rayonZ, circonferenceCm };
}

const lisse = (t: number) => t * t * (3 - 2 * t);

/** Interpole les anneaux de contrôle en anneaux échantillonnés (coupe lissée). */
export function interpolerAnneaux(controles: Anneau[], pasCm = 4): Anneau[] {
  const sortie: Anneau[] = [];
  for (let i = 0; i < controles.length - 1; i++) {
    const a = controles[i]!;
    const b = controles[i + 1]!;
    const n = Math.max(2, Math.ceil(Math.abs(b.y - a.y) / pasCm));
    for (let j = i === 0 ? 0 : 1; j <= n; j++) {
      const t = lisse(j / n);
      const circonferenceCm = a.circonferenceCm + (b.circonferenceCm - a.circonferenceCm) * t;
      const { rayonX, rayonZ } = rayonsDepuisCirconference(circonferenceCm);
      sortie.push({
        y: a.y + (b.y - a.y) * (j / n),
        centreX: a.centreX + (b.centreX - a.centreX) * t,
        rayonX,
        rayonZ,
        circonferenceCm
      });
    }
  }
  return sortie;
}

/**
 * Sections du pantalon 3D, dérivées des mêmes cotes que le patron 2D :
 * circonférence d'une jambe = 2 × (largeur devant + largeur dos) de l'analyse.
 */
export function construireSectionsPantalon(m: MesuresPantalonLarge, analyse: AnalysePantalon): SectionsPantalon {
  const c = BROUILLON_PANTALON_LARGE;
  const L = m.longueurPantalonCm;
  const circonferenceTailleCm = m.tourTailleCm + c.aisanceTailleCm;
  const circonferenceHanchesCm = m.tourHanchesCm + c.aisanceHanchesCm;
  const circonferenceGenouCm = 2 * (analyse.devant.largeurGenouCm + analyse.dos.largeurGenouCm);
  const circonferenceBasCm = 2 * (analyse.devant.largeurBasCm + analyse.dos.largeurBasCm);
  const yTaille = L;
  const yHanches = L - Math.min(c.hauteurHanchesCm, m.hauteurFourcheCm * 0.7);
  const yFourche = L - m.hauteurFourcheCm;
  // Genou à mi-chemin fourche → bas (même construction que le patron 2D).
  const genouY = yFourche / 2;
  const ecartJambe = rayonsDepuisCirconference(circonferenceHanchesCm).rayonX / 2;

  const tronc = interpolerAnneaux([
    anneau(yTaille, 0, circonferenceTailleCm),
    anneau(yHanches, 0, circonferenceHanchesCm),
    anneau(yFourche, 0, circonferenceHanchesCm * 0.99)
  ]);
  const jambe = (signe: 1 | -1): Anneau[] => {
    // Centres écartés vers le bas pour que les deux jambes restent lisibles
    // (leurs coupes se recouvrent à la fourche, puis se séparent au genou).
    const centreBas = rayonsDepuisCirconference(circonferenceGenouCm).rayonX * 0.82;
    return interpolerAnneaux([
      anneau(yFourche, signe * ecartJambe * 0.55, circonferenceGenouCm * 0.82),
      anneau(genouY, signe * centreBas, circonferenceGenouCm),
      anneau(0, signe * centreBas, circonferenceBasCm)
    ]);
  };
  return {
    hauteurTotaleCm: L,
    tronc,
    jambeGauche: jambe(-1),
    jambeDroite: jambe(1),
    circonferenceHanchesCm,
    circonferenceGenouCm,
    circonferenceBasCm,
    circonferenceTailleCm
  };
}
