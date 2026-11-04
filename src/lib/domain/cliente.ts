import { MessageError } from '$lib/i18n';

export function validerNomCliente(nomBrut: string): string {
  const nom = nomBrut.trim();
  if (nom.length < 2 || nom.length > 80) {
    throw new MessageError('validation.nomClienteBornes');
  }
  return nom;
}
