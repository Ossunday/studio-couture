<script lang="ts">
  import { t, formatCm, type Lang, type TranslationKey } from '$lib/i18n';
  let { data } = $props();
  const lang: Lang = $derived(data.lang ?? 'fr');
  const cle = (k: string) => k as TranslationKey;
</script>

<svelte:head><title>{t(lang, 'patron.apercu.titrePage')}</title></svelte:head>

<main>
  <p><a href={data.hrefMesures}>← {t(lang, cle('patron.apercu.refaire'))}</a></p>
  <h1>{t(lang, 'patron.apercu.titre', { modele: data.titre })} — {data.nom}</h1>

  <section class="alerte" role="alert">
    <strong>{t(lang, 'commun.brouillonNonValide')}.</strong>
    {t(lang, 'patron.apercu.banniere')}
  </section>

  <p class="mesures-resume">
    {#each data.mesures as m, i}{#if i > 0}<span aria-hidden="true">{' · '}</span>{/if}<span>{m.libelle} : {formatCm(lang, m.valeur)} {t(lang, 'commun.cm')}</span>{/each}
  </p>

  <div class="patron-defilant">
    <div class="patron-cadre">
  <svg viewBox="0 0 {data.largeur} {data.hauteur}" role="img" aria-label={t(lang, cle('patron.apercu.aria'), { modele: data.titre, nom: data.nom })} class="patron">
    <title>{t(lang, cle('patron.apercu.aria'), { modele: data.titre, nom: data.nom })}</title>
    {#each data.pieces as piece}
      <polygon points={piece.coupe} fill="#fffdf8" stroke="#1e1a17" stroke-width="0.35" />
      <polygon points={piece.couture} fill="none" stroke="#b5532f" stroke-width="0.25" stroke-dasharray="1.2 0.8" />
      {#each piece.lignes as ligne}
        <polyline points={ligne} fill="none" stroke="#8a8a8a" stroke-width="0.18" stroke-dasharray="1.6 1.2" />
      {/each}
      <line x1={piece.filDroit.x1} y1={piece.filDroit.y1} x2={piece.filDroit.x2} y2={piece.filDroit.y2} stroke="#1e1a17" stroke-width="0.3" marker-start="url(#fleche)" marker-end="url(#fleche)" />
      {#each piece.crans as cran}
        <path d="M {cran.x - 1} {cran.y} H {cran.x + 1} M {cran.x} {cran.y - 1} V {cran.y + 1}" stroke="#1e1a17" stroke-width="0.3" />
      {/each}
      {#each piece.traits as trait}
        <polyline points={trait} fill="none" stroke="#b5532f" stroke-width="0.25" stroke-dasharray="1 0.7" />
      {/each}
      {#each piece.cotes as cote}
        <g class="cote">
          <line x1={cote.x1} y1={cote.y1} x2={cote.x2} y2={cote.y2} stroke="#2f6b4f" stroke-width="0.22" marker-start="url(#fleche-cote)" marker-end="url(#fleche-cote)" />
          <rect x={cote.fondX} y={cote.fondY} width={cote.fondLargeur} height={cote.fondHauteur} fill="#ffffff" opacity="0.92" />
          <text x={cote.tx} y={cote.ty} font-size="2.3" fill="#2f6b4f" text-anchor="middle">{cote.libelle} {cote.valeur} {t(lang, 'commun.cm')}</text>
        </g>
      {/each}
      <rect x={piece.etiquetteX - 0.5} y={piece.etiquetteY - 3.4} width={piece.nom.length * 1.9 + 1} height="7.6" fill="#ffffff" opacity="0.92" />
      <text x={piece.etiquetteX} y={piece.etiquetteY} font-size="3" fill="#1e1a17">{piece.nom}</text>
      <text x={piece.etiquetteX} y={piece.etiquetteY + 3.4} font-size="2" fill="#1e1a17">{t(lang, 'visionneuse.margeIncluse')}</text>
    {/each}
    <defs>
      <marker id="fleche" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
        <path d="M0 0 L4 2 L0 4 z" fill="#1e1a17" />
      </marker>
      <marker id="fleche-cote" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
        <path d="M0 0 L4 2 L0 4 z" fill="#2f6b4f" />
      </marker>
    </defs>
  </svg>
    </div>
  </div>
  <p class="aide-defilement">{t(lang, 'patron.apercu.defilement')}</p>
  <p class="legende">{t(lang, cle('patron.apercu.legende'))}</p>

  <section class="carte" aria-label={t(lang, 'patron.apercu.mesuresTableau')}>
    <h2>{t(lang, 'patron.apercu.mesuresTableau')}</h2>
    {#each data.pieces as piece}
      <h3>{piece.nom}</h3>
      {#if piece.tableau.length}
        <table>
          <tbody>
            {#each piece.tableau as ligne}
              <tr><th scope="row">{ligne.libelle}</th><td>{ligne.valeur} {t(lang, 'commun.cm')}</td></tr>
            {/each}
          </tbody>
        </table>
      {/if}
    {/each}
  </section>

  <p><a class="bouton" href={data.hrefPdf} download>{t(lang, 'demo.telecharger')}</a></p>
  <p>{t(lang, 'demo.carreRappel')}</p>

  <section class="carte">
    <h2>{t(lang, 'patron.apercu.formules')}</h2>
    <ul>
      {#each data.formules as f}
        <li><strong>{f.element}</strong> ({f.statut}) : {f.hypotheses.join(' ')}</li>
      {/each}
    </ul>
  </section>
</main>

<style>
  /* Conteneur défilable horizontalement : le dessin garde une largeur lisible
     (environ 700 px) sur téléphone sans faire déborder la page. */
  .patron-defilant { overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; }
  .patron-cadre { min-width: 700px; }
  .patron { width: 100%; height: auto; display: block; border: 2px solid var(--encre); border-radius: 10px; background: #fff; }
  .aide-defilement { font-size: 15px; }
  .legende { font-size: 15px; }
  .mesures-resume { overflow-wrap: anywhere; }
  table { border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #888; padding: 4px 10px; text-align: left; font-weight: 400; }
  th { font-weight: 600; }
</style>
