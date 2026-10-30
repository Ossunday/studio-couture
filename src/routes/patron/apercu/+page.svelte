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

  <svg viewBox="0 0 {data.largeur} {data.hauteur}" role="img" aria-label="Aperçu du patron brouillon {data.titre} pour {data.nom} : devant, dos et ceinture, avec marges de couture et cotes" class="patron">
    <title>Aperçu du patron brouillon {data.titre} pour {data.nom}</title>
    {#each data.pieces as piece}
      <polygon points={piece.coupe} fill="#fff8ec" stroke="#111" stroke-width="0.35" />
      <polygon points={piece.couture} fill="none" stroke="#7a1f1f" stroke-width="0.25" stroke-dasharray="1.2 0.8" />
      {#each piece.lignes as ligne}
        <polyline points={ligne} fill="none" stroke="#8a8a8a" stroke-width="0.18" stroke-dasharray="1.6 1.2" />
      {/each}
      <line x1={piece.filDroit.x1} y1={piece.filDroit.y1} x2={piece.filDroit.x2} y2={piece.filDroit.y2} stroke="#111" stroke-width="0.3" marker-start="url(#fleche)" marker-end="url(#fleche)" />
      {#each piece.crans as cran}
        <path d="M {cran.x - 1} {cran.y} H {cran.x + 1} M {cran.x} {cran.y - 1} V {cran.y + 1}" stroke="#111" stroke-width="0.3" />
      {/each}
      {#each piece.traits as trait}
        <polyline points={trait} fill="none" stroke="#7a1f1f" stroke-width="0.25" stroke-dasharray="1 0.7" />
      {/each}
      {#each piece.cotes as cote}
        <g class="cote">
          <line x1={cote.x1} y1={cote.y1} x2={cote.x2} y2={cote.y2} stroke="#14532d" stroke-width="0.22" marker-start="url(#fleche-cote)" marker-end="url(#fleche-cote)" />
          <rect x={cote.tx - (cote.libelle.length + cote.valeur.length + 3) * 0.85} y={cote.ty - 2.6} width={(cote.libelle.length + cote.valeur.length + 3) * 1.7} height="3.6" fill="#ffffff" opacity="0.92" />
          <text x={cote.tx} y={cote.ty} font-size="2.3" fill="#14532d" text-anchor="middle">{cote.libelle} {cote.valeur} cm</text>
        </g>
      {/each}
      <rect x={piece.etiquetteX - 0.5} y={piece.etiquetteY - 3.4} width={piece.nom.length * 1.9 + 1} height="7.6" fill="#ffffff" opacity="0.92" />
      <text x={piece.etiquetteX} y={piece.etiquetteY} font-size="3" fill="#111">{piece.nom}</text>
      <text x={piece.etiquetteX} y={piece.etiquetteY + 3.4} font-size="2" fill="#111">Marge incluse — brouillon</text>
    {/each}
    <defs>
      <marker id="fleche" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
        <path d="M0 0 L4 2 L0 4 z" fill="#111" />
      </marker>
      <marker id="fleche-cote" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
        <path d="M0 0 L4 2 L0 4 z" fill="#14532d" />
      </marker>
    </defs>
  </svg>
  <p class="legende">Trait plein noir : coupe (marges comprises). Pointillé rouge : couture — 1 cm de marge, 2 cm d’ourlet en bas. Trait avec flèches : fil droit. Croix : crans. Vert : cotes en cm, étiquettes sur fond clair. Gris : lignes de construction (hanches, genou, fourche). Poche : bientôt — non incluse dans ce brouillon.</p>

  <section class="carte" aria-label="Mesures du patron">
    <h2>Mesures du patron</h2>
    {#each data.pieces as piece}
      <h3>{piece.nom}</h3>
      {#if piece.tableau.length}
        <table>
          <tbody>
            {#each piece.tableau as ligne}
              <tr><th scope="row">{ligne.libelle}</th><td>{ligne.valeur} cm</td></tr>
            {/each}
          </tbody>
        </table>
      {/if}
    {/each}
  </section>

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
  table { border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #888; padding: 4px 10px; text-align: left; font-weight: 400; }
  th { font-weight: 600; }
</style>
