<script lang="ts">
  import Carte from '$lib/design/Carte.svelte';
  import ChampTexte from '$lib/design/ChampTexte.svelte';
  import { t } from '$lib/i18n';
  let { data, form } = $props();
</script>

<svelte:head><title>{t(data.lang, 'cliente.nouvelle.titre')}</title></svelte:head>

<main>
  <p><a href="/clientes">← {t(data.lang, 'cliente.retourListe')}</a></p>
  <h1>{t(data.lang, 'cliente.nouvelle.titre')}</h1>
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  <Carte>
    <form method="post" class="grille-form">
      <input type="hidden" name="_csrf" value={data.csrfToken} />
      <ChampTexte label={t(data.lang, 'cliente.nom')} name="nom" requis autocomplete="name" />
      <ChampTexte label={t(data.lang, 'cliente.telephone')} name="telephone" type="tel" autocomplete="tel" />
      <button type="submit">{t(data.lang, 'cliente.creerFiche')}</button>
    </form>
  </Carte>
</main>

<style>
  .grille-form { display: grid; gap: 16px; max-width: 560px; }
</style>
