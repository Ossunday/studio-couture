import { construirePiece, type PieceBrouillon, type Point } from '../brouillon';

/**
 * Géométrie BROUILLON du pantalon large — voir formulas.ts et
 * docs/FORMULES_A_VALIDER.md. Chaque constante ci-dessous est une hypothèse
 * « a_valider », jamais une formule de production.
 */
export const BROUILLON_PANTALON_LARGE = {
  aisanceTailleCm: 4,
  aisanceHanchesCm: 6,
  hauteurHanchesCm: 18,
  elargissementBasCm: 4,
  extensionDosSupplementCm: 2,
  croisureCeintureCm: 3,
  hauteurCeintureCoupeeCm: 8
} as const;

export interface MesuresPantalonLarge {
  tourTailleCm: number;
  tourHanchesCm: number;
  hauteurFourcheCm: number;
  longueurPantalonCm: number;
}

function jambe(m: MesuresPantalonLarge, dos: boolean): PieceBrouillon {
  const c = BROUILLON_PANTALON_LARGE;
  const quartTaille = (m.tourTailleCm + c.aisanceTailleCm) / 4;
  const quartHanches = (m.tourHanchesCm + c.aisanceHanchesCm) / 4;
  const hauteurHanches = Math.min(c.hauteurHanchesCm, m.hauteurFourcheCm * 0.7);
  const extension = (m.tourHanchesCm + c.aisanceHanchesCm) / 16 + (dos ? c.extensionDosSupplementCm : 0);
  const xCoteBas = quartHanches + 1;
  const largeurBas = quartHanches + c.elargissementBasCm;
  const xEntrejambeBas = xCoteBas - largeurBas;
  const yFourche = m.hauteurFourcheCm + (dos ? 0.5 : 0);
  const couture: Point[] = [
    { x: 0, y: dos ? -1 : 0 },
    { x: quartTaille, y: 0 },
    { x: quartHanches, y: hauteurHanches },
    { x: xCoteBas, y: m.longueurPantalonCm },
    { x: xEntrejambeBas, y: m.longueurPantalonCm },
    { x: -extension, y: yFourche },
    { x: 0, y: yFourche }
  ];
  const yGenou = yFourche + (m.longueurPantalonCm - yFourche) / 2;
  const xFil = quartHanches / 2;
  return construirePiece({
    id: dos ? 'dos' : 'devant',
    nom: dos ? 'Dos (×2)' : 'Devant (×2)',
    couture,
    filDroit: { de: { x: xFil, y: 12 }, a: { x: xFil, y: m.longueurPantalonCm - 12 } },
    crans: [
      { x: quartHanches, y: hauteurHanches },
      { x: xCoteBas - (xCoteBas - quartHanches) / 2, y: yGenou }
    ]
  });
}

export function genererPatronPantalonLarge(m: MesuresPantalonLarge): PieceBrouillon[] {
  if (m.hauteurFourcheCm >= m.longueurPantalonCm - 15) {
    throw new Error('Vérifiez la hauteur de fourche : elle doit être nettement plus petite que la longueur du pantalon.');
  }
  if (m.tourHanchesCm < m.tourTailleCm - 20) {
    throw new Error('Vérifiez le tour de hanches : il est en général proche ou supérieur au tour de taille.');
  }
  const c = BROUILLON_PANTALON_LARGE;
  const longueurCeinture = m.tourTailleCm + c.aisanceTailleCm + c.croisureCeintureCm;
  const ceinture = construirePiece({
    id: 'ceinture',
    nom: 'Ceinture (×1)',
    couture: [
      { x: 0, y: 0 },
      { x: longueurCeinture, y: 0 },
      { x: longueurCeinture, y: c.hauteurCeintureCoupeeCm },
      { x: 0, y: c.hauteurCeintureCoupeeCm }
    ],
    filDroit: { de: { x: 4, y: c.hauteurCeintureCoupeeCm / 2 }, a: { x: longueurCeinture - 4, y: c.hauteurCeintureCoupeeCm / 2 } },
    crans: [{ x: longueurCeinture / 2, y: 0 }]
  });
  return [jambe(m, false), jambe(m, true), ceinture];
}
