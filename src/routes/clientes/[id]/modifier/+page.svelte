<script lang="ts">
  let { data, form } = $props();
</script>

<main>
  <h1>Modifier {data.cliente.nom}</h1>
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  <form method="post" class="grille">
    <input type="hidden" name="_csrf" value={data.csrfToken} />
    <label>Nom de la cliente <input name="nom" required minlength="2" maxlength="80" value={data.cliente.nom} /></label>
    <label>Téléphone (optionnel) <input name="telephone" type="tel" value={data.cliente.telephone} /></label>
    <button type="submit">Enregistrer</button>
  </form>
  <p><a href="/clientes/{data.cliente.id}">Retour à la fiche</a></p>
</main>
