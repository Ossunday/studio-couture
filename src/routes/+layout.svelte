<script lang="ts">
  import '../app.css';
  import { BRAND_NAME } from '$lib/brand';
  let { children, data } = $props();
</script>

<header>
  <div class="metre" aria-hidden="true">
    <svg viewBox="0 0 360 16" preserveAspectRatio="none" focusable="false">
      {#each Array.from({ length: 37 }, (_, i) => i) as i}
        <line x1={i * 10} y1="16" x2={i * 10} y2={i % 5 === 0 ? 2 : 8} stroke="currentColor" stroke-width="1" />
      {/each}
    </svg>
  </div>
  <div class="barre">
    <p class="marque"><a href="/">{BRAND_NAME}</a></p>
    {#if data.utilisatrice}
      <nav aria-label="Atelier">
        <a href="/">Accueil</a>
        <a href="/patron/mesures?modele=pantalon_large">Nouveau patron</a>
        <a href="/clientes">Clientes</a>
        {#if data.utilisatrice.role === 'admin'}<a href="/atelier/utilisatrices">Équipe</a>{/if}
        <span>{data.utilisatrice.nom} ({data.utilisatrice.role === 'admin' ? 'administratrice' : 'couturière'})</span>
        <form method="post" action="/deconnexion">
          <input type="hidden" name="_csrf" value={data.csrfToken} />
          <button type="submit">Se déconnecter</button>
        </form>
      </nav>
    {:else}
      <nav aria-label="Atelier"><a href="/demo">Démo guidée</a><a href="/connexion">Espace atelier (connexion)</a></nav>
    {/if}
  </div>
</header>

{@render children()}

<footer>
  <hr class="filet-laiton" />
  <p>{BRAND_NAME} — Patron brouillon à valider par un maître tailleur. Photos clientes (espace atelier) : consentement explicite, chiffrées, supprimées automatiquement après 7 jours, jamais utilisées pour l’entraînement.</p>
</footer>

<style>
  header { background: var(--papier); border-bottom: 1px solid var(--bord); box-shadow: var(--ombre-petite); }
  .metre { color: var(--laiton); height: 16px; overflow: hidden; }
  .metre svg { width: 100%; height: 16px; display: block; }
  .barre, footer { max-width: 1120px; margin: 0 auto; padding: 12px 16px; }
  .marque { font-family: var(--serif); font-weight: 700; font-size: 24px; margin: 0; }
  .marque a { color: var(--vert); text-decoration: none; }
  nav { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; margin-top: 8px; }
  nav a, nav button { display: inline-flex; align-items: center; }
  nav form { margin: 0; }
  footer { font-size: 15px; }
</style>
