import { describe, expect, it } from 'vitest';
import { RepositoryMemoire } from './repository-memory';

/**
 * Patrons de cliente : cloisonnement par atelier et cascade à la suppression.
 * Même famille de garanties que les clientes/mensurations (repository-memory.test.ts).
 */
async function atelierAvecCliente(repo: RepositoryMemoire, nomAtelier: string) {
  const admin = await repo.creerAtelierEtAdmin({
    nomAtelier,
    nom: `Admin ${nomAtelier}`,
    identifiant: `admin@${nomAtelier}.bj`,
    motDePasseHash: 'hash-de-test'
  });
  const cliente = await repo.creerCliente(admin.atelierId, 'Cliente Patron', '+22996000000');
  return { admin, cliente };
}

const entreePatron = (clienteId: string, creePar: string) => ({
  clienteId,
  modele: 'pantalon_large',
  nom: 'Pantalon large — test',
  mesures: { tour_taille_cm: 82, tour_hanches_cm: 100, hauteur_fourche_cm: 27, longueur_pantalon_cm: 105 },
  options: {},
  tissu: { couleurId: 'bleu-denim', matiereId: 'denim' },
  creePar
});

describe('patrons de cliente (dépôt mémoire)', () => {
  it('crée, liste, retrouve et modifie un patron de son atelier', async () => {
    const repo = new RepositoryMemoire();
    const { admin, cliente } = await atelierAvecCliente(repo, 'atelier-a');
    const patron = await repo.creerPatron(admin.atelierId, entreePatron(cliente.id, admin.id));
    expect(patron.statut).toBe('brouillon');
    expect(await repo.listerPatrons(admin.atelierId, cliente.id)).toHaveLength(1);
    await repo.modifierPatron(admin.atelierId, patron.id, {
      nom: 'Pantalon large — renommé',
      mesures: { tour_taille_cm: 84 },
      options: { largeurBasPieceCm: 24 },
      tissu: { couleurId: 'noir', matiereId: 'satin' }
    });
    const relu = await repo.trouverPatron(admin.atelierId, patron.id);
    expect(relu?.nom).toBe('Pantalon large — renommé');
    expect(relu?.mesures.tour_taille_cm).toBe(84);
    expect(relu?.tissu.couleurId).toBe('noir');
  });

  it('un autre atelier ne voit, ne lit, ne modifie et ne supprime aucun patron', async () => {
    const repo = new RepositoryMemoire();
    const a = await atelierAvecCliente(repo, 'atelier-a');
    const b = await atelierAvecCliente(repo, 'atelier-b');
    const patron = await repo.creerPatron(a.admin.atelierId, entreePatron(a.cliente.id, a.admin.id));

    expect(await repo.listerPatrons(b.admin.atelierId, a.cliente.id)).toEqual([]);
    expect(await repo.trouverPatron(b.admin.atelierId, patron.id)).toBeUndefined();
    await repo.modifierPatron(b.admin.atelierId, patron.id, {
      nom: 'Détourné',
      mesures: {},
      options: {},
      tissu: { couleurId: 'noir', matiereId: 'lin' }
    });
    await repo.supprimerPatron(b.admin.atelierId, patron.id);
    expect((await repo.trouverPatron(a.admin.atelierId, patron.id))?.nom).toBe('Pantalon large — test');
    await expect(repo.creerPatron(b.admin.atelierId, entreePatron(a.cliente.id, b.admin.id))).rejects.toThrow();
    expect(await repo.resumerPatronsParCliente(b.admin.atelierId)).toEqual({});
  });

  it('supprimer la cliente supprime ses patrons en cascade', async () => {
    const repo = new RepositoryMemoire();
    const { admin, cliente } = await atelierAvecCliente(repo, 'atelier-a');
    await repo.creerPatron(admin.atelierId, entreePatron(cliente.id, admin.id));
    await repo.creerPatron(admin.atelierId, entreePatron(cliente.id, admin.id));
    expect((await repo.resumerPatronsParCliente(admin.atelierId))[cliente.id]?.nombre).toBe(2);
    await repo.supprimerCliente(admin.atelierId, cliente.id);
    expect(await repo.listerPatrons(admin.atelierId, cliente.id)).toEqual([]);
    expect(await repo.resumerPatronsParCliente(admin.atelierId)).toEqual({});
  });
});
