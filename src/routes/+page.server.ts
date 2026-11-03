import type { PageServerLoad } from './$types';
import { preparerCartePatron, preparerPatronGenerique, type PatronGeneriquePrepare } from '$lib/design/patron-cote';
import { estModelePatron, REGISTRE_MODELES, texteResumeMesures } from '$lib/patterns/registre';
import { getRepository } from '$lib/server/repository';
import { parametresDepuisPatron } from '$lib/server/patron-cliente';

const NB_MESURES_FICHE = 9;

/** Accueil public (visiteur) / tableau de bord (utilisatrice connectée, maquette Atelier). */
export const load: PageServerLoad = async ({ locals, url }) => {
  const u = locals.utilisatrice;
  if (!u) {
    return { connectee: false, bienvenue: false, tableau: null };
  }
  const repo = getRepository();
  const clientes = await repo.listerClientes(u.atelierId);
  const parCliente = await Promise.all(
    clientes.map(async (c) => {
      const [mensurations, patrons] = await Promise.all([repo.listerMensurations(c.id), repo.listerPatrons(u.atelierId, c.id)]);
      return { cliente: c, nbMesures: mensurations.length, patrons };
    })
  );

  const tousPatrons = parCliente
    .flatMap(({ cliente, patrons }) => patrons.map((p) => ({ patron: p, cliente })))
    .sort((a, b) => b.patron.createdAt.getTime() - a.patron.createdAt.getTime());

  const incompletes = parCliente
    .filter((x) => x.nbMesures < NB_MESURES_FICHE)
    .slice(0, 3)
    .map(({ cliente, nbMesures }) => ({ id: cliente.id, nom: cliente.nom, nbMesures, total: NB_MESURES_FICHE }));

  const nbCompletes = parCliente.filter((x) => x.nbMesures >= NB_MESURES_FICHE).length;

  // Dernier patron, TOUS modèles confondus : le plus récent qui se génère.
  // Le modèle vient du registre — une jupe s'affiche comme une jupe.
  let dernierPatron = null;
  for (const candidat of tousPatrons) {
    if (!estModelePatron(candidat.patron.modele)) continue;
    const entree = REGISTRE_MODELES[candidat.patron.modele];
    try {
      const carte = preparerCartePatron(entree, candidat.patron.mesures, candidat.patron.options);
      dernierPatron = {
        id: candidat.patron.id,
        clienteId: candidat.cliente.id,
        clienteNom: candidat.cliente.nom,
        prenomCliente: candidat.cliente.nom.trim().split(/\s+/)[0] ?? candidat.cliente.nom,
        nom: candidat.patron.nom,
        titreModele: entree.titre,
        creeLe: candidat.patron.createdAt.toISOString(),
        mesuresPantalon: carte.mesuresPantalon,
        generique: carte.generique,
        lignes: carte.lignes,
        hrefSalle: `/clientes/${candidat.cliente.id}/patron/${candidat.patron.id}`,
        hrefPdf: `/patron/pdf?${parametresDepuisPatron(entree.id, candidat.patron.nom, candidat.patron.mesures, candidat.patron.options).toString()}`
      };
      break;
    } catch {
      // Patron illisible (mesures incomplètes) : on essaie le précédent.
    }
  }

  return {
    connectee: true,
    bienvenue: url.searchParams.get('bienvenue') === 'atelier',
    tableau: {
      prenom: u.nom.trim().split(/\s+/)[0] ?? u.nom,
      incompletes,
      nbIncompletes: parCliente.filter((x) => x.nbMesures < NB_MESURES_FICHE).length,
      stats: {
        clientes: clientes.length,
        patrons: tousPatrons.length,
        completes: nbCompletes,
        pourcentage: clientes.length ? Math.round((nbCompletes / clientes.length) * 100) : 0
      },
      recentes: [...parCliente].reverse().slice(0, 4).map(({ cliente, nbMesures, patrons }) => ({
        id: cliente.id,
        nom: cliente.nom,
        telephone: cliente.telephone ?? null,
        nbMesures,
        total: NB_MESURES_FICHE,
        nbPatrons: patrons.length
      })),
      derniersPatrons: tousPatrons.slice(0, 3).map(({ patron, cliente }) => {
        const entree = estModelePatron(patron.modele) ? REGISTRE_MODELES[patron.modele] : null;
        let vignette: PatronGeneriquePrepare | null = null;
        if (entree) {
          try {
            vignette = preparerPatronGenerique(entree, patron.mesures, patron.options);
          } catch {
            vignette = null;
          }
        }
        return {
          id: patron.id,
          clienteId: cliente.id,
          clienteNom: cliente.nom,
          nom: patron.nom,
          modele: patron.modele,
          titreModele: entree ? entree.titre : 'Modèle indisponible',
          vignette,
          texte: entree ? texteResumeMesures(entree, patron.mesures) : patron.modele
        };
      }),
      dernierPatron
    }
  };
};
