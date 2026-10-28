<script lang="ts">
  let { data, form } = $props();
</script>

<main>
  <h1>Équipe de l’atelier</h1>
  <p>Réservé à l’administratrice : créer un compte couturière ou administratrice.</p>
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  {#if form?.cree}<p role="status">Compte créé. La personne peut se connecter.</p>{/if}
  <form method="post" class="grille">
    <input type="hidden" name="_csrf" value={data.csrfToken} />
    <label>Nom <input name="nom" required autocomplete="name" /></label>
    <label>Adresse e-mail ou numéro de téléphone <input name="identifiant" required autocomplete="username" /></label>
    <label>Mot de passe (10 caractères minimum) <input name="mot_de_passe" type="password" required autocomplete="new-password" /></label>
    <label>Rôle
      <select name="role">
        <option value="couturiere">Couturière</option>
        <option value="admin">Administratrice</option>
      </select>
    </label>
    <button type="submit">Créer le compte</button>
  </form>
</main>
