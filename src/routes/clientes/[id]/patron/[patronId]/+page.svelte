<script lang="ts">
  import SalleEssayageCliente from '$lib/demo/SalleEssayageCliente.svelte';
  import { formatDateComplete, t, type TranslationKey } from '$lib/i18n';
  let { data, form } = $props();

  /** Clé pas encore dans fr.ts/en.ts : proposée dans le rapport du lot (clé=FR=EN). */
  const txt = (k: string, params?: Record<string, string | number>) => t(data.lang, k as TranslationKey, params);
</script>

<main>
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  <SalleEssayageCliente
    lang={data.lang}
    modele={data.patron.modele}
    mesuresInitiales={data.patron.mesures}
    nomInitial={data.patron.nom}
    csrfToken={data.csrfToken ?? ''}
    actionEnregistrer="?/modifierPatron"
    libelleEnregistrer={t(data.lang, 'salle.enregistrerModifs')}
    tissuInitial={data.patron.tissu}
    optionsInitiales={data.patron.options}
    prenomCliente={data.cliente.prenom}
    hrefRetour="/clientes/{data.cliente.id}?onglet=patrons"
    sousTitre={txt('nouveau.sousTitreSalle', { titre: data.patron.nom })}
    ficheLibelle={txt('fiche.ficheDePrenom', { nom: data.cliente.prenom })}
    infoPatron={txt('patron.infoEnregistre', { date: formatDateComplete(data.lang, data.patron.creeLe), nom: data.cliente.nom })}
  />
</main>

<style>
</style>
