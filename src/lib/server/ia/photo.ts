/**
 * Photo d’un vêtement envoyée à l’assistant IA (phase 11) — traitement
 * strictement en mémoire, côté serveur :
 *
 * - taille maximale 5 Mo ;
 * - type vérifié par la SIGNATURE du fichier (JPEG, PNG ou WebP), jamais par
 *   l’extension ni par le type déclaré ;
 * - métadonnées retirées avant envoi (segments APPn/COM d’un JPEG, champs
 *   texte/EXIF d’un PNG, blocs EXIF/ICCP/XMP d’un WebP) : la photo transmise
 *   au modèle ne contient que l’image ;
 * - la photo n’est jamais enregistrée, jamais journalisée : elle vit le temps
 *   de l’appel au modèle, puis disparaît avec la requête.
 */

export const TAILLE_MAX_PHOTO_OCTETS = 5 * 1024 * 1024;

export type TypeImageIa = 'image/jpeg' | 'image/png' | 'image/webp';

export class PhotoInvalideError extends Error {
  constructor(public readonly raison: 'trop_grande' | 'type_refuse') {
    super(raison);
    this.name = 'PhotoInvalideError';
  }
}

/** Type réel d’après les premiers octets (signature), ou null si non reconnu. */
export function detecterTypeImage(octets: Uint8Array): TypeImageIa | null {
  if (octets.length >= 3 && octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    octets.length >= 8 &&
    octets[0] === 0x89 && octets[1] === 0x50 && octets[2] === 0x4e && octets[3] === 0x47 &&
    octets[4] === 0x0d && octets[5] === 0x0a && octets[6] === 0x1a && octets[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    octets.length >= 12 &&
    octets[0] === 0x52 && octets[1] === 0x49 && octets[2] === 0x46 && octets[3] === 0x46 &&
    octets[8] === 0x57 && octets[9] === 0x45 && octets[10] === 0x42 && octets[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

function retirerMetadonneesJpeg(octets: Uint8Array): Uint8Array {
  // Segments : FF D8 (SOI), puis [FF marqueur, longueur(2, incluse), données…].
  // On retire APP0–APP15 (FF E0–EF, dont EXIF en APP1) et COM (FF FE) ; dès le
  // segment SOS (FF DA), le flux compressé est recopié tel quel jusqu’à la fin.
  const morceaux: Uint8Array[] = [octets.subarray(0, 2)];
  let pos = 2;
  while (pos + 4 <= octets.length) {
    if (octets[pos] !== 0xff) break;
    const marqueur = octets[pos + 1]!;
    if (marqueur === 0xda) {
      morceaux.push(octets.subarray(pos));
      return assembler(morceaux);
    }
    if (marqueur === 0xd9) {
      morceaux.push(octets.subarray(pos, pos + 2));
      return assembler(morceaux);
    }
    if ((marqueur >= 0xd0 && marqueur <= 0xd7) || marqueur === 0x01) {
      morceaux.push(octets.subarray(pos, pos + 2));
      pos += 2;
      continue;
    }
    const longueur = (octets[pos + 2]! << 8) | octets[pos + 3]!;
    if (longueur < 2 || pos + 2 + longueur > octets.length) break;
    const aRetirer = (marqueur >= 0xe0 && marqueur <= 0xef) || marqueur === 0xfe;
    if (!aRetirer) morceaux.push(octets.subarray(pos, pos + 2 + longueur));
    pos += 2 + longueur;
  }
  morceaux.push(octets.subarray(pos));
  return assembler(morceaux);
}

const BLOCS_PNG_IMAGE = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND']);

function retirerMetadonneesPng(octets: Uint8Array): Uint8Array {
  // Blocs : longueur(4 BE), type(4), données, CRC(4). On ne garde que les
  // blocs d’image ; tEXt/zTXt/iTXt/eXIf/tIME… (métadonnées) sont retirés.
  const morceaux: Uint8Array[] = [octets.subarray(0, 8)];
  let pos = 8;
  while (pos + 8 <= octets.length) {
    const longueur = (((octets[pos]! << 24) | (octets[pos + 1]! << 16) | (octets[pos + 2]! << 8) | octets[pos + 3]!) >>> 0);
    const type = String.fromCharCode(octets[pos + 4]!, octets[pos + 5]!, octets[pos + 6]!, octets[pos + 7]!);
    const total = 12 + longueur;
    if (pos + total > octets.length) break;
    if (BLOCS_PNG_IMAGE.has(type)) morceaux.push(octets.subarray(pos, pos + total));
    pos += total;
    if (type === 'IEND') return assembler(morceaux);
  }
  morceaux.push(octets.subarray(pos));
  return assembler(morceaux);
}

const BLOCS_WEBP_METADONNEES = new Set(['EXIF', 'ICCP', 'XMP ']);

function retirerMetadonneesWebp(octets: Uint8Array): Uint8Array {
  // RIFF : « RIFF », taille(4 LE), « WEBP », puis blocs fourcc + taille(4 LE)
  // + données (+ bourrage si taille impaire). EXIF/ICCP/XMP retirés, taille
  // RIFF recalculée.
  const morceaux: Uint8Array[] = [octets.subarray(0, 12)];
  let pos = 12;
  while (pos + 8 <= octets.length) {
    const type = String.fromCharCode(octets[pos]!, octets[pos + 1]!, octets[pos + 2]!, octets[pos + 3]!);
    const longueur = (octets[pos + 4]! | (octets[pos + 5]! << 8) | (octets[pos + 6]! << 16) | (octets[pos + 7]! << 24)) >>> 0;
    const total = 8 + longueur + (longueur % 2);
    if (pos + total > octets.length) break;
    if (!BLOCS_WEBP_METADONNEES.has(type)) morceaux.push(octets.subarray(pos, pos + total));
    pos += total;
  }
  if (pos < octets.length) morceaux.push(octets.subarray(pos));
  const resultat = assembler(morceaux);
  const taille = resultat.length - 8;
  resultat[4] = taille & 0xff;
  resultat[5] = (taille >> 8) & 0xff;
  resultat[6] = (taille >> 16) & 0xff;
  resultat[7] = (taille >> 24) & 0xff;
  return resultat;
}

function assembler(morceaux: Uint8Array[]): Uint8Array {
  const total = morceaux.reduce((n, m) => n + m.length, 0);
  const sortie = new Uint8Array(total);
  let pos = 0;
  for (const m of morceaux) {
    sortie.set(m, pos);
    pos += m.length;
  }
  return sortie;
}

/** Retire les métadonnées selon le format ; en cas de structure inattendue, renvoie l’original (l’image reste valide). */
export function retirerMetadonnees(type: TypeImageIa, octets: Uint8Array): Uint8Array {
  try {
    if (type === 'image/jpeg') return retirerMetadonneesJpeg(octets);
    if (type === 'image/png') return retirerMetadonneesPng(octets);
    return retirerMetadonneesWebp(octets);
  } catch {
    return octets;
  }
}

export interface PhotoValidee {
  mediaType: TypeImageIa;
  /** Image sans métadonnées, prête à encoder en base64 pour le modèle. */
  donnees: Uint8Array;
}

/**
 * Valide une photo reçue (taille, signature) et la renvoie sans métadonnées.
 * Lève PhotoInvalideError('trop_grande' | 'type_refuse') sinon.
 */
export function validerPhoto(octets: Uint8Array): PhotoValidee {
  if (octets.length > TAILLE_MAX_PHOTO_OCTETS) throw new PhotoInvalideError('trop_grande');
  if (octets.length === 0) throw new PhotoInvalideError('type_refuse');
  const mediaType = detecterTypeImage(octets);
  if (!mediaType) throw new PhotoInvalideError('type_refuse');
  return { mediaType, donnees: retirerMetadonnees(mediaType, octets) };
}

/** Encodage base64 pour le bloc image de l’API (serveur uniquement). */
export function versBase64(octets: Uint8Array): string {
  return Buffer.from(octets).toString('base64');
}
