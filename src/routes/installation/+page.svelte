<script lang="ts">
  import Carte from '$lib/design/Carte.svelte';
  import ChampTexte from '$lib/design/ChampTexte.svelte';
  import { BRAND_NAME } from '$lib/brand';
  let { form } = $props();
</script>

<svelte:head><title>{BRAND_NAME} — Créer l’atelier</title></svelte:head>

<main class="installation">
  <div class="installation-entete">
    <p class="sur-titre">Première installation</p>
    <h1>Créer l’atelier</h1>
    <p>Cette page disparaît dès que le premier compte est créé.</p>
  </div>

  <Carte>
    {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
    <form method="post" class="grille-form">
      <ChampTexte label="Nom de l’atelier" name="nom_atelier" requis autocomplete="organization" />
      <ChampTexte label="Votre nom" name="nom" requis autocomplete="name" />
      <ChampTexte label="Adresse e-mail ou numéro de téléphone" name="identifiant" requis autocomplete="username" />
      <ChampTexte label="Mot de passe (10 caractères minimum)" name="mot_de_passe" type="password" requis autocomplete="new-password" aide="Choisissez un mot de passe long, différent de vos autres comptes." />
      <button type="submit" class="plein">Créer l’atelier et le compte administratrice</button>
    </form>
  </Carte>
</main>

<style>
  .installation {
    max-width: 760px;
  }
  .installation-entete {
    margin: 10px 0 22px;
  }
  .sur-titre {
    margin: 0 0 8px;
    color: var(--bleu-texte);
    font-size: 0.88rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .installation-entete h1 {
    margin: 0 0 8px;
  }
  .installation-entete p:last-child {
    margin: 0;
    color: var(--texte-secondaire);
    font-size: 1.05rem;
  }
  .installation :global(.carte-v2) {
    margin: 0;
    padding: clamp(20px, 4vw, 32px);
  }
  .grille-form {
    display: grid;
    gap: 16px;
  }
  .plein {
    width: 100%;
    min-height: 56px;
    margin-top: 4px;
    font-size: 1rem;
  }
</style>
