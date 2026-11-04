import { describe, expect, it } from 'vitest';
import { TAILLE_MAX_PHOTO_OCTETS, PhotoInvalideError, detecterTypeImage, retirerMetadonnees, validerPhoto } from './photo';

const encoder = new TextEncoder();
const octetsTexte = (s: string) => encoder.encode(s);

function contient(octets: Uint8Array, marqueur: string): boolean {
  const m = octetsTexte(marqueur);
  for (let i = 0; i + m.length <= octets.length; i += 1) {
    if (m.every((b, j) => octets[i + j] === b)) return true;
  }
  return false;
}

function segmentJpeg(marqueur: number, donnees: Uint8Array): Uint8Array {
  const sortie = new Uint8Array(4 + donnees.length);
  sortie[0] = 0xff;
  sortie[1] = marqueur;
  sortie[2] = (donnees.length + 2) >> 8;
  sortie[3] = (donnees.length + 2) & 0xff;
  sortie.set(donnees, 4);
  return sortie;
}

function jpegAvecMetadonnees(): Uint8Array {
  const sos = new Uint8Array([0xff, 0xda, 0x00, 0x08, 1, 2, 3, 4, 0xff, 0xd9]);
  const parties = [
    new Uint8Array([0xff, 0xd8]),
    segmentJpeg(0xe1, octetsTexte('Exif\0\0SECRET-GPS')),
    segmentJpeg(0xfe, octetsTexte('SECRET-COMMENTAIRE')),
    segmentJpeg(0xdb, new Uint8Array([0, 1, 2, 3])),
    sos
  ];
  const total = parties.reduce((n, p) => n + p.length, 0);
  const sortie = new Uint8Array(total);
  let pos = 0;
  for (const p of parties) {
    sortie.set(p, pos);
    pos += p.length;
  }
  return sortie;
}

function blocPng(type: string, donnees: Uint8Array): Uint8Array {
  const sortie = new Uint8Array(12 + donnees.length);
  sortie[0] = (donnees.length >> 24) & 0xff;
  sortie[1] = (donnees.length >> 16) & 0xff;
  sortie[2] = (donnees.length >> 8) & 0xff;
  sortie[3] = donnees.length & 0xff;
  sortie.set(octetsTexte(type), 4);
  sortie.set(donnees, 8);
  return sortie;
}

function pngAvecMetadonnees(): Uint8Array {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const parties = [
    signature,
    blocPng('IHDR', new Uint8Array(13)),
    blocPng('tEXt', octetsTexte('Comment\0SECRET-PNG')),
    blocPng('eXIf', octetsTexte('SECRET-EXIF')),
    blocPng('IDAT', new Uint8Array([1, 2, 3])),
    blocPng('IEND', new Uint8Array(0))
  ];
  const total = parties.reduce((n, p) => n + p.length, 0);
  const sortie = new Uint8Array(total);
  let pos = 0;
  for (const p of parties) {
    sortie.set(p, pos);
    pos += p.length;
  }
  return sortie;
}

function blocWebp(type: string, donnees: Uint8Array): Uint8Array {
  const pad = donnees.length % 2;
  const sortie = new Uint8Array(8 + donnees.length + pad);
  sortie.set(octetsTexte(type), 0);
  sortie[4] = donnees.length & 0xff;
  sortie[5] = (donnees.length >> 8) & 0xff;
  sortie[6] = (donnees.length >> 16) & 0xff;
  sortie[7] = (donnees.length >> 24) & 0xff;
  sortie.set(donnees, 8);
  return sortie;
}

function webpAvecMetadonnees(): Uint8Array {
  const corps = [blocWebp('VP8 ', new Uint8Array([1, 2, 3, 4])), blocWebp('EXIF', octetsTexte('SECRET-WEBP')), blocWebp('XMP ', octetsTexte('SECRET-XMP'))];
  const tailleCorps = 4 + corps.reduce((n, p) => n + p.length, 0);
  const sortie = new Uint8Array(8 + tailleCorps);
  sortie.set(octetsTexte('RIFF'), 0);
  sortie[4] = tailleCorps & 0xff;
  sortie[5] = (tailleCorps >> 8) & 0xff;
  sortie[6] = (tailleCorps >> 16) & 0xff;
  sortie[7] = (tailleCorps >> 24) & 0xff;
  sortie.set(octetsTexte('WEBP'), 8);
  let pos = 12;
  for (const p of corps) {
    sortie.set(p, pos);
    pos += p.length;
  }
  return sortie;
}

describe('detecterTypeImage — signature du fichier, jamais l’extension', () => {
  it('reconnaît JPEG, PNG et WebP à leurs premiers octets', () => {
    expect(detecterTypeImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe1]))).toBe('image/jpeg');
    expect(detecterTypeImage(pngAvecMetadonnees())).toBe('image/png');
    expect(detecterTypeImage(webpAvecMetadonnees())).toBe('image/webp');
  });

  it('refuse texte, GIF, RIFF non-WebP et fichier vide', () => {
    expect(detecterTypeImage(octetsTexte('ceci est un texte renommé .jpg'))).toBeNull();
    expect(detecterTypeImage(octetsTexte('GIF89a........'))).toBeNull();
    expect(detecterTypeImage(octetsTexte('RIFF....AVI '))).toBeNull();
    expect(detecterTypeImage(new Uint8Array(0))).toBeNull();
  });
});

describe('validerPhoto — taille, type, métadonnées', () => {
  it('photo trop grande : refus trop_grande même avec une signature JPEG valide', () => {
    const gros = new Uint8Array(TAILLE_MAX_PHOTO_OCTETS + 1);
    gros[0] = 0xff;
    gros[1] = 0xd8;
    gros[2] = 0xff;
    let raison = '';
    try {
      validerPhoto(gros);
    } catch (e) {
      raison = e instanceof PhotoInvalideError ? e.raison : 'autre';
    }
    expect(raison).toBe('trop_grande');
  });

  it('mauvais type (texte renommé en .jpg) : refus type_refuse', () => {
    let raison = '';
    try {
      validerPhoto(octetsTexte('pas une image'));
    } catch (e) {
      raison = e instanceof PhotoInvalideError ? e.raison : 'autre';
    }
    expect(raison).toBe('type_refuse');
  });

  it('JPEG : segments EXIF (APP1) et commentaire retirés, image conservée', () => {
    const nettoye = validerPhoto(jpegAvecMetadonnees());
    expect(nettoye.mediaType).toBe('image/jpeg');
    expect(contient(nettoye.donnees, 'SECRET-GPS')).toBe(false);
    expect(contient(nettoye.donnees, 'SECRET-COMMENTAIRE')).toBe(false);
    expect(nettoye.donnees[0]).toBe(0xff);
    expect(nettoye.donnees[1]).toBe(0xd8);
    expect(detecterTypeImage(nettoye.donnees)).toBe('image/jpeg');
  });

  it('PNG : blocs tEXt et eXIf retirés, IHDR/IDAT/IEND conservés', () => {
    const nettoye = validerPhoto(pngAvecMetadonnees());
    expect(nettoye.mediaType).toBe('image/png');
    expect(contient(nettoye.donnees, 'SECRET-PNG')).toBe(false);
    expect(contient(nettoye.donnees, 'SECRET-EXIF')).toBe(false);
    expect(contient(nettoye.donnees, 'IHDR')).toBe(true);
    expect(contient(nettoye.donnees, 'IDAT')).toBe(true);
    expect(contient(nettoye.donnees, 'IEND')).toBe(true);
  });

  it('WebP : blocs EXIF et XMP retirés, taille RIFF recalculée', () => {
    const nettoye = validerPhoto(webpAvecMetadonnees());
    expect(nettoye.mediaType).toBe('image/webp');
    expect(contient(nettoye.donnees, 'SECRET-WEBP')).toBe(false);
    expect(contient(nettoye.donnees, 'SECRET-XMP')).toBe(false);
    expect(contient(nettoye.donnees, 'VP8 ')).toBe(true);
    const tailleLue = nettoye.donnees[4]! | (nettoye.donnees[5]! << 8) | (nettoye.donnees[6]! << 16) | (nettoye.donnees[7]! << 24);
    expect(tailleLue).toBe(nettoye.donnees.length - 8);
  });

  it('retirerMetadonnees ne casse pas une image tronquée : elle reste détectable', () => {
    const tronque = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00]);
    const sortie = retirerMetadonnees('image/jpeg', tronque);
    expect(detecterTypeImage(sortie)).toBe('image/jpeg');
  });

  it('vraie photo JPEG (1×1 complète) : métadonnées retirées, structure JPEG intacte', () => {
    // JPEG 1×1 complet et décodable (SOI, DQT, SOF0, DHT, SOS, EOI), encodé en
    // base64 dans le test — aucune image cliente, aucun fichier externe.
    const JPEG_1X1_BASE64 =
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AvwH/2Q==';
    const original = new Uint8Array(Buffer.from(JPEG_1X1_BASE64, 'base64'));
    expect(detecterTypeImage(original)).toBe('image/jpeg');
    // On injecte un segment APP1 EXIF comme le ferait un téléphone.
    const avecExif = assemblerTest([
      original.subarray(0, 2),
      segmentJpeg(0xe1, octetsTexte('Exif\0\0GPS-SECRET')),
      original.subarray(2)
    ]);
    const nettoye = validerPhoto(avecExif);
    expect(nettoye.mediaType).toBe('image/jpeg');
    expect(contient(nettoye.donnees, 'GPS-SECRET')).toBe(false);
    // Structure toujours complète : SOI au début, EOI à la fin, SOF et SOS présents.
    expect([nettoye.donnees[0], nettoye.donnees[1]]).toEqual([0xff, 0xd8]);
    expect([nettoye.donnees[nettoye.donnees.length - 2], nettoye.donnees[nettoye.donnees.length - 1]]).toEqual([0xff, 0xd9]);
    const marqueurs = new Set<number>();
    for (let i = 0; i + 1 < nettoye.donnees.length; i += 1) {
      if (nettoye.donnees[i] === 0xff && nettoye.donnees[i + 1] !== 0x00 && nettoye.donnees[i + 1] !== 0xff) marqueurs.add(nettoye.donnees[i + 1]!);
    }
    expect(marqueurs.has(0xc0) || marqueurs.has(0xc2)).toBe(true); // SOF0/SOF2 : dimensions présentes
    expect(marqueurs.has(0xda)).toBe(true); // SOS : données d’image présentes
    expect(marqueurs.has(0xe1)).toBe(false); // APP1 bien retiré
    // Idempotence : retraiter l’image nettoyée (comme après un réencodage
    // navigateur sans métadonnées) ne change plus rien.
    expect(validerPhoto(nettoye.donnees).donnees).toEqual(nettoye.donnees);
    const propre = validerPhoto(original);
    expect(detecterTypeImage(propre.donnees)).toBe('image/jpeg');
    expect([propre.donnees[propre.donnees.length - 2], propre.donnees[propre.donnees.length - 1]]).toEqual([0xff, 0xd9]);
  });
});

function assemblerTest(parties: Uint8Array[]): Uint8Array {
  const total = parties.reduce((n, p) => n + p.length, 0);
  const sortie = new Uint8Array(total);
  let pos = 0;
  for (const p of parties) {
    sortie.set(p, pos);
    pos += p.length;
  }
  return sortie;
}
