<script lang="ts">
  let { data, form } = $props();

  // Garde client (le contrôle autoritaire reste validerPhoto côté serveur, 5 Mo) :
  // sans elle, un fichier de plus de 6 Mo heurterait BODY_SIZE_LIMIT d’adapter-node
  // et afficherait une page 413 brute au lieu de ce message.
  let erreurPhotoLocale = $state('');
  function verifierTaillePhoto(event: Event) {
    const saisie = event.currentTarget as HTMLInputElement;
    const fichier = saisie.files?.[0];
    // 5 Mo : même seuil que TAILLE_PHOTO_MAX_OCTETS (src/lib/server/crypto.ts).
    if (fichier && fichier.size > 5 * 1024 * 1024) {
      erreurPhotoLocale = 'Photo trop lourde : 5 Mo maximum.';
      saisie.value = '';
    } else {
      erreurPhotoLocale = '';
    }
  }
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

  <section class="carte" aria-labelledby="titre-photos">
    <h2 id="titre-photos">Ajouter une photo (option)</h2>
    <p>Les photos sont facultatives : un patron peut être créé sans elles, depuis « Nouveau patron ». Le consentement ci-dessus n’est demandé qu’au moment d’envoyer une photo.</p>
    {#if form?.photoAjoutee}<p role="status">Photo chiffrée enregistrée. Elle sera supprimée automatiquement dans 7 jours.</p>{/if}
    {#if form?.photoSupprimee}<p role="status">Photo supprimée.</p>{/if}
    {#if data.photos.length === 0}
      <p class="etat-vide">Aucune photo pour cette cliente.</p>
    {:else}
      <ul>
        {#each data.photos as photo}
          <li>
            <a href="/clientes/{data.cliente.id}/photos/{photo.id}">
              Photo {photo.type === 'modele' ? 'du modèle' : photo.type === 'tissu' ? 'du tissu' : 'de la cliente'}
            </a>
            — ajoutée le {new Date(photo.creeeLe).toLocaleDateString('fr-FR')},
            suppression automatique le {new Date(photo.expireLe).toLocaleDateString('fr-FR')}
            <form method="post" action="?/supprimerPhoto">
              <input type="hidden" name="_csrf" value={data.csrfToken} />
              <input type="hidden" name="photo_id" value={photo.id} />
              <button type="submit">Supprimer cette photo</button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}
    {#if data.consentement}
      {#if erreurPhotoLocale}<p class="alerte" role="alert">{erreurPhotoLocale}</p>{/if}
      <form method="post" action="?/televerserPhoto" enctype="multipart/form-data" class="grille">
        <input type="hidden" name="_csrf" value={data.csrfToken} />
        <label>Type de photo
          <select name="type_photo">
            <option value="cliente_complete">Photo complète de la cliente</option>
            <option value="modele">Photo du modèle choisi</option>
            <option value="tissu">Photo du tissu</option>
          </select>
        </label>
        <label>Photo (JPEG, PNG ou WebP, 5 Mo maximum)
          <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onchange={verifierTaillePhoto} />
        </label>
        <button type="submit">Envoyer la photo chiffrée</button>
      </form>
    {:else}
      <p>Enregistrez d’abord le consentement signé ci-dessus pour pouvoir ajouter une photo.</p>
    {/if}
  </section>

  <section class="carte" aria-labelledby="titre-mensurations">
    <h2 id="titre-mensurations">Mensurations (saisie manuelle, en cm)</h2>
    {#if form?.mensurationsEnregistrees}<p role="status">Mensurations enregistrées et validées par la couturière.</p>{/if}
    <p>Mesurez au mètre ruban, puis saisissez en centimètres (ex. 82,5). Laissez vide ce qui n’est pas mesuré.</p>
    <form method="post" action="?/mensurations" class="grille">
      <input type="hidden" name="_csrf" value={data.csrfToken} />
      {#each data.mensurations as m}
        <label>{m.libelle} — entre {m.minCm} et {m.maxCm} cm
          <input
            name={m.code}
            inputmode="decimal"
            value={m.valeurCm ?? ''}
            placeholder="Non mesuré"
          />
        </label>
      {/each}
      <button type="submit">Enregistrer les mensurations</button>
    </form>
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
