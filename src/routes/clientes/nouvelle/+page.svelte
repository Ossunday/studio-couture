<script lang="ts">
  let { data, form } = $props();
</script>

<main>
  <h1>Nouvelle cliente</h1>
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  <form method="post" class="grille">
    <input type="hidden" name="_csrf" value={data.csrfToken} />
    <label>Nom de la cliente <input name="nom" required minlength="2" maxlength="80" autocomplete="name" /></label>
    <label>Téléphone (optionnel) <input name="telephone" type="tel" autocomplete="tel" /></label>
    <button type="submit">Créer la fiche cliente</button>
  </form>
  <p><a href="/clientes">Retour à la liste</a></p>
</main>
