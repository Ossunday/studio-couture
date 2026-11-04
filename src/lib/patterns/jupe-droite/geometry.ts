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
  const largeurBas = quartHanches + c.elargissementBasCm;
  return construirePiece({
    id: dos ? 'dos' : 'devant',
    nomCle: dos ? 'piece.dos' : 'piece.devant', quantite: dos ? 2 : 1,
    detailCle: dos ? 'piece.detail.milieuFermeture' : 'piece.detail.auPli',
    couture,
    filDroit: { de: { x: quartHanches / 2, y: 10 }, a: { x: quartHanches / 2, y: m.longueurJupeCm - 10 } },
    crans: [{ x: quartHanches, y: hauteurHanches }],
    traitsInterieurs: [
      [
        { x: xPince - c.largeurPinceCm / 2, y: 0 },
        { x: xPince, y: longueurPince },
        { x: xPince + c.largeurPinceCm / 2, y: 0 }
      ]
    ],
    // Cotes génériques (données) : mêmes libellés que les mesures de la pièce,
    // dessinées par le rendu commun — aucun libellé d'un autre vêtement.
    cotes: [
      { libelleCle: 'cote.taille', valeurCm: quartTaille, de: { x: 0, y: 5 }, a: { x: quartTaille, y: 5 }, texte: { x: quartTaille / 2, y: 5 } },
      { libelleCle: 'cote.hanches', valeurCm: quartHanches, de: { x: 0, y: hauteurHanches }, a: { x: quartHanches, y: hauteurHanches }, texte: { x: quartHanches / 2, y: hauteurHanches } },
      { libelleCle: 'cote.bas', valeurCm: largeurBas, de: { x: 0, y: m.longueurJupeCm }, a: { x: largeurBas, y: m.longueurJupeCm }, texte: { x: largeurBas / 2, y: m.longueurJupeCm } },
      { libelleCle: 'cote.longueur', valeurCm: m.longueurJupeCm, de: { x: 2.5, y: 0 }, a: { x: 2.5, y: m.longueurJupeCm }, texte: { x: 2.5, y: m.longueurJupeCm / 2 } }
    ],
    mesuresPatron: [
      { libelleCle: 'cote.taille', valeurCm: quartTaille },
      { libelleCle: 'cote.hanches', valeurCm: quartHanches },
      { libelleCle: 'cote.bas', valeurCm: largeurBas },
      { libelleCle: 'cote.longueur', valeurCm: m.longueurJupeCm }
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
    nomCle: 'piece.ceinture', quantite: 1,
    couture: [
      { x: 0, y: 0 },
      { x: longueurCeinture, y: 0 },
      { x: longueurCeinture, y: c.hauteurCeintureCoupeeCm },
      { x: 0, y: c.hauteurCeintureCoupeeCm }
    ],
    filDroit: { de: { x: 4, y: c.hauteurCeintureCoupeeCm / 2 }, a: { x: longueurCeinture - 4, y: c.hauteurCeintureCoupeeCm / 2 } },
    crans: [{ x: longueurCeinture / 2, y: 0 }],
    cotes: [
      { libelleCle: 'cote.longueurCeinture', valeurCm: longueurCeinture, de: { x: 0, y: c.hauteurCeintureCoupeeCm / 2 }, a: { x: longueurCeinture, y: c.hauteurCeintureCoupeeCm / 2 }, texte: { x: longueurCeinture / 2, y: c.hauteurCeintureCoupeeCm / 2 } },
      { libelleCle: 'cote.hauteurCoupee', valeurCm: c.hauteurCeintureCoupeeCm, de: { x: longueurCeinture - 3, y: 0 }, a: { x: longueurCeinture - 3, y: c.hauteurCeintureCoupeeCm }, texte: { x: longueurCeinture - 12, y: c.hauteurCeintureCoupeeCm / 2 } }
    ],
    mesuresPatron: [
      { libelleCle: 'cote.longueurCeintureCroisure', valeurCm: longueurCeinture },
      { libelleCle: 'cote.hauteurCoupee', valeurCm: c.hauteurCeintureCoupeeCm }
    ]
  });
  return [moitie(m, false), moitie(m, true), ceinture];
}
