<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type * as THREE from 'three';
  import { analyserPantalonLarge, type MesuresPantalonLarge } from '$lib/patterns/pantalon-large/geometry';
  import { couleurTissu, type MatiereId } from '../tissus';
  import { construireSectionsPantalon } from './geometrie-pantalon';

  let {
    mesures,
    couleurId,
    matiere,
    onIndisponible
  }: {
    mesures: MesuresPantalonLarge;
    couleurId: string;
    matiere: MatiereId;
    onIndisponible: (message: string) => void;
  } = $props();

  let conteneur = $state<HTMLDivElement | null>(null);
  let pret = $state(false);
  let erreurChargement = $state('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ctx3d: any = null;
  let derniereCle = '';

  function webglDisponible(): boolean {
    try {
      const c = document.createElement('canvas');
      return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  async function initialiser() {
    if (!conteneur) return;
    if (!webglDisponible()) {
      onIndisponible('La 3D n’est pas disponible sur cet appareil (WebGL absent) : voici le patron à plat.');
      return;
    }
    try {
      const [three, orbit, modele] = await Promise.all([
        import('three'),
        import('three/addons/controls/OrbitControls.js'),
        import('./modele-three')
      ]);
      if (!conteneur) return;
      const scene = new three.Scene();
      const camera = new three.PerspectiveCamera(38, 1, 0.5, 1200);
      // Cadrage plein pied : hauteur du mannequin ≈ longueur pantalon / 0,6.
      let hauteurCorps = mesures.longueurPantalonCm / 0.6;
      const positionInitiale = new three.Vector3(hauteurCorps * 0.52, hauteurCorps * 0.58, hauteurCorps * 1.32);
      camera.position.copy(positionInitiale);
      const renderer = new three.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = three.PCFSoftShadowMap;
      renderer.domElement.dataset.testid = 'scene-3d-canvas';
      renderer.domElement.setAttribute('aria-label', 'Pantalon en 3D, généré à partir des cotes du patron');
      conteneur.appendChild(renderer.domElement);

      // Lumière de studio douce : clé + remplissage + contour, fond transparent.
      scene.add(new three.AmbientLight(0xfff6e8, 0.95));
      const cle = new three.DirectionalLight(0xffffff, 1.7);
      cle.position.set(70, 150, 90);
      cle.castShadow = true;
      cle.shadow.mapSize.set(1024, 1024);
      cle.shadow.camera.left = -90; cle.shadow.camera.right = 90;
      cle.shadow.camera.top = 190; cle.shadow.camera.bottom = -20;
      cle.shadow.radius = 6;
      scene.add(cle);
      const remplissage = new three.DirectionalLight(0xdfe8ff, 0.55); remplissage.position.set(-80, 50, 40); scene.add(remplissage);
      const rim = new three.DirectionalLight(0xffe2b0, 0.65); rim.position.set(-20, 90, -100); scene.add(rim);

      const controls = new orbit.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false;
      controls.minDistance = 60;
      controls.maxDistance = 380;
      controls.maxPolarAngle = Math.PI * 0.62;
      controls.minPolarAngle = Math.PI * 0.15;
      controls.target.set(0, hauteurCorps * 0.47, 0);
      camera.lookAt(0, hauteurCorps * 0.47, 0);
      controls.update();

      const groupe = new three.Group();
      scene.add(groupe);
      scene.add(modele.construireOmbreSol(62));
      let pantalon: THREE.Group | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let materiauxActuels: any = null;
      let mannequin: THREE.Group | null = null;

      const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let autoRotation = !mouvementReduit;
      let raf = 0;
      const rendre = () => renderer.render(scene, camera);
      const boucle = () => {
        if (!autoRotation) return;
        groupe.rotation.y += 0.004;
        rendre();
        raf = requestAnimationFrame(boucle);
      };
      controls.addEventListener('change', rendre);
      controls.addEventListener('start', () => { autoRotation = false; cancelAnimationFrame(raf); });

      const majTaille = () => {
        if (!conteneur) return;
        const w = Math.max(1, conteneur.clientWidth);
        const h = Math.max(1, conteneur.clientHeight);
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        rendre();
      };
      const observer = new ResizeObserver(majTaille);
      observer.observe(conteneur);
      majTaille();

      ctx3d = {
        three, modele, scene, camera, renderer, controls, groupe, rendre, boucle, observer,
        setPantalon(m: MesuresPantalonLarge, coul: string, mat: MatiereId) {
          const sections = construireSectionsPantalon(m, analyserPantalonLarge(m));
          const materiaux = modele.creerMateriauxTissu(coul, mat);
          const nouveau = modele.construireGroupePantalon(sections, materiaux);
          if (pantalon) { groupe.remove(pantalon); modele.disposerGroupe(pantalon); }
          if (materiauxActuels) {
            materiauxActuels.principal.dispose(); materiauxActuels.fonce.dispose(); materiauxActuels.fil.dispose();
            Object.values(materiauxActuels.textures).forEach((t: unknown) => (t as THREE.Texture).dispose());
          }
          pantalon = nouveau; materiauxActuels = materiaux;
          groupe.add(pantalon);
          // Mannequin reconstruit aux mesures saisies (sans aisance) à chaque changement.
          if (mannequin) { groupe.remove(mannequin); modele.disposerGroupe(mannequin); }
          const construit = modele.construireMannequin(m);
          mannequin = construit.groupe;
          hauteurCorps = construit.hauteurTotaleCm;
          groupe.add(mannequin);
          rendre();
        },
        tourner(delta: number) { groupe.rotation.y += delta; rendre(); },
        reinitialiserVue() {
          groupe.rotation.y = 0;
          camera.position.set(hauteurCorps * 0.52, hauteurCorps * 0.58, hauteurCorps * 1.32);
          controls.target.set(0, hauteurCorps * 0.47, 0);
          controls.update();
          rendre();
        },
        detruire() {
          cancelAnimationFrame(raf);
          observer.disconnect();
          controls.dispose();
          if (pantalon) modele.disposerGroupe(pantalon);
          if (mannequin) modele.disposerGroupe(mannequin);
          if (materiauxActuels) {
            materiauxActuels.principal.dispose(); materiauxActuels.fonce.dispose(); materiauxActuels.fil.dispose();
            Object.values(materiauxActuels.textures).forEach((t: unknown) => (t as THREE.Texture).dispose());
          }
          renderer.dispose();
          renderer.domElement.remove();
        }
      };
      pret = true;
      majModele(true);
      if (autoRotation) boucle();
      else rendre();
    } catch {
      erreurChargement = 'Le chargement de la 3D a échoué.';
      onIndisponible('Le chargement de la 3D a échoué : voici le patron à plat.');
    }
  }

  function majModele(force = false) {
    if (!ctx3d || !pret) return;
    const cle = `${mesures.tourTailleCm}|${mesures.tourHanchesCm}|${mesures.hauteurFourcheCm}|${mesures.longueurPantalonCm}|${couleurId}|${matiere}`;
    if (!force && cle === derniereCle) return;
    derniereCle = cle;
    ctx3d.setPantalon({ ...mesures }, couleurId, matiere);
  }

  $effect(() => {
    void mesures; void couleurId; void matiere;
    majModele();
  });

  onMount(() => { void initialiser(); });
  onDestroy(() => { ctx3d?.detruire(); ctx3d = null; });
</script>

<div class="scene-3d-wrap">
  <div bind:this={conteneur} class="scene-3d" data-couleur={couleurTissu(couleurId).hex}>
    {#if !pret && !erreurChargement}<p class="chargement">Chargement de la vue 3D…</p>{/if}
  </div>
  <div class="commandes-3d">
    <button type="button" class="rond" aria-label="Tourner à gauche" title="Tourner à gauche (−45°)" onclick={() => ctx3d?.tourner(-Math.PI / 4)}>↩</button>
    <button type="button" class="rond" aria-label="Tourner à droite" title="Tourner à droite (+45°)" onclick={() => ctx3d?.tourner(Math.PI / 4)}>↪</button>
    <button type="button" onclick={() => ctx3d?.reinitialiserVue()}>Réinitialiser la vue</button>
  </div>
  <p class="etiquette-honnete">Volume généré à partir des cotes du patron — pas une simulation de drapé.</p>
</div>

<style>
  .scene-3d-wrap { display: grid; gap: 8px; }
  .scene-3d { position: relative; height: min(58vh, 540px); min-height: 300px; border-radius: 14px; overflow: hidden; background: linear-gradient(165deg, #fbf6ee, #efe7d7 58%, #e3dac7); }
  .scene-3d :global(canvas) { display: block; width: 100%; height: 100%; touch-action: none; }
  .chargement { padding: 18px; font-weight: 600; }
  .commandes-3d { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .commandes-3d button { min-height: 48px; min-width: 48px; }
  .commandes-3d .rond { border-radius: 999px; width: 48px; font-size: 20px; }
  .etiquette-honnete { margin: 0; font-size: 14px; font-weight: 600; }
  @media (max-width: 760px) { .scene-3d { height: 55vh; } }
</style>
