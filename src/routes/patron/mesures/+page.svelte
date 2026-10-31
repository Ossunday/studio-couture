<script lang="ts">
  import IllustrationMesure from '$lib/illustrations/IllustrationMesure.svelte';
  let { data, form } = $props();

  const aides: Record<string, { aide: string; exemple: string }> = {
    tour_taille_cm: {
      aide: 'Faites le tour au creux naturel de la taille, ruban à plat, sans serrer.',
      exemple: 'Exemple courant : 82 cm.'
    },
    tour_hanches_cm: {
      aide: 'Faites le tour à l’endroit le plus fort des hanches et des fesses.',
      exemple: 'Exemple courant : 100 cm.'
    },
    hauteur_fourche_cm: {
      aide: 'Assise sur une chaise dure, mesurez le long du côté, de la taille jusqu’à la chaise.',
      exemple: 'Exemple courant : 27 cm.'
    },
    longueur_pantalon_cm: {
      aide: 'Debout, mesurez le long du côté, de la taille jusqu’au sol (ou à la cheville souhaitée).',
      exemple: 'Exemple courant : 105 cm.'
    },
    longueur_jupe_cm: {
      aide: 'Mesurez de la taille jusqu’à la longueur de jupe souhaitée (genou, mollet…).',
      exemple: 'Exemple courant : 60 cm.'
    }
  };
</script>

<main>
  <p><a href="/">← Changer de modèle</a></p>
  <h1>{data.titre} — vos mesures</h1>
  <p>Seulement les mesures de ce modèle. Prenez-les au mètre ruban, en centimètres.</p>

  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}

  <form method="post" class="grille">
    <input type="hidden" name="_csrf" value={data.csrfToken} />
    <label>Nom de la cliente (ou laissez « sans nom »)
      <input name="nom" autocomplete="name" placeholder="sans nom" />
    </label>
    {#each data.champs as champ}
      <div class="champ">
        <IllustrationMesure code={champ.code} />
        <label>{champ.libelle}
          <input name={champ.code} inputmode="decimal" required placeholder="ex. 82,5" />
          <span class="aide">{aides[champ.code]?.aide} {aides[champ.code]?.exemple} Plage acceptée : {champ.minCm} à {champ.maxCm} cm.</span>
        </label>
      </div>
    {/each}
    {#if data.modele === 'pantalon_large'}
      <details>
        <summary>Options du modèle (facultatif)</summary>
        <p>Valeurs du modèle si vous ne changez rien : bas calculé à partir du genou (jambe droite), un pli devant, ceinture de 4 cm. Aucun champ obligatoire ici.</p>
        <label>Largeur du bas par pièce (cm)
          <input name="largeur_bas_cm" inputmode="decimal" placeholder="calculée : jambe droite" />
        </label>
        <label>Profondeur du pli devant (cm)
          <input name="profondeur_pli_cm" inputmode="decimal" placeholder="4" />
        </label>
        <label>Hauteur finie de la ceinture (cm)
          <input name="hauteur_ceinture_cm" inputmode="decimal" placeholder="4" />
        </label>
      </details>
    {/if}
    <button type="submit">Voir mon patron</button>
  </form>
</main>

<style>
  .champ { display: flex; gap: 12px; align-items: flex-start; }
  .champ label { display: grid; gap: 6px; font-weight: 600; flex: 1; }
  .champ input { min-height: 48px; font: inherit; padding: 10px 14px; border: 1.5px solid var(--bord-fort); border-radius: 12px; width: 100%; background: #fff; color: var(--encre); }
  .aide { font-weight: 400; font-size: 15px; }
</style>
