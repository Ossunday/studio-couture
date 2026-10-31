import type { Pool } from 'pg';
import type { Cliente, Consentement, Mensuration, PatronCliente, PhotoCliente } from '../domain/types';
import type { CompteUtilisatrice, Repository } from './repository';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Implémentation PostgreSQL — suppose les migrations 0001, 0002, 0003 et 0004 appliquées. */
export class RepositoryPg implements Repository {
  constructor(private readonly pool: Pool) {}

  private compte(row: any): CompteUtilisatrice {
    return {
      id: row.id,
      atelierId: row.atelier_id,
      nom: row.nom,
      role: row.role,
      identifiant: row.identifiant,
      motDePasseHash: row.mot_de_passe_hash
    };
  }

  async compterUtilisatrices() {
    const r = await this.pool.query('select count(*)::int as n from utilisatrices');
    return r.rows[0].n as number;
  }

  async creerAtelierEtAdmin(e: { nomAtelier: string; nom: string; identifiant: string; motDePasseHash: string }) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const a = await client.query('insert into ateliers (nom) values ($1) returning id', [e.nomAtelier]);
      const u = await client.query(
        `insert into utilisatrices (atelier_id, nom, role, identifiant, mot_de_passe_hash)
         values ($1,$2,'admin',$3,$4) returning *`,
        [a.rows[0].id, e.nom, e.identifiant, e.motDePasseHash]
      );
      await client.query('commit');
      return this.compte(u.rows[0]);
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  }

  async trouverCompteParIdentifiant(identifiant: string) {
    const r = await this.pool.query('select * from utilisatrices where identifiant = $1', [identifiant]);
    return r.rows[0] ? this.compte(r.rows[0]) : undefined;
  }

  async creerUtilisatrice(e: { atelierId: string; nom: string; identifiant: string; motDePasseHash: string; role: 'admin' | 'couturiere' }) {
    const r = await this.pool.query(
      `insert into utilisatrices (atelier_id, nom, role, identifiant, mot_de_passe_hash)
       values ($1,$2,$3,$4,$5) returning *`,
      [e.atelierId, e.nom, e.role, e.identifiant, e.motDePasseHash]
    );
    return this.compte(r.rows[0]);
  }

  async creerSession(utilisatriceId: string, tokenHash: string, expireLe: Date) {
    await this.pool.query('insert into sessions (utilisatrice_id, token_hash, expire_le) values ($1,$2,$3)', [
      utilisatriceId,
      tokenHash,
      expireLe
    ]);
  }

  async trouverSession(tokenHash: string) {
    const r = await this.pool.query(
      `select s.expire_le, u.id, u.atelier_id, u.nom, u.role from sessions s
       join utilisatrices u on u.id = s.utilisatrice_id
       where s.token_hash = $1 and s.expire_le > now()`,
      [tokenHash]
    );
    const row = r.rows[0];
    if (!row) return undefined;
    return {
      utilisatrice: { id: row.id, atelierId: row.atelier_id, nom: row.nom, role: row.role },
      expireLe: new Date(row.expire_le)
    };
  }

  async supprimerSession(tokenHash: string) {
    await this.pool.query('delete from sessions where token_hash = $1', [tokenHash]);
  }

  private cliente(row: any): Cliente {
    return { id: row.id, atelierId: row.atelier_id, nom: row.nom, telephone: row.telephone ?? undefined, createdAt: new Date(row.created_at) };
  }

  async listerClientes(atelierId: string, recherche?: string) {
    const q = `%${(recherche ?? '').trim()}%`;
    const r = await this.pool.query(
      `select * from clientes where atelier_id = $1 and ($2 = '%%' or nom ilike $2 or coalesce(telephone,'') ilike $2)
       order by created_at desc`,
      [atelierId, q]
    );
    return r.rows.map((row) => this.cliente(row));
  }

  async creerCliente(atelierId: string, nom: string, telephone?: string) {
    const r = await this.pool.query('insert into clientes (atelier_id, nom, telephone) values ($1,$2,$3) returning *', [
      atelierId,
      nom,
      telephone ?? null
    ]);
    return this.cliente(r.rows[0]);
  }

  async trouverCliente(atelierId: string, id: string) {
    const r = await this.pool.query('select * from clientes where atelier_id = $1 and id = $2', [atelierId, id]);
    return r.rows[0] ? this.cliente(r.rows[0]) : undefined;
  }

  async modifierCliente(atelierId: string, id: string, nom: string, telephone?: string) {
    await this.pool.query('update clientes set nom = $3, telephone = $4 where atelier_id = $1 and id = $2', [
      atelierId,
      id,
      nom,
      telephone ?? null
    ]);
  }

  async supprimerCliente(atelierId: string, id: string) {
    await this.pool.query('delete from clientes where atelier_id = $1 and id = $2', [atelierId, id]);
  }

  private consentement(row: any): Consentement {
    return {
      id: row.id,
      clienteId: row.cliente_id,
      donneLe: new Date(row.donne_le),
      revoqueLe: row.revoque_le ? new Date(row.revoque_le) : undefined,
      usageRenduIa: row.usage_rendu_ia,
      usageEntrainementIa: false
    };
  }

  async consentementActif(clienteId: string) {
    const r = await this.pool.query(
      'select * from consentements where cliente_id = $1 and revoque_le is null order by donne_le desc limit 1',
      [clienteId]
    );
    return r.rows[0] ? this.consentement(r.rows[0]) : undefined;
  }

  async donnerConsentement(clienteId: string, signatureNom: string, usageRenduIa: boolean) {
    const r = await this.pool.query(
      `insert into consentements (cliente_id, usage_rendu_ia, usage_entrainement_ia, signature_nom, texte_version)
       values ($1,$2,false,$3,'v1') returning *`,
      [clienteId, usageRenduIa, signatureNom]
    );
    return this.consentement(r.rows[0]);
  }

  async revoquerConsentement(clienteId: string) {
    await this.pool.query('update consentements set revoque_le = now() where cliente_id = $1 and revoque_le is null', [clienteId]);
    await this.pool.query('delete from photos_clientes where cliente_id = $1', [clienteId]);
  }

  private photo(row: any): PhotoCliente {
    return {
      id: row.id,
      clienteId: row.cliente_id,
      type: row.type,
      storageKeyChiffre: row.storage_key_chiffre,
      consentementId: row.consentement_id,
      creeeLe: new Date(row.creee_le),
      expireLe: new Date(row.expire_le),
      supprimeeLe: row.supprimee_le ? new Date(row.supprimee_le) : undefined
    };
  }

  async creerPhoto(e: Parameters<Repository['creerPhoto']>[0]) {
    const r = await this.pool.query(
      `insert into photos_clientes (cliente_id, consentement_id, type, storage_key_chiffre, expire_le, type_mime, taille_octets, iv, auth_tag, donnees_chiffrees)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
      [e.clienteId, e.consentementId, e.type, `db:${e.clienteId}`, e.expireLe, e.typeMime, e.tailleOctets, e.iv, e.authTag, e.donneesChiffrees]
    );
    return this.photo(r.rows[0]);
  }

  async listerPhotos(clienteId: string) {
    const r = await this.pool.query(
      'select * from photos_clientes where cliente_id = $1 and supprimee_le is null order by creee_le desc',
      [clienteId]
    );
    return r.rows.map((row) => this.photo(row));
  }

  async trouverPhoto(clienteId: string, photoId: string) {
    const r = await this.pool.query('select * from photos_clientes where cliente_id = $1 and id = $2 and supprimee_le is null', [
      clienteId,
      photoId
    ]);
    const row = r.rows[0];
    if (!row || !row.donnees_chiffrees) return undefined;
    return { ...this.photo(row), typeMime: row.type_mime, iv: row.iv, authTag: row.auth_tag, donneesChiffrees: row.donnees_chiffrees };
  }

  async supprimerPhoto(clienteId: string, photoId: string) {
    await this.pool.query('delete from photos_clientes where cliente_id = $1 and id = $2', [clienteId, photoId]);
  }

  async purgerPhotosExpirees(maintenant: Date) {
    const r = await this.pool.query('delete from photos_clientes where expire_le <= $1', [maintenant]);
    return r.rowCount ?? 0;
  }

  async listerMensurations(clienteId: string): Promise<Mensuration[]> {
    const r = await this.pool.query('select * from mensurations where cliente_id = $1 order by code', [clienteId]);
    return r.rows.map((row: any) => ({
      id: row.id,
      clienteId: row.cliente_id,
      code: row.code,
      valeurCm: Number(row.valeur_cm),
      source: row.source,
      margeErreurCm: row.marge_erreur_cm === null ? undefined : Number(row.marge_erreur_cm),
      valideeParCouturiere: row.validee_par_couturiere,
      valideePar: row.validee_par ?? undefined,
      valideeLe: row.validee_le ? new Date(row.validee_le) : undefined
    }));
  }

  async enregistrerMensuration(e: { clienteId: string; code: string; valeurCm: number; saisiePar: string }) {
    await this.pool.query(
      `insert into mensurations (cliente_id, code, valeur_cm, source, validee_par_couturiere, validee_par, validee_le)
       values ($1,$2,$3,'saisie_couturiere',true,$4,now())
       on conflict (cliente_id, code) do update set valeur_cm = excluded.valeur_cm, validee_par = excluded.validee_par, validee_le = now()`,
      [e.clienteId, e.code, e.valeurCm, e.saisiePar]
    );
  }

  private patron(row: any): PatronCliente {
    return {
      id: row.id,
      clienteId: row.cliente_id,
      modele: row.modele,
      nom: row.nom,
      mesures: row.mesures ?? {},
      options: row.options ?? {},
      tissu: row.tissu ?? { couleurId: 'bleu-denim', matiereId: 'denim' },
      statut: 'brouillon',
      creePar: row.cree_par ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async listerPatrons(atelierId: string, clienteId: string) {
    const r = await this.pool.query(
      `select p.* from patrons_clientes p
       join clientes c on c.id = p.cliente_id
       where c.atelier_id = $1 and p.cliente_id = $2
       order by p.created_at desc`,
      [atelierId, clienteId]
    );
    return r.rows.map((row) => this.patron(row));
  }

  async creerPatron(atelierId: string, e: Parameters<Repository['creerPatron']>[1]) {
    // Insertion conditionnée par l'appartenance de la cliente à l'atelier :
    // impossible d'attacher un patron à la cliente d'un autre atelier.
    const r = await this.pool.query(
      `insert into patrons_clientes (cliente_id, modele, nom, mesures, options, tissu, cree_par)
       select c.id, $3, $4, $5, $6, $7, $8 from clientes c
       where c.id = $1 and c.atelier_id = $2
       returning *`,
      [e.clienteId, atelierId, e.modele, e.nom, e.mesures, e.options, e.tissu, e.creePar]
    );
    if (!r.rows[0]) throw new Error('Cliente introuvable pour cet atelier.');
    return this.patron(r.rows[0]);
  }

  async trouverPatron(atelierId: string, patronId: string) {
    const r = await this.pool.query(
      `select p.* from patrons_clientes p
       join clientes c on c.id = p.cliente_id
       where c.atelier_id = $1 and p.id = $2`,
      [atelierId, patronId]
    );
    return r.rows[0] ? this.patron(r.rows[0]) : undefined;
  }

  async modifierPatron(atelierId: string, patronId: string, maj: Parameters<Repository['modifierPatron']>[2]) {
    await this.pool.query(
      `update patrons_clientes p set nom = $3, mesures = $4, options = $5, tissu = $6, updated_at = now()
       from clientes c
       where c.id = p.cliente_id and c.atelier_id = $1 and p.id = $2`,
      [atelierId, patronId, maj.nom, maj.mesures, maj.options, maj.tissu]
    );
  }

  async supprimerPatron(atelierId: string, patronId: string) {
    await this.pool.query(
      `delete from patrons_clientes p using clientes c
       where c.id = p.cliente_id and c.atelier_id = $1 and p.id = $2`,
      [atelierId, patronId]
    );
  }

  async resumerPatronsParCliente(atelierId: string) {
    const r = await this.pool.query(
      `select p.cliente_id, count(*)::int as nombre, max(p.created_at) as dernier_le
       from patrons_clientes p
       join clientes c on c.id = p.cliente_id
       where c.atelier_id = $1
       group by p.cliente_id`,
      [atelierId]
    );
    const resume: Record<string, { nombre: number; dernierLe: Date | null }> = {};
    for (const row of r.rows) {
      resume[row.cliente_id] = { nombre: row.nombre, dernierLe: row.dernier_le ? new Date(row.dernier_le) : null };
    }
    return resume;
  }
}
