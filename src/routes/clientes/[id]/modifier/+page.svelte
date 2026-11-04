<script lang="ts">
  import Carte from '$lib/design/Carte.svelte';
  import ChampTexte from '$lib/design/ChampTexte.svelte';
  import { t } from '$lib/i18n';
  let { data, form } = $props();
  const prenom = $derived(data.cliente.nom.trim().split(/\s+/)[0] ?? data.cliente.nom);
</script>

<svelte:head><title>{t(data.lang, 'cliente.modifier.titre')} — {data.cliente.nom}</title></svelte:head>

<main>
  <p><a href="/clientes/{data.cliente.id}">← {t(data.lang, 'salle.retourFiche', { prenom })}</a></p>
  <h1>{t(data.lang, 'cliente.modifier.titre')} — {data.cliente.nom}</h1>
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  <Carte>
    <form method="post" class="grille-form">
      <input type="hidden" name="_csrf" value={data.csrfToken} />
      <ChampTexte label={t(data.lang, 'cliente.nom')} name="nom" requis autocomplete="name" valeur={data.cliente.nom} />
      <ChampTexte label={t(data.lang, 'cliente.telephone')} name="telephone" type="tel" autocomplete="tel" valeur={data.cliente.telephone ?? ''} />
      <button type="submit">{t(data.lang, 'cliente.enregistrer')}</button>
    </form>
  </Carte>
</main>

<style>
  .grille-form { display: grid; gap: 16px; max-width: 560px; }
</style>
