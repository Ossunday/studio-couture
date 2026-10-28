<script lang="ts">
  import '../app.css';
  import { BRAND_NAME } from '$lib/brand';
  let { children } = $props();
</script>

<header>
  <p class="marque"><a href="/">{BRAND_NAME}</a></p>
</header>

{@render children()}

<footer>
  <p>{BRAND_NAME} — Photos clientes : consentement explicite, chiffrées, supprimées automatiquement après 7 jours, jamais utilisées pour l’entraînement.</p>
</footer>

<style>
  header, footer { max-width: 720px; margin: 0 auto; padding: 12px 16px; }
  .marque { font-weight: 800; font-size: 20px; margin: 0; }
  .marque a { color: inherit; }
  footer { font-size: 14px; }
</style>
