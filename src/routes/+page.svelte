<script lang="ts">
  import '@fontsource/playfair-display/500.css';
  import '@fontsource/playfair-display/600.css';
  import '@fontsource/playfair-display/700.css';
  import { BRAND_NAME } from '$lib/brand';
  import IllustrationModele from '$lib/illustrations/IllustrationModele.svelte';
  import Aiguille from '$lib/design/icones/Aiguille.svelte';
  import Ciseaux from '$lib/design/icones/Ciseaux.svelte';
  import Epingle from '$lib/design/icones/Epingle.svelte';
  import Metre from '$lib/design/icones/Metre.svelte';
  let { data } = $props();
</script>

<svelte:head><title>{BRAND_NAME} — Votre patron sur mesure, en 2 minutes</title></svelte:head>

<main>
  {#if data.bienvenue}
    <p class="bienvenue" role="status">Votre atelier est prêt. Ajoutez votre première cliente. <a href="/clientes/nouvelle">Ajouter votre première cliente</a></p>
  {/if}
  <section class="hero">
    <p class="sur-titre"><Epingle /> Studio Couture, l’atelier dans la poche</p>
    <h1>Votre patron sur mesure, en 2 minutes</h1>
    <p class="sous-titre">Choisissez un modèle, prenez quatre mesures au mètre ruban, obtenez un patron coté à imprimer en A4. Sans compte pour essayer.</p>
    <p class="actions">
      <a class="bouton bouton-action gros" href="/demo">Voir la démo guidée</a>
      {#if data.connectee}
        <a class="bouton bouton-discret" href="/clientes">Espace atelier</a>
      {:else}
        <a class="bouton bouton-secondaire gros" href="/inscription">Créer mon atelier</a>
        <a class="bouton bouton-discret" href="/connexion">Espace atelier (connexion)</a>
      {/if}
    </p>
    <p><span class="badge">Brouillon à valider par un maître tailleur</span></p>
  </section>

  <section aria-labelledby="etapes-titre">
    <h2 id="etapes-titre">Trois gestes, un patron</h2>
    <div class="cartes">
      <article class="carte geste"><Ciseaux /><h3>1. Choisir</h3><p>Le pantalon large, taille haute et jambes amples. D’autres modèles arrivent bientôt.</p></article>
      <article class="carte geste"><Metre /><h3>2. Mesurer</h3><p>Taille, hanches, hauteur de fourche et longueur : quatre mesures guidées, illustrées une à une.</p></article>
      <article class="carte geste"><Aiguille /><h3>3. Obtenir le patron</h3><p>Un dessin coté devant, dos et ceinture, puis un PDF A4 à l’échelle 1:1 avec carré de contrôle.</p></article>
    </div>
  </section>

  {#if data.connectee}
    <section class="carte" aria-labelledby="atelier-titre">
      <h2 id="atelier-titre">Dans votre atelier</h2>
      <p>Vous êtes connectée : partez d’un modèle pour une cliente, avec ses mesures enregistrées.</p>
      <div class="modeles">
        <a class="carte-modele" href="/patron/mesures?modele=pantalon_large"><IllustrationModele modele="pantalon_large" /><strong>Pantalon large</strong><span>4 mesures au mètre ruban</span></a>
        <a class="carte-modele" href="/patron/mesures?modele=jupe_droite"><IllustrationModele modele="jupe_droite" /><strong>Jupe droite</strong><span>3 mesures au mètre ruban</span></a>
      </div>
    </section>
  {:else}
    <section class="carte" aria-labelledby="atelier-titre">
      <h2 id="atelier-titre">Vous tenez un atelier ?</h2>
      <p>L’espace atelier garde vos clientes, leurs mesures et leurs photos avec consentement. La démo ci-dessus, elle, n’enregistre rien.</p>
      <p><a href="/connexion">Espace atelier (connexion)</a></p>
    </section>
  {/if}
</main>

<style>
  .hero { text-align: center; padding: 28px 12px 10px; }
  .bienvenue { border: 1.5px solid var(--bleu); background: var(--bleu-pastille); color: var(--bleu-texte); border-radius: var(--rayon-carte); padding: 16px 20px; font-weight: 700; }
  .bienvenue a { color: var(--bleu-texte); }
  .sur-titre { display: inline-flex; gap: 8px; align-items: center; font-weight: 700; color: var(--terracotta-fonce); }
  .sur-titre :global(.icone) { width: 22px; height: 22px; }
  .hero h1 { margin: 10px auto; max-width: 16ch; font-family: var(--serif-display); font-weight: 600; }
  .sous-titre { font-size: var(--titre-3); max-width: 38rem; margin: 0 auto; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin: 22px 0 14px; }
  .gros { font-size: 1.2rem; padding: 16px 30px; }
  .badge { display: inline-block; border: 2px solid var(--laiton); background: #fffaf0; color: var(--encre); border-radius: 999px; padding: 6px 14px; font-weight: 700; }
  .cartes, .modeles { display: grid; gap: 16px; margin: 18px 0; }
  @media (min-width: 760px) { .cartes { grid-template-columns: repeat(3, 1fr); } .modeles { grid-template-columns: 1fr 1fr; } }
  .geste { text-align: center; margin: 0; }
  .geste :global(.icone) { color: var(--terracotta); width: 36px; height: 36px; }
  .geste h3 { margin-bottom: 6px; }
  .geste p { margin: 0; }
  .carte-modele { display: grid; gap: 6px; text-align: center; border: 1px solid var(--bord); border-radius: var(--rayon-carte); padding: 20px 16px; color: inherit; text-decoration: none; font-size: 20px; background: var(--carte); box-shadow: var(--ombre-petite); transition: transform var(--transition), box-shadow var(--transition); }
  .carte-modele:hover { transform: translateY(-2px); box-shadow: var(--ombre); }
  .carte-modele span { font-size: 16px; }
</style>
