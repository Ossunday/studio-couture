<script lang="ts">
  let { data } = $props();
</script>

<main>
  <h1>Clientes</h1>
  <p><a class="bouton" href="/clientes/nouvelle">Nouvelle cliente</a></p>
  <form method="get" class="grille" role="search">
    <label>Rechercher (nom ou téléphone)
      <input name="q" value={data.recherche} placeholder="Ex. Awa" />
    </label>
    <button type="submit">Rechercher</button>
  </form>

  {#if data.clientes.length === 0}
    <p class="etat-vide">
      {#if data.recherche}
        Aucune cliente ne correspond à « {data.recherche} ».
      {:else}
        Aucune cliente pour le moment. Créez la première fiche cliente.
      {/if}
    </p>
  {:else}
    <ul class="etapes">
      {#each data.clientes as cliente}
        <li>
          <a href="/clientes/{cliente.id}"><strong>{cliente.nom}</strong></a>
          {#if cliente.telephone}<br />{cliente.telephone}{/if}
        </li>
      {/each}
    </ul>
  {/if}
</main>
