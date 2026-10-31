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
  circonferenceHautJambeCm: number;
  circonferenceGenouCm: number;
  circonferenceBasCm: number;
  circonferenceTailleCm: number;
}

/** Circonférence d'ellipse (approximation de Ramanujan II, erreur < 0,01 %). */
export function circonferenceEllipse(rayonX: number, rayonZ: number): number {
  const h = ((rayonX - rayonZ) / (rayonX + rayonZ)) ** 2;
  return Math.PI * (rayonX + rayonZ) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

/** Rayons elliptiques (profondeur/largeur = ratio ≈ 0,7 aux hanches et cuisses) donnant la circonférence visée. */
export function rayonsDepuisCirconference(circonferenceCm: number, ratio = 0.7): { rayonX: number; rayonZ: number } {
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
 * Sections du pantalon 3D, dérivées des mêmes cotes que le patron 2D.
 * Circonférence d'UNE jambe = largeur devant + largeur dos de l'analyse :
 * une pièce devant et une pièce dos cousues au côté et à l'entrejambe forment
 * le tube de la jambe (les « ×2 » des pièces désignent la jambe gauche et la
 * jambe droite, pas un doublement du tour). Ex. jeu moyenne : bas ≈ 71,6 cm.
 * Le tronc, lui, vaut bien 2 × (devant + dos aux hanches) = hanches + aisance.
 */
export function construireSectionsPantalon(m: MesuresPantalonLarge, analyse: AnalysePantalon): SectionsPantalon {
  const c = BROUILLON_PANTALON_LARGE;
  const L = m.longueurPantalonCm;
  const circonferenceTailleCm = m.tourTailleCm + c.aisanceTailleCm;
  const circonferenceHanchesCm = m.tourHanchesCm + c.aisanceHanchesCm;
  const circonferenceGenouCm = analyse.devant.largeurGenouCm + analyse.dos.largeurGenouCm;
  const circonferenceBasCm = analyse.devant.largeurBasCm + analyse.dos.largeurBasCm;
  /**
   * Haut de jambe à la fourche : largeur devant + dos AUX HANCHES de l'analyse
   * (≈ 53 cm en moyenne, soit la moitié du tour de hanches du tronc). C'est la
   * valeur cohérente avec le tube devant + dos au niveau où la jambe sort du
   * tronc ; elle rejoint ensuite le genou par interpolation lissée.
   */
  const circonferenceHautJambeCm = analyse.devant.largeurHanchesCm + analyse.dos.largeurHanchesCm;
  const yTaille = L;
  const yHanches = L - Math.min(c.hauteurHanchesCm, m.hauteurFourcheCm * 0.7);
  const yFourche = L - m.hauteurFourcheCm;
  // Genou à mi-chemin fourche → bas (même construction que le patron 2D).
  const genouY = yFourche / 2;

  // Tronc terminé par un fond arrondi : sous la fourche, deux anneaux qui se
  // resserrent vite (arche de fourche) — aucune arête plate ni plateau.
  const tronc = interpolerAnneaux([
    anneau(yTaille, 0, circonferenceTailleCm),
    anneau(yHanches, 0, circonferenceHanchesCm),
    anneau(yFourche, 0, circonferenceHanchesCm * 0.97),
    anneau(yFourche - 3.5, 0, circonferenceHanchesCm * 0.78),
    anneau(yFourche - 6.5, 0, circonferenceHanchesCm * 0.48)
  ]);
  const jambe = (signe: 1 | -1): Anneau[] => {
    // La jambe monte jusqu'à la ligne de hanches, cachée dans le tronc (même
    // matériau) : elle en sort progressivement sous la fourche, sans vide.
    // Centres séparés d'au moins un rayon au genou et au bas : pas d'interpénétration.
    const centreJambe = Math.max(
      rayonsDepuisCirconference(circonferenceGenouCm).rayonX,
      rayonsDepuisCirconference(circonferenceBasCm).rayonX
    );
    return interpolerAnneaux([
      anneau(yHanches, signe * centreJambe * 0.45, circonferenceHautJambeCm),
      anneau(yFourche + 3, signe * centreJambe * 0.72, circonferenceHautJambeCm),
      anneau(yFourche - 5, signe * centreJambe, circonferenceHautJambeCm + (circonferenceGenouCm - circonferenceHautJambeCm) * 0.3),
      anneau(genouY, signe * centreJambe, circonferenceGenouCm),
      anneau(0, signe * centreJambe, circonferenceBasCm)
    ]);
  };
  return {
    hauteurTotaleCm: L,
    tronc,
    jambeGauche: jambe(-1),
    jambeDroite: jambe(1),
    circonferenceHanchesCm,
    circonferenceHautJambeCm,
    circonferenceGenouCm,
    circonferenceBasCm,
    circonferenceTailleCm
  };
}
