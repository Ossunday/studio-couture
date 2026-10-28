import type { Consentement, PhotoCliente } from '../domain/types';

export const RETENTION_DEFAUT_JOURS = 7;

export function calculerExpiration(creeeLe: Date, retentionJours = RETENTION_DEFAUT_JOURS): Date {
  if (!Number.isInteger(retentionJours) || retentionJours <= 0) {
    throw new Error('Durée de rétention invalide : entier positif requis.');
  }
  return new Date(creeeLe.getTime() + retentionJours * 24 * 60 * 60 * 1000);
}

export function estExpiree(photo: Pick<PhotoCliente, 'expireLe' | 'supprimeeLe'>, maintenant = new Date()): boolean {
  return photo.supprimeeLe !== undefined || photo.expireLe.getTime() <= maintenant.getTime();
}

/** Règle n°8 : pas de photo sans consentement explicite non révoqué, jamais pour l'entraînement. */
export function assertConsentementPhoto(c: Consentement | undefined): void {
  if (!c) throw new Error('Consentement explicite de la cliente requis avant toute photo.');
  if (c.revoqueLe) throw new Error('Consentement révoqué : photo interdite, suppression à effectuer.');
  if (c.usageEntrainementIa !== false) {
    throw new Error('Les photos clientes ne sont jamais utilisées pour l’entraînement.');
  }
}
