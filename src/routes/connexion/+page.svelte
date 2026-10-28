<script lang="ts">
  let { data, form } = $props();
</script>

<main>
  <h1>Connexion à l’atelier</h1>
  {#if data.installationRequise}
    <p class="alerte">Aucun compte n’existe encore. <a href="/installation">Créer l’atelier et le compte administratrice</a></p>
  {/if}
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  <form method="post">
    <label>Adresse e-mail ou numéro de téléphone
      <input name="identifiant" type="text" autocomplete="username" required value={form?.identifiant ?? ''} />
    </label>
    <label>Mot de passe
      <input name="mot_de_passe" type="password" autocomplete="current-password" required />
    </label>
    <button type="submit">Se connecter</button>
  </form>
</main>

<style>
  form { display: grid; gap: 16px; max-width: 480px; }
  label { display: grid; gap: 6px; font-weight: 600; }
  input { min-height: 48px; font: inherit; padding: 10px; border: 2px solid #111; border-radius: 8px; }
</style>
