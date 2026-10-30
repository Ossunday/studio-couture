/**
 * Patron BROUILLON — types et géométrie de base partagés (pantalon large, jupe droite).
 *
 * ⚠️ Règle n°3 : aucune des valeurs de construction utilisées par les géométries
 * « brouillon » n'est validée par un tailleur. Elles sont regroupées dans les
 * constantes BROUILLON_* de chaque modèle, affichées dans l'interface avec le
 * statut « a_valider » (voir docs/FORMULES_A_VALIDER.md), et chaque aperçu/PDF
 * porte la bannière « brouillon non validé ». Le moteur de production
 * (engine.ts, tenterGenerationPatron) reste bloqué, inchangé.
 */
export interface Point {
  x: number;
  y: number;
}

export interface CotePiece {
  libelle: string;
  valeurCm: number;
  /** Segment de cotation dessiné (cm, repère local). */
  de: Point;
  a: Point;
  /** Centre de l'étiquette (fond clair dessiné par le rendu). */
  texte: Point;
}

export interface PieceBrouillon {
  id: string;
  nom: string;
  /** Trait de couture (cm, repère local de la pièce, y vers le bas). Courbes échantillonnées en points. */
  couture: Point[];
  /** Trait de coupe = couture + marges (1 cm, ourlet 2 cm en bas). */
  coupe: Point[];
  /** Fil droit : segment à dessiner avec flèches. */
  filDroit: { de: Point; a: Point };
  /** Crans : petits points de repère sur le trait de couture. */
  crans: Point[];
  /** Traits intérieurs en pointillés (pinces, pli…) : polylignes libres. */
  traitsInterieurs?: Point[][];
  /** Cotes avec flèches et valeurs (aperçu SVG et PDF). */
  cotes?: CotePiece[];
  /** Lignes de construction (hanches, genou…) en tirets légers. */
  lignesConstruction?: Point[][];
  /** Mesures calculées de la pièce, pour le tableau « Mesures du patron ». */
  mesuresPatron?: { libelle: string; valeurCm: number }[];
}

export interface PiecePlacee extends PieceBrouillon {
  /** Translation dans le plan d'ensemble (cm). */
  dx: number;
  dy: number;
}

export function largeurPiece(p: PieceBrouillon): number {
  const xs = p.coupe.map((pt) => pt.x);
  return Math.max(...xs) - Math.min(...xs);
}
export function hauteurPiece(p: PieceBrouillon): number {
  const ys = p.coupe.map((pt) => pt.y);
  return Math.max(...ys) - Math.min(...ys);
}
export function boite(p: PiecePlacee): { x1: number; y1: number; x2: number; y2: number } {
  const xs = p.coupe.map((pt) => pt.x + p.dx);
  const ys = p.coupe.map((pt) => pt.y + p.dy);
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
}

/** Deux boîtes se chevauchent-elles ? (test d'agencement des pièces) */
export function boitesSeChevauchent(
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number }
): boolean {
  return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
}

/**
 * Décale un polygone vers l'extérieur de `distance` cm (jointure en onglet).
 * Suffisant pour un brouillon : polygones simples, quasi convexes.
 */
export function decalerPolygone(points: Point[], distance: number): Point[] {
  const n = points.length;
  const aire =
    points.reduce((acc, p, i) => {
      const q = points[(i + 1) % n]!;
      return acc + p.x * q.y - q.x * p.y;
    }, 0) / 2;
  const sens = aire > 0 ? -1 : 1; // y vers le bas : le signe est inversé vs maths usuelles
  return points.map((p, i) => {
    const prec = points[(i - 1 + n) % n]!;
    const suiv = points[(i + 1) % n]!;
    const n1 = normale(prec, p, sens);
    const n2 = normale(p, suiv, sens);
    let mx = n1.x + n2.x;
    let my = n1.y + n2.y;
    const len = Math.hypot(mx, my) || 1;
    mx /= len;
    my /= len;
    const cos = Math.max(0.5, mx * n1.x + my * n1.y); // borne l'onglet
    return { x: p.x + (mx * distance) / cos, y: p.y + (my * distance) / cos };
  });
}

function normale(de: Point, a: Point, sens: number): Point {
  const dx = a.x - de.x;
  const dy = a.y - de.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: (-dy / len) * sens, y: (dx / len) * sens };
}

/**
 * Construit une pièce : le trait de coupe décale le trait de couture de 1 cm,
 * avec 1 cm de plus (2 cm au total) sur les points du bas (ourlet).
 */
export function construirePiece(base: Omit<PieceBrouillon, 'coupe'>): PieceBrouillon {
  const coupe = decalerPolygone(base.couture, 1);
  const yMax = Math.max(...base.couture.map((p) => p.y));
  for (let i = 0; i < coupe.length; i++) {
    if (Math.abs(base.couture[i]!.y - yMax) < 0.001) coupe[i] = { x: coupe[i]!.x, y: coupe[i]!.y + 1 };
  }
  return { ...base, coupe };
}

/** Place les pièces côte à côte (écart 5 cm), ceinture éventuelle dessous. */
export function agencerPieces(pieces: PieceBrouillon[]): { pieces: PiecePlacee[]; largeur: number; hauteur: number } {
  const placees: PiecePlacee[] = [];
  let x = 0;
  let hauteurLigne = 0;
  for (const piece of pieces.filter((p) => p.id !== 'ceinture')) {
    const minX = Math.min(...piece.coupe.map((pt) => pt.x));
    const minY = Math.min(...piece.coupe.map((pt) => pt.y));
    placees.push({ ...piece, dx: x - minX, dy: -minY });
    x += largeurPiece(piece) + 5;
    hauteurLigne = Math.max(hauteurLigne, hauteurPiece(piece));
  }
  let hauteur = hauteurLigne;
  const ceinture = pieces.find((p) => p.id === 'ceinture');
  if (ceinture) {
    const minX = Math.min(...ceinture.coupe.map((pt) => pt.x));
    const minY = Math.min(...ceinture.coupe.map((pt) => pt.y));
    placees.push({ ...ceinture, dx: -minX, dy: hauteurLigne + 9 - minY });
    hauteur = hauteurLigne + 9 + hauteurPiece(ceinture);
  }
  return { pieces: placees, largeur: Math.max(x - 5, ceinture ? largeurPiece(ceinture) : 0), hauteur };
}

export function pointsEnAttribut(points: Point[], dx = 0, dy = 0): string {
  return points.map((p) => `${(p.x + dx).toFixed(2)},${(p.y + dy).toFixed(2)}`).join(' ');
}
