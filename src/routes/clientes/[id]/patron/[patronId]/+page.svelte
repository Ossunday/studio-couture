<script lang="ts">
  import SalleEssayageCliente from '$lib/demo/SalleEssayageCliente.svelte';
  let { data, form } = $props();
</script>

<main>
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
    prenomCliente={data.cliente.prenom}
    hrefRetour="/clientes/{data.cliente.id}?onglet=patrons"
    sousTitre="{data.patron.nom} · les mesures de la fiche sont déjà chargées"
    ficheLibelle="Fiche d’{data.cliente.prenom}"
    infoPatron="Enregistré le {new Date(data.patron.creeLe).toLocaleDateString('fr-FR')} · patron de {data.cliente.nom}"
  />
</main>

<style>
</style>
