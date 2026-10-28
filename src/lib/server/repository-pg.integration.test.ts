import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENV_DATABASE_URL } from '../brand';
import { chiffrer, dechiffrer } from './crypto';
import { RepositoryPg } from './repository-pg';

/**
 * Intégration PostgreSQL réelle de RepositoryPg (migrations 0001 + 0002 supposées appliquées ;
 * 0003 recommandée en production, mais le nettoyage afterAll passe aussi sans elle).
 * Ne s’exécute que si STUDIO_COUTURE_DATABASE_URL est définie ; ignoré proprement sinon,
 * pour que `npm test` reste vert sans base. Ne jamais afficher l’URL ni aucun secret :
 * elle n’est lue que pour construire le pool, sans journalisation.
 * Base dédiée aux tests recommandée : la purge supprime toute photo expirée de la base.
 */
const databaseUrl = process.env[ENV_DATABASE_URL];
const suffixe = randomUUID();

describe.skipIf(!databaseUrl)('RepositoryPg — intégration PostgreSQL', () => {
  let pool: Pool;
  let repo: RepositoryPg;
  const atelierIds: string[] = [];
  let adminA: Awaited<ReturnType<RepositoryPg['creerAtelierEtAdmin']>>;
  let adminB: Awaited<ReturnType<RepositoryPg['creerAtelierEtAdmin']>>;
  let clienteA: Awaited<ReturnType<RepositoryPg['creerCliente']>>;
  let photoValideId: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl, max: 2 });
    repo = new RepositoryPg(pool);
    adminA = await repo.creerAtelierEtAdmin({
      nomAtelier: `Intégration A ${suffixe}`,
      nom: 'Admin A',
      identifiant: `integration-a-${suffixe}@exemple.bj`,
      motDePasseHash: 'hash-fictif-integration'
    });
    atelierIds.push(adminA.atelierId);
    adminB = await repo.creerAtelierEtAdmin({
      nomAtelier: `Intégration B ${suffixe}`,
      nom: 'Admin B',
      identifiant: `integration-b-${suffixe}@exemple.bj`,
      motDePasseHash: 'hash-fictif-integration'
    });
    atelierIds.push(adminB.atelierId);
    clienteA = await repo.creerCliente(adminA.atelierId, 'Cliente de A', '+22996000000');
  }, 30_000);

  afterAll(async () => {
    try {
      // Ordre explicite, pour passer même si la migration 0003 n'est pas appliquée :
      // mensurations.validee_par (sans action avant 0003) bloque la suppression des
      // utilisatrices, et photos_clientes.consentement_id celle des consentements.
      // On supprime donc d'abord les mensurations, photos et consentements des
      // clientes de test ; la suppression des ateliers cascade ensuite le reste
      // (utilisatrices, sessions, clientes, projets).
      for (const id of atelierIds) {
        await pool.query('delete from mensurations where cliente_id in (select id from clientes where atelier_id = $1)', [id]);
        await pool.query('delete from photos_clientes where cliente_id in (select id from clientes where atelier_id = $1)', [id]);
        await pool.query('delete from consentements where cliente_id in (select id from clientes where atelier_id = $1)', [id]);
        await pool.query('delete from ateliers where id = $1', [id]);
      }
    } finally {
      await pool.end();
    }
  }, 30_000);

  it('crée un atelier, son compte admin et un compte couturière retrouvables', async () => {
    expect(adminA.role).toBe('admin');
    expect(adminA.atelierId).not.toBe(adminB.atelierId);
    expect(await repo.trouverCompteParIdentifiant(adminA.identifiant)).toMatchObject({ id: adminA.id, atelierId: adminA.atelierId });
    const couturiere = await repo.creerUtilisatrice({
      atelierId: adminA.atelierId,
      nom: 'Couturière A',
      identifiant: `integration-couturiere-${suffixe}@exemple.bj`,
      motDePasseHash: 'hash-fictif-integration',
      role: 'couturiere'
    });
    expect(couturiere.role).toBe('couturiere');
    expect((await repo.trouverCompteParIdentifiant(couturiere.identifiant))?.id).toBe(couturiere.id);
    expect(await repo.compterUtilisatrices()).toBeGreaterThanOrEqual(3);
  });

  it('crée, retrouve puis supprime une session ; une session expirée est ignorée', async () => {
    const hashValide = createHash('sha256').update(`session-valide-${suffixe}`).digest('hex');
    const hashExpire = createHash('sha256').update(`session-expiree-${suffixe}`).digest('hex');
    await repo.creerSession(adminA.id, hashValide, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    await repo.creerSession(adminA.id, hashExpire, new Date(Date.now() - 1000));
    expect((await repo.trouverSession(hashValide))?.utilisatrice).toMatchObject({ id: adminA.id, atelierId: adminA.atelierId });
    expect(await repo.trouverSession(hashExpire)).toBeUndefined();
    await repo.supprimerSession(hashValide);
    expect(await repo.trouverSession(hashValide)).toBeUndefined();
  });

  it('crée une cliente, donne un consentement actif sans entraînement IA', async () => {
    expect(await repo.trouverCliente(adminA.atelierId, clienteA.id)).toMatchObject({ nom: 'Cliente de A', atelierId: adminA.atelierId });
    expect(await repo.listerClientes(adminA.atelierId, 'Cliente de A')).toContainEqual(expect.objectContaining({ id: clienteA.id }));
    const consentement = await repo.donnerConsentement(clienteA.id, 'Cliente de A', true);
    expect(consentement.usageEntrainementIa).toBe(false);
    expect((await repo.consentementActif(clienteA.id))?.id).toBe(consentement.id);
  });

  it('stocke une photo chiffrée relisible uniquement déchiffrée, et une mensuration mise à jour', async () => {
    const consentement = await repo.consentementActif(clienteA.id);
    if (!consentement) throw new Error('Consentement actif attendu pour la photo.');
    const cle = randomBytes(32);
    const clair = Buffer.from('image-fictive-integration');
    const blob = chiffrer(clair, cle);
    const photo = await repo.creerPhoto({
      clienteId: clienteA.id,
      consentementId: consentement.id,
      type: 'cliente_complete',
      typeMime: 'image/jpeg',
      tailleOctets: clair.length,
      iv: blob.iv,
      authTag: blob.authTag,
      donneesChiffrees: blob.donnees,
      expireLe: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    photoValideId = photo.id;
    const relue = await repo.trouverPhoto(clienteA.id, photo.id);
    expect(relue).toBeDefined();
    expect(relue?.donneesChiffrees.equals(clair)).toBe(false);
    expect(dechiffrer({ iv: relue!.iv, authTag: relue!.authTag, donnees: relue!.donneesChiffrees }, cle).equals(clair)).toBe(true);
    expect(await repo.listerPhotos(clienteA.id)).toContainEqual(expect.objectContaining({ id: photo.id }));

    await repo.enregistrerMensuration({ clienteId: clienteA.id, code: 'tour_taille_cm', valeurCm: 82.5, saisiePar: adminA.id });
    await repo.enregistrerMensuration({ clienteId: clienteA.id, code: 'tour_taille_cm', valeurCm: 83, saisiePar: adminA.id });
    const mensurations = await repo.listerMensurations(clienteA.id);
    expect(mensurations).toHaveLength(1);
    expect(mensurations[0]).toMatchObject({ code: 'tour_taille_cm', valeurCm: 83, source: 'saisie_couturiere', valideeParCouturiere: true });
  });

  it('cloisonne les données entre deux ateliers', async () => {
    expect(await repo.trouverCliente(adminB.atelierId, clienteA.id)).toBeUndefined();
    expect(await repo.listerClientes(adminB.atelierId)).not.toContainEqual(expect.objectContaining({ id: clienteA.id }));
    await repo.modifierCliente(adminB.atelierId, clienteA.id, 'Nom détourné', '+22900000000');
    await repo.supprimerCliente(adminB.atelierId, clienteA.id);
    expect(await repo.trouverCliente(adminA.atelierId, clienteA.id)).toMatchObject({ nom: 'Cliente de A', telephone: '+22996000000' });
    // Garde-fou des routes : sans la cliente de son atelier, B n’atteint ni photo ni mensurations.
    expect(await repo.trouverPhoto(clienteA.id, photoValideId)).toBeDefined();
    expect(await repo.listerMensurations(clienteA.id)).toHaveLength(1);
  });

  it('purge les photos expirées et conserve les photos encore valides', async () => {
    const cliente = await repo.creerCliente(adminA.atelierId, 'Cliente purge', '+22996000001');
    const consentement = await repo.donnerConsentement(cliente.id, 'Cliente purge', false);
    const blob = chiffrer(Buffer.from('image-fictive-purge'), randomBytes(32));
    const base = {
      clienteId: cliente.id,
      consentementId: consentement.id,
      type: 'tissu' as const,
      typeMime: 'image/png',
      tailleOctets: 19,
      iv: blob.iv,
      authTag: blob.authTag,
      donneesChiffrees: blob.donnees
    };
    await repo.creerPhoto({ ...base, expireLe: new Date('2026-10-21T00:00:00Z') });
    const valide = await repo.creerPhoto({ ...base, expireLe: new Date('2026-11-04T00:00:00Z') });
    expect(await repo.purgerPhotosExpirees(new Date('2026-10-28T00:00:00Z'))).toBeGreaterThanOrEqual(1);
    expect((await repo.listerPhotos(cliente.id)).map((p) => p.id)).toEqual([valide.id]);
  });
});
