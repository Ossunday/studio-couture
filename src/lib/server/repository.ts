import type { Cliente, Consentement, Mensuration, PatronCliente, PhotoCliente, RoleAtelier } from '../domain/types';
import { getPool } from './db';
import { RepositoryMemoire } from './repository-memory';
import { RepositoryPg } from './repository-pg';

/**
 * Accès données Phase 1. Deux implémentations interchangeables :
 * - PostgreSQL (production, migrations 0001 + 0002) ;
 * - mémoire (tests et Playwright uniquement, via STUDIO_COUTURE_REPOSITORY=memoire).
 * Jamais de mémoire en production : le choix est explicite par variable d’environnement.
 */

export interface CompteUtilisatrice {
  id: string;
  atelierId: string;
  nom: string;
  role: RoleAtelier;
  identifiant: string;
  motDePasseHash: string;
}

export interface SessionTrouvee {
  utilisatrice: { id: string; atelierId: string; nom: string; role: RoleAtelier };
  expireLe: Date;
}

export interface PhotoAvecDonnees extends PhotoCliente {
  typeMime: string;
  iv: Buffer;
  authTag: Buffer;
  donneesChiffrees: Buffer;
}

export interface Repository {
  compterUtilisatrices(): Promise<number>;
  creerAtelierEtAdmin(entree: {
    nomAtelier: string;
    nom: string;
    identifiant: string;
    motDePasseHash: string;
  }): Promise<CompteUtilisatrice>;
  trouverCompteParIdentifiant(identifiant: string): Promise<CompteUtilisatrice | undefined>;
  creerUtilisatrice(entree: {
    atelierId: string;
    nom: string;
    identifiant: string;
    motDePasseHash: string;
    role: RoleAtelier;
  }): Promise<CompteUtilisatrice>;
  creerSession(utilisatriceId: string, tokenHash: string, expireLe: Date): Promise<void>;
  trouverSession(tokenHash: string): Promise<SessionTrouvee | undefined>;
  supprimerSession(tokenHash: string): Promise<void>;

  listerClientes(atelierId: string, recherche?: string): Promise<Cliente[]>;
  creerCliente(atelierId: string, nom: string, telephone?: string): Promise<Cliente>;
  trouverCliente(atelierId: string, id: string): Promise<Cliente | undefined>;
  modifierCliente(atelierId: string, id: string, nom: string, telephone?: string): Promise<void>;
  supprimerCliente(atelierId: string, id: string): Promise<void>;

  consentementActif(clienteId: string): Promise<Consentement | undefined>;
  donnerConsentement(clienteId: string, signatureNom: string, usageRenduIa: boolean): Promise<Consentement>;
  revoquerConsentement(clienteId: string): Promise<void>;

  creerPhoto(entree: {
    clienteId: string;
    consentementId: string;
    type: PhotoCliente['type'];
    typeMime: string;
    tailleOctets: number;
    iv: Buffer;
    authTag: Buffer;
    donneesChiffrees: Buffer;
    expireLe: Date;
  }): Promise<PhotoCliente>;
  listerPhotos(clienteId: string): Promise<PhotoCliente[]>;
  trouverPhoto(clienteId: string, photoId: string): Promise<PhotoAvecDonnees | undefined>;
  supprimerPhoto(clienteId: string, photoId: string): Promise<void>;
  purgerPhotosExpirees(maintenant: Date): Promise<number>;

  listerMensurations(clienteId: string): Promise<Mensuration[]>;
  enregistrerMensuration(entree: {
    clienteId: string;
    code: string;
    valeurCm: number;
    saisiePar: string;
  }): Promise<void>;

  /**
   * Patrons enregistrés d'une cliente. Toujours filtrés par atelier via la
   * cliente propriétaire : un atelier ne voit jamais les patrons d'un autre.
   */
  listerPatrons(atelierId: string, clienteId: string): Promise<PatronCliente[]>;
  creerPatron(
    atelierId: string,
    entree: {
      clienteId: string;
      modele: string;
      nom: string;
      mesures: Record<string, number>;
      options: Record<string, number | string>;
      tissu: { couleurId: string; matiereId: string };
      creePar: string;
    }
  ): Promise<PatronCliente>;
  trouverPatron(atelierId: string, patronId: string): Promise<PatronCliente | undefined>;
  modifierPatron(
    atelierId: string,
    patronId: string,
    maj: {
      nom: string;
      mesures: Record<string, number>;
      options: Record<string, number | string>;
      tissu: { couleurId: string; matiereId: string };
    }
  ): Promise<void>;
  supprimerPatron(atelierId: string, patronId: string): Promise<void>;
  /** Nombre de patrons et dernier patron par cliente de l'atelier (liste des clientes). */
  resumerPatronsParCliente(atelierId: string): Promise<Record<string, { nombre: number; dernierLe: Date | null }>>;
}

let instance: Repository | undefined;

export function getRepository(): Repository {
  if (!instance) {
    instance =
      process.env.STUDIO_COUTURE_REPOSITORY === 'memoire'
        ? new RepositoryMemoire()
        : new RepositoryPg(getPool());
  }
  return instance;
}
