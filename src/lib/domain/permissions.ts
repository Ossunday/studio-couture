import type { RoleAtelier } from './types';

export type Permission =
  | 'atelier.gerer_utilisatrices'
  | 'cliente.creer'
  | 'cliente.supprimer'
  | 'photo.supprimer'
  | 'patron.generer'
  | 'devis.valider';

const MATRICE: Record<RoleAtelier, readonly Permission[]> = {
  admin: [
    'atelier.gerer_utilisatrices',
    'cliente.creer',
    'cliente.supprimer',
    'photo.supprimer',
    'patron.generer',
    'devis.valider'
  ],
  couturiere: ['cliente.creer', 'photo.supprimer', 'patron.generer']
};

export function peut(role: RoleAtelier, permission: Permission): boolean {
  return MATRICE[role].includes(permission);
}
