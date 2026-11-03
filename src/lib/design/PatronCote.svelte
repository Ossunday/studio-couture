<script lang="ts">
  import { preparerPatronCote, type MesuresPatronCote } from './patron-cote';
  import type { OptionsPantalonLarge } from '$lib/patterns/pantalon-large/geometry';

  let {
    mesures,
    options = {},
    variante = 'complet',
    remplissage = '#ffffff',
    uid = 'pc',
    classe = ''
  }: {
    mesures: MesuresPatronCote;
    options?: OptionsPantalonLarge;
    variante?: 'complet' | 'mini';
    remplissage?: string;
    uid?: string;
    classe?: string;
  } = $props();

  const d = $derived(preparerPatronCote(mesures, options));
  const fleche = $derived(`${uid}-fleche`);
  const pieces = $derived([d.devant, d.dos]);
  // Mini : uniquement les contours des jambes, serrés (comme les vignettes de la maquette).
  const miniVb = $derived.by(() => {
    const minX = Math.min(d.devant.x, d.dos.x) - 2;
    const minY = d.yJambes - 2;
    const largeur = Math.max(d.devant.x + d.devant.largeur, d.dos.x + d.dos.largeur) - minX + 2;
    return `${minX} ${minY} ${largeur} ${d.hauteurJambes + 4}`;
  });
  const largeurEtiquette = (texte: string) => texte.length * 1.72 + 3;
</script>

{#if variante === 'mini'}
  <svg viewBox={miniVb} role="img" aria-label={d.ariaLabel} class="patron-cote mini {classe}">
    <title>Patron du pantalon — brouillon à valider</title>
    {#each pieces as piece}
      <polygon points={piece.coupe} fill={remplissage} stroke="#23223a" stroke-width="0.45" stroke-linejoin="round" />
      <polygon points={piece.couture} fill="none" stroke="#23223a" stroke-width="0.28" stroke-dasharray="1.4 1" opacity="0.7" />
      {#each piece.traits as trait}<polyline points={trait} fill="none" stroke="#23223a" stroke-width="0.28" stroke-dasharray="1.2 0.9" opacity="0.8" />{/each}
      <line x1={piece.filDroit.x1} y1={piece.filDroit.y1} x2={piece.filDroit.x2} y2={piece.filDroit.y2} stroke="#23223a" stroke-width="0.35" opacity="0.65" />
    {/each}
  </svg>
{:else}
  <svg viewBox="0 0 {d.largeurTotale} {d.hauteurTotale}" role="img" aria-label={d.ariaLabel} class="patron-cote complet {classe}">
    <title>Patron du pantalon — brouillon à valider</title>
    <defs>
      <marker id={fleche} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0 1 L10 5 L0 9 z" fill="#c2410c" />
      </marker>
    </defs>

    <!-- Ceinture, au-dessus des jambes -->
    <text x={d.largeurTotale / 2} y="6" text-anchor="middle" font-size="3.1" font-weight="700" letter-spacing="0.28" fill="#23223a">CEINTURE (1 PIÈCE, À COUPER DANS LE DROIT-FIL)</text>
    <polygon points={d.ceinture.coupe} fill={remplissage} stroke="#23223a" stroke-width="0.45" stroke-linejoin="round" />
    <polygon points={d.ceinture.couture} fill="none" stroke="#23223a" stroke-width="0.26" stroke-dasharray="1.4 1" opacity="0.7" />
    <line x1={d.ceinture.x + 1} y1={d.ceinture.y + d.ceinture.hauteur / 2} x2={d.ceinture.x + d.ceinture.largeur - 1} y2={d.ceinture.y + d.ceinture.hauteur / 2} stroke="#c2410c" stroke-width="0.4" marker-start="url(#{fleche})" marker-end="url(#{fleche})" />
    <rect x={d.largeurTotale / 2 - largeurEtiquette(`Ceinture ${d.valeurs.ceinture} cm`) / 2} y={d.ceinture.y + d.ceinture.hauteur / 2 - 2.8} width={largeurEtiquette(`Ceinture ${d.valeurs.ceinture} cm`)} height="5.6" rx="2.8" fill="#ffffff" stroke="#c2410c" stroke-width="0.3" />
    <text x={d.largeurTotale / 2} y={d.ceinture.y + d.ceinture.hauteur / 2 + 1.2} text-anchor="middle" font-size="3" font-weight="800" fill="#c2410c">Ceinture {d.valeurs.ceinture} cm</text>
    <line x1={d.ceinture.x + d.ceinture.largeur + 2.5} y1={d.ceinture.y} x2={d.ceinture.x + d.ceinture.largeur + 2.5} y2={d.ceinture.y + d.ceinture.hauteur} stroke="#c2410c" stroke-width="0.4" marker-start="url(#{fleche})" marker-end="url(#{fleche})" />
    <text x={d.ceinture.x + d.ceinture.largeur + 4} y={d.ceinture.y + d.ceinture.hauteur / 2 + 1} font-size="2.8" font-weight="800" fill="#c2410c">{d.valeurs.ceintureHauteur} cm</text>

    <!-- Titres des pièces -->
    <text x={d.devant.centreX} y={d.yTitres} text-anchor="middle" font-size="4.2" font-weight="800" letter-spacing="0.3" fill="#23223a">DEVANT</text>
    <text x={d.dos.centreX} y={d.yTitres} text-anchor="middle" font-size="4.2" font-weight="800" letter-spacing="0.3" fill="#23223a">DOS</text>

    {#each pieces as piece, i}
      <polygon points={piece.coupe} fill={remplissage} stroke="#23223a" stroke-width="0.45" stroke-linejoin="round" />
      <polygon points={piece.couture} fill="none" stroke="#23223a" stroke-width="0.26" stroke-dasharray="1.4 1" opacity="0.7" />
      {#each piece.traits as trait}<polyline points={trait} fill="none" stroke="#23223a" stroke-width="0.28" stroke-dasharray="1.2 0.9" opacity="0.8" />{/each}

      <!-- Droit-fil -->
      <line x1={piece.filDroit.x1} y1={piece.filDroit.y1} x2={piece.filDroit.x2} y2={piece.filDroit.y2} stroke="#23223a" stroke-width="0.35" marker-start="url(#{fleche})" marker-end="url(#{fleche})" />
      <text transform="translate({piece.filDroit.x1 + 3.4} {(piece.filDroit.y1 + piece.filDroit.y2) / 2}) rotate(-90)" text-anchor="middle" font-size="2.5" font-weight="700" letter-spacing="0.2" fill="#23223a">SENS DU DROIT-FIL</text>

      <!-- Taille -->
      <line x1={piece.x} y1={piece.y} x2={piece.x + piece.largeur} y2={piece.y} stroke="#c2410c" stroke-width="0.4" marker-start="url(#{fleche})" marker-end="url(#{fleche})" />
      <rect x={piece.centreX - largeurEtiquette(`Taille ${d.valeurs.taille} cm`) / 2} y={piece.y - 2.8} width={largeurEtiquette(`Taille ${d.valeurs.taille} cm`)} height="5.6" rx="2.8" fill="#ffffff" stroke="#c2410c" stroke-width="0.3" />
      <text x={piece.centreX} y={piece.y + 1.2} text-anchor="middle" font-size="3" font-weight="800" fill="#c2410c">Taille {d.valeurs.taille} cm</text>

      <!-- Hanches, à leur hauteur -->
      <line x1={piece.x} y1={piece.yHanches} x2={piece.x + piece.largeur} y2={piece.yHanches} stroke="#c2410c" stroke-width="0.4" marker-start="url(#{fleche})" marker-end="url(#{fleche})" />
      <rect x={piece.centreX - largeurEtiquette(`Hanches ${d.valeurs.hanches} cm`) / 2} y={piece.yHanches - 2.8} width={largeurEtiquette(`Hanches ${d.valeurs.hanches} cm`)} height="5.6" rx="2.8" fill="#ffffff" stroke="#c2410c" stroke-width="0.3" />
      <text x={piece.centreX} y={piece.yHanches + 1.2} text-anchor="middle" font-size="3" font-weight="800" fill="#c2410c">Hanches {d.valeurs.hanches} cm</text>

      <!-- Longueur, au centre de la pièce -->
      <line x1={piece.centreX} y1={piece.y} x2={piece.centreX} y2={piece.y + mesures.longueurPantalonCm} stroke="#c2410c" stroke-width="0.38" marker-start="url(#{fleche})" marker-end="url(#{fleche})" opacity="0.9" />
      <rect x={piece.centreX - 9.5} y={piece.y + piece.hauteur * 0.68} width="19" height="9" rx="2.6" fill="#ffffff" stroke="#c2410c" stroke-width="0.3" />
      <text x={piece.centreX} y={piece.y + piece.hauteur * 0.68 + 3.6} text-anchor="middle" font-size="2.6" font-weight="700" fill="#c2410c">Longueur</text>
      <text x={piece.centreX} y={piece.y + piece.hauteur * 0.68 + 7.2} text-anchor="middle" font-size="3" font-weight="800" fill="#c2410c">{d.valeurs.longueur} cm</text>

      <!-- Fourche, devant seulement -->
      {#if i === 0}
        <line x1={piece.x + 3} y1={piece.y} x2={piece.x + 3} y2={piece.y + mesures.hauteurFourcheCm} stroke="#c2410c" stroke-width="0.4" marker-start="url(#{fleche})" marker-end="url(#{fleche})" />
        <rect x={piece.x - 1} y={piece.y + mesures.hauteurFourcheCm / 2 - 4.5} width="17" height="9" rx="2.6" fill="#ffffff" stroke="#c2410c" stroke-width="0.3" />
        <text x={piece.x + 7.5} y={piece.y + mesures.hauteurFourcheCm / 2 - 0.9} text-anchor="middle" font-size="2.6" font-weight="700" fill="#c2410c">Fourche</text>
        <text x={piece.x + 7.5} y={piece.y + mesures.hauteurFourcheCm / 2 + 2.7} text-anchor="middle" font-size="3" font-weight="800" fill="#c2410c">{d.valeurs.fourche} cm</text>
      {/if}

      <!-- Bas, valeur calculée de la pièce -->
      <line x1={piece.x} y1={d.yBasCotes} x2={piece.x + piece.largeur} y2={d.yBasCotes} stroke="#c2410c" stroke-width="0.4" marker-start="url(#{fleche})" marker-end="url(#{fleche})" />
      <rect x={piece.centreX - largeurEtiquette(`Bas ${piece.basValeur} cm`) / 2} y={d.yBasCotes - 2.8} width={largeurEtiquette(`Bas ${piece.basValeur} cm`)} height="5.6" rx="2.8" fill="#ffffff" stroke="#c2410c" stroke-width="0.3" />
      <text x={piece.centreX} y={d.yBasCotes + 1.2} text-anchor="middle" font-size="3" font-weight="800" fill="#c2410c">Bas {piece.basValeur} cm</text>
    {/each}

    <!-- Légende -->
    <line x1={d.devant.x} y1={d.yLegende} x2={d.devant.x + 10} y2={d.yLegende} stroke="#23223a" stroke-width="0.4" stroke-dasharray="1.6 1.2" />
    <text x={d.devant.x + 12} y={d.yLegende + 1.1} font-size="3" font-weight="700" fill="#23223a">= marge de couture 1 cm</text>
  </svg>
{/if}

<style>
  .patron-cote { display: block; width: 100%; height: auto; font-family: var(--sans); }
</style>
