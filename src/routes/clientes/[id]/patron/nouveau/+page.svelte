<script lang="ts">
  import IllustrationModele from '$lib/illustrations/IllustrationModele.svelte';
  import AssistantPatron from '$lib/design/AssistantPatron.svelte';
  import SalleEssayageCliente from '$lib/demo/SalleEssayageCliente.svelte';
  import { definitionMensuration } from '$lib/domain/mensurations-saisie';
  import { LISTE_MODELES } from '$lib/patterns/registre';
  import { formatCm, t, type TranslationKey } from '$lib/i18n';
  let { data, form } = $props();

  /** Clé pas encore dans fr.ts/en.ts : proposée dans le rapport du lot (clé=FR=EN). */
  const txt = (k: string, params?: Record<string, string | number>) => t(data.lang, k as TranslationKey, params);
</script>

<main>
  {#if !data.mesures}
    <p><a href="/clientes/{data.cliente.id}">← {txt('fiche.ficheDe', { nom: data.cliente.nom })}</a></p>
    <h1>{t(data.lang, 'fiche.creerPatronPour', { prenom: data.cliente.prenom })}</h1>
    <section class="alerte" role="alert">
      <strong>{t(data.lang, 'commun.brouillonNonValide')}.</strong>
      {txt('nouveau.brouillonTexte')}
    </section>
  {/if}
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}

  {#if !data.modele}
    <AssistantPatron lang={data.lang} clienteId={data.cliente.id} csrfToken={data.csrfToken ?? ''} disponible={data.assistantIaDisponible ?? false} />
    <h2>1. {t(data.lang, 'demo.choisirModele')}</h2>
    <div class="modeles">
      {#each LISTE_MODELES as entree}
        <a class="carte-modele" href="/clientes/{data.cliente.id}/patron/nouveau?modele={entree.id}">
          <IllustrationModele modele={entree.id} /><strong>{t(data.lang, entree.titreCle)}</strong><span>{t(data.lang, entree.accrocheCle)}</span>
        </a>
      {/each}
    </div>
  {:else if data.aCompleter && data.aCompleter.length > 0}
    <h2>2. {data.aCompleter.length > 1 ? txt('nouveau.mesuresManquantesPlusieurs', { n: data.aCompleter.length }) : txt('nouveau.mesuresManquantesUne', { n: data.aCompleter.length })}</h2>
    <p>{txt('nouveau.ficheDeja', { prenom: data.cliente.prenom, n: data.mesuresConnues?.length ?? 0 })}</p>
    {#if data.erreurMesures}<p class="alerte" role="alert">{data.erreurMesures}</p>{/if}
    <form method="post" action="?/completerMesures" class="grille">
      <input type="hidden" name="_csrf" value={data.csrfToken} />
      <input type="hidden" name="modele" value={data.modele} />
      {#each data.optionsParams ?? [] as opt}
        <input type="hidden" name={opt.code} value={opt.valeur} />
      {/each}
      {#each data.aCompleter as champ}
        {@const def = definitionMensuration(champ.code)}
        <label>{t(data.lang, `mesure.${champ.code}` as TranslationKey)} — {t(data.lang, 'patron.mesures.aidePlage', { min: def.minCm, max: def.maxCm })}
          <input name={champ.code} inputmode="decimal" required value={champ.valeur} placeholder={txt('commun.exempleNombre', { exemple: formatCm(data.lang, 82.5) })} />
        </label>
      {/each}
      <label class="coche">
        <input type="checkbox" name="enregistrer_fiche" checked />
        {txt('nouveau.enregistrerDansFiche', { prenom: data.cliente.prenom })}
      </label>
      <button type="submit">{txt('nouveau.continuerSalle')}</button>
    </form>
  {:else if data.mesures}
    <SalleEssayageCliente
      lang={data.lang}
      modele={data.modele}
      mesuresInitiales={data.mesures}
      optionsInitiales={data.optionsInitiales ?? {}}
      nomInitial={data.nomPropose ?? ''}
      csrfToken={data.csrfToken ?? ''}
      actionEnregistrer="?/enregistrerPatron"
      libelleEnregistrer={t(data.lang, 'salle.enregistrer')}
      prenomCliente={data.cliente.prenom}
      hrefRetour="/clientes/{data.cliente.id}"
      sousTitre={txt('nouveau.sousTitreSalle', { titre: data.titreModele })}
      ficheLibelle={txt('fiche.ficheDePrenom', { nom: data.cliente.prenom })}
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
