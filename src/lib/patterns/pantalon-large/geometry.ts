import { construirePiece, type CotePiece, type PieceBrouillon, type Point } from '../brouillon';

/**
 * Géométrie BROUILLON du pantalon large — tracé classique par lignes de
 * construction (taille, hanches, fourche, genou, bas), points nommés dans
 * docs/PATRON_PANTALON.md. Toutes les constantes sont « a_valider »
 * (source null dans formulas.ts) : aucune n'est une formule de production.
 */
export const BROUILLON_PANTALON_LARGE = {
  aisanceTailleCm: 4,
  aisanceHanchesCm: 6,
  hauteurHanchesCm: 18,
  /** Répartition devant/dos : devant = quart − écart, dos = quart + écart. */
  ecartDevantDosCm: 1,
  /** Extension de fourche devant = tour de hanches avec aisance ÷ diviseur. */
  diviseurExtensionFourche: 16,
  supplementExtensionDosCm: 2.5,
  profondeurPliDevantCm: 4,
  largeurPinceDosCm: 3,
  longueurPinceDosCm: 12,
  remonteeMilieuDosCm: 2,
  inclinaisonMilieuDosCm: 1.5,
  largeurBasPieceCm: 27,
  galbeCoteCm: 0.4,
  croisureCeintureCm: 3,
  hauteurCeintureFinieCm: 4
} as const;

export interface MesuresPantalonLarge {
  tourTailleCm: number;
  tourHanchesCm: number;
  hauteurFourcheCm: number;
  longueurPantalonCm: number;
}

export interface OptionsPantalonLarge {
  largeurBasPieceCm?: number;
  profondeurPliCm?: number;
  hauteurCeintureFinieCm?: number;
}

export interface OptionsResolues {
  largeurBasPieceCm: number;
  profondeurPliCm: number;
  hauteurCeintureFinieCm: number;
}

export function resoudreOptions(o: OptionsPantalonLarge = {}): OptionsResolues {
  return {
    largeurBasPieceCm: o.largeurBasPieceCm ?? BROUILLON_PANTALON_LARGE.largeurBasPieceCm,
    profondeurPliCm: o.profondeurPliCm ?? BROUILLON_PANTALON_LARGE.profondeurPliDevantCm,
    hauteurCeintureFinieCm: o.hauteurCeintureFinieCm ?? BROUILLON_PANTALON_LARGE.hauteurCeintureFinieCm
  };
}

const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function quad(p0: Point, p1: Point, p2: Point, n = 10): Point[] {
  const pts: Point[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push({ x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y });
  }
  return pts;
}
function cubic(p0: Point, p1: Point, p2: Point, p3: Point, n = 12): Point[] {
  const pts: Point[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push({
      x: u ** 3 * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * p3.x,
      y: u ** 3 * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * p3.y
    });
  }
  return pts;
}
function longueur(points: Point[]): number {
  return points.reduce((acc, p, i) => (i === 0 ? acc : acc + dist(points[i - 1]!, p)), 0);
}

export interface AnalysePiece {
  largeurTailleEffectiveCm: number;
  largeurHanchesCm: number;
  largeurGenouCm: number;
  largeurBasCm: number;
  hauteurFourcheCm: number;
  longueurCoteCm: number;
  longueurEntrejambeCm: number;
  pointFourche: Point;
}
export interface AnalysePantalon {
  devant: AnalysePiece;
  dos: AnalysePiece;
  longueurCeintureCm: number;
  hauteurCeintureFinieCm: number;
  ecartCoteCm: number;
  ecartEntrejambeCm: number;
}

interface Construite {
  piece: PieceBrouillon;
  analyse: AnalysePiece;
}

function construireJambe(
  m: MesuresPantalonLarge,
  opts: OptionsResolues,
  dos: boolean,
  partage: {
    waistOutlineDevant: number;
    expHip: number;
    hemSideDevant: number;
    yHip: number;
    yGenou: number;
    entrejambeDevant: number;
    coteDevant: Point[];
  }
): Construite {
  const c = BROUILLON_PANTALON_LARGE;
  const Ww = m.tourTailleCm + c.aisanceTailleCm;
  const Hh = m.tourHanchesCm + c.aisanceHanchesCm;
  const waistEff = Ww / 4 + (dos ? c.ecartDevantDosCm : -c.ecartDevantDosCm);
  const waistOutline = dos ? Ww / 4 + c.ecartDevantDosCm + c.largeurPinceDosCm : partage.waistOutlineDevant;
  const decalage = waistOutline - partage.waistOutlineDevant; // 0 devant, Δ dos : le côté dos est translaté, donc même longueur
  const hipSideX = waistOutline + partage.expHip;
  const largeurHanches = hipSideX - (dos ? -c.inclinaisonMilieuDosCm * (partage.yHip / Math.max(1, m.hauteurFourcheCm)) : 0);
  const ext = Hh / c.diviseurExtensionFourche + (dos ? c.supplementExtensionDosCm : 0);
  const hemSide: Point = { x: partage.hemSideDevant + decalage, y: m.longueurPantalonCm };
  const hemInseam: Point = { x: hemSide.x - opts.largeurBasPieceCm, y: m.longueurPantalonCm };
  // Entrejambe dos égalisé : on résout la hauteur du point de fourche dos
  // pour que la longueur d'entrejambe (droite) égale celle du devant.
  let yFork = m.hauteurFourcheCm;
  if (dos) {
    const dx = hemInseam.x + ext;
    const dy2 = partage.entrejambeDevant ** 2 - dx * dx;
    if (dy2 <= 0) throw new Error('Vérifiez les mesures : la fourche dos ne peut pas égaliser l’entrejambe.');
    yFork = m.longueurPantalonCm - Math.sqrt(dy2);
  }
  const fork: Point = { x: -ext, y: yFork };
  // Points nommés (voir docs/PATRON_PANTALON.md)
  const A: Point = dos ? { x: 0, y: -c.remonteeMilieuDosCm } : { x: 0, y: 0 };
  const B: Point = { x: waistOutline, y: 0 };
  const B2: Point = { x: hipSideX, y: partage.yHip };
  const X1: Point = hemSide;
  const X2: Point = hemInseam;
  const O: Point = { x: (X1.x + X2.x) / 2, y: m.longueurPantalonCm }; // milieu du bas, sur le fil droit
  const kneeSide: Point = lerp(B2, X1, (partage.yGenou - partage.yHip) / (m.longueurPantalonCm - partage.yHip));
  const kneeInseam: Point = lerp(fork, X2, (partage.yGenou - yFork) / (m.longueurPantalonCm - yFork));
  const J: Point = dos
    ? { x: -c.inclinaisonMilieuDosCm, y: yFork - 4 }
    : { x: 0, y: yFork - 4 };
  // Courbe de fourche : Bézier cubique J → fourche, tangente verticale aux deux bouts (pas de coude).
  const courbeFourche = cubic(J, { x: J.x, y: J.y + 3 }, { x: fork.x, y: fork.y - 3 }, fork, 24);
  // Côté galbé : Bézier quadratique taille → hanches, puis droite hanches → bas (genou sur la droite).
  const ctrlCote: Point = { x: (B.x + B2.x) / 2 + c.galbeCoteCm, y: (B.y + B2.y) / 2 };
  const cotePoints = [B, ...quad(B, ctrlCote, B2), kneeSide, X1];
  const couture: Point[] = [
    A,
    B,
    ...quad(B, ctrlCote, B2),
    kneeSide,
    X1,
    X2,
    fork,
    ...courbeFourche.slice(0, -1).reverse(),
    J
  ];
  const longueurCote = longueur(cotePoints);
  const longueurEntrejambe = dist(fork, X2);
  const largeurGenou = kneeSide.x - kneeInseam.x;
  const xFil = O.x;
  const pliX = xFil;
  const traits: Point[][] = [];
  if (!dos) {
    traits.push(
      [
        { x: pliX, y: 0 },
        { x: pliX, y: partage.yHip + 6 }
      ],
      [
        { x: pliX + opts.profondeurPliCm, y: 0 },
        { x: pliX + opts.profondeurPliCm, y: partage.yHip + 6 }
      ]
    );
  } else {
    const xPince = waistOutline / 2;
    traits.push([
      { x: xPince - c.largeurPinceDosCm / 2, y: -c.remonteeMilieuDosCm / 2 },
      { x: xPince, y: c.longueurPinceDosCm },
      { x: xPince + c.largeurPinceDosCm / 2, y: 0 }
    ]);
  }
  const cotes: CotePiece[] = [
    { libelle: 'Taille', valeurCm: waistEff, de: { x: A.x, y: 10.5 }, a: { x: waistEff, y: 10.5 }, texte: { x: waistEff / 2, y: 10.5 } },
    { libelle: 'Hanches', valeurCm: largeurHanches, de: { x: dos ? J.x * (partage.yHip / Math.max(1, yFork)) : 0, y: partage.yHip }, a: B2, texte: { x: B2.x / 2, y: partage.yHip - 3 } },
    { libelle: 'Genou', valeurCm: largeurGenou, de: kneeInseam, a: kneeSide, texte: { x: (kneeInseam.x + kneeSide.x) / 2, y: partage.yGenou - 2.2 } },
    { libelle: 'Bas', valeurCm: opts.largeurBasPieceCm, de: X2, a: X1, texte: { x: O.x, y: m.longueurPantalonCm - 2.2 } },
    { libelle: 'Fourche', valeurCm: yFork, de: { x: A.x + 2.5, y: dos ? 0 : 0 }, a: { x: A.x + 2.5, y: yFork }, texte: { x: A.x + 11.5, y: yFork - 2.5 } },
    { libelle: 'Côté', valeurCm: longueurCote, de: { x: B.x - 3, y: B.y }, a: { x: X1.x - 3, y: X1.y }, texte: { x: (B.x + X1.x) / 2 - 8, y: (B.y + X1.y) / 2 } },
    { libelle: 'Entrejambe', valeurCm: longueurEntrejambe, de: { x: fork.x + 3, y: fork.y }, a: { x: X2.x + 3, y: X2.y }, texte: { x: O.x, y: (fork.y + X2.y) / 2 + 8 } }
  ];
  const mesuresPatron = [
    { libelle: dos ? 'Taille (pince fermée)' : 'Taille (pli fermé)', valeurCm: waistEff },
    { libelle: 'Hanches', valeurCm: largeurHanches },
    { libelle: 'Genou', valeurCm: largeurGenou },
    { libelle: 'Bas', valeurCm: opts.largeurBasPieceCm },
    { libelle: 'Hauteur de fourche', valeurCm: yFork },
    { libelle: 'Longueur de côté', valeurCm: longueurCote },
    { libelle: 'Entrejambe', valeurCm: longueurEntrejambe }
  ].map((mm) => ({ libelle: mm.libelle, valeurCm: Math.round(mm.valeurCm * 10) / 10 }));
  const piece = construirePiece({
    id: dos ? 'dos' : 'devant',
    nom: dos ? 'Dos (×2)' : 'Devant (×2)',
    couture,
    filDroit: { de: { x: xFil, y: 10 }, a: { x: xFil, y: m.longueurPantalonCm - 10 } },
    crans: [B2, kneeSide, B],
    traitsInterieurs: traits,
    cotes,
    lignesConstruction: [
      [
        { x: -ext - 1, y: partage.yHip },
        { x: hipSideX + 1, y: partage.yHip }
      ],
      [
        { x: kneeInseam.x - 1, y: partage.yGenou },
        { x: kneeSide.x + 1, y: partage.yGenou }
      ],
      [
        { x: -ext - 1, y: yFork },
        { x: hipSideX + 1, y: yFork }
      ]
    ],
    mesuresPatron
  });
  return {
    piece,
    analyse: {
      largeurTailleEffectiveCm: waistEff,
      largeurHanchesCm: largeurHanches,
      largeurGenouCm: largeurGenou,
      largeurBasCm: opts.largeurBasPieceCm,
      hauteurFourcheCm: yFork,
      longueurCoteCm: longueurCote,
      longueurEntrejambeCm: longueurEntrejambe,
      pointFourche: fork
    }
  };
}

function construire(m: MesuresPantalonLarge, options: OptionsPantalonLarge): { pieces: PieceBrouillon[]; analyse: AnalysePantalon } {
  if (m.hauteurFourcheCm >= m.longueurPantalonCm - 15) {
    throw new Error('Vérifiez la hauteur de fourche : elle doit être nettement plus petite que la longueur du pantalon.');
  }
  if (m.tourHanchesCm < m.tourTailleCm - 20) {
    throw new Error('Vérifiez le tour de hanches : il est en général proche ou supérieur au tour de taille.');
  }
  const c = BROUILLON_PANTALON_LARGE;
  const opts = resoudreOptions(options);
  const Ww = m.tourTailleCm + c.aisanceTailleCm;
  const Hh = m.tourHanchesCm + c.aisanceHanchesCm;
  const waistOutlineDevant = Ww / 4 - c.ecartDevantDosCm + opts.profondeurPliCm;
  const hipDevant = Hh / 4 - c.ecartDevantDosCm;
  const yHip = Math.min(c.hauteurHanchesCm, m.hauteurFourcheCm * 0.7);
  const yGenou = m.hauteurFourcheCm + (m.longueurPantalonCm - m.hauteurFourcheCm) / 2;
  const extDevant = Hh / c.diviseurExtensionFourche;
  const creaseDevant = (hipDevant - extDevant) / 2;
  const hemSideDevant = creaseDevant + opts.largeurBasPieceCm / 2;
  const hemInseamDevant = creaseDevant - opts.largeurBasPieceCm / 2;
  const entrejambeDevant = Math.hypot(hemInseamDevant + extDevant, m.longueurPantalonCm - m.hauteurFourcheCm);
  const partage = {
    waistOutlineDevant,
    expHip: hipDevant - waistOutlineDevant,
    hemSideDevant,
    yHip,
    yGenou,
    entrejambeDevant,
    coteDevant: [] as Point[]
  };
  const devant = construireJambe(m, opts, false, partage);
  const dos = construireJambe(m, opts, true, partage);
  const longueurCeinture = Ww + c.croisureCeintureCm;
  const hauteurCoupee = opts.hauteurCeintureFinieCm * 2;
  const ceinture = construirePiece({
    id: 'ceinture',
    nom: 'Ceinture (×1)',
    couture: [
      { x: 0, y: 0 },
      { x: longueurCeinture, y: 0 },
      { x: longueurCeinture, y: hauteurCoupee },
      { x: 0, y: hauteurCoupee }
    ],
    filDroit: { de: { x: 4, y: hauteurCoupee / 2 }, a: { x: longueurCeinture - 4, y: hauteurCoupee / 2 } },
    crans: [{ x: Ww / 2, y: 0 }, { x: Ww, y: 0 }],
    cotes: [
      { libelle: 'Longueur ceinture', valeurCm: longueurCeinture, de: { x: 0, y: hauteurCoupee / 2 }, a: { x: longueurCeinture, y: hauteurCoupee / 2 }, texte: { x: longueurCeinture / 2, y: hauteurCoupee / 2 - 2 } },
      { libelle: 'Hauteur finie', valeurCm: opts.hauteurCeintureFinieCm, de: { x: longueurCeinture - 3, y: 0 }, a: { x: longueurCeinture - 3, y: hauteurCoupee }, texte: { x: longueurCeinture - 16, y: hauteurCoupee / 2 + 3 } }
    ],
    mesuresPatron: [
      { libelle: 'Longueur de ceinture (avec recouvrement)', valeurCm: longueurCeinture },
      { libelle: 'Hauteur finie (coupée ×2)', valeurCm: opts.hauteurCeintureFinieCm }
    ]
  });
  return {
    pieces: [devant.piece, dos.piece, ceinture],
    analyse: {
      devant: devant.analyse,
      dos: dos.analyse,
      longueurCeintureCm: longueurCeinture,
      hauteurCeintureFinieCm: opts.hauteurCeintureFinieCm,
      ecartCoteCm: Math.abs(devant.analyse.longueurCoteCm - dos.analyse.longueurCoteCm),
      ecartEntrejambeCm: Math.abs(devant.analyse.longueurEntrejambeCm - dos.analyse.longueurEntrejambeCm)
    }
  };
}

export function analyserPantalonLarge(m: MesuresPantalonLarge, options: OptionsPantalonLarge = {}): AnalysePantalon {
  return construire(m, options).analyse;
}

export function genererPatronPantalonLarge(m: MesuresPantalonLarge, options: OptionsPantalonLarge = {}): PieceBrouillon[] {
  return construire(m, options).pieces;
}
