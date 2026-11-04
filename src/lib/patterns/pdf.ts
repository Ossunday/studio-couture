import { nomPiece, type PieceBrouillon, type Point } from './brouillon';
import { t, type Lang } from '../i18n';

/**
 * Export PDF 1:1 du patron brouillon, découpé en pages A4.
 * PDF écrit à la main (aucune dépendance) : traits vectoriels à l'échelle
 * réelle (1 cm = 28,3465 pt), carré de contrôle de 10 cm sur la première
 * page de chaque pièce, repères d'assemblage (colonne/ligne par pièce).
 * Texte en Latin-1 (WinAnsi) pour les accents français.
 */
const PT_PAR_CM = 28.3465;
const PAGE_L = 595.28; // A4 portrait, pt
const PAGE_H = 841.89;
const MARGE = PT_PAR_CM; // 1 cm

function textePdf(texte: string): string {
  return texte
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, (c) => {
      const code = c.charCodeAt(0);
      return code <= 0xff ? '\\' + code.toString(8).padStart(3, '0') : '?';
    });
}

function pagesPourPiece(piece: PieceBrouillon, titreModele: string, nomCliente: string, lang: Lang): string[] {
  const xs = piece.coupe.map((p) => p.x);
  const ys = piece.coupe.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const largeurCm = Math.max(...xs) - minX;
  const hauteurCm = Math.max(...ys) - minY;
  const utileL = PAGE_L - 2 * MARGE;
  const utileH = PAGE_H - 2 * MARGE;
  const colonnes = Math.max(1, Math.ceil((largeurCm * PT_PAR_CM) / utileL));
  const lignes = Math.max(1, Math.ceil((hauteurCm * PT_PAR_CM) / utileH));
  const pages: string[] = [];
  for (let ligne = 0; ligne < lignes; ligne++) {
    for (let colonne = 0; colonne < colonnes; colonne++) {
      const decalageX = minX + (colonne * utileL) / PT_PAR_CM;
      const decalageY = minY + (ligne * utileH) / PT_PAR_CM;
      const cheminPage = (pts: Point[], fermer = true) =>
        pts
          .map((p, i) => {
            const x = (p.x - decalageX) * PT_PAR_CM + MARGE;
            const y = PAGE_H - ((p.y - decalageY) * PT_PAR_CM + MARGE);
            return `${x.toFixed(1)} ${y.toFixed(1)} ${i === 0 ? 'm' : 'l'}`;
          })
          .join(' ') + (fermer ? ' h' : '');
      const ops: string[] = [];
      ops.push('q');
      ops.push(`${MARGE} ${MARGE} ${utileL} ${utileH} re W n`); // fenêtre imprimable de la page
      ops.push('1.5 w 0 0 0 RG');
      ops.push(`${cheminPage(piece.coupe)} S`); // trait de coupe (plein)
      ops.push('[6 4] 0 d 0.8 w');
      ops.push(`${cheminPage(piece.couture)} S`); // trait de couture (pointillé)
      ops.push('[] 0 d 1 w');
      ops.push(`${cheminPage([piece.filDroit.de, piece.filDroit.a], false)} S`); // fil droit
      for (const cran of piece.crans) {
        const cx = (cran.x - decalageX) * PT_PAR_CM + MARGE;
        const cy = PAGE_H - ((cran.y - decalageY) * PT_PAR_CM + MARGE);
        ops.push(`${(cx - 4).toFixed(1)} ${cy.toFixed(1)} m ${(cx + 4).toFixed(1)} ${cy.toFixed(1)} l S`);
        ops.push(`${cx.toFixed(1)} ${(cy - 4).toFixed(1)} m ${cx.toFixed(1)} ${(cy + 4).toFixed(1)} l S`);
      }
      for (const trait of piece.traitsInterieurs ?? []) {
        ops.push('[3 3] 0 d');
        ops.push(`${cheminPage(trait, false)} S`);
        ops.push('[] 0 d');
      }
      for (const ligne of piece.lignesConstruction ?? []) {
        ops.push('[2 3] 0 d 0.5 w 0.5 g');
        ops.push(`${cheminPage(ligne, false)} S`);
        ops.push('[] 0 d 1 w 0 G');
      }
      // Cotes : mêmes lignes et valeurs que l'aperçu SVG. Le trait est
      // fenêtré par la page ; le texte n'est écrit que sur la page qui
      // contient son étiquette, pour ne pas le répéter ni le tronquer.
      for (const cote of piece.cotes ?? []) {
        ops.push('0.8 w 0 0.4 0 RG');
        ops.push(`${cheminPage([cote.de, cote.a], false)} S`);
        ops.push('0 0 0 RG 1 w');
        const tx = (cote.texte.x - decalageX) * PT_PAR_CM + MARGE;
        const ty = PAGE_H - ((cote.texte.y - decalageY) * PT_PAR_CM + MARGE);
        if (tx > MARGE && tx < PAGE_L - MARGE && ty > MARGE && ty < PAGE_H - MARGE) {
          const valeurPdf = lang === 'en' ? cote.valeurCm.toFixed(1) : cote.valeurCm.toFixed(1).replace('.', ',');
          const etiquette = `${t(lang, cote.libelleCle)} ${valeurPdf} cm`;
          ops.push(`BT /F1 8 Tf ${(tx - etiquette.length * 2).toFixed(1)} ${ty.toFixed(1)} Td (${textePdf(etiquette)}) Tj ET`);
        }
      }
      ops.push('BT /F1 9 Tf 28 782 Td');
      ops.push(`(${textePdf(t(lang, 'pdf.marge'))}) Tj ET`);
      ops.push('Q');
      ops.push('BT /F1 13 Tf 28 818 Td');
      ops.push(`(${textePdf(`${titreModele} — ${nomPiece(lang, piece)} — ${nomCliente}`)}) Tj ET`);
      ops.push('BT /F1 11 Tf 28 800 Td');
      ops.push(
        `(${textePdf(t(lang, 'pdf.colonneLigne', { colonne: colonne + 1, colonnes, ligne: ligne + 1, lignes }))}) Tj ET`
      );
      if (colonne === 0 && ligne === 0) {
        const c = 10 * PT_PAR_CM;
        ops.push(`28 ${PAGE_H - 90 - c} ${c} ${c} re S`);
        ops.push(`BT /F1 11 Tf 28 ${PAGE_H - 80} Td (${textePdf(t(lang, 'pdf.carreControle'))}) Tj ET`);
      }
      pages.push(ops.join('\n'));
    }
  }
  return pages;
}

export function genererPdfPatron(titreModele: string, nomCliente: string, pieces: PieceBrouillon[], lang: Lang = 'fr'): Buffer {
  const contenus = pieces.flatMap((p) => pagesPourPiece(p, titreModele, nomCliente, lang));
  // Objets : 1=Catalog, 2=Pages, 3=Font, puis par page : flux, page.
  const objets = new Map<number, Buffer>();
  objets.set(3, Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', 'latin1'));
  const pageIds: number[] = [];
  let prochainId = 4;
  for (const contenu of contenus) {
    const octets = Buffer.from(contenu, 'latin1');
    const fluxId = prochainId++;
    const pageId = prochainId++;
    objets.set(
      fluxId,
      Buffer.concat([Buffer.from(`<< /Length ${octets.length} >>\nstream\n`, 'latin1'), octets, Buffer.from('\nendstream', 'latin1')])
    );
    objets.set(
      pageId,
      Buffer.from(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_L} ${PAGE_H}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${fluxId} 0 R >>`,
        'latin1'
      )
    );
    pageIds.push(pageId);
  }
  objets.set(1, Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'latin1'));
  objets.set(2, Buffer.from(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`, 'latin1'));

  const morceaux: Buffer[] = [Buffer.from('%PDF-1.4\n', 'latin1')];
  const offsets = new Map<number, number>();
  let position = morceaux[0]!.length;
  for (const id of [...objets.keys()].sort((a, b) => a - b)) {
    const contenu = objets.get(id)!;
    const entete = Buffer.from(`${id} 0 obj\n`, 'latin1');
    const pied = Buffer.from('\nendobj\n', 'latin1');
    offsets.set(id, position);
    morceaux.push(entete, contenu, pied);
    position += entete.length + contenu.length + pied.length;
  }
  const total = objets.size + 1;
  const xref = ['xref', `0 ${total}`, '0000000000 65535 f '];
  for (let id = 1; id < total; id++) xref.push(`${String(offsets.get(id)!).padStart(10, '0')} 00000 n `);
  morceaux.push(Buffer.from(xref.join('\n') + `\ntrailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF`, 'latin1'));
  return Buffer.concat(morceaux);
}
