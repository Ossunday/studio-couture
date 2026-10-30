import { boiteEtiquetteCote, pointsEnAttribut, type PiecePlacee } from './brouillon';

const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');

/** Données de rendu SVG d'une pièce placée (aperçu connecté et démo publique). */
export function preparerPiece(p: PiecePlacee) {
  return {
    id: p.id,
    nom: p.nom,
    coupe: pointsEnAttribut(p.coupe, p.dx, p.dy),
    couture: pointsEnAttribut(p.couture, p.dx, p.dy),
    filDroit: { x1: p.filDroit.de.x + p.dx, y1: p.filDroit.de.y + p.dy, x2: p.filDroit.a.x + p.dx, y2: p.filDroit.a.y + p.dy },
    crans: p.crans.map((c) => ({ x: c.x + p.dx, y: c.y + p.dy })),
    traits: (p.traitsInterieurs ?? []).map((t) => pointsEnAttribut(t, p.dx, p.dy)),
    lignes: (p.lignesConstruction ?? []).map((t) => pointsEnAttribut(t, p.dx, p.dy)),
    cotes: (p.cotes ?? []).map((ct) => {
      const valeur = fmt(ct.valeurCm);
      const fond = boiteEtiquetteCote(ct.texte.x + p.dx, ct.texte.y + p.dy, ct.libelle, valeur);
      return {
        libelle: ct.libelle,
        valeur,
        x1: ct.de.x + p.dx,
        y1: ct.de.y + p.dy,
        x2: ct.a.x + p.dx,
        y2: ct.a.y + p.dy,
        tx: ct.texte.x + p.dx,
        ty: ct.texte.y + p.dy,
        fondX: fond.x1,
        fondY: fond.y1,
        fondLargeur: fond.x2 - fond.x1,
        fondHauteur: fond.y2 - fond.y1
      };
    }),
    tableau: (p.mesuresPatron ?? []).map((mm) => ({ libelle: mm.libelle, valeur: fmt(mm.valeurCm) })),
    etiquetteX: Math.min(...p.coupe.map((pt) => pt.x)) + p.dx + 2,
    etiquetteY: Math.min(...p.coupe.map((pt) => pt.y)) + p.dy - 4.5
  };
}

export type PieceRendue = ReturnType<typeof preparerPiece>;
