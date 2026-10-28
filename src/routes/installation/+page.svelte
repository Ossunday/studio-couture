<script lang="ts">
  let { form } = $props();
</script>

<main>
  <h1>Créer l’atelier</h1>
  <p>Cette page disparaît dès que le premier compte est créé.</p>
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  <form method="post">
    <label>Nom de l’atelier <input name="nom_atelier" required /></label>
    <label>Votre nom <input name="nom" required autocomplete="name" /></label>
    <label>Adresse e-mail ou numéro de téléphone <input name="identifiant" required autocomplete="username" /></label>
    <label>Mot de passe (10 caractères minimum) <input name="mot_de_passe" type="password" required autocomplete="new-password" /></label>
    <button type="submit">Créer l’atelier et le compte administratrice</button>
  </form>
</main>

<style>
  form { display: grid; gap: 16px; max-width: 480px; }
  label { display: grid; gap: 6px; font-weight: 600; }
  input { min-height: 48px; font: inherit; padding: 10px; border: 2px solid #111; border-radius: 8px; }
</style>
