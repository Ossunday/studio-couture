import type { Consentement, PhotoCliente } from '../domain/types';
import { MessageError } from '$lib/i18n';

export const RETENTION_DEFAUT_JOURS = 7;

export function calculerExpiration(creeeLe: Date, retentionJours = RETENTION_DEFAUT_JOURS): Date {
  if (!Number.isInteger(retentionJours) || retentionJours <= 0) {
    throw new MessageError('validation.retentionInvalide');
  }
  return new Date(creeeLe.getTime() + retentionJours * 24 * 60 * 60 * 1000);
}

export function estExpiree(photo: Pick<PhotoCliente, 'expireLe' | 'supprimeeLe'>, maintenant = new Date()): boolean {
  return photo.supprimeeLe !== undefined || photo.expireLe.getTime() <= maintenant.getTime();
}

/** Règle n°8 : pas de photo sans consentement explicite non révoqué, jamais pour l'entraînement. */
export function assertConsentementPhoto(c: Consentement | undefined): void {
  if (!c) throw new MessageError('validation.consentementRequis');
  if (c.revoqueLe) throw new MessageError('validation.consentementRevoque');
  if (c.usageEntrainementIa !== false) {
    throw new MessageError('validation.photosJamaisEntrainement');
  }
}
