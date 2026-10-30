/**
 * Limitation de débit en mémoire pour la génération PDF publique de la démo.
 * Mono-instance : la fenêtre glissante est conservée dans ce processus, sans
 * cookie ni stockage persistant. 30 générations par minute et par IP.
 */
export const LIMITE_PDF_DEMO = 30;
export const FENETRE_PDF_DEMO_MS = 60_000;

const historiques = new Map<string, number[]>();

export function autoriserPdfDemo(ip: string, maintenant = Date.now()): boolean {
  const borne = maintenant - FENETRE_PDF_DEMO_MS;
  const recents = (historiques.get(ip) ?? []).filter((t) => t > borne);
  if (recents.length >= LIMITE_PDF_DEMO) {
    historiques.set(ip, recents);
    return false;
  }
  recents.push(maintenant);
  historiques.set(ip, recents);
  return true;
}

/** Vide la mémoire (tests). */
export function reinitialiserLimitePdfDemo(): void {
  historiques.clear();
}
