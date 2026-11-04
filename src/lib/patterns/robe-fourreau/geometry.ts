import { construirePiece, type PieceBrouillon, type Point } from '../brouillon';

/**
 * Géométrie BROUILLON de la robe fourreau — hypothèses « a_valider »
 * (docs/modeles/robe-fourreau.md, docs/FORMULES_A_VALIDER.md section R,
 * registre robe-fourreau/formulas.ts : aucune formule de production tant
 * qu'un tailleur n'a pas validé). Demi-patrons : x = 0 au milieu devant/dos,
 * y = 0 à la nuque, y vers le bas. Devant et dos partagent EXACTEMENT les
 * mêmes points de couture de côté et d'épaule (égalité par construction) ;
 * ils ne diffèrent que par l'encolure, la position de pince et les repères.
 */
export const BROUILLON_ROBE_FOURREAU = {
  aisancePoitrineCm: 6,
  aisanceTailleCm: 2,
  aisanceHanchesCm: 4,
  hauteurHanchesCm: 18,
  largeurPinceCm: 3,
  longueurPinceBasCm: 11,
  longueurPinceHautCm: 10,
  penteEpauleCm: 4,
  ratioDemiEncolure: 0.17,
  profondeurEncolureDosCm: 2,
  profondeurFenteVCm: 5,
  emmanchureDiviseur: 6,
  emmanchureBaseCm: 7,
  elargissementBasCm: 1,
  longueurMancheCourteCm: 18,
  ratioTeteManche: 0.6
} as const;

export interface MesuresRobeFourreau {
  tourPoitrineCm: number;
  tourTailleCm: number;
  tourHanchesCm: number;
  longueurDosCm: number;
  longueurRobeCm: number;
  largeurEpaulesCm: number;
}

export interface OptionsRobeFourreau {
  encolure?: string;
  manches?: string;
  fermetureDos?: string;
}

function bezier(p0: Point, p1: Point, p2: Point, p3: Point, segments = 12): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const u = 1 - t;
    points.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
    });
  }
  return points;
}

function longueurPoly(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
  return total;
}

interface Base {
  quartPoitrine: number;
  quartTaille: number;
  quartHanches: number;
  largeurBas: number;
  demiEncolure: number;
  profondeurEncolureDevant: number;
  yPoitrine: number;
  yTaille: number;
  yHanches: number;
  epaule: { de: Point; a: Point; longueur: number };
  coteCote: Point[];
}

function calculerBase(m: MesuresRobeFourreau): Base {
  const c = BROUILLON_ROBE_FOURREAU;
  if (m.tourHanchesCm < m.tourTailleCm - 20) {
    throw new Error('Vérifiez le tour de hanches : il est en général proche ou supérieur au tour de taille.');
  }
  if (m.longueurRobeCm < m.longueurDosCm + 25) {
    throw new Error('Vérifiez : longueur de robe — elle doit dépasser la longueur nuque-taille d’au moins 25 cm pour une robe.');
  }
  const yPoitrine = m.tourPoitrineCm / c.emmanchureDiviseur + c.emmanchureBaseCm;
  if (yPoitrine >= m.longueurDosCm - 5) {
    throw new Error('Vérifiez le tour de poitrine et la longueur nuque-taille : l’emmanchure calculée descendrait jusqu’à la taille.');
  }
  const quartPoitrine = (m.tourPoitrineCm + c.aisancePoitrineCm) / 4;
  const quartTaille = (m.tourTailleCm + c.aisanceTailleCm) / 4;
  const quartHanches = (m.tourHanchesCm + c.aisanceHanchesCm) / 4;
  const demiEncolure = m.largeurEpaulesCm * c.ratioDemiEncolure;
  const yTaille = m.longueurDosCm;
  const yHanches = Math.min(yTaille + c.hauteurHanchesCm, m.longueurRobeCm - 12);
  const epauleDe = { x: demiEncolure, y: 0 };
  const epauleA = { x: m.largeurEpaulesCm / 2, y: c.penteEpauleCm };
  // Couture de côté PARTAGÉE devant/dos : emmanchure → taille (pince comprise)
  // → hanches → bas, échantillonnée à l'identique pour les deux pièces.
  const pointEmmanchure = { x: quartPoitrine, y: yPoitrine };
  const pointTaille = { x: quartTaille + c.largeurPinceCm, y: yTaille };
  const pointHanches = { x: quartHanches, y: yHanches };
  const pointBas = { x: quartHanches + c.elargissementBasCm, y: m.longueurRobeCm };
  const coteCote: Point[] = [
    ...bezier(pointEmmanchure, { x: quartPoitrine + 0.5, y: (yPoitrine + yTaille) / 2 }, { x: pointTaille.x + 1.2, y: yTaille - 4 }, pointTaille, 10),
    ...bezier(pointTaille, { x: pointTaille.x + 1.5, y: yTaille + 5 }, { x: quartHanches + 0.8, y: yHanches - 5 }, pointHanches, 10),
    pointBas
  ];
  return {
    quartPoitrine,
    quartTaille,
    quartHanches,
    largeurBas: pointBas.x,
    demiEncolure,
    profondeurEncolureDevant: demiEncolure + 2,
    yPoitrine,
    yTaille,
    yHanches,
    epaule: { de: epauleDe, a: epauleA, longueur: Math.hypot(epauleA.x - epauleDe.x, epauleA.y - epauleDe.y) },
    coteCote
  };
}

function moitie(m: MesuresRobeFourreau, base: Base, dos: boolean, options: OptionsRobeFourreau): PieceBrouillon {
  const c = BROUILLON_ROBE_FOURREAU;
  const profondeurEncolure = dos ? c.profondeurEncolureDosCm : base.profondeurEncolureDevant;
  const departEncolure: Point = { x: 0, y: profondeurEncolure };
  const encolure = bezier(
    departEncolure,
    { x: 0, y: profondeurEncolure * 0.3 },
    { x: base.epaule.de.x * 0.55, y: 0 },
    base.epaule.de,
    12
  );
  const longueurEncolure = longueurPoly([departEncolure, ...encolure]);
  const emmanchure = bezier(
    base.epaule.a,
    { x: base.epaule.a.x + 0.4, y: base.yPoitrine * 0.55 },
    { x: base.quartPoitrine + 1, y: base.yPoitrine * 0.85 },
    { x: base.quartPoitrine, y: base.yPoitrine },
    12
  );
  const couture: Point[] = [
    departEncolure,
    ...encolure,
    base.epaule.a,
    ...emmanchure,
    ...base.coteCote,
    { x: 0, y: m.longueurRobeCm }
  ];
  const xPince = base.quartTaille * (dos ? 0.45 : 0.55);
  const traits: Point[][] = [
    [
      { x: xPince - c.largeurPinceCm / 2, y: base.yTaille },
      { x: xPince, y: base.yTaille - c.longueurPinceHautCm },
      { x: xPince + c.largeurPinceCm / 2, y: base.yTaille }
    ],
    [
      { x: xPince - c.largeurPinceCm / 2, y: base.yTaille },
      { x: xPince, y: base.yTaille + c.longueurPinceBasCm },
      { x: xPince + c.largeurPinceCm / 2, y: base.yTaille }
    ]
  ];
  if (!dos && options.encolure === 'fendue_v') {
    traits.push([
      { x: 0, y: profondeurEncolure },
      { x: 0, y: profondeurEncolure + c.profondeurFenteVCm }
    ]);
  }
  if (dos && options.fermetureDos) {
    traits.push([
      { x: 0.8, y: profondeurEncolure + 2 },
      { x: 0.8, y: base.yHanches }
    ]);
  }
  const fermeture = Boolean(options.fermetureDos);
  return construirePiece({
    id: dos ? 'dos' : 'devant',
    nomCle: dos ? 'piece.dos' : 'piece.devant', quantite: dos ? 2 : 1,
    detailCle: dos ? (fermeture ? 'piece.detail.fermetureMilieuDos' : 'piece.detail.milieuDos') : 'piece.detail.auPli',
    couture,
    filDroit: { de: { x: base.quartHanches / 2, y: base.yPoitrine + 6 }, a: { x: base.quartHanches / 2, y: m.longueurRobeCm - 10 } },
    crans: [
      { x: base.quartHanches, y: base.yHanches },
      { x: base.quartPoitrine, y: base.yPoitrine }
    ],
    traitsInterieurs: traits,
    lignesConstruction: [
      [
        { x: 0, y: base.yPoitrine },
        { x: base.quartPoitrine, y: base.yPoitrine }
      ],
      [
        { x: 0, y: base.yTaille },
        { x: base.quartTaille + c.largeurPinceCm, y: base.yTaille }
      ],
      [
        { x: 0, y: base.yHanches },
        { x: base.quartHanches, y: base.yHanches }
      ]
    ],
    cotes: [
      { libelleCle: 'cote.poitrine', valeurCm: base.quartPoitrine, de: { x: 0, y: base.yPoitrine }, a: { x: base.quartPoitrine, y: base.yPoitrine }, texte: { x: base.quartPoitrine / 2, y: base.yPoitrine } },
      { libelleCle: 'cote.taille', valeurCm: base.quartTaille, de: { x: 0, y: base.yTaille - 3.5 }, a: { x: base.quartTaille, y: base.yTaille - 3.5 }, texte: { x: base.quartTaille / 2, y: base.yTaille - 3.5 } },
      { libelleCle: 'cote.hanches', valeurCm: base.quartHanches, de: { x: 0, y: base.yHanches }, a: { x: base.quartHanches, y: base.yHanches }, texte: { x: base.quartHanches / 2, y: base.yHanches } },
      { libelleCle: 'cote.nuqueTaille', valeurCm: m.longueurDosCm, de: { x: 2.2, y: 0 }, a: { x: 2.2, y: base.yTaille }, texte: { x: 2.2, y: base.yTaille / 2 } },
      {
        libelleCle: 'cote.longueurRobe',
        valeurCm: m.longueurRobeCm,
        de: { x: base.largeurBas + 1.6, y: 0 },
        a: { x: base.largeurBas + 1.6, y: m.longueurRobeCm },
        texte: { x: base.largeurBas + 1.6, y: m.longueurRobeCm / 2 }
      },
      {
        libelleCle: 'cote.epaule',
        valeurCm: Math.round(base.epaule.longueur * 10) / 10,
        de: base.epaule.de,
        a: base.epaule.a,
        texte: { x: (base.epaule.de.x + base.epaule.a.x) / 2, y: -1.2 }
      },
      {
        libelleCle: 'cote.encolure',
        valeurCm: Math.round(longueurEncolure * 10) / 10,
        de: departEncolure,
        a: base.epaule.de,
        texte: { x: base.demiEncolure / 2, y: profondeurEncolure / 2 }
      }
    ],
    mesuresPatron: [
      { libelleCle: 'cote.poitrineQuart', valeurCm: base.quartPoitrine },
      { libelleCle: 'cote.tailleQuartPince', valeurCm: base.quartTaille },
      { libelleCle: 'cote.hanchesQuart', valeurCm: base.quartHanches },
      { libelleCle: 'cote.nuqueTaille', valeurCm: m.longueurDosCm },
      { libelleCle: 'cote.longueurDeRobe', valeurCm: m.longueurRobeCm },
      { libelleCle: 'cote.epaule', valeurCm: Math.round(base.epaule.longueur * 10) / 10 },
      { libelleCle: 'cote.encolureDemi', valeurCm: Math.round(longueurEncolure * 10) / 10 }
    ]
  });
}

function mancheCourte(base: Base): PieceBrouillon {
  const c = BROUILLON_ROBE_FOURREAU;
  const hauteurTete = base.yPoitrine * c.ratioTeteManche;
  const demiLargeur = base.quartPoitrine + 3;
  const cap = bezier({ x: 0, y: hauteurTete }, { x: demiLargeur * 0.25, y: 0 }, { x: demiLargeur * 0.75, y: 0 }, { x: demiLargeur, y: hauteurTete }, 12);
  return construirePiece({
    id: 'manche',
    nomCle: 'piece.manche', quantite: 2,
    couture: [
      { x: 0, y: hauteurTete },
      ...cap,
      { x: demiLargeur - 1.5, y: hauteurTete + c.longueurMancheCourteCm },
      { x: 0, y: hauteurTete + c.longueurMancheCourteCm }
    ],
    filDroit: { de: { x: demiLargeur / 2, y: hauteurTete + 3 }, a: { x: demiLargeur / 2, y: hauteurTete + c.longueurMancheCourteCm - 3 } },
    crans: [{ x: demiLargeur / 2, y: 0.8 }],
    cotes: [
      {
        libelleCle: 'cote.longueurManche',
        valeurCm: c.longueurMancheCourteCm,
        de: { x: demiLargeur - 3.4, y: hauteurTete },
        a: { x: demiLargeur - 3.4, y: hauteurTete + c.longueurMancheCourteCm },
        texte: { x: demiLargeur - 3.4, y: hauteurTete + c.longueurMancheCourteCm / 2 }
      },
      {
        libelleCle: 'cote.largeurManche',
        valeurCm: demiLargeur,
        de: { x: 0, y: hauteurTete + c.longueurMancheCourteCm },
        a: { x: demiLargeur - 1.5, y: hauteurTete + c.longueurMancheCourteCm },
        texte: { x: demiLargeur / 2, y: hauteurTete + c.longueurMancheCourteCm }
      }
    ],
    mesuresPatron: [
      { libelleCle: 'cote.longueurMancheFinie', valeurCm: c.longueurMancheCourteCm },
      { libelleCle: 'cote.demiLargeurManche', valeurCm: demiLargeur }
    ]
  });
}

export function genererPatronRobeFourreau(m: MesuresRobeFourreau, options: OptionsRobeFourreau = {}): PieceBrouillon[] {
  const base = calculerBase(m);
  const pieces = [moitie(m, base, false, options), moitie(m, base, true, options)];
  if (options.manches === 'manche_courte') pieces.push(mancheCourte(base));
  return pieces;
}
