<script lang="ts">
  import Carte from '$lib/design/Carte.svelte';
  import ChampTexte from '$lib/design/ChampTexte.svelte';
  let { data, form } = $props();
</script>

<main>
  <p><a href="/clientes">← Toutes les clientes</a></p>
  <h1>Nouvelle cliente</h1>
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  <Carte>
    <form method="post" class="grille-form">
      <input type="hidden" name="_csrf" value={data.csrfToken} />
      <ChampTexte label="Nom de la cliente" name="nom" requis autocomplete="name" aide="Nom complet, tel qu’il apparaîtra sur ses patrons." />
      <ChampTexte label="Téléphone (optionnel)" name="telephone" type="tel" autocomplete="tel" />
      <button type="submit">Créer la fiche cliente</button>
    </form>
  </Carte>
</main>

<style>
  .grille-form { display: grid; gap: 16px; max-width: 560px; }
</style>
