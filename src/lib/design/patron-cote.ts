import { analyserPantalonLarge, genererPatronPantalonLarge, type MesuresPantalonLarge, type OptionsPantalonLarge } from '../patterns/pantalon-large/geometry';
import { pointsEnAttribut, type PieceBrouillon } from '../patterns/brouillon';

export type MesuresPatronCote = MesuresPantalonLarge;

export const MESURES_DEMONSTRATION: MesuresPatronCote = {
  tourTailleCm: 82,
  tourHanchesCm: 100,
  hauteurFourcheCm: 27,
  longueurPantalonCm: 105
};

const fmt = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ',');
};

function boite(piece: PieceBrouillon) {
  const xs = piece.coupe.map((p) => p.x);
  const ys = piece.coupe.map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys), largeur: Math.max(...xs) - Math.min(...xs), hauteur: Math.max(...ys) - Math.min(...ys) };
}

export interface PieceCotePreparee {
  id: string;
  nomCourt: 'DEVANT' | 'DOS';
  coupe: string;
  couture: string;
  traits: string[];
  filDroit: { x1: number; y1: number; x2: number; y2: number };
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  centreX: number;
  yHanches: number;
  basValeur: string;
}

/**
 * Prépare le dessin coté depuis le moteur brouillon (aucune valeur inventée) :
 * contours réels des pièces, ceinture au-dessus, valeurs des cotes relues
 * dans l'analyse et les mesures calculées des pièces.
 */
export function preparerPatronCote(mesures: MesuresPatronCote, options: OptionsPantalonLarge = {}) {
  const analyse = analyserPantalonLarge(mesures, options);
  const pieces = genererPatronPantalonLarge(mesures, options);
  const devantBrut = pieces.find((p) => p.id === 'devant')!;
  const dosBrut = pieces.find((p) => p.id === 'dos')!;
  const ceintureBrute = pieces.find((p) => p.id === 'ceinture')!;

  const ecart = 8;
  const marge = 13;
  const bDev = boite(devantBrut);
  const bDos = boite(dosBrut);
  const bCeint = boite(ceintureBrute);
  const largeurJambes = bDev.largeur + ecart + bDos.largeur;
  const largeurTotale = Math.max(bCeint.largeur, largeurJambes) + marge * 2;
  const xJambes = (largeurTotale - largeurJambes) / 2;
  const xCeinture = (largeurTotale - bCeint.largeur) / 2;

  const yCeinture = 11;
  const hauteurCeintureDessin = bCeint.hauteur;
  const yTitres = yCeinture + hauteurCeintureDessin + 9;
  const yJambes = yTitres + 4;
  const hauteurJambes = Math.max(bDev.hauteur, bDos.hauteur);
  const yBasCotes = yJambes + hauteurJambes + 6;
  const yLegende = yBasCotes + 9;
  const hauteurTotale = yLegende + 5;

  const placer = (piece: PieceBrouillon, b: ReturnType<typeof boite>, x: number, nomCourt: 'DEVANT' | 'DOS', bas: number): PieceCotePreparee => {
    const dx = x - b.minX;
    const dy = yJambes - b.minY;
    const yHanchesLocale = piece.lignesConstruction?.[0]?.[0]?.y ?? 18;
    return {
      id: piece.id,
      nomCourt,
      coupe: pointsEnAttribut(piece.coupe, dx, dy),
      couture: pointsEnAttribut(piece.couture, dx, dy),
      traits: (piece.traitsInterieurs ?? []).map((t) => pointsEnAttribut(t, dx, dy)),
      filDroit: { x1: piece.filDroit.de.x + dx, y1: piece.filDroit.de.y + dy, x2: piece.filDroit.a.x + dx, y2: piece.filDroit.a.y + dy },
      x,
      y: yJambes,
      largeur: b.largeur,
      hauteur: b.hauteur,
      centreX: x + b.largeur / 2,
      yHanches: yHanchesLocale + dy,
      basValeur: fmt(bas)
    };
  };

  const devant = placer(devantBrut, bDev, xJambes, 'DEVANT', analyse.devant.largeurBasCm);
  const dos = placer(dosBrut, bDos, xJambes + bDev.largeur + ecart, 'DOS', analyse.dos.largeurBasCm);
  const ceinture = {
    x: xCeinture,
    y: yCeinture,
    largeur: bCeint.largeur,
    hauteur: hauteurCeintureDessin,
    coupe: pointsEnAttribut(ceintureBrute.coupe, xCeinture - bCeint.minX, yCeinture - bCeint.minY),
    couture: pointsEnAttribut(ceintureBrute.couture, xCeinture - bCeint.minX, yCeinture - bCeint.minY)
  };

  const valeurs = {
    ceinture: fmt(analyse.longueurCeintureCm),
    ceintureHauteur: fmt(analyse.hauteurCeintureFinieCm),
    taille: fmt(mesures.tourTailleCm),
    hanches: fmt(mesures.tourHanchesCm),
    fourche: fmt(mesures.hauteurFourcheCm),
    longueur: fmt(mesures.longueurPantalonCm),
    basDevant: devant.basValeur,
    basDos: dos.basValeur
  };

  return {
    devant,
    dos,
    ceinture,
    valeurs,
    largeurTotale,
    hauteurTotale,
    yTitres,
    yJambes,
    hauteurJambes,
    yBasCotes,
    yLegende,
    ariaLabel: `Patron du pantalon, brouillon à valider : devant, dos et ceinture. Taille ${valeurs.taille} centimètres, hanches ${valeurs.hanches} centimètres, fourche ${valeurs.fourche} centimètres, longueur ${valeurs.longueur} centimètres, ceinture ${valeurs.ceinture} centimètres sur ${valeurs.ceintureHauteur} centimètres.`
  };
}

export type PatronCotePrepare = ReturnType<typeof preparerPatronCote>;
