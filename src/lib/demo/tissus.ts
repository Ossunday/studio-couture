/** Tissus de la salle d'essayage : couleurs et matières dessinées par code (aucune image externe). */

export interface CouleurTissu {
  id: string;
  libelle: string;
  hex: string;
  /** Couleur de fil contrastante pour la trame dessinée. */
  fil: string;
}
export type MatiereId = 'denim' | 'lin' | 'satin';
export interface Matiere {
  id: MatiereId;
  libelle: string;
}

export const COULEURS_TISSU: readonly CouleurTissu[] = [
  { id: 'ivoire', libelle: 'Ivoire', hex: '#f3ead8', fil: '#d8cbb4' },
  { id: 'sable', libelle: 'Sable', hex: '#d9bd93', fil: '#b99c6d' },
  { id: 'terracotta', libelle: 'Terracotta', hex: '#b5532f', fil: '#8f3e20' },
  { id: 'vert-profond', libelle: 'Vert profond', hex: '#1f3d36', fil: '#356355' },
  { id: 'bleu-denim', libelle: 'Bleu denim', hex: '#33536e', fil: '#597d9c' },
  { id: 'noir', libelle: 'Noir', hex: '#23201d', fil: '#4a453f' }
] as const;

export const MATIERES: readonly Matiere[] = [
  { id: 'denim', libelle: 'Denim' },
  { id: 'lin', libelle: 'Lin' },
  { id: 'satin', libelle: 'Satin' }
] as const;

export function couleurTissu(id: string): CouleurTissu {
  return COULEURS_TISSU.find((c) => c.id === id) ?? COULEURS_TISSU[0]!;
}

/**
 * Dessine la matière (trame + chaîne) dans un contexte canvas 2D.
 * Réutilisé par la loupe (partie A) et par les textures Three.js (partie B) :
 * une seule source de dessin pour les deux rendus.
 */
export function dessinerTextureTissu(
  ctx: CanvasRenderingContext2D,
  largeur: number,
  hauteur: number,
  couleur: CouleurTissu,
  matiere: MatiereId
): void {
  ctx.fillStyle = couleur.hex;
  ctx.fillRect(0, 0, largeur, hauteur);
  ctx.lineWidth = 1;
  if (matiere === 'denim') {
    // Fils croisés en diagonale (sergé).
    ctx.strokeStyle = couleur.fil;
    ctx.globalAlpha = 0.55;
    for (let x = -hauteur; x < largeur; x += 4) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + hauteur, hauteur); ctx.stroke();
    }
    ctx.globalAlpha = 0.3;
    for (let x = 0; x < largeur + hauteur; x += 4) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - hauteur, hauteur); ctx.stroke();
    }
  } else if (matiere === 'lin') {
    // Fils irréguliers horizontaux et verticaux.
    ctx.strokeStyle = couleur.fil;
    for (let y = 0; y < hauteur; y += 3) {
      ctx.globalAlpha = 0.25 + ((y * 7) % 10) / 40;
      ctx.beginPath(); ctx.moveTo(0, y + ((y * 13) % 3)); ctx.lineTo(largeur, y); ctx.stroke();
    }
    for (let x = 0; x < largeur; x += 3) {
      ctx.globalAlpha = 0.18 + ((x * 11) % 10) / 50;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + ((x * 7) % 3), hauteur); ctx.stroke();
    }
  } else {
    // Satin : surface lisse, reflets diagonaux doux.
    const g = ctx.createLinearGradient(0, 0, largeur, hauteur);
    g.addColorStop(0, couleur.hex);
    g.addColorStop(0.45, couleur.fil);
    g.addColorStop(0.55, couleur.hex);
    g.addColorStop(1, couleur.fil);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, largeur, hauteur);
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#ffffff';
    for (let x = -hauteur; x < largeur; x += 18) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + hauteur, hauteur); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
