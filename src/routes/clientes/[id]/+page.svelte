<script lang="ts">
  let { data, form } = $props();
</script>

<main>
  <p><a href="/clientes">← Toutes les clientes</a></p>
  <h1>{data.cliente.nom}</h1>
  {#if data.cliente.telephone}<p>Téléphone : {data.cliente.telephone}</p>{/if}
  <p><a href="/clientes/{data.cliente.id}/modifier">Modifier la fiche</a></p>

  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  {#if form?.consentementEnregistre}<p role="status">Consentement photo enregistré.</p>{/if}
  {#if form?.consentementRevoque}<p role="status">Consentement révoqué et photos supprimées.</p>{/if}

  <section class="carte" aria-labelledby="titre-consentement">
    <h2 id="titre-consentement">Consentement photo signé</h2>
    {#if data.consentement}
      <p>
        Consentement donné le {new Date(data.consentement.donneLe).toLocaleDateString('fr-FR')}.
        Rendu indicatif autorisé : {data.consentement.usageRenduIa ? 'oui' : 'non'}.
        Entraînement IA : jamais.
      </p>
      <form method="post" action="?/revoquer">
        <input type="hidden" name="_csrf" value={data.csrfToken} />
        <button type="submit">Révoquer le consentement et supprimer les photos</button>
      </form>
    {:else}
      <p>Aucun consentement actif : aucune photo cliente ne peut être ajoutée.</p>
      <form method="post" action="?/consentement" class="grille">
        <input type="hidden" name="_csrf" value={data.csrfToken} />
        <label>
          <input type="checkbox" name="accord_photo" required style="min-height:auto;width:auto" />
          La cliente accepte explicitement que ses photos soient conservées chiffrées 7 jours pour son projet de couture, jamais pour l’entraînement d’une IA. (texte v1)
        </label>
        <label>
          <input type="checkbox" name="usage_rendu_ia" style="min-height:auto;width:auto" />
          La cliente accepte aussi le rendu indicatif à partir de ses photos.
        </label>
        <label>Nom signé de la cliente
          <input name="signature_nom" required minlength="2" autocomplete="name" placeholder="Nom tapé par la cliente en signature" />
        </label>
        <button type="submit">Enregistrer le consentement signé</button>
      </form>
    {/if}
  </section>

  {#if data.peutSupprimer}
    <section class="carte">
      <h2>Supprimer la cliente</h2>
      <p>Cette action supprime la fiche, ses photos et ses mensurations. Elle est irréversible.</p>
      <form method="post" action="?/supprimer">
        <input type="hidden" name="_csrf" value={data.csrfToken} />
        <button type="submit">Supprimer définitivement cette cliente</button>
      </form>
    </section>
  {/if}
</main>
