<script lang="ts">
  import Avatar from '$lib/design/Avatar.svelte';
  import Carte from '$lib/design/Carte.svelte';
  let { data } = $props();
</script>

<main>
  <h1>Profil</h1>
  <Carte>
    <p class="qui"><Avatar nom={data.nom} taille={56} /><span><strong>{data.nom}</strong><br />{data.role === 'admin' ? 'administratrice de l’atelier' : 'couturière'}</span></p>
    {#if data.role === 'admin'}<p><a href="/atelier/utilisatrices">Gérer l’équipe de l’atelier</a></p>{/if}
    <form method="post" action="/deconnexion">
      <input type="hidden" name="_csrf" value={data.csrfToken} />
      <button type="submit">Se déconnecter</button>
    </form>
  </Carte>
</main>

<style>
  .qui { display: flex; gap: 14px; align-items: center; }
</style>
