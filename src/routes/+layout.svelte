<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { BRAND_NAME } from '$lib/brand';
  import Avatar from '$lib/design/Avatar.svelte';
  let { children, data } = $props();

  const chemin = $derived(page.url.pathname);
  const estActif = (href: string) => (href === '/' ? chemin === '/' : chemin.startsWith(href));
</script>

{#if data.utilisatrice}
  <div class="coque">
    <aside class="barre-laterale">
      <p class="marque"><a href="/">{BRAND_NAME}</a></p>
      <nav aria-label="Atelier" class="nav-laterale">
        <a href="/" class:actif={estActif('/')}>Accueil</a>
        <a href="/clientes" class:actif={estActif('/clientes')}>Clientes</a>
        <a href="/patron/mesures?modele=pantalon_large" class:actif={chemin.startsWith('/patron')}>Patrons</a>
        {#if data.utilisatrice.role === 'admin'}<a href="/atelier/utilisatrices" class:actif={estActif('/atelier')}>Équipe</a>{/if}
      </nav>
      <div class="bas-lateral">
        <p class="utilisatrice"><Avatar nom={data.utilisatrice.nom} taille={40} /><span>{data.utilisatrice.nom}<br /><small>{data.utilisatrice.role === 'admin' ? 'administratrice' : 'couturière'}</small></span></p>
        <form method="post" action="/deconnexion">
          <input type="hidden" name="_csrf" value={data.csrfToken} />
          <button type="submit" class="bouton-deconnexion">Se déconnecter</button>
        </form>
      </div>
    </aside>

    <header class="entete-mobile">
      <p class="marque"><a href="/">{BRAND_NAME}</a></p>
      <span class="qui"><Avatar nom={data.utilisatrice.nom} taille={36} /></span>
    </header>

    <div class="contenu">
      {@render children()}
      <footer>
        <hr class="filet-laiton" />
        <p>{BRAND_NAME} — Patron brouillon à valider par un maître tailleur. Photos clientes (espace atelier) : consentement explicite, chiffrées, supprimées automatiquement après 7 jours, jamais utilisées pour l’entraînement.</p>
      </footer>
    </div>

    <nav class="barre-onglets" aria-label="Atelier">
      <a href="/" class:actif={estActif('/')}>Accueil</a>
      <a href="/clientes" class:actif={estActif('/clientes')}>Clientes</a>
      <a href="/patron/mesures?modele=pantalon_large" class="nouveau" aria-label="Nouveau patron">+ Patron</a>
      {#if data.utilisatrice.role === 'admin'}
        <a href="/atelier/utilisatrices" class:actif={estActif('/atelier')}>Équipe</a>
      {:else}
        <a href="/profil" class:actif={estActif('/profil')}>Profil</a>
      {/if}
    </nav>
  </div>
{:else}
  <header class="entete-public">
    <div class="barre-publique">
      <p class="marque"><a href="/">{BRAND_NAME}</a></p>
      <nav aria-label="Public">
        <a href="/demo">Démo guidée</a>
        <a class="bouton bouton-petit" href="/connexion">Espace atelier</a>
      </nav>
    </div>
  </header>
  {@render children()}
  <footer class="pied-public">
    <hr class="filet-laiton" />
    <p>{BRAND_NAME} — Patron brouillon à valider par un maître tailleur. Photos clientes (espace atelier) : consentement explicite, chiffrées, supprimées automatiquement après 7 jours, jamais utilisées pour l’entraînement.</p>
  </footer>
{/if}

<style>
  .marque { font-weight: 750; font-size: 22px; margin: 0; letter-spacing: -0.01em; }
  .marque a { color: var(--encre); text-decoration: none; display: inline-flex; align-items: center; }
  .marque a::before { content: ''; width: 10px; height: 10px; border-radius: 3px; background: var(--terracotta); margin-right: 10px; }

  /* --- Coque connectée : barre latérale ≥ 1024 px, onglets bas sur mobile --- */
  .barre-laterale { display: none; }
  .entete-mobile { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: var(--carte); border-bottom: 1px solid var(--bord); position: sticky; top: 0; z-index: 20; }
  .contenu { padding-bottom: 84px; }
  .contenu footer { max-width: 1120px; margin: 0 auto; padding: 12px 16px 24px; font-size: 15px; color: var(--encre-douce); }
  .barre-onglets { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: grid; grid-template-columns: repeat(4, 1fr); background: var(--carte); border-top: 1px solid var(--bord); box-shadow: 0 -6px 24px rgb(20 17 15 / 0.06); padding: 6px 8px calc(6px + env(safe-area-inset-bottom)); }
  .barre-onglets a { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; border-radius: 12px; color: var(--encre); text-decoration: none; font-weight: 600; font-size: 0.95rem; }
  .barre-onglets a.actif { background: var(--fond); color: var(--terracotta-fonce); }
  .barre-onglets a.nouveau { background: var(--terracotta); color: #fff; font-weight: 700; }
  @media (min-width: 1024px) {
    .entete-mobile, .barre-onglets { display: none; }
    .barre-laterale { display: flex; flex-direction: column; gap: 22px; position: fixed; inset: 0 auto 0 0; width: 252px; padding: 22px 18px; background: var(--carte); border-right: 1px solid var(--bord); z-index: 20; }
    .nav-laterale { display: grid; gap: 6px; }
    .nav-laterale a { display: flex; align-items: center; min-height: 48px; padding: 10px 14px; border-radius: 12px; color: var(--encre); text-decoration: none; font-weight: 600; transition: background-color var(--transition), color var(--transition); }
    .nav-laterale a:hover { background: var(--fond); }
    .nav-laterale a.actif { background: var(--primaire); color: var(--primaire-texte); }
    .bas-lateral { margin-top: auto; display: grid; gap: 12px; border-top: 1px solid var(--bord); padding-top: 16px; }
    .utilisatrice { display: flex; gap: 10px; align-items: center; margin: 0; font-weight: 650; line-height: 1.25; }
    .utilisatrice small { color: var(--encre-douce); font-weight: 500; }
    .bouton-deconnexion { width: 100%; background: var(--carte); color: var(--encre); border-color: var(--bord-fort); }
    .contenu { margin-left: 252px; padding-bottom: 0; }
  }

  /* --- Pages publiques : en-tête léger avec CTA --- */
  .entete-public { background: var(--carte); border-bottom: 1px solid var(--bord); position: sticky; top: 0; z-index: 20; }
  .barre-publique { max-width: 1120px; margin: 0 auto; padding: 10px 16px; display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; justify-content: space-between; }
  .barre-publique nav { display: flex; gap: 10px 18px; align-items: center; }
  .barre-publique nav a { display: inline-flex; align-items: center; font-weight: 600; }
  .bouton-petit { min-height: 48px; padding: 10px 18px; }
  .pied-public { max-width: 1120px; margin: 0 auto; padding: 12px 16px 32px; font-size: 15px; color: var(--encre-douce); }
</style>
