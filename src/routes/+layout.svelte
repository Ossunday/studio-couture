<script lang="ts">
  import '../app.css';
  import { BRAND_NAME } from '$lib/brand';
  let { children, data } = $props();
</script>

<header>
  <p class="marque"><a href="/">{BRAND_NAME}</a></p>
  {#if data.utilisatrice}
    <nav aria-label="Atelier">
      <a href="/clientes">Clientes</a>
      {#if data.utilisatrice.role === 'admin'}<a href="/atelier/utilisatrices">Équipe</a>{/if}
      <span>{data.utilisatrice.nom} ({data.utilisatrice.role === 'admin' ? 'administratrice' : 'couturière'})</span>
      <form method="post" action="/deconnexion">
        <input type="hidden" name="_csrf" value={data.csrfToken} />
        <button type="submit">Se déconnecter</button>
      </form>
    </nav>
  {:else}
    <nav aria-label="Atelier"><a href="/connexion">Se connecter</a></nav>
  {/if}
</header>

{@render children()}

<footer>
  <p>{BRAND_NAME} — Photos clientes : consentement explicite, chiffrées, supprimées automatiquement après 7 jours, jamais utilisées pour l’entraînement.</p>
</footer>

<style>
  header, footer { max-width: 720px; margin: 0 auto; padding: 12px 16px; }
  .marque { font-weight: 800; font-size: 20px; margin: 0; }
  .marque a { color: inherit; }
  nav { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-top: 8px; }
  nav a, nav button { display: inline-flex; align-items: center; }
  nav form { margin: 0; }
  footer { font-size: 14px; }
</style>
