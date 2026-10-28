import { construirePiece, type PieceBrouillon, type Point } from '../brouillon';

/**
 * Géométrie BROUILLON de la jupe droite — hypothèses « a_valider » listées
 * dans docs/FORMULES_A_VALIDER.md (le registre jupe-droite/formulas.ts reste
 * la référence : aucune formule de production tant qu'un tailleur n'a pas validé).
 */
export const BROUILLON_JUPE_DROITE = {
  aisanceTailleCm: 2,
  aisanceHanchesCm: 4,
  hauteurHanchesCm: 18,
  elargissementBasCm: 2,
  largeurPinceCm: 3,
  longueurPinceDevantCm: 12,
  longueurPinceDosCm: 14,
  croisureCeintureCm: 3,
  hauteurCeintureCoupeeCm: 8
} as const;

export interface MesuresJupeDroite {
  tourTailleCm: number;
  tourHanchesCm: number;
  longueurJupeCm: number;
}

function moitie(m: MesuresJupeDroite, dos: boolean): PieceBrouillon {
  const c = BROUILLON_JUPE_DROITE;
  const quartTaille = (m.tourTailleCm + c.aisanceTailleCm) / 4;
  const quartHanches = (m.tourHanchesCm + c.aisanceHanchesCm) / 4;
  const hauteurHanches = Math.min(c.hauteurHanchesCm, m.longueurJupeCm * 0.4);
  const couture: Point[] = [
    { x: 0, y: 0 },
    { x: quartTaille, y: 0 },
    { x: quartHanches, y: hauteurHanches },
    { x: quartHanches + c.elargissementBasCm, y: m.longueurJupeCm },
    { x: 0, y: m.longueurJupeCm }
  ];
  const xPince = quartTaille * 0.55;
  const longueurPince = dos ? c.longueurPinceDosCm : c.longueurPinceDevantCm;
  return construirePiece({
    id: dos ? 'dos' : 'devant',
    nom: dos ? 'Dos (×2, milieu avec fermeture)' : 'Devant (×1 au pli)',
    couture,
    filDroit: { de: { x: quartHanches / 2, y: 10 }, a: { x: quartHanches / 2, y: m.longueurJupeCm - 10 } },
    crans: [{ x: quartHanches, y: hauteurHanches }],
    traitsInterieurs: [
      [
        { x: xPince - c.largeurPinceCm / 2, y: 0 },
        { x: xPince, y: longueurPince },
        { x: xPince + c.largeurPinceCm / 2, y: 0 }
      ]
    ]
  });
}

export function genererPatronJupeDroite(m: MesuresJupeDroite): PieceBrouillon[] {
  if (m.tourHanchesCm < m.tourTailleCm - 20) {
    throw new Error('Vérifiez le tour de hanches : il est en général proche ou supérieur au tour de taille.');
  }
  const c = BROUILLON_JUPE_DROITE;
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
  return [moitie(m, false), moitie(m, true), ceinture];
}
