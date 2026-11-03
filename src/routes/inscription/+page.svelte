<script lang="ts">
  import ChampTexte from '$lib/design/ChampTexte.svelte';
  import PanneauAuth from '$lib/design/PanneauAuth.svelte';
  let { data, form } = $props();
</script>

<svelte:head><title>Studio Couture — Créer mon atelier</title></svelte:head>

{#if data.fermee}
  <main class="fermee">
    <h1>Les inscriptions sont fermées.</h1>
    <p>Vous avez déjà un compte ? <a href="/connexion">Se connecter</a> — ou <a href="/demo">essayer la démo guidée, sans compte</a>.</p>
  </main>
{:else}
  <PanneauAuth>
    <p class="deja">Déjà un compte ? <a href="/connexion">Se connecter</a></p>
    <div class="titre">
      <h1>Ouvrez votre atelier en 2 minutes</h1>
      <p>Vos clientes et vos patrons restent privés, visibles seulement par votre équipe.</p>
    </div>

    {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}

    <form method="post" class="grille-form">
      <ChampTexte label="Nom de l’atelier" name="nom_atelier" requis placeholder="Atelier Awa" valeur={form?.nomAtelier ?? ''} minlength={2} maxlength={80} />
      <ChampTexte label="Votre nom" name="nom" requis placeholder="Awa Diallo" autocomplete="name" valeur={form?.nom ?? ''} />
      <ChampTexte label="Adresse e-mail" name="email" type="email" requis placeholder="awa@atelier.com" autocomplete="email" valeur={form?.email ?? ''} />
      <ChampTexte label="Mot de passe" name="mot_de_passe" type="password" requis placeholder="12 caractères minimum" autocomplete="new-password" aide="Utilisez une phrase facile à retenir, longue de préférence." />
      <ChampTexte label="Confirmez le mot de passe" name="mot_de_passe_confirmation" type="password" requis autocomplete="new-password" />

      <div class="consentement">
        <input id="consentement" name="consentement" type="checkbox" required />
        <label for="consentement">Je m’engage à recueillir le consentement explicite de mes clientes avant toute photo ou mesure.</label>
      </div>

      <!-- Champ piège anti-robots : invisible et hors tabulation, à laisser vide. -->
      <div class="piege" aria-hidden="true">
        <label for="site_web">Site web</label>
        <input id="site_web" name="site_web" type="text" tabindex="-1" autocomplete="off" />
      </div>

      <button type="submit" class="plein">Créer mon atelier</button>
    </form>

    <div class="separateur" aria-hidden="true"><span></span><span class="ou">ou</span><span></span></div>
    <a class="bouton-demo" href="/demo">Essayer la démo guidée, sans compte</a>
  </PanneauAuth>
{/if}

<style>
  .fermee { max-width: 560px; margin: 48px auto; padding: 0 16px; text-align: center; }
  .deja { margin: 0; align-self: flex-end; font-size: 15px; color: var(--texte-secondaire); }
  .deja a { font-weight: 700; color: var(--encre); }
  .titre h1 { margin: 0 0 8px; font-size: 32px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; }
  .titre p { margin: 0; font-size: 16px; line-height: 1.5; color: var(--texte-secondaire); }
  .grille-form { display: grid; gap: 16px; }
  .plein { width: 100%; min-height: 56px; border-radius: 16px; font-size: 16px; }
  .consentement { display: flex; align-items: flex-start; gap: 12px; }
  .consentement input { width: 22px; height: 22px; min-width: 22px; margin: 2px 0 0; accent-color: var(--encre); }
  .consentement label { font-size: 14px; line-height: 1.5; color: #44444e; }
  .piege { position: absolute; left: -9999px; top: -9999px; width: 1px; height: 1px; overflow: hidden; }
  .separateur { display: flex; align-items: center; gap: 14px; }
  .separateur span:first-child, .separateur span:last-child { flex: 1; height: 1px; background: #dadae1; }
  .separateur .ou { font-size: 13px; color: var(--texte-secondaire); }
  .bouton-demo { height: 54px; min-height: 54px; border-radius: 16px; border: 1.5px solid var(--encre); display: flex; align-items: center; justify-content: center; text-decoration: none; font-weight: 700; font-size: 16px; color: var(--encre); background: var(--carte); }
</style>
