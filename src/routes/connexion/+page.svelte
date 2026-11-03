<script lang="ts">
  import ChampTexte from '$lib/design/ChampTexte.svelte';
  import PanneauAuth from '$lib/design/PanneauAuth.svelte';
  let { data, form } = $props();
</script>

<svelte:head><title>Studio Couture — Connexion à l’atelier</title></svelte:head>

<PanneauAuth>
  <p class="deja">Pas encore d’atelier ? <a href="/inscription">Créer mon atelier</a></p>
  <div class="titre">
    <h1>Connexion à l’atelier</h1>
    <p>Retrouvez vos clientes, leurs mesures et leurs patrons.</p>
  </div>

  {#if data.installationRequise}
    <p class="alerte">Aucun compte n’existe encore. <a href="/installation">Créer l’atelier et le compte administratrice</a> ou <a href="/inscription">ouvrir votre atelier</a>.</p>
  {/if}
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}

  <form method="post" class="grille-form">
    <ChampTexte label="Adresse e-mail ou numéro de téléphone" name="identifiant" autocomplete="username" requis valeur={form?.identifiant ?? ''} />
    <ChampTexte label="Mot de passe" name="mot_de_passe" type="password" autocomplete="current-password" requis />
    <button type="submit" class="plein">Se connecter</button>
  </form>

  <div class="separateur" aria-hidden="true"><span></span><span class="ou">ou</span><span></span></div>
  <a class="bouton-demo" href="/demo">Essayer la démo guidée, sans compte</a>
  <p class="creer"><a href="/inscription">Créer mon atelier</a></p>
</PanneauAuth>

<style>
  .deja { margin: 0; align-self: flex-end; font-size: 15px; color: var(--texte-secondaire); }
  .deja a { font-weight: 700; color: var(--encre); }
  .titre h1 { margin: 0 0 8px; font-size: 32px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; }
  .titre p { margin: 0; font-size: 16px; line-height: 1.5; color: var(--texte-secondaire); }
  .grille-form { display: grid; gap: 16px; }
  .plein { width: 100%; min-height: 56px; border-radius: 16px; font-size: 16px; }
  .separateur { display: flex; align-items: center; gap: 14px; }
  .separateur span:first-child, .separateur span:last-child { flex: 1; height: 1px; background: #dadae1; }
  .separateur .ou { font-size: 13px; color: var(--texte-secondaire); }
  .bouton-demo { height: 54px; min-height: 54px; border-radius: 16px; border: 1.5px solid var(--encre); display: flex; align-items: center; justify-content: center; text-decoration: none; font-weight: 700; font-size: 16px; color: var(--encre); background: var(--carte); }
  .creer { margin: 0; text-align: center; }
</style>
