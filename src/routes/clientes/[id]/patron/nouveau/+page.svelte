<script lang="ts">
  import IllustrationModele from '$lib/illustrations/IllustrationModele.svelte';
  import SalleEssayageCliente from '$lib/demo/SalleEssayageCliente.svelte';
  import { definitionMensuration } from '$lib/domain/mensurations-saisie';
  import { LISTE_MODELES } from '$lib/patterns/registre';
  let { data, form } = $props();
</script>

<main>
  {#if !data.mesures}
    <p><a href="/clientes/{data.cliente.id}">← Fiche de {data.cliente.nom}</a></p>
    <h1>Créer un patron pour {data.cliente.prenom}</h1>
    <section class="alerte" role="alert">
      <strong>Brouillon non validé.</strong>
      Ces formules sont marquées « à valider » : un maître tailleur ne les a pas encore confirmées. Essayez d’abord sur un tissu peu coûteux.
    </section>
  {/if}
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}

  {#if !data.modele}
    <h2>1. Choisir le modèle</h2>
    <div class="modeles">
      {#each LISTE_MODELES as entree}
        <a class="carte-modele" href="/clientes/{data.cliente.id}/patron/nouveau?modele={entree.id}">
          <IllustrationModele modele={entree.id} /><strong>{entree.titre}</strong><span>{entree.accroche}</span>
        </a>
      {/each}
    </div>
  {:else if data.manquantes && data.manquantes.length > 0}
    <h2>2. Il manque {data.manquantes.length} mesure{data.manquantes.length > 1 ? 's' : ''}</h2>
    <p>La fiche de {data.cliente.prenom} a déjà {data.mesuresConnues?.length ?? 0} mesure(s) utile(s) pour ce modèle. Complétez seulement celles-ci :</p>
    <form method="post" action="?/completerMesures" class="grille">
      <input type="hidden" name="_csrf" value={data.csrfToken} />
      <input type="hidden" name="modele" value={data.modele} />
      {#each data.manquantes as code}
        {@const def = definitionMensuration(code)}
        <label>{def.libelle} — entre {def.minCm} et {def.maxCm} cm
          <input name={code} inputmode="decimal" required placeholder="ex. 82,5" />
        </label>
      {/each}
      <label class="coche">
        <input type="checkbox" name="enregistrer_fiche" checked />
        Enregistrer ces mesures dans la fiche de {data.cliente.prenom} pour les retrouver
      </label>
      <button type="submit">Continuer vers la salle d’essayage</button>
    </form>
  {:else if data.mesures}
    <SalleEssayageCliente
      modele={data.modele}
      mesuresInitiales={data.mesures}
      nomInitial={data.nomPropose ?? ''}
      csrfToken={data.csrfToken ?? ''}
      actionEnregistrer="?/enregistrerPatron"
      libelleEnregistrer="Enregistrer ce patron"
      prenomCliente={data.cliente.prenom}
      hrefRetour="/clientes/{data.cliente.id}"
      sousTitre="{data.titreModele} · les mesures de la fiche sont déjà chargées"
      ficheLibelle="Fiche d’{data.cliente.prenom}"
    />
  {/if}
</main>

<style>
  .modeles { display: grid; gap: 16px; margin: 18px 0; }
  @media (min-width: 700px) { .modeles { grid-template-columns: 1fr 1fr; } }
  .carte-modele { display: grid; gap: 6px; text-align: center; border: 1px solid var(--bord); border-radius: var(--rayon-carte); padding: 20px 16px; color: inherit; text-decoration: none; font-size: 20px; background: var(--carte); box-shadow: var(--ombre-petite); transition: transform var(--transition), box-shadow var(--transition); }
  .carte-modele:hover { transform: translateY(-2px); box-shadow: var(--ombre); }
  .carte-modele span { font-size: 16px; color: var(--encre-douce); }
  .coche { display: flex; gap: 10px; align-items: flex-start; font-weight: 600; }
  .coche input { min-height: auto; width: auto; margin-top: 4px; }
</style>
