<script lang="ts">
  import { preparerPatronCote, type MesuresPatronCote, type PatronGeneriquePrepare } from './patron-cote';
  import type { OptionsPantalonLarge } from '$lib/patterns/pantalon-large/geometry';
  import { t, type Lang, type TranslationKey } from '$lib/i18n';

  let {
    mesures,
    generique = null,
    options = {},
    variante = 'complet',
    remplissage = '#ffffff',
    uid = 'pc',
    classe = '',
    lang = 'fr'
  }: {
    /** Mode spécialisé pantalon large (dessin historique des maquettes). */
    mesures?: MesuresPatronCote;
    /** Mode générique : pièces et cotes d'un modèle du registre, en données. */
    generique?: PatronGeneriquePrepare | null;
    options?: OptionsPantalonLarge;
    variante?: 'complet' | 'mini';
    remplissage?: string;
    uid?: string;
    classe?: string;
    lang?: Lang;
  } = $props();

  const cle = (k: string) => k as TranslationKey;
  const d = $derived(mesures ? preparerPatronCote(mesures, options, lang) : null);
  const fleche = $derived(`${uid}-fleche`);
  const flecheGen = $derived(`${uid}-fleche-gen`);
  const pieces = $derived(d ? [d.devant, d.dos] : []);
  // Mini : uniquement les contours des jambes, serrés (comme les vignettes de la maquette).
  const miniVb = $derived.by(() => {
    if (!d) return '0 0 1 1';
    const minX = Math.min(d.devant.x, d.dos.x) - 2;
    const minY = d.yJambes - 2;
    const largeur = Math.max(d.devant.x + d.devant.largeur, d.dos.x + d.dos.largeur) - minX + 2;
    return `${minX} ${minY} ${largeur} ${d.hauteurJambes + 4}`;
  });
  const largeurEtiquette = (texte: string) => texte.length * 1.72 + 3;
</script>

{#if generique}
  <!-- Mode générique : contours, fil droit et cotes lus dans les données des
       pièces du modèle (registre) — aucun libellé propre à un vêtement ici. -->
  <svg viewBox="0 0 {generique.largeur} {generique.hauteur}" role="img" aria-label={generique.ariaLabel} class="patron-cote generique {classe}">
    <title>{generique.titre}</title>
    <defs>
      <marker id={flecheGen} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0 1 L10 5 L0 9 z" fill="#c2410c" />
      </marker>
    </defs>
    {#each generique.pieces as piece}
      <polygon points={piece.coupe} fill={remplissage} stroke="#23223a" stroke-width="0.45" stroke-linejoin="round" />
      <polygon points={piece.couture} fill="none" stroke="#23223a" stroke-width="0.28" stroke-dasharray="1.4 1" opacity="0.7" />
      {#each piece.traits as trait}<polyline points={trait} fill="none" stroke="#23223a" stroke-width="0.28" stroke-dasharray="1.2 0.9" opacity="0.8" />{/each}
      <line x1={piece.filDroit.x1} y1={piece.filDroit.y1} x2={piece.filDroit.x2} y2={piece.filDroit.y2} stroke="#23223a" stroke-width="0.35" opacity="0.65" />
      {#if variante !== 'mini'}
        <text x={piece.etiquetteX} y={piece.etiquetteY} font-size="3" font-weight="700" fill="#23223a">{piece.nom}</text>
        {#each piece.cotes as cote}
          <line x1={cote.x1} y1={cote.y1} x2={cote.x2} y2={cote.y2} stroke="#c2410c" stroke-width="0.35" marker-start="url(#{flecheGen})" marker-end="url(#{flecheGen})" />
          <rect x={cote.fondX} y={cote.fondY} width={cote.fondLargeur} height={cote.fondHauteur} rx="2.6" fill="#ffffff" stroke="#c2410c" stroke-width="0.25" />
          <text x={cote.tx} y={cote.ty + 0.8} text-anchor="middle" font-size="2.6" font-weight="700" fill="#c2410c">{cote.libelle} {cote.valeur} {t(lang, 'commun.cm')}</text>
        {/each}
      {/if}
    {/each}
  </svg>
{:else if d && variante === 'mini'}
  <svg viewBox={miniVb} role="img" aria-label={d.ariaLabel} class="patron-cote mini {classe}">
    <title>{t(lang, cle('patronCote.titrePantalon'))}</title>
    {#each pieces as piece}
      <polygon points={piece.coupe} fill={remplissage} stroke="#23223a" stroke-width="0.45" stroke-linejoin="round" />
      <polygon points={piece.couture} fill="none" stroke="#23223a" stroke-width="0.28" stroke-dasharray="1.4 1" opacity="0.7" />
      {#each piece.traits as trait}<polyline points={trait} fill="none" stroke="#23223a" stroke-width="0.28" stroke-dasharray="1.2 0.9" opacity="0.8" />{/each}
      <line x1={piece.filDroit.x1} y1={piece.filDroit.y1} x2={piece.filDroit.x2} y2={piece.filDroit.y2} stroke="#23223a" stroke-width="0.35" opacity="0.65" />
    {/each}
  </svg>
{:else if d}
  <svg viewBox="0 0 {d.largeurTotale} {d.hauteurTotale}" role="img" aria-label={d.ariaLabel} class="patron-cote complet {classe}">
    <title>{t(lang, cle('patronCote.titrePantalon'))}</title>
    <defs>
      <marker id={fleche} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0 1 L10 5 L0 9 z" fill="#c2410c" />
      </marker>
    </defs>

    <!-- Ceinture, au-dessus des jambes -->
    <text x={d.largeurTotale / 2} y="6" text-anchor="middle" font-size="3.1" font-weight="700" letter-spacing="0.28" fill="#23223a">{t(lang, cle('patronCote.ceintureUnePiece'))}</text>
    <polygon points={d.ceinture.coupe} fill={remplissage} stroke="#23223a" stroke-width="0.45" stroke-linejoin="round" />
    <polygon points={d.ceinture.couture} fill="none" stroke="#23223a" stroke-width="0.26" stroke-dasharray="1.4 1" opacity="0.7" />
    <line x1={d.ceinture.x + 1} y1={d.ceinture.y + d.ceinture.hauteur / 2} x2={d.ceinture.x + d.ceinture.largeur - 1} y2={d.ceinture.y + d.ceinture.hauteur / 2} stroke="#c2410c" stroke-width="0.4" marker-start="url(#{fleche})" marker-end="url(#{fleche})" />
    <rect x={d.largeurTotale / 2 - largeurEtiquette(`${t(lang, 'patronCote.ceinture')} ${d.valeurs.ceinture} ${t(lang, 'commun.cm')}`) / 2} y={d.ceinture.y + d.ceinture.hauteur / 2 - 2.8} width={largeurEtiquette(`${t(lang, 'patronCote.ceinture')} ${d.valeurs.ceinture} ${t(lang, 'commun.cm')}`)} height="5.6" rx="2.8" fill="#ffffff" stroke="#c2410c" stroke-width="0.3" />
    <text x={d.largeurTotale / 2} y={d.ceinture.y + d.ceinture.hauteur / 2 + 1.2} text-anchor="middle" font-size="3" font-weight="800" fill="#c2410c">{t(lang, 'patronCote.ceinture')} {d.valeurs.ceinture} {t(lang, 'commun.cm')}</text>
    <line x1={d.ceinture.x + d.ceinture.largeur + 2.5} y1={d.ceinture.y} x2={d.ceinture.x + d.ceinture.largeur + 2.5} y2={d.ceinture.y + d.ceinture.hauteur} stroke="#c2410c" stroke-width="0.4" marker-start="url(#{fleche})" marker-end="url(#{fleche})" />
    <text x={d.ceinture.x + d.ceinture.largeur + 4} y={d.ceinture.y + d.ceinture.hauteur / 2 + 1} font-size="2.8" font-weight="800" fill="#c2410c">{d.valeurs.ceintureHauteur} {t(lang, 'commun.cm')}</text>

    <!-- Titres des pièces -->
    <text x={d.devant.centreX} y={d.yTitres} text-anchor="middle" font-size="4.2" font-weight="800" letter-spacing="0.3" fill="#23223a">{t(lang, 'patronCote.devant')}</text>
    <text x={d.dos.centreX} y={d.yTitres} text-anchor="middle" font-size="4.2" font-weight="800" letter-spacing="0.3" fill="#23223a">{t(lang, 'patronCote.dos')}</text>

    {#each pieces as piece, i}
      <polygon points={piece.coupe} fill={remplissage} stroke="#23223a" stroke-width="0.45" stroke-linejoin="round" />
      <polygon points={piece.couture} fill="none" stroke="#23223a" stroke-width="0.26" stroke-dasharray="1.4 1" opacity="0.7" />
      {#each piece.traits as trait}<polyline points={trait} fill="none" stroke="#23223a" stroke-width="0.28" stroke-dasharray="1.2 0.9" opacity="0.8" />{/each}

      <!-- Droit-fil -->
      <line x1={piece.filDroit.x1} y1={piece.filDroit.y1} x2={piece.filDroit.x2} y2={piece.filDroit.y2} stroke="#23223a" stroke-width="0.35" marker-start="url(#{fleche})" marker-end="url(#{fleche})" />
      <text transform="translate({piece.filDroit.x1 + 3.4} {(piece.filDroit.y1 + piece.filDroit.y2) / 2}) rotate(-90)" text-anchor="middle" font-size="2.5" font-weight="700" letter-spacing="0.2" fill="#23223a">{t(lang, cle('patronCote.droitFil'))}</text>

      <!-- Taille -->
      <line x1={piece.x} y1={piece.y} x2={piece.x + piece.largeur} y2={piece.y} stroke="#c2410c" stroke-width="0.4" marker-start="url(#{fleche})" marker-end="url(#{fleche})" />
      <rect x={piece.centreX - largeurEtiquette(`${t(lang, 'cote.taille')} ${d.valeurs.taille} ${t(lang, 'commun.cm')}`) / 2} y={piece.y - 2.8} width={largeurEtiquette(`${t(lang, 'cote.taille')} ${d.valeurs.taille} ${t(lang, 'commun.cm')}`)} height="5.6" rx="2.8" fill="#ffffff" stroke="#c2410c" stroke-width="0.3" />
      <text x={piece.centreX} y={piece.y + 1.2} text-anchor="middle" font-size="3" font-weight="800" fill="#c2410c">{t(lang, 'cote.taille')} {d.valeurs.taille} {t(lang, 'commun.cm')}</text>

      <!-- Hanches, à leur hauteur -->
      <line x1={piece.x} y1={piece.yHanches} x2={piece.x + piece.largeur} y2={piece.yHanches} stroke="#c2410c" stroke-width="0.4" marker-start="url(#{fleche})" marker-end="url(#{fleche})" />
      <rect x={piece.centreX - largeurEtiquette(`${t(lang, 'cote.hanches')} ${d.valeurs.hanches} ${t(lang, 'commun.cm')}`) / 2} y={piece.yHanches - 2.8} width={largeurEtiquette(`${t(lang, 'cote.hanches')} ${d.valeurs.hanches} ${t(lang, 'commun.cm')}`)} height="5.6" rx="2.8" fill="#ffffff" stroke="#c2410c" stroke-width="0.3" />
      <text x={piece.centreX} y={piece.yHanches + 1.2} text-anchor="middle" font-size="3" font-weight="800" fill="#c2410c">{t(lang, 'cote.hanches')} {d.valeurs.hanches} {t(lang, 'commun.cm')}</text>

      <!-- Longueur, au centre de la pièce -->
      <line x1={piece.centreX} y1={piece.y} x2={piece.centreX} y2={piece.y + mesures!.longueurPantalonCm} stroke="#c2410c" stroke-width="0.38" marker-start="url(#{fleche})" marker-end="url(#{fleche})" opacity="0.9" />
      <rect x={piece.centreX - 9.5} y={piece.y + piece.hauteur * 0.68} width="19" height="9" rx="2.6" fill="#ffffff" stroke="#c2410c" stroke-width="0.3" />
      <text x={piece.centreX} y={piece.y + piece.hauteur * 0.68 + 3.6} text-anchor="middle" font-size="2.6" font-weight="700" fill="#c2410c">{t(lang, 'cote.longueur')}</text>
      <text x={piece.centreX} y={piece.y + piece.hauteur * 0.68 + 7.2} text-anchor="middle" font-size="3" font-weight="800" fill="#c2410c">{d.valeurs.longueur} {t(lang, 'commun.cm')}</text>

      <!-- Fourche, devant seulement -->
      {#if i === 0}
        <line x1={piece.x + 3} y1={piece.y} x2={piece.x + 3} y2={piece.y + mesures!.hauteurFourcheCm} stroke="#c2410c" stroke-width="0.4" marker-start="url(#{fleche})" marker-end="url(#{fleche})" />
        <rect x={piece.x - 1} y={piece.y + mesures!.hauteurFourcheCm / 2 - 4.5} width="17" height="9" rx="2.6" fill="#ffffff" stroke="#c2410c" stroke-width="0.3" />
        <text x={piece.x + 7.5} y={piece.y + mesures!.hauteurFourcheCm / 2 - 0.9} text-anchor="middle" font-size="2.6" font-weight="700" fill="#c2410c">{t(lang, 'cote.fourche')}</text>
        <text x={piece.x + 7.5} y={piece.y + mesures!.hauteurFourcheCm / 2 + 2.7} text-anchor="middle" font-size="3" font-weight="800" fill="#c2410c">{d.valeurs.fourche} {t(lang, 'commun.cm')}</text>
      {/if}

      <!-- Bas, valeur calculée de la pièce -->
      <line x1={piece.x} y1={d.yBasCotes} x2={piece.x + piece.largeur} y2={d.yBasCotes} stroke="#c2410c" stroke-width="0.4" marker-start="url(#{fleche})" marker-end="url(#{fleche})" />
      <rect x={piece.centreX - largeurEtiquette(`${t(lang, 'cote.bas')} ${piece.basValeur} ${t(lang, 'commun.cm')}`) / 2} y={d.yBasCotes - 2.8} width={largeurEtiquette(`${t(lang, 'cote.bas')} ${piece.basValeur} ${t(lang, 'commun.cm')}`)} height="5.6" rx="2.8" fill="#ffffff" stroke="#c2410c" stroke-width="0.3" />
      <text x={piece.centreX} y={d.yBasCotes + 1.2} text-anchor="middle" font-size="3" font-weight="800" fill="#c2410c">{t(lang, 'cote.bas')} {piece.basValeur} {t(lang, 'commun.cm')}</text>
    {/each}

    <!-- Légende -->
    <line x1={d.devant.x} y1={d.yLegende} x2={d.devant.x + 10} y2={d.yLegende} stroke="#23223a" stroke-width="0.4" stroke-dasharray="1.6 1.2" />
    <text x={d.devant.x + 12} y={d.yLegende + 1.1} font-size="3" font-weight="700" fill="#23223a">{t(lang, cle('patronCote.marge'))}</text>
  </svg>
{/if}

<style>
  .patron-cote { display: block; width: 100%; height: auto; font-family: var(--sans); }
</style>
