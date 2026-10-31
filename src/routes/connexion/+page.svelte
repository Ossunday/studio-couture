<script lang="ts">
  import Carte from '$lib/design/Carte.svelte';
  import ChampTexte from '$lib/design/ChampTexte.svelte';
  let { data, form } = $props();
</script>

<main>
  <div class="connexion">
    <Carte>
      <h1>Connexion à l’atelier</h1>
      {#if data.installationRequise}
        <p class="alerte">Aucun compte n’existe encore. <a href="/installation">Créer l’atelier et le compte administratrice</a></p>
      {/if}
      {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
      <form method="post" class="grille-form">
        <ChampTexte label="Adresse e-mail ou numéro de téléphone" name="identifiant" autocomplete="username" requis valeur={form?.identifiant ?? ''} />
        <ChampTexte label="Mot de passe" name="mot_de_passe" type="password" autocomplete="current-password" requis />
        <button type="submit" class="plein">Se connecter</button>
      </form>
      <p class="retour"><a href="/demo">Pas encore de compte ? Essayez la démo guidée</a></p>
    </Carte>
  </div>
</main>

<style>
  .connexion { max-width: 480px; margin: 24px auto; }
  h1 { font-size: var(--titre-2); margin-top: 0; }
  .grille-form { display: grid; gap: 16px; }
  .plein { width: 100%; }
  .retour { margin-bottom: 0; }
</style>
