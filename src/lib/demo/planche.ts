/** Planche composite PNG de l'aperçu en 3 images — dessinée en canvas 2D, jamais envoyée au serveur. */
import { t, type Lang, type TranslationKey } from '$lib/i18n';

export interface VuesApercu {
  face: string;
  perspective: string;
  dos: string;
}

export const LIBELLES_VUES = [
  { cle: 'face', libelleCle: 'troisVues.face' },
  { cle: 'perspective', libelleCle: 'troisVues.perspective' },
  { cle: 'dos', libelleCle: 'troisVues.dos' }
] as const;

const cle = (k: string) => k as TranslationKey;

function chargerImage(src: string, lang: Lang): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(t(lang, cle('troisVues.imageIllisible'))));
    img.src = src;
  });
}

/** Compose la planche : titre, 3 vues côte à côte (800×1000 chacune), mesures et mention brouillon en pied. */
export async function composerPlanche(vues: VuesApercu, mesuresTexte: string, tissuTexte: string, lang: Lang = 'fr'): Promise<string> {
  const images = await Promise.all([chargerImage(vues.face, lang), chargerImage(vues.perspective, lang), chargerImage(vues.dos, lang)]);
  const largeurVue = 800;
  const hauteurVue = 1000;
  const marge = 36;
  const canvas = document.createElement('canvas');
  canvas.width = largeurVue * 3 + marge * 4;
  canvas.height = 96 + hauteurVue + 44 + 118;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fbf6ee';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1e1a17';
  ctx.font = '700 44px Georgia, serif';
  ctx.fillText(t(lang, 'troisVues.titrePlanche'), marge, 62);
  ctx.strokeStyle = '#c9a24b';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(marge, 80); ctx.lineTo(canvas.width - marge, 80); ctx.stroke();
  images.forEach((img, i) => {
    const x = marge + i * (largeurVue + marge);
    ctx.drawImage(img, x, 96, largeurVue, hauteurVue);
    ctx.fillStyle = '#1e1a17';
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t(lang, LIBELLES_VUES[i]!.libelleCle as TranslationKey), x + largeurVue / 2, 96 + hauteurVue + 38);
    ctx.textAlign = 'left';
  });
  const piedY = 96 + hauteurVue + 78;
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText(t(lang, cle('troisVues.plancheMesures'), { texte: mesuresTexte }), marge, piedY);
  ctx.fillText(t(lang, cle('troisVues.plancheTissu'), { texte: tissuTexte }), marge, piedY + 38);
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.fillText(`${t(lang, 'commun.brouillonNonValide')} — ${t(lang, 'salle.volumeIndicatif')}`, marge, piedY + 80);
  return canvas.toDataURL('image/png');
}

export async function telechargerPlanche(vues: VuesApercu, mesuresTexte: string, tissuTexte: string, lang: Lang = 'fr'): Promise<void> {
  const dataUrl = await composerPlanche(vues, mesuresTexte, tissuTexte, lang);
  // Conversion manuelle en Blob (fetch sur très longue data URL peu fiable).
  const base64 = dataUrl.split(',')[1]!;
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  const blob = new Blob([octets], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = 'apercu-pantalon-large-brouillon.png';
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
