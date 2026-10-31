<script lang="ts">
  import SalleEssayageCliente from '$lib/demo/SalleEssayageCliente.svelte';
  import Puce from '$lib/design/Puce.svelte';
  let { data, form } = $props();
</script>

<main>
  <p><a href="/clientes/{data.cliente.id}?onglet=patrons">← Patrons de {data.cliente.nom}</a></p>
  <h1>{data.patron.nom}</h1>
  <p><Puce ton="accent">Brouillon</Puce> <span class="date">Enregistré le {new Date(data.patron.creeLe).toLocaleDateString('fr-FR')} · patron de {data.cliente.nom}</span></p>
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  <SalleEssayageCliente
    modele={data.patron.modele}
    mesuresInitiales={data.patron.mesures}
    nomInitial={data.patron.nom}
    csrfToken={data.csrfToken ?? ''}
    actionEnregistrer="?/modifierPatron"
    libelleEnregistrer="Enregistrer les modifications"
    tissuInitial={data.patron.tissu}
    optionsInitiales={data.patron.options}
  />
</main>

<style>
  .date { color: var(--encre-douce); }
</style>
