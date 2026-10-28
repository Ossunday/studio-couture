export function validerNomCliente(nomBrut: string): string {
  const nom = nomBrut.trim();
  if (nom.length < 2 || nom.length > 80) {
    throw new Error('Le nom de la cliente doit contenir entre 2 et 80 caractères.');
  }
  return nom;
}
