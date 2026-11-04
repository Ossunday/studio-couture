import { analyserPantalonLarge, genererPatronPantalonLarge, type MesuresPantalonLarge, type OptionsPantalonLarge } from '../patterns/pantalon-large/geometry';
import { agencerPieces, pointsEnAttribut, type PieceBrouillon } from '../patterns/brouillon';
import { preparerPiece, type PieceRendue } from '../patterns/apercu-rendu';
import { assertJamais, resumeMesures, type EntreeModele, type OptionsModele } from '../patterns/registre';
import { formatCm, t, type Lang } from '../i18n';

export type MesuresPatronCote = MesuresPantalonLarge;

export const MESURES_DEMONSTRATION: MesuresPatronCote = {
  tourTailleCm: 82,
  tourHanchesCm: 100,
  hauteurFourcheCm: 27,
  longueurPantalonCm: 105
};

const fmt = (v: number, lang: Lang = 'fr') => formatCm(lang, v);

function boite(piece: PieceBrouillon) {
  const xs = piece.coupe.map((p) => p.x);
  const ys = piece.coupe.map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys), largeur: Math.max(...xs) - Math.min(...xs), hauteur: Math.max(...ys) - Math.min(...ys) };
}

export interface PieceCotePreparee {
  id: string;
  nomCourt: string;
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
export function preparerPatronCote(mesures: MesuresPatronCote, options: OptionsPantalonLarge = {}, lang: Lang = 'fr') {
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

  const placer = (piece: PieceBrouillon, b: ReturnType<typeof boite>, x: number, nomCourt: string, bas: number): PieceCotePreparee => {
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
      basValeur: fmt(bas, lang)
    };
  };

  const devant = placer(devantBrut, bDev, xJambes, t(lang, 'patronCote.devant'), analyse.devant.largeurBasCm);
  const dos = placer(dosBrut, bDos, xJambes + bDev.largeur + ecart, t(lang, 'patronCote.dos'), analyse.dos.largeurBasCm);
  const ceinture = {
    x: xCeinture,
    y: yCeinture,
    largeur: bCeint.largeur,
    hauteur: hauteurCeintureDessin,
    coupe: pointsEnAttribut(ceintureBrute.coupe, xCeinture - bCeint.minX, yCeinture - bCeint.minY),
    couture: pointsEnAttribut(ceintureBrute.couture, xCeinture - bCeint.minX, yCeinture - bCeint.minY)
  };

  const valeurs = {
    ceinture: fmt(analyse.longueurCeintureCm, lang),
    ceintureHauteur: fmt(analyse.hauteurCeintureFinieCm, lang),
    taille: fmt(mesures.tourTailleCm, lang),
    hanches: fmt(mesures.tourHanchesCm, lang),
    fourche: fmt(mesures.hauteurFourcheCm, lang),
    longueur: fmt(mesures.longueurPantalonCm, lang),
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
    ariaLabel: t(lang, 'patronCote.ariaPantalon', { taille: valeurs.taille, hanches: valeurs.hanches, fourche: valeurs.fourche, longueur: valeurs.longueur, ceinture: valeurs.ceinture, ceintureHauteur: valeurs.ceintureHauteur })
  };
}

export type PatronCotePrepare = ReturnType<typeof preparerPatronCote>;

export interface PatronGeneriquePrepare {
  pieces: PieceRendue[];
  largeur: number;
  hauteur: number;
  titre: string;
  ariaLabel: string;
}

/**
 * Cotation GÉNÉRIQUE : prépare n'importe quel modèle du registre depuis les
 * cotes que ses pièces portent comme données (départ, arrivée, valeur,
 * libellé). Aucun libellé propre à un vêtement n'est ajouté ici.
 */
export function preparerPatronGenerique(
  entree: EntreeModele,
  mesures: Record<string, number>,
  options: OptionsModele = {},
  lang: Lang = 'fr'
): PatronGeneriquePrepare {
  const { pieces, largeur, hauteur } = agencerPieces(entree.genererPieces(mesures, options));
  const rendues = pieces.map((piece) => preparerPiece(piece, lang));
  return {
    pieces: rendues,
    largeur: Math.ceil(largeur),
    hauteur: Math.ceil(hauteur),
    titre: t(lang, 'patronCote.titreGenerique', { modele: t(lang, entree.titreCle) }),
    ariaLabel: t(lang, 'patronCote.ariaGenerique', { modele: t(lang, entree.titreCle), pieces: rendues.map((p) => p.nom).join(', ') })
  };
}

export interface CartePatronPreparee {
  /** Dessin spécialisé (pantalon large uniquement), sinon null. */
  mesuresPantalon: MesuresPatronCote | null;
  /** Dessin générique du registre, sinon null. */
  generique: PatronGeneriquePrepare | null;
  lignes: { libelle: string; valeur: string }[];
}

/**
 * Carte « dernier patron » des écrans : switch EXHAUSTIF sur le modèle
 * (le compilateur refuse un modèle non traité). Le pantalon garde son
 * dessin spécialisé historique ; les autres modèles passent par la
 * cotation générique du registre.
 */
export function preparerCartePatron(entree: EntreeModele, mesures: Record<string, number>, options: OptionsModele = {}, lang: Lang = 'fr'): CartePatronPreparee {
  switch (entree.id) {
    case 'pantalon_large': {
      const m: MesuresPatronCote = {
        tourTailleCm: mesures['tour_taille_cm']!,
        tourHanchesCm: mesures['tour_hanches_cm']!,
        hauteurFourcheCm: mesures['hauteur_fourche_cm']!,
        longueurPantalonCm: mesures['longueur_pantalon_cm']!
      };
      const prepare = preparerPatronCote(m, options as OptionsPantalonLarge, lang);
      return {
        mesuresPantalon: m,
        generique: null,
        lignes: [
          { libelle: t(lang, 'patronCote.ceinture'), valeur: `${prepare.valeurs.ceinture} cm × ${prepare.valeurs.ceintureHauteur} cm` },
          { libelle: t(lang, 'cote.taille'), valeur: `${prepare.valeurs.taille} cm` },
          { libelle: t(lang, 'cote.hanches'), valeur: `${prepare.valeurs.hanches} cm` },
          { libelle: t(lang, 'cote.fourche'), valeur: `${prepare.valeurs.fourche} cm` },
          { libelle: t(lang, 'cote.longueur'), valeur: `${prepare.valeurs.longueur} cm` },
          { libelle: t(lang, 'cote.bas'), valeur: `${prepare.valeurs.basDevant} cm` }
        ]
      };
    }
    case 'jupe_droite':
    case 'robe_fourreau':
      return {
        mesuresPantalon: null,
        generique: preparerPatronGenerique(entree, mesures, options, lang),
        lignes: resumeMesures(entree, mesures).map((x) => ({ libelle: t(lang, x.libelleCle), valeur: `${formatCm(lang, x.valeur)} cm` }))
      };
    default:
      return assertJamais(entree.id, 'preparerCartePatron');
  }
}
