import * as THREE from 'three';
import { couleurTissu, dessinerTextureTissu, type MatiereId } from '../tissus';
import { rayonsDepuisCirconference, type Anneau, type SectionsPantalon } from './geometrie-pantalon';

const SEGMENTS = 64;

/**
 * Loft lissé d'anneaux elliptiques. Tombé doux : plis lents de bas de jambe,
 * amplitude ≤ 0,6 cm, jamais de bruit anguleux haute fréquence.
 */
export function construireLoft(anneaux: Anneau[], phase = 0): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const yMax = Math.max(...anneaux.map((a) => a.y), 1);
  anneaux.forEach((a) => {
    // Les plis doux croissent vers le bas (tombé), quasi nuls aux hanches.
    const forcePli = 0.25 + 0.75 * (1 - a.y / yMax);
    for (let j = 0; j <= SEGMENTS; j++) {
      const theta = (j / SEGMENTS) * Math.PI * 2;
      const decalage =
        (0.34 * Math.sin(3 * theta + a.y * 0.07 + phase) + 0.2 * Math.sin(5 * theta - a.y * 0.045 + phase * 2)) * forcePli;
      positions.push(a.centreX + Math.cos(theta) * (a.rayonX + decalage), a.y, Math.sin(theta) * (a.rayonZ + decalage * 0.7));
      uvs.push(j / SEGMENTS, a.y / 20);
    }
  });
  for (let i = 0; i < anneaux.length - 1; i++) {
    for (let j = 0; j < SEGMENTS; j++) {
      const r0 = i * (SEGMENTS + 1) + j;
      const r1 = (i + 1) * (SEGMENTS + 1) + j;
      indices.push(r0, r1, r0 + 1, r1, r1 + 1, r0 + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export interface TexturesTissu {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

/** Textures générées par canvas — même dessin que la loupe (dessinerTextureTissu). */
export function creerTexturesTissu(couleurId: string, matiere: MatiereId): TexturesTissu {
  const couleur = couleurTissu(couleurId);
  const faire = (nuance: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    nuance(ctx, 512, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  const map = faire((ctx, w, h) => dessinerTextureTissu(ctx, w, h, couleur, matiere));
  const roughnessMap = faire((ctx, w, h) => {
    ctx.fillStyle = matiere === 'satin' ? '#5a5a5a' : matiere === 'denim' ? '#c8c8c8' : '#a8a8a8';
    ctx.fillRect(0, 0, w, h);
    dessinerTextureTissu(ctx, w, h, couleur, matiere);
  });
  roughnessMap.colorSpace = THREE.NoColorSpace;
  const bumpMap = roughnessMap.clone();
  return { map, roughnessMap, bumpMap };
}

export interface MateriauxTissu {
  principal: THREE.MeshStandardMaterial;
  /** Ceinture et ourlet : même tissu, teinte un peu plus foncée. */
  fonce: THREE.MeshStandardMaterial;
  /** Surpiqûres et pli : fil contrastant. */
  fil: THREE.MeshStandardMaterial;
  textures: TexturesTissu;
}

export function creerMateriauxTissu(couleurId: string, matiere: MatiereId): MateriauxTissu {
  const textures = creerTexturesTissu(couleurId, matiere);
  const base = {
    map: textures.map,
    roughnessMap: textures.roughnessMap,
    bumpMap: textures.bumpMap,
    bumpScale: matiere === 'satin' ? 0.15 : 0.6,
    roughness: matiere === 'satin' ? 0.35 : matiere === 'denim' ? 0.9 : 0.75,
    metalness: matiere === 'satin' ? 0.08 : 0,
    side: THREE.DoubleSide
  } as const;
  const principal = new THREE.MeshStandardMaterial({ ...base });
  const fonce = new THREE.MeshStandardMaterial({ ...base, color: new THREE.Color(0xb9b0a4) });
  const fil = new THREE.MeshStandardMaterial({ color: new THREE.Color(couleurTissu(couleurId).fil), roughness: 0.6, side: THREE.DoubleSide });
  return { principal, fonce, fil, textures };
}

/** Anneau filaire fin (surpiqûre) posé sur une ellipse à hauteur y. */
function ligneSurpiqure(y: number, rayonX: number, rayonZ: number, materiau: THREE.Material): THREE.Mesh {
  const anneaux: Anneau[] = [
    { y: y - 0.18, centreX: 0, rayonX, rayonZ, circonferenceCm: 0 },
    { y: y + 0.18, centreX: 0, rayonX, rayonZ, circonferenceCm: 0 }
  ];
  return new THREE.Mesh(construireLoft(anneaux), materiau);
}

/**
 * Groupe pantalon visuellement continu : jambes montant jusqu'aux hanches dans
 * le tronc (même matériau), fond de tronc arrondi, ceinture de ~4 cm plus
 * foncée avec surpiqûre, pli devant en relief, ourlet de 2 cm surpiqué.
 */
export function construireGroupePantalon(sections: SectionsPantalon, materiaux: MateriauxTissu, hauteurCeintureCm = 4): THREE.Group {
  const groupe = new THREE.Group();
  const ajouter = (anneaux: Anneau[], materiau: THREE.Material, phase = 0) => {
    const mesh = new THREE.Mesh(construireLoft(anneaux, phase), materiau);
    mesh.castShadow = true;
    groupe.add(mesh);
    return mesh;
  };
  ajouter(sections.tronc, materiaux.principal, 0);
  ajouter(sections.jambeGauche, materiaux.principal, 1.7);
  ajouter(sections.jambeDroite, materiaux.principal, 3.4);

  const L = sections.hauteurTotaleCm;
  const rayonsTaille = rayonsDepuisCirconference(sections.circonferenceTailleCm);
  // Ceinture : bande de ~4 cm légèrement renflée, plus foncée, surpiquée en bas.
  ajouter(
    [
      { y: L - hauteurCeintureCm, centreX: 0, rayonX: rayonsTaille.rayonX * 1.015, rayonZ: rayonsTaille.rayonZ * 1.015, circonferenceCm: sections.circonferenceTailleCm },
      { y: L, centreX: 0, rayonX: rayonsTaille.rayonX * 1.05, rayonZ: rayonsTaille.rayonZ * 1.05, circonferenceCm: sections.circonferenceTailleCm }
    ],
    materiaux.fonce
  );
  const surCeinture = ligneSurpiqure(L - hauteurCeintureCm + 0.7, rayonsTaille.rayonX * 1.055, rayonsTaille.rayonZ * 1.055, materiaux.fil);
  groupe.add(surCeinture);

  for (const jambe of [sections.jambeGauche, sections.jambeDroite]) {
    const bas = jambe[jambe.length - 1]!;
    // Ourlet de 2 cm, même tissu plus foncé, surpiqué en haut de l'ourlet.
    ajouter(
      [
        { ...bas, rayonX: bas.rayonX * 1.02, rayonZ: bas.rayonZ * 1.02 },
        { ...bas, y: bas.y + 2, rayonX: bas.rayonX * 1.02, rayonZ: bas.rayonZ * 1.02 }
      ],
      materiaux.fonce,
      0.5
    );
    const surOurlet = ligneSurpiqure(2.1, bas.rayonX * 1.025, bas.rayonZ * 1.025, materiaux.fil);
    surOurlet.position.x = bas.centreX;
    groupe.add(surOurlet);
    // Pli devant en relief : fine capsule verticale aplatie sur le devant de la jambe.
    const milieu = jambe[Math.floor(jambe.length / 2)]!;
    const pli = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, Math.max(10, milieu.y * 1.55), 4, 10), materiaux.principal);
    pli.position.set(milieu.centreX, milieu.y * 0.92, milieu.rayonZ * 0.96);
    pli.scale.z = 0.38;
    pli.castShadow = true;
    groupe.add(pli);
  }
  return groupe;
}

function capsuleEntre(a: THREE.Vector3, b: THREE.Vector3, rayon: number, materiau: THREE.Material): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(b, a);
  const longueur = Math.max(1, direction.length() - rayon * 1.2);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(rayon, longueur, 6, 14), materiau);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  mesh.castShadow = true;
  return mesh;
}

export interface MesuresMannequin {
  tourTailleCm: number;
  tourHanchesCm: number;
  hauteurFourcheCm: number;
  longueurPantalonCm: number;
}

/**
 * Mannequin humain stylisé en pied, sans visage — proportions classiques
 * ≈ 7,5 têtes, calé sur la longueur du pantalon (taille du mannequin à la
 * hauteur de la ceinture). Taille/hanches = mesures saisies SANS aisance :
 * le pantalon (avec aisances) flotte donc légèrement autour du corps.
 * Argile mate #d8cfc2, haut ajusté ivoire simple, chaussures simples.
 */
export function construireMannequin(m: MesuresMannequin): { groupe: THREE.Group; hauteurTotaleCm: number } {
  const groupe = new THREE.Group();
  const L = m.longueurPantalonCm;
  const hauteurTotaleCm = L / 0.6;
  const tete = hauteurTotaleCm / 7.5;
  const argile = new THREE.MeshStandardMaterial({ color: 0xd8cfc2, roughness: 0.92 });
  const haut = new THREE.MeshStandardMaterial({ color: 0xf5eee1, roughness: 0.85 });
  const cuir = new THREE.MeshStandardMaterial({ color: 0x6b4a35, roughness: 0.55 });

  const yTaille = L;
  const yHanches = L - m.hauteurFourcheCm * 0.55;
  const yFourche = L - m.hauteurFourcheCm;
  const yEpaule = hauteurTotaleCm - tete - 5;
  const yCou = hauteurTotaleCm - tete - 1.5;
  const yPoitrine = yEpaule - (yEpaule - yTaille) * 0.38;
  const rayonTaille = rayonsDepuisCirconference(m.tourTailleCm, 0.68);
  const rayonHanches = rayonsDepuisCirconference(m.tourHanchesCm, 0.68);
  const rayonPoitrine = rayonsDepuisCirconference(m.tourHanchesCm * 0.94, 0.68);

  // Buste (lathe aplati en profondeur), de la fourche au cou.
  const profil: THREE.Vector2[] = [
    new THREE.Vector2(0.6, yFourche + 1),
    new THREE.Vector2(rayonHanches.rayonX * 0.94, yHanches - 7),
    new THREE.Vector2(rayonHanches.rayonX, yHanches),
    new THREE.Vector2(rayonTaille.rayonX * 1.03, yTaille),
    new THREE.Vector2(rayonPoitrine.rayonX * 0.97, yPoitrine),
    new THREE.Vector2(rayonPoitrine.rayonX * 1.04, yEpaule - 2),
    new THREE.Vector2(4.6, yCou),
    new THREE.Vector2(0.6, yCou + 3)
  ];
  const buste = new THREE.Mesh(new THREE.LatheGeometry(profil, 40), argile);
  // Corps volontairement plus fin que le volume du pantalon (aisances) :
  // sans cette marge, le bassin transpercerait le tronc au gré des plis doux.
  buste.scale.set(0.9, 1, 0.63);
  buste.castShadow = true;
  groupe.add(buste);
  // Haut ajusté ivoire : même buste, de la taille aux épaules, à peine plus large.
  const profilHaut = profil.filter((p) => p.y >= yTaille - 3 && p.y <= yEpaule - 1).map((p) => new THREE.Vector2(p.x * 1.045 + 0.25, p.y));
  if (profilHaut.length >= 2) {
    const hautMesh = new THREE.Mesh(new THREE.LatheGeometry(profilHaut, 40), haut);
    hautMesh.scale.set(0.93, 1, 0.65);
    hautMesh.castShadow = true;
    groupe.add(hautMesh);
  }
  // Cou et tête ovoïde sans visage.
  groupe.add(capsuleEntre(new THREE.Vector3(0, yCou - 3, 0), new THREE.Vector3(0, yCou + 4, 0), 3.4, argile));
  const teteMesh = new THREE.Mesh(new THREE.SphereGeometry(tete * 0.4, 28, 22), argile);
  teteMesh.scale.set(0.82, 1.18, 0.9);
  teteMesh.position.y = hauteurTotaleCm - tete / 2 + 1;
  teteMesh.castShadow = true;
  groupe.add(teteMesh);

  const ecartBras = rayonPoitrine.rayonX * 1.02;
  for (const signe of [-1, 1] as const) {
    // Bras le long du corps : épaule → coude → main simple.
    const epaule = new THREE.Vector3(signe * ecartBras, yEpaule - 2, 0);
    const coude = new THREE.Vector3(signe * (ecartBras + 2.4), (yEpaule + yTaille) / 2, 0.6);
    const poignet = new THREE.Vector3(signe * (rayonHanches.rayonX + 2.6), yHanches - 3, 1.2);
    groupe.add(capsuleEntre(epaule, coude, 3.1, argile));
    groupe.add(capsuleEntre(coude, poignet, 2.6, argile));
    const main = new THREE.Mesh(new THREE.SphereGeometry(3.1, 16, 12), argile);
    main.scale.set(0.75, 1.35, 0.45);
    main.position.set(poignet.x, poignet.y - 3.4, poignet.z);
    groupe.add(main);
    // Jambe du mannequin (cachée par le pantalon) jusqu'à la cheville.
    const hancheJ = new THREE.Vector3(signe * rayonHanches.rayonX * 0.48, yFourche + 4, 0);
    const genouJ = new THREE.Vector3(signe * rayonHanches.rayonX * 0.5, yFourche / 2 + 6, 0.4);
    const cheville = new THREE.Vector3(signe * rayonHanches.rayonX * 0.48, 7, 0.6);
    groupe.add(capsuleEntre(hancheJ, genouJ, 6.1, argile));
    groupe.add(capsuleEntre(genouJ, cheville, 4.3, argile));
    // Chaussure simple qui dépasse sous l'ourlet, vers l'avant.
    const chaussure = new THREE.Mesh(new THREE.SphereGeometry(5.4, 20, 14), cuir);
    chaussure.scale.set(0.78, 0.5, 1.95);
    chaussure.position.set(cheville.x, 2.4, 5.2);
    chaussure.castShadow = true;
    groupe.add(chaussure);
  }
  return { groupe, hauteurTotaleCm };
}

/** Ombre de sol douce : disque à dégradé radial, aucune lumière dure requise. */
export function construireOmbreSol(rayon = 58): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const degrade = ctx.createRadialGradient(128, 128, 12, 128, 128, 128);
  degrade.addColorStop(0, 'rgba(46,36,26,0.34)');
  degrade.addColorStop(0.62, 'rgba(46,36,26,0.14)');
  degrade.addColorStop(1, 'rgba(46,36,26,0)');
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(rayon * 2, rayon * 2),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.12;
  return mesh;
}

export function disposerGroupe(obj: THREE.Object3D): void {
  obj.traverse((enfant) => {
    const maille = enfant as THREE.Mesh;
    if (maille.geometry) maille.geometry.dispose();
    const mat = maille.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) mat.dispose();
  });
}
