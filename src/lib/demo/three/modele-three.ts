import * as THREE from 'three';
import { couleurTissu, dessinerTextureTissu, type MatiereId } from '../tissus';
import type { Anneau, SectionsPantalon } from './geometrie-pantalon';

const SEGMENTS = 48;

/** Loft lissé d'anneaux elliptiques, plis légers par bruit de déplacement faible. */
export function construireLoft(anneaux: Anneau[], phase = 0): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  anneaux.forEach((a, i) => {
    for (let j = 0; j <= SEGMENTS; j++) {
      const theta = (j / SEGMENTS) * Math.PI * 2;
      const pli = 1 + 0.013 * Math.sin(6 * theta + a.y * 0.22 + phase) + 0.008 * Math.sin(11 * theta - a.y * 0.13 + phase);
      positions.push(a.centreX + Math.cos(theta) * a.rayonX * pli, a.y, Math.sin(theta) * a.rayonZ * pli);
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

export function creerMateriauTissu(couleurId: string, matiere: MatiereId): { materiau: THREE.MeshStandardMaterial; textures: TexturesTissu } {
  const textures = creerTexturesTissu(couleurId, matiere);
  const materiau = new THREE.MeshStandardMaterial({
    map: textures.map,
    roughnessMap: textures.roughnessMap,
    bumpMap: textures.bumpMap,
    bumpScale: matiere === 'satin' ? 0.15 : 0.6,
    roughness: matiere === 'satin' ? 0.35 : matiere === 'denim' ? 0.9 : 0.75,
    metalness: matiere === 'satin' ? 0.08 : 0,
    side: THREE.DoubleSide
  });
  return { materiau, textures };
}

/** Groupe pantalon : tronc + deux jambes + ourlets visibles (bande basse légèrement élargie). */
export function construireGroupePantalon(sections: SectionsPantalon, materiau: THREE.Material): THREE.Group {
  const groupe = new THREE.Group();
  const ajouter = (anneaux: Anneau[], phase: number) => {
    const mesh = new THREE.Mesh(construireLoft(anneaux, phase), materiau);
    groupe.add(mesh);
  };
  ajouter(sections.tronc, 0);
  ajouter(sections.jambeGauche, 1.7);
  ajouter(sections.jambeDroite, 3.4);
  for (const jambe of [sections.jambeGauche, sections.jambeDroite]) {
    const bas = jambe[jambe.length - 1]!;
    const ourlet: Anneau[] = [
      { ...bas, rayonX: bas.rayonX * 1.03, rayonZ: bas.rayonZ * 1.03 },
      { ...bas, y: bas.y + 2.4, rayonX: bas.rayonX * 1.03, rayonZ: bas.rayonZ * 1.03 }
    ];
    ajouter(ourlet, 0.5);
  }
  return groupe;
}

/** Mannequin de couture stylisé : buste sur pied, gris pierre, sans visage ni corps réaliste. */
export function construireMannequin(hauteurTailleCm: number): THREE.Group {
  const groupe = new THREE.Group();
  const pierre = new THREE.MeshStandardMaterial({ color: 0x9a917f, roughness: 0.85, transparent: true, opacity: 0.32, depthWrite: false });
  const profil: THREE.Vector2[] = [
    new THREE.Vector2(0.1, hauteurTailleCm + 42),
    new THREE.Vector2(5, hauteurTailleCm + 40),
    new THREE.Vector2(7, hauteurTailleCm + 32),
    new THREE.Vector2(13, hauteurTailleCm + 18),
    new THREE.Vector2(12, hauteurTailleCm + 4),
    new THREE.Vector2(15, hauteurTailleCm - 16),
    new THREE.Vector2(13, hauteurTailleCm - 30),
    new THREE.Vector2(6, hauteurTailleCm - 38),
    new THREE.Vector2(0.8, hauteurTailleCm - 40)
  ];
  const buste = new THREE.Mesh(new THREE.LatheGeometry(profil, 36), pierre);
  groupe.add(buste);
  const metal = new THREE.MeshStandardMaterial({ color: 0x5c564c, roughness: 0.5, metalness: 0.5, transparent: true, opacity: 0.55 });
  const pied = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, hauteurTailleCm - 38, 12), metal);
  pied.position.y = (hauteurTailleCm - 38) / 2;
  groupe.add(pied);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(17, 19, 2, 36), metal);
  base.position.y = 1;
  groupe.add(base);
  return groupe;
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
