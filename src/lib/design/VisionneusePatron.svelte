<script lang="ts">
  import type { PieceRendue } from '$lib/patterns/apercu-rendu';

  let {
    pieces,
    largeur,
    hauteur,
    couleurTissu = '',
    matiereTissu = ''
  }: { pieces: PieceRendue[]; largeur: number; hauteur: number; couleurTissu?: string; matiereTissu?: string } = $props();

  // Onglets déduits des pièces du modèle affiché (aucun nom de pièce codé ici).
  const onglets = $derived([
    { id: 'tout', libelle: 'Tout' },
    ...pieces.map((p) => ({ id: p.id, libelle: p.nom.replace(/\s*\(.*$/, '') }))
  ]);
  const ariaPatron = $derived(`Aperçu du patron brouillon : ${pieces.map((p) => p.nom).join(', ')}, avec cotes`);

  let onglet = $state<string>('tout');
  let echelle = $state(1);
  let tx = $state(0);
  let ty = $state(0);
  const visibles = $derived(onglet === 'tout' ? pieces : pieces.filter((p) => p.id === onglet));

  function zoomer(facteur: number) {
    echelle = Math.min(3, Math.max(0.5, Math.round(echelle * facteur * 100) / 100));
  }
  function ajuster() {
    echelle = 1;
    tx = 0;
    ty = 0;
  }
  function reinitialiser() {
    ajuster();
    onglet = 'tout';
  }

  const pointeurs = new Map<number, { x: number; y: number }>();
  let derniereDistance = 0;
  function distancePince(): number {
    const pts = [...pointeurs.values()];
    return pts.length === 2 ? Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) : 0;
  }
  function debut(e: PointerEvent) {
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    derniereDistance = distancePince();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function bouger(e: PointerEvent) {
    const avant = pointeurs.get(e.pointerId);
    if (!avant) return;
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointeurs.size === 2) {
      const d = distancePince();
      if (derniereDistance > 0 && d > 0) zoomer(d / derniereDistance);
      derniereDistance = d;
    } else {
      tx += e.clientX - avant.x;
      ty += e.clientY - avant.y;
    }
  }
  function fin(e: PointerEvent) {
    pointeurs.delete(e.pointerId);
    derniereDistance = distancePince();
  }
</script>

<div class="visionneuse">
  <div class="barre-outils">
    <div class="onglets" role="tablist" aria-label="Pièces à afficher">
      {#each onglets as o}
        <button type="button" role="tab" aria-selected={onglet === o.id} class:actif={onglet === o.id} onclick={() => (onglet = o.id)}>{o.libelle}</button>
      {/each}
    </div>
    <div class="zoom" aria-label="Zoom du patron">
      <button type="button" aria-label="Zoomer" onclick={() => zoomer(1.25)}>+</button>
      <button type="button" aria-label="Dézoomer" onclick={() => zoomer(0.8)}>−</button>
      <button type="button" onclick={ajuster}>Ajuster</button>
      <button type="button" onclick={reinitialiser}>Réinitialiser</button>
    </div>
  </div>
  <p class="zoom-lu" aria-live="polite">Zoom : {Math.round(echelle * 100)} % — glissez pour déplacer, pincez sur mobile.</p>
  <div class="scene" onpointerdown={debut} onpointermove={bouger} onpointerup={fin} onpointercancel={fin} role="application" aria-label="Patron déplaçable et zoomable">
    <div class="calque" style="transform: translate({tx}px, {ty}px) scale({echelle});">
      <svg viewBox="0 0 {largeur} {hauteur}" role="img" aria-label={ariaPatron} class="patron" data-tissu-couleur={couleurTissu} data-tissu-matiere={matiereTissu}>
        <title>Aperçu du patron brouillon</title>
        {#each visibles as piece}
          <polygon points={piece.coupe} pathLength="100" class="trace" fill={couleurTissu ? 'url(#motif-tissu)' : '#fffdf8'} stroke="#1e1a17" stroke-width="0.35" />
          <polygon points={piece.couture} fill="none" stroke="#b5532f" stroke-width="0.25" stroke-dasharray="1.2 0.8" />
          {#each piece.lignes as ligne}<polyline points={ligne} fill="none" stroke="#8a7d67" stroke-width="0.18" stroke-dasharray="1.6 1.2" />{/each}
          <line x1={piece.filDroit.x1} y1={piece.filDroit.y1} x2={piece.filDroit.x2} y2={piece.filDroit.y2} stroke="#1e1a17" stroke-width="0.3" marker-start="url(#fleche-demo)" marker-end="url(#fleche-demo)" />
          {#each piece.crans as cran}<path d="M {cran.x - 1} {cran.y} H {cran.x + 1} M {cran.x} {cran.y - 1} V {cran.y + 1}" stroke="#1e1a17" stroke-width="0.3" />{/each}
          {#each piece.traits as trait}<polyline points={trait} fill="none" stroke="#b5532f" stroke-width="0.25" stroke-dasharray="1 0.7" />{/each}
          {#each piece.cotes as cote}
            <g>
              <line x1={cote.x1} y1={cote.y1} x2={cote.x2} y2={cote.y2} stroke="#2f6b4f" stroke-width="0.22" marker-start="url(#fleche-cote-demo)" marker-end="url(#fleche-cote-demo)" />
              <rect x={cote.fondX} y={cote.fondY} width={cote.fondLargeur} height={cote.fondHauteur} fill="#ffffff" opacity="0.94" />
              <text x={cote.tx} y={cote.ty} font-size="2.3" fill="#2f6b4f" text-anchor="middle">{cote.libelle} {cote.valeur} cm</text>
            </g>
          {/each}
          <rect x={piece.etiquetteX - 0.5} y={piece.etiquetteY - 3.4} width={piece.nom.length * 1.9 + 1} height="7.6" fill="#ffffff" opacity="0.94" />
          <text x={piece.etiquetteX} y={piece.etiquetteY} font-size="3" fill="#1e1a17">{piece.nom}</text>
          <text x={piece.etiquetteX} y={piece.etiquetteY + 3.4} font-size="2" fill="#1e1a17">Marge incluse — brouillon</text>
        {/each}
        <defs>
          {#if couleurTissu}
            <pattern id="motif-tissu" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill={couleurTissu} />
              {#if matiereTissu === 'satin'}
                <path d="M-1 7 L7 -1" stroke="#ffffff" stroke-width="1.4" opacity="0.28" />
              {:else if matiereTissu === 'lin'}
                <path d="M0 1.5 H6 M0 4.5 H6 M1.5 0 V6 M4.5 0 V6" stroke="#000000" stroke-width="0.35" opacity="0.22" />
              {:else}
                <path d="M-1 7 L7 -1 M-1 1 L1 -1 M5 7 L7 5" stroke="#000000" stroke-width="0.5" opacity="0.3" />
                <path d="M-1 -1 L7 7" stroke="#ffffff" stroke-width="0.4" opacity="0.22" />
              {/if}
            </pattern>
          {/if}
          <marker id="fleche-demo" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto"><path d="M0 0 L4 2 L0 4 z" fill="#1e1a17" /></marker>
          <marker id="fleche-cote-demo" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto"><path d="M0 0 L4 2 L0 4 z" fill="#2f6b4f" /></marker>
        </defs>
      </svg>
    </div>
  </div>
  <details class="legende">
    <summary>Légende du patron</summary>
    <p>Trait plein : coupe (marges comprises). Pointillé terracotta : couture — 1 cm de marge, 2 cm d’ourlet en bas. Flèches : fil droit. Croix : crans. Vert : cotes en cm. Gris : lignes de construction du modèle.</p>
  </details>
</div>

<style>
  .visionneuse { border: 1px solid var(--bord); border-radius: var(--rayon); background: var(--papier); box-shadow: var(--ombre-petite); padding: 12px; }
  .barre-outils { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center; }
  .onglets, .zoom { display: flex; flex-wrap: wrap; gap: 8px; }
  .onglets button, .zoom button { min-width: 48px; min-height: 48px; }
  .zoom button[aria-label='Zoomer'], .zoom button[aria-label='Dézoomer'] { border-radius: 999px; width: 48px; font-size: 20px; }
  .onglets button.actif { background: var(--terracotta); border-color: var(--terracotta); }
  .zoom-lu { font-size: 15px; margin: 8px 0; }
  .scene { overflow: hidden; border: 2px solid var(--encre); border-radius: 10px; background: #fff; touch-action: none; cursor: grab; }
  .scene:active { cursor: grabbing; }
  .calque { transform-origin: center center; transition: transform 0.25s ease; }
  .patron { width: 100%; height: auto; display: block; }
  .trace { stroke-dasharray: 100; animation: tracer 1.4s ease both; }
  @keyframes tracer { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
  @media (prefers-reduced-motion: reduce) { .trace { animation: none; } .calque { transition: none; } }
  .legende { margin-top: 10px; }
  .legende summary { min-height: 48px; display: flex; align-items: center; cursor: pointer; font-weight: 700; }
</style>
