<script lang="ts">
  let { data } = $props();
</script>

<main>
  <p><a href={data.hrefMesures}>← Refaire les mesures</a></p>
  <h1>{data.titre} — {data.nom}</h1>

  <section class="alerte" role="alert">
    <strong>Brouillon non validé.</strong>
    Ces formules sont marquées « à valider » : un maître tailleur ne les a pas encore confirmées.
    Essayez d’abord sur un tissu peu coûteux, ne coupez pas un tissu précieux avec ce brouillon.
  </section>

  <p>
    {#each data.mesures as m}<span class="mesure-resume">{m.libelle} : {m.valeur} cm · </span>{/each}
  </p>

  <svg viewBox="0 0 {data.largeur} {data.hauteur}" role="img" aria-label="Aperçu du patron brouillon {data.titre} pour {data.nom} : devant, dos et ceinture, avec marges de couture" class="patron">
    <title>Aperçu du patron brouillon {data.titre} pour {data.nom}</title>
    {#each data.pieces as piece}
      <polygon points={piece.coupe} fill="#fff8ec" stroke="#111" stroke-width="0.35" />
      <polygon points={piece.couture} fill="none" stroke="#7a1f1f" stroke-width="0.25" stroke-dasharray="1.2 0.8" />
      <line x1={piece.filDroit.x1} y1={piece.filDroit.y1} x2={piece.filDroit.x2} y2={piece.filDroit.y2} stroke="#111" stroke-width="0.3" marker-start="url(#fleche)" marker-end="url(#fleche)" />
      {#each piece.crans as cran}
        <path d="M {cran.x - 1} {cran.y} H {cran.x + 1} M {cran.x} {cran.y - 1} V {cran.y + 1}" stroke="#111" stroke-width="0.3" />
      {/each}
      {#each piece.traits as trait}
        <polyline points={trait} fill="none" stroke="#7a1f1f" stroke-width="0.25" stroke-dasharray="1 0.7" />
      {/each}
      <text x={piece.etiquetteX} y={piece.etiquetteY} font-size="3.2" fill="#111">{piece.nom}</text>
    {/each}
    <defs>
      <marker id="fleche" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
        <path d="M0 0 L4 2 L0 4 z" fill="#111" />
      </marker>
    </defs>
  </svg>
  <p class="legende">Trait plein noir : coupe (marges comprises). Pointillé rouge : couture — 1 cm de marge, 2 cm d’ourlet en bas. Trait avec flèches : fil droit. Croix : crans.</p>

  <p><a class="bouton" href={data.hrefPdf} download>Télécharger le PDF (A4, échelle 1:1)</a></p>
  <p>Imprimez sans mise à l’échelle (« taille réelle »), puis vérifiez le carré de contrôle de 10 cm à la règle avant de couper.</p>

  <section class="carte">
    <h2>Formules utilisées — statut : à valider</h2>
    <ul>
      {#each data.formules as f}
        <li><strong>{f.element}</strong> ({f.statut}) : {f.hypotheses.join(' ')}</li>
      {/each}
    </ul>
  </section>
</main>

<style>
  .patron { width: 100%; height: auto; border: 2px solid #111; border-radius: 8px; background: #fff; }
  .legende { font-size: 15px; }
  .mesure-resume { white-space: nowrap; }
</style>
