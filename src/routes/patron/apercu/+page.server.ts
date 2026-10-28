import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { definitionMensuration } from '$lib/domain/mensurations-saisie';
import { pointsEnAttribut } from '$lib/patterns/brouillon';
import { FORMULES_PANTALON_LARGE } from '$lib/patterns/pantalon-large/formulas';
import { FORMULES_JUPE_DROITE } from '$lib/patterns/jupe-droite/formulas';
import {
  estModelePatron,
  genererPiecesPlacees,
  MODELES,
  parametresPatron,
  validerMesuresPatron
} from '$lib/patterns/saisie-patron';
import { exigerConnexion } from '$lib/server/garde';

export const load: PageServerLoad = async ({ locals, url }) => {
  exigerConnexion(locals.utilisatrice);
  const modele = url.searchParams.get('modele');
  if (!estModelePatron(modele)) throw redirect(303, '/');
  const nom = (url.searchParams.get('nom') ?? '').trim().slice(0, 60) || 'sans nom';
  let mesures: Record<string, number>;
  try {
    mesures = validerMesuresPatron(modele, (code) => url.searchParams.get(code));
  } catch {
    throw redirect(303, `/patron/mesures?modele=${modele}`);
  }
  const { pieces, largeur, hauteur } = genererPiecesPlacees(modele, mesures);
  const formules = modele === 'pantalon_large' ? FORMULES_PANTALON_LARGE : FORMULES_JUPE_DROITE;
  return {
    modele,
    titre: MODELES[modele].titre,
    nom,
    mesures: MODELES[modele].champs.map((code) => ({
      code,
      libelle: definitionMensuration(code).libelle,
      valeur: mesures[code]
    })),
    largeur: Math.ceil(largeur),
    hauteur: Math.ceil(hauteur),
    pieces: pieces.map((p) => ({
      id: p.id,
      nom: p.nom,
      coupe: pointsEnAttribut(p.coupe, p.dx, p.dy),
      couture: pointsEnAttribut(p.couture, p.dx, p.dy),
      filDroit: {
        x1: p.filDroit.de.x + p.dx,
        y1: p.filDroit.de.y + p.dy,
        x2: p.filDroit.a.x + p.dx,
        y2: p.filDroit.a.y + p.dy
      },
      crans: p.crans.map((c) => ({ x: c.x + p.dx, y: c.y + p.dy })),
      traits: (p.traitsInterieurs ?? []).map((t) => pointsEnAttribut(t, p.dx, p.dy)),
      etiquetteX: Math.min(...p.coupe.map((pt) => pt.x)) + p.dx + 2,
      etiquetteY: Math.min(...p.coupe.map((pt) => pt.y)) + p.dy + 5
    })),
    formules: formules.map((f) => ({ element: f.element, hypotheses: f.hypotheses, statut: f.statut })),
    hrefPdf: `/patron/pdf?${parametresPatron(modele, nom, mesures).toString()}`,
    hrefMesures: `/patron/mesures?modele=${modele}`
  };
};
