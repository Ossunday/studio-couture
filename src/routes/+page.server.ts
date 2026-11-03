import type { PageServerLoad } from './$types';
import { preparerPatronCote, type MesuresPatronCote } from '$lib/design/patron-cote';
import { getRepository } from '$lib/server/repository';
import { parametresDepuisPatron } from '$lib/server/patron-cliente';

const NB_MESURES_FICHE = 9;

function mesuresPantalon(mesures: Record<string, number>): MesuresPatronCote | null {
  const taille = mesures['tour_taille_cm'];
  const hanches = mesures['tour_hanches_cm'];
  const fourche = mesures['hauteur_fourche_cm'];
  const longueur = mesures['longueur_pantalon_cm'];
  if (taille === undefined || hanches === undefined || fourche === undefined || longueur === undefined) return null;
  return { tourTailleCm: taille, tourHanchesCm: hanches, hauteurFourcheCm: fourche, longueurPantalonCm: longueur };
}

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

  const dernier = tousPatrons.find((x) => x.patron.modele === 'pantalon_large' && mesuresPantalon(x.patron.mesures));
  let dernierPatron = null;
  if (dernier) {
    const mesures = mesuresPantalon(dernier.patron.mesures)!;
    try {
      const prepare = preparerPatronCote(mesures, dernier.patron.modele === 'pantalon_large' ? dernier.patron.options : {});
      dernierPatron = {
        id: dernier.patron.id,
        clienteId: dernier.cliente.id,
        clienteNom: dernier.cliente.nom,
        prenomCliente: dernier.cliente.nom.trim().split(/\s+/)[0] ?? dernier.cliente.nom,
        nom: dernier.patron.nom,
        creeLe: dernier.patron.createdAt.toISOString(),
        mesures,
        lignes: [
          { libelle: 'Ceinture', valeur: `${prepare.valeurs.ceinture} cm × ${prepare.valeurs.ceintureHauteur} cm` },
          { libelle: 'Taille', valeur: `${prepare.valeurs.taille} cm` },
          { libelle: 'Hanches', valeur: `${prepare.valeurs.hanches} cm` },
          { libelle: 'Fourche', valeur: `${prepare.valeurs.fourche} cm` },
          { libelle: 'Longueur', valeur: `${prepare.valeurs.longueur} cm` },
          { libelle: 'Bas', valeur: `${prepare.valeurs.basDevant} cm` }
        ],
        hrefSalle: `/clientes/${dernier.cliente.id}/patron/${dernier.patron.id}`,
        hrefPdf: `/patron/pdf?${parametresDepuisPatron('pantalon_large', dernier.patron.nom, dernier.patron.mesures, dernier.patron.options).toString()}`
      };
    } catch {
      dernierPatron = null;
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
      derniersPatrons: tousPatrons.slice(0, 3).map(({ patron, cliente }) => ({
        id: patron.id,
        clienteId: cliente.id,
        clienteNom: cliente.nom,
        nom: patron.nom,
        modele: patron.modele,
        mesures: mesuresPantalon(patron.mesures),
        texte: (() => {
          const m = mesuresPantalon(patron.mesures);
          return m ? `Taille ${String(m.tourTailleCm).replace('.', ',')} · Hanches ${String(m.tourHanchesCm).replace('.', ',')}` : patron.modele;
        })()
      })),
      dernierPatron
    }
  };
};
