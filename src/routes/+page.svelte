<script lang="ts">
  import '@fontsource/playfair-display/500.css';
  import '@fontsource/playfair-display/600.css';
  import '@fontsource/playfair-display/700.css';
  import { BRAND_NAME } from '$lib/brand';
  import Avatar from '$lib/design/Avatar.svelte';
  import PatronCote from '$lib/design/PatronCote.svelte';
  import { MESURES_DEMONSTRATION } from '$lib/design/patron-cote';
  let { data } = $props();
  const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const tonsPriorite = ['priorite-lavande', 'priorite-peche', 'priorite-jaune'];
</script>

<svelte:head><title>{BRAND_NAME} — Mesurez-la une fois. Son patron est déjà là.</title></svelte:head>

{#if data.connectee && data.tableau}
  {@const t = data.tableau}
  <main class="atelier">
    {#if data.bienvenue}
      <p class="bienvenue" role="status">Votre atelier est prêt. Ajoutez votre première cliente. <a href="/clientes/nouvelle">Ajouter votre première cliente</a></p>
    {/if}
    <header class="atelier-entete">
      <div>
        <h1>Bonjour, <span class="prenom">{t.prenom}</span></h1>
        <p>Voici l’état de votre atelier aujourd’hui.</p>
      </div>
      <div class="atelier-actions">
        <form method="get" action="/clientes" role="search" class="recherche-atelier">
          <label class="sr-only" for="recherche-atelier">Rechercher une cliente</label>
          <input id="recherche-atelier" name="q" placeholder="Rechercher une cliente" />
        </form>
        <a class="bouton-noir" href="/clientes/nouvelle">+ Nouvelle cliente</a>
      </div>
    </header>

    <section class="priorite" aria-labelledby="priorite-titre">
      <div class="priorite-gauche">
        <p class="priorite-surtitre">À faire en priorité</p>
        <h2 id="priorite-titre">{#if t.nbIncompletes === 0}Toutes vos clientes ont leurs mesures complètes{:else if t.nbIncompletes === 1}1 cliente a encore des mesures à compléter{:else}{t.nbIncompletes} clientes ont encore des mesures à compléter{/if}</h2>
        <p><a class="bouton-blanc" href="/clientes">Voir la liste <span aria-hidden="true">↗</span></a></p>
      </div>
      <div class="priorite-cartes">
        {#each t.incompletes as cliente, i}
          <a class="priorite-carte {tonsPriorite[i % 3]}" href="/clientes/{cliente.id}?onglet=mesures">
            <span class="priorite-num">0{i + 1}</span>
            <Avatar nom={cliente.nom} taille={44} />
            <strong>{cliente.nom}</strong>
            <span>{cliente.nbMesures} mesures sur {cliente.total}</span>
            <span class="barre" aria-hidden="true"><span style="width:{Math.round((cliente.nbMesures / cliente.total) * 100)}%"></span></span>
          </a>
        {:else}
          <p class="priorite-vide">Aucune mesure en attente : créez une fiche cliente pour commencer.</p>
        {/each}
      </div>
    </section>

    <div class="atelier-grille">
      <div class="colonne-principale">
        <div class="stats">
          <article class="stat"><span>Clientes</span><strong>{t.stats.clientes}</strong></article>
          <article class="stat"><span>Patrons</span><strong>{t.stats.patrons}</strong><small>tous en brouillon</small></article>
          <article class="stat"><span>Mesures complètes</span><strong>{t.stats.pourcentage}%</strong><span class="barre claire" aria-hidden="true"><span style="width:{t.stats.pourcentage}%"></span></span><small>{t.stats.completes} clientes sur {t.stats.clientes}</small></article>
        </div>

        <section class="carte-bloc" aria-labelledby="recentes-titre">
          <header><h2 id="recentes-titre">Clientes récentes</h2><a href="/clientes">Tout voir</a></header>
          {#if t.recentes.length === 0}
            <p class="vide-texte">Aucune cliente pour le moment. <a href="/clientes/nouvelle">Créer une fiche cliente</a></p>
          {:else}
            <ul class="liste-recentes">
              {#each t.recentes as cliente}
                <li>
                  <a href="/clientes/{cliente.id}">
                    <Avatar nom={cliente.nom} taille={48} />
                    <span class="flex"><strong>{cliente.nom}</strong><small>{cliente.telephone ?? 'Téléphone non renseigné'}</small></span>
                    {#if cliente.nbPatrons > 0}<span class="puce-bleue">{cliente.nbPatrons} patron{cliente.nbPatrons > 1 ? 's' : ''}</span>{:else if cliente.nbMesures < cliente.total}<span class="puce-peche">Mesures à compléter</span>{:else}<span class="puce-bleue">Mesures complètes</span>{/if}
                  </a>
                </li>
              {/each}
            </ul>
          {/if}
        </section>
      </div>

      <div class="colonne-laterale">
        <section class="carte-bloc" aria-labelledby="derniers-titre">
          <header><h2 id="derniers-titre">Derniers patrons</h2><a href="/clientes">Tout voir</a></header>
          {#if t.derniersPatrons.length === 0}
            <p class="vide-texte">Aucun patron enregistré pour le moment.</p>
          {:else}
            <ul class="liste-derniers">
              {#each t.derniersPatrons as patron, i}
                <li>
                  <a href="/clientes/{patron.clienteId}/patron/{patron.id}">
                    <span class="vignette">{#if patron.vignette}<PatronCote generique={patron.vignette} variante="mini" remplissage={['#dce5fa', '#ffdfb8', '#e3dbff'][i % 3]} uid="dash-{patron.id}" />{/if}</span>
                    <span class="flex"><strong>{patron.titreModele} — {patron.clienteNom}</strong><small>{patron.texte}</small><span class="puce-peche">Brouillon à valider</span></span>
                  </a>
                </li>
              {/each}
            </ul>
          {/if}
        </section>

        <section class="carte-sombre-bloc">
          <span class="coche-jaune" aria-hidden="true">✓</span>
          <div><h2>Patrons à valider</h2><p>Un maître tailleur doit les relire avant toute coupe.</p></div>
          <a class="bouton-blanc petit" href="/clientes">Voir</a>
        </section>

        <a class="bouton-jaune" href="/patron/mesures?modele=pantalon_large">Créer un patron <span aria-hidden="true">→</span></a>
      </div>
    </div>

    {#if t.dernierPatron}
      {@const dp = t.dernierPatron}
      <section class="dernier-patron" aria-labelledby="dernier-titre">
        <div class="dernier-dessin">
          {#if dp.mesuresPantalon}
            <PatronCote mesures={dp.mesuresPantalon} variante="complet" uid="dernier" />
          {:else if dp.generique}
            <PatronCote generique={dp.generique} variante="complet" uid="dernier" />
          {/if}
        </div>
        <div class="dernier-infos">
          <h2 id="dernier-titre">Dernier patron — {dp.prenomCliente} <span class="puce-peche">Brouillon à valider</span></h2>
          <p>{dp.titreModele} · créé le {dateFr(dp.creeLe)}. Les mesures sont écrites directement sur le dessin.</p>
          <ul class="lignes-mesures">
            {#each dp.lignes as ligne}<li><span><span class="point-mesure"></span>{ligne.libelle}</span><strong>{ligne.valeur}</strong></li>{/each}
          </ul>
          <p class="hero-actions">
            <a class="bouton-noir" href={dp.hrefSalle}>Ouvrir la salle d’essayage</a>
            <a class="bouton-bord" href={dp.hrefPdf} download>Télécharger le PDF A4</a>
          </p>
        </div>
      </section>
    {:else}
      <section class="carte-bloc">
        <h2>Dernier patron</h2>
        <p class="vide-texte">Aucun patron pour le moment. <a href="/patron/mesures?modele=pantalon_large">Créer un patron</a></p>
      </section>
    {/if}
  </main>
{:else}
  <div class="accueil">
    <!-- Hero bleu nuit, en-tête intégré (maquette Accueil) -->
    <section class="hero">
      <header class="hero-entete">
        <a class="logo" href="/" aria-label="Studio Couture — Accueil">
          <svg width="40" height="40" viewBox="0 0 38 38" aria-hidden="true"><rect width="38" height="38" rx="19" fill="#C9A77C" /><path d="M12 25c2 2.2 5 2.8 7.5 1.8 2.6-1 3-4 .6-5.2l-3.4-1.6c-2.4-1.2-2-4.2.6-5.2 2.4-1 5.3-.4 7.2 1.6" fill="none" stroke="#23223A" stroke-width="2.6" stroke-linecap="round" /></svg>
          <span>Studio Couture</span>
        </a>
        <nav aria-label="Navigation du site" class="hero-nav">
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#comment-ca-marche">Comment ça marche</a>
          <a href="/demo">Salle d’essayage</a>
          <a href="/demo">Démo</a>
        </nav>
        <div class="hero-compte">
          <a class="lien-connexion" href="/connexion">Se connecter</a>
          <a class="bouton-dore" href="/inscription">Créer mon atelier</a>
        </div>
      </header>

      <div class="hero-grille">
        <div class="hero-texte">
          <p class="sur-titre">Pour les ateliers qui veulent gagner des heures</p>
          <h1>Mesurez-la une fois. <em>Son patron est déjà là.</em></h1>
          <p class="hero-p">Fini les heures de calcul au crayon. Saisissez les mesures de votre cliente, regardez le vêtement prendre forme sur mannequin, puis imprimez son patron à l’échelle, prêt à couper.</p>
          <p class="hero-actions">
            <a class="bouton-dore gros" href="/demo">Voir mon premier patron <span aria-hidden="true">→</span></a>
            <a class="bouton-contour" href="/demo">Tester gratuitement, sans compte</a>
          </p>
        </div>
        <div class="hero-visuels">
          <figure class="carte-vetement">
            <img src="/img/accueil-pantalon-bleu.jpg" alt="Pantalon de tailleur bleu roi, vu de trois quarts et de dos" />
            <figcaption>Le vêtement</figcaption>
          </figure>
          <figure class="carte-hero-patron">
            <PatronCote mesures={MESURES_DEMONSTRATION} variante="complet" uid="hero" />
          </figure>
        </div>
      </div>
    </section>

    <!-- Ce que vous obtenez -->
    <section class="section services" id="fonctionnalites">
      <p class="sur-titre clair">Ce que vous obtenez</p>
      <h2 class="serif">Ce que vous faisiez en une journée, en dix minutes</h2>
      <div class="cercles">
        <article>
          <span class="cercle lavande"><svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true"><path d="M6 36h44M6 36v8h44v-8M12 36v-5M20 36v-3M28 36v-5M36 36v-3M44 36v-5" fill="none" stroke="#2A2940" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" /><circle cx="28" cy="16" r="6" fill="none" stroke="#2A2940" stroke-width="2.6" /></svg></span>
          <h3 class="serif">Fiches clientes</h3>
          <p>Mesures, consentement et photos de chaque cliente, retrouvées à la prochaine visite.</p>
        </article>
        <article>
          <span class="cercle peche"><svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true"><g fill="none" stroke="#2A2940" stroke-width="2.6" stroke-linejoin="round"><path d="M8 6h18l2 12c1 10 2 20 1 32H14c-1-12-2-24-6-34z" /><path d="M32 6h16l-1 14c-2 10-3 20-2 30H34c1-14 0-26-2-36z" /></g></svg></span>
          <h3 class="serif">Patron généré</h3>
          <p>Devant, dos et ceinture calculés depuis les mesures, avec la fourche en J.</p>
        </article>
        <article>
          <span class="cercle bleu"><svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true"><g fill="none" stroke="#2A2940" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"><path d="M28 6l18 10v20L28 46 10 36V16z" /><path d="M10 16l18 10 18-10M28 26v20" /></g></svg></span>
          <h3 class="serif">Salle d’essayage</h3>
          <p>Mannequin en 3D, tissu au choix et aperçu en trois images : face, perspective, dos.</p>
        </article>
        <article>
          <span class="cercle jaune"><svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true"><g fill="none" stroke="#2A2940" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"><path d="M14 6h20l10 10v34H14z" /><path d="M34 6v10h10M22 30h14M22 38h14" /></g></svg></span>
          <h3 class="serif">PDF A4 à l’échelle</h3>
          <p>À imprimer sans mise à l’échelle, avec un carré de 10 cm pour contrôler à la règle.</p>
        </article>
      </div>
    </section>

    <!-- Patron lisible -->
    <section class="section patron-lisible">
      <div class="deux-colonnes">
        <div>
          <p class="sur-titre clair">Un patron qu’on comprend d’un coup d’œil</p>
          <h2 class="serif">Devant, dos et ceinture. Chaque mesure écrite sur la pièce.</h2>
          <p>Plus besoin de deviner : la taille, les hanches, la fourche et la longueur sont cotées directement sur le dessin, comme sur un patron de maison de couture.</p>
          <ul class="legende-liste">
            <li><span class="point orange"></span><span><strong>Cotes en orange</strong><br />Taille, hanches, fourche, longueur, bas : lisibles en un regard.</span></li>
            <li><span class="point nuit"></span><span><strong>Contour et sens du droit-fil</strong><br />Pour poser le tissu dans le bon sens avant de couper.</span></li>
            <li><span class="point dore"></span><span><strong>Marge de couture 1 cm</strong><br />Le trait pointillé montre où coudre.</span></li>
          </ul>
        </div>
        <div class="carte-patron-blanche">
          <PatronCote mesures={MESURES_DEMONSTRATION} variante="complet" uid="lisible" />
        </div>
      </div>
    </section>

    <!-- Comment ça marche -->
    <section class="section" id="comment-ca-marche">
      <div class="bandeau-marche">
        <div class="marche-texte">
          <p class="sur-titre clair">Comment ça marche</p>
          <h2 class="serif">Trois gestes, et la cliente se voit déjà dans son pantalon</h2>
          <ol class="gestes">
            <li><span class="numero">1</span><span><strong>Mesurez</strong><br />Saisissez les neuf mesures. Elles restent sur la fiche de la cliente.</span></li>
            <li><span class="numero">2</span><span><strong>Essayez</strong><br />Ajustez, choisissez le tissu et regardez le rendu sous trois angles.</span></li>
            <li><span class="numero">3</span><span><strong>Imprimez</strong><br />Téléchargez le PDF, assemblez les feuilles, vérifiez le carré, coupez.</span></li>
          </ol>
        </div>
        <div class="marche-apercu" role="img" aria-label="Aperçu du tableau de bord : clientes à compléter, compteurs et dernières clientes">
          <div class="apercu-sombre"><span>À faire en priorité</span><strong>3 clientes ont encore des mesures à compléter</strong></div>
          <div class="apercu-chiffres"><div><span>Clientes</span><strong>12</strong></div><div><span>Patrons</span><strong>8</strong></div><div class="violet"><span>À valider</span><strong>8</strong></div></div>
          <div class="apercu-cliente"><span class="mini-avatar">AW</span><span class="flex">Awa</span><span class="mini-puce">2 patrons</span></div>
        </div>
      </div>
    </section>

    <!-- Honnêteté -->
    <section class="section honnetete">
      <p class="sur-titre">Notre engagement</p>
      <h2 class="serif">Nous ne vous promettons pas la magie. Nous vous promettons un vrai point de départ.</h2>
      <p>Chaque patron est présenté comme un brouillon tant qu’un professionnel ne l’a pas relu. Le rendu 3D montre un volume à partir des cotes, pas une simulation de drapé. Les photos sont chiffrées et supprimées après sept jours.</p>
    </section>

    <!-- Appel final -->
    <section class="section cta">
      <h2 class="serif">Votre prochaine cliente mérite mieux qu’un patron à la main</h2>
      <p>Deux minutes pour ouvrir votre atelier. Aucune carte bancaire, aucune installation.</p>
      <p class="hero-actions centre">
        <a class="bouton-nuit" href="/inscription">Créer mon atelier</a>
        <a class="bouton-contour-nuit" href="/demo">Voir la démo d’abord</a>
      </p>
    </section>

    <footer class="pied-accueil">
      <span class="serif">Studio Couture</span>
      <span>Brouillons à valider par un maître tailleur avant toute coupe réelle.</span>
    </footer>
  </div>
{/if}

<style>
  .bienvenue { border: 1.5px solid var(--bleu); background: var(--bleu-pastille); color: var(--bleu-texte); border-radius: var(--rayon-carte); padding: 16px 20px; font-weight: 700; }
  .modeles { display: grid; gap: 16px; margin: 18px 0; }
  @media (min-width: 760px) { .modeles { grid-template-columns: 1fr 1fr; } }
  .carte-modele { display: grid; gap: 6px; text-align: center; border: 1px solid var(--bord); border-radius: var(--rayon-carte); padding: 20px 16px; color: inherit; text-decoration: none; font-size: 20px; background: var(--carte); }
  .carte-modele span { font-size: 16px; }

  /* --- Accueil public, maquette Accueil --- */
  .accueil { background: var(--creme); color: var(--encre); }
  .serif, .accueil h1, .accueil h2, .accueil h3 { font-family: var(--serif-display); }
  .hero { background: var(--nuit); color: #fff; padding: 0 clamp(16px, 5vw, 64px) 72px; overflow: hidden; }
  .hero-entete { max-width: 1152px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px 20px; padding: 24px 0; }
  .logo { display: inline-flex; align-items: center; gap: 12px; color: #fff; text-decoration: none; font-family: var(--serif-display); font-size: 22px; font-weight: 600; min-height: 48px; }
  .hero-nav { display: flex; flex-wrap: wrap; gap: 10px 28px; font-size: 14px; font-weight: 600; color: #d9d9e4; }
  .hero-nav a, .lien-connexion { color: inherit; text-decoration: none; display: inline-flex; align-items: center; min-height: 48px; }
  .hero-compte { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 700; }
  .bouton-dore { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; padding: 12px 24px; border-radius: 999px; background: var(--dore); color: var(--nuit); text-decoration: none; font-weight: 800; }
  .bouton-dore.gros { min-height: 58px; padding: 14px 32px; font-size: 16px; }
  .hero-grille { max-width: 1152px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 40px 48px; padding-top: 28px; }
  .hero-texte { flex: 1 1 340px; display: flex; flex-direction: column; gap: 26px; min-width: 0; }
  .sur-titre { margin: 0; font-size: 13px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--dore); }
  .sur-titre.clair { color: var(--dore-sur-clair); }
  .hero h1 { margin: 0; font-size: clamp(2.4rem, 5vw, 3.5rem); line-height: 1.08; font-weight: 600; color: #fff; }
  .hero h1 em { color: var(--dore); font-weight: 500; }
  .hero-p { margin: 0; font-size: 18px; line-height: 1.6; color: #c9c8dd; max-width: 520px; }
  .hero-actions { display: flex; flex-wrap: wrap; gap: 14px; margin: 0; }
  .hero-actions.centre { justify-content: center; }
  .bouton-contour { display: inline-flex; align-items: center; justify-content: center; min-height: 58px; padding: 14px 30px; border-radius: 999px; border: 1.5px solid #6c6b8c; color: #fff; text-decoration: none; font-weight: 700; }
  .hero-visuels { flex: 1 1 620px; display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; align-items: stretch; min-width: 0; }
  .carte-vetement { margin: 0; flex: 1 1 300px; max-width: 430px; position: relative; border-radius: 32px; background: #fff; overflow: hidden; min-height: 420px; }
  .carte-vetement img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .carte-vetement figcaption { position: absolute; left: 14px; bottom: 14px; background: var(--nuit); color: #fff; border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 800; }
  .carte-hero-patron { margin: 0; flex: 1 1 280px; max-width: 340px; border-radius: 32px; background: #f6f3ec; overflow: hidden; padding: 12px 8px 8px; }
  .section { padding: 72px clamp(16px, 5vw, 64px); max-width: 1280px; margin: 0 auto; }
  .services { display: flex; flex-direction: column; align-items: center; gap: 22px; text-align: center; }
  .services h2, .patron-lisible h2, .marche-texte h2 { margin: 0; font-size: clamp(1.9rem, 4vw, 2.75rem); font-weight: 600; color: var(--encre); }
  .cercles { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 36px; width: 100%; max-width: 1120px; margin-top: 26px; }
  .cercles article { display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .cercles h3 { margin: 0; font-size: 22px; font-weight: 600; }
  .cercles p { margin: 0; font-size: 15px; line-height: 1.55; color: var(--texte-secondaire); }
  .cercle { width: 132px; height: 132px; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
  .cercle.lavande { background: #e3dbff; } .cercle.peche { background: #ffdfb8; } .cercle.bleu { background: #dce5fa; } .cercle.jaune { background: #f2f8b8; }
  .deux-colonnes { max-width: 1152px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 48px; align-items: center; justify-content: center; }
  .deux-colonnes > div:first-child { flex: 1 1 380px; max-width: 520px; display: flex; flex-direction: column; gap: 20px; }
  .deux-colonnes p { line-height: 1.6; color: var(--texte-secondaire); }
  .legende-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
  .legende-liste li { display: flex; gap: 14px; align-items: flex-start; line-height: 1.5; }
  .point { width: 14px; height: 14px; border-radius: 999px; margin-top: 5px; flex: none; }
  .point.orange { background: var(--cote); } .point.nuit { background: var(--nuit); } .point.dore { background: var(--dore); }
  .carte-patron-blanche { flex: 1 1 360px; max-width: 440px; background: #fff; border-radius: 36px; border: 1px solid #e6e1d6; padding: 20px; box-shadow: 0 18px 50px rgb(35 34 58 / 0.08); }
  .bandeau-marche { max-width: 1152px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: stretch; background: #f1e4da; border-radius: 40px; overflow: hidden; }
  .marche-texte { flex: 1 1 420px; padding: clamp(28px, 5vw, 56px); display: flex; flex-direction: column; gap: 26px; justify-content: center; }
  .gestes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 20px; }
  .gestes li { display: flex; gap: 16px; align-items: flex-start; line-height: 1.5; color: var(--texte-secondaire); }
  .gestes strong { color: var(--encre); font-size: 17px; }
  .numero { width: 38px; height: 38px; border-radius: 999px; background: var(--nuit); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; flex: none; }
  .marche-apercu { flex: 1 1 420px; background: var(--fond); padding: clamp(24px, 4vw, 40px); display: flex; flex-direction: column; justify-content: center; gap: 14px; }
  .apercu-sombre { background: var(--carte-sombre); color: #fff; border-radius: 24px; padding: 20px; display: flex; flex-direction: column; gap: 8px; }
  .apercu-sombre span { font-size: 13px; color: #b9b8d3; font-weight: 600; }
  .apercu-sombre strong { font-size: 20px; line-height: 1.2; }
  .apercu-chiffres { display: flex; gap: 12px; }
  .apercu-chiffres div { flex: 1; background: #fff; border-radius: 20px; padding: 16px; display: flex; flex-direction: column; }
  .apercu-chiffres div.violet { background: var(--lavande); }
  .apercu-chiffres span { font-size: 12px; color: var(--texte-secondaire); font-weight: 600; }
  .apercu-chiffres strong { font-size: 30px; }
  .apercu-cliente { background: #fff; border-radius: 20px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; font-weight: 700; }
  .mini-avatar { width: 40px; height: 40px; border-radius: 999px; background: #ffdfb8; color: #6b3a00; display: flex; align-items: center; justify-content: center; font-weight: 800; }
  .flex { flex: 1; min-width: 0; overflow-wrap: anywhere; } .mini-puce { font-size: 12px; font-weight: 700; background: var(--bleu-pastille); color: var(--bleu-texte); border-radius: 999px; padding: 5px 10px; }
  .honnetete { background: var(--nuit); color: #fff; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px; max-width: none; }
  .honnetete h2 { margin: 0; font-size: clamp(1.9rem, 4vw, 2.6rem); font-weight: 600; max-width: 820px; color: #fff; }
  .honnetete p:last-child { margin: 0; font-size: 17px; line-height: 1.65; color: #c9c8dd; max-width: 680px; }
  .cta { background: var(--dore); color: var(--nuit); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 22px; max-width: none; }
  .cta h2 { margin: 0; font-size: clamp(2rem, 4vw, 2.9rem); font-weight: 600; color: var(--nuit); }
  .cta p { margin: 0; font-size: 17px; }
  .bouton-nuit { display: inline-flex; align-items: center; min-height: 58px; padding: 14px 34px; border-radius: 999px; background: var(--nuit); color: #fff; text-decoration: none; font-weight: 800; }
  .bouton-contour-nuit { display: inline-flex; align-items: center; min-height: 58px; padding: 14px 30px; border-radius: 999px; border: 1.5px solid var(--nuit); color: var(--nuit); text-decoration: none; font-weight: 700; }
  .pied-accueil { background: #1a1a2c; color: #b9b8d3; padding: 32px clamp(16px, 5vw, 64px); display: flex; flex-wrap: wrap; gap: 12px 16px; justify-content: space-between; font-size: 13px; }
  .pied-accueil .serif { font-size: 18px; color: #fff; }
  /* --- Tableau de bord connecté, maquette Atelier --- */
  .atelier { max-width: 1120px; margin: 0 auto; padding: 24px 16px 40px; display: flex; flex-direction: column; gap: 22px; }
  .atelier-entete { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; }
  .atelier-entete h1 { margin: 0; font-size: clamp(1.9rem, 4vw, 2.6rem); }
  .atelier-entete p { margin: 4px 0 0; color: var(--texte-secondaire); }
  .prenom { color: var(--bleu); }
  .atelier-actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .recherche-atelier input { min-height: 52px; border: 1px solid var(--bord); border-radius: 999px; padding: 12px 22px; font: inherit; background: #fff; min-width: min(280px, 70vw); }
  .bouton-noir { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; padding: 12px 24px; border-radius: 999px; background: var(--encre); color: #fff; text-decoration: none; font-weight: 800; }
  .bouton-blanc { display: inline-flex; align-items: center; gap: 8px; min-height: 48px; padding: 10px 22px; border-radius: 999px; background: #fff; color: var(--encre); text-decoration: none; font-weight: 800; }
  .bouton-blanc.petit { min-height: 44px; padding: 8px 18px; }
  .bouton-bord { display: inline-flex; align-items: center; min-height: 52px; padding: 12px 24px; border-radius: 999px; border: 1.5px solid var(--encre); color: var(--encre); text-decoration: none; font-weight: 700; background: #fff; }
  .bouton-jaune { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 58px; border-radius: 999px; background: var(--jaune-vert); color: var(--jaune-vert-texte); text-decoration: none; font-weight: 800; font-size: 17px; }
  .priorite { background: var(--carte-sombre); color: #fff; border-radius: 32px; padding: clamp(22px, 4vw, 36px); display: flex; flex-wrap: wrap; gap: 24px; }
  .priorite-gauche { flex: 1 1 300px; display: flex; flex-direction: column; gap: 16px; justify-content: center; }
  .priorite-surtitre { margin: 0; color: #b9b8d3; font-weight: 600; }
  .priorite h2 { margin: 0; color: #fff; font-size: clamp(1.6rem, 3.4vw, 2.3rem); line-height: 1.15; }
  .priorite-cartes { flex: 2 1 480px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; }
  .priorite-carte { border-radius: 24px; padding: 18px; display: flex; flex-direction: column; gap: 10px; color: var(--encre); text-decoration: none; min-height: 170px; }
  .priorite-lavande { background: var(--lavande); } .priorite-peche { background: var(--peche); } .priorite-jaune { background: var(--jaune-vert); }
  .priorite-num { font-size: 13px; font-weight: 700; opacity: 0.75; }
  .priorite-carte strong { font-size: 17px; }
  .barre { display: block; height: 8px; border-radius: 999px; background: rgb(30 30 34 / 0.18); overflow: hidden; margin-top: auto; }
  .barre > span { display: block; height: 100%; background: var(--encre); border-radius: 999px; }
  .barre.claire { background: var(--bord); width: 100%; }
  .barre.claire > span { background: var(--bleu); }
  .priorite-vide { color: #d9d9e4; }
  .atelier-grille { display: grid; gap: 22px; }
  @media (min-width: 960px) { .atelier-grille { grid-template-columns: 1.6fr 1fr; align-items: start; } }
  .colonne-principale, .colonne-laterale { display: flex; flex-direction: column; gap: 22px; min-width: 0; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; }
  .stat { background: #fff; border: 1px solid var(--bord); border-radius: 26px; padding: 20px; display: flex; flex-direction: column; gap: 6px; }
  .stat span { color: var(--texte-secondaire); font-weight: 600; font-size: 14px; }
  .stat strong { font-size: 42px; line-height: 1; }
  .stat small { color: var(--texte-secondaire); }
  .carte-bloc { background: #fff; border: 1px solid var(--bord); border-radius: 28px; padding: 22px; }
  .carte-bloc header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .carte-bloc h2, .carte-sombre-bloc h2 { margin: 0; font-size: 21px; }
  .carte-sombre-bloc h2 { color: #fff; }
  .carte-bloc header a { color: var(--texte-secondaire); font-weight: 600; font-size: 14px; }
  .liste-recentes, .liste-derniers { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .liste-recentes a { display: flex; align-items: center; gap: 14px; padding: 10px; border-radius: 18px; color: inherit; text-decoration: none; }
  .liste-recentes a:hover, .liste-derniers a:hover { background: var(--fond); }
  .liste-recentes small, .liste-derniers small { display: block; color: var(--texte-secondaire); }
  .puce-bleue { background: var(--bleu-pastille); color: var(--bleu-texte); border-radius: 999px; padding: 5px 12px; font-size: 12.5px; font-weight: 700; white-space: nowrap; }
  .puce-peche { background: var(--peche-pastille); color: var(--peche-texte); border-radius: 999px; padding: 5px 12px; font-size: 12.5px; font-weight: 700; white-space: nowrap; display: inline-flex; }
  .liste-derniers a { display: flex; gap: 14px; align-items: center; background: var(--fond); border-radius: 20px; padding: 12px; color: inherit; text-decoration: none; }
  .vignette { width: 64px; height: 84px; flex: none; background: #fff; border-radius: 14px; padding: 6px; display: flex; }
  .carte-sombre-bloc { background: var(--rail); color: #fff; border-radius: 28px; padding: 22px; display: flex; gap: 16px; align-items: center; }
  .carte-sombre-bloc p { margin: 4px 0 0; color: #b9b8d3; font-size: 14px; }
  .carte-sombre-bloc .bouton-blanc { margin-left: auto; }
  .coche-jaune { width: 48px; height: 48px; flex: none; border: 1.5px solid #55565f; border-radius: 999px; display: flex; align-items: center; justify-content: center; color: var(--jaune-vert); font-size: 20px; font-weight: 800; }
  .dernier-patron { background: #fff; border: 1px solid var(--bord); border-radius: 28px; padding: 22px; display: grid; gap: 26px; }
  @media (min-width: 960px) { .dernier-patron { grid-template-columns: 1fr 1fr; align-items: center; } }
  .dernier-dessin { background: var(--creme); border-radius: 24px; padding: 16px; }
  .dernier-infos h2 { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-size: 26px; margin: 0 0 10px; }
  .dernier-infos p { color: var(--texte-secondaire); line-height: 1.55; }
  .lignes-mesures { list-style: none; margin: 18px 0; padding: 0; }
  .lignes-mesures li { display: flex; justify-content: space-between; gap: 16px; padding: 11px 0; border-bottom: 1px solid var(--bord); }
  .lignes-mesures li span { display: inline-flex; gap: 10px; align-items: center; color: var(--texte-secondaire); font-weight: 600; }
  .point-mesure { width: 9px; height: 9px; border-radius: 999px; background: var(--cote); flex: none; }
  .vide-texte { color: var(--texte-secondaire); line-height: 1.55; }
  @media (max-width: 640px) {
    .hero-nav { display: none; } .carte-vetement { min-height: 320px; }
    /* Tableau de bord : aucun débordement horizontal sur petit écran. */
    .atelier { padding-inline: 0; }
    .atelier-actions, .recherche-atelier, .recherche-atelier input { min-width: 0; width: 100%; }
    .priorite-cartes { grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr)); }
    .stats { grid-template-columns: repeat(auto-fit, minmax(min(130px, 100%), 1fr)); }
    .liste-recentes a, .liste-derniers a { flex-wrap: wrap; }
    .puce-bleue, .puce-peche { white-space: normal; }
    .carte-sombre-bloc { flex-wrap: wrap; }
    .carte-sombre-bloc .bouton-blanc { margin-left: 0; }
    .dernier-patron { padding: 16px; }
    .lignes-mesures li strong { text-align: right; }
  }
</style>
