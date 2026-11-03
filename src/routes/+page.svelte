<script lang="ts">
  import '@fontsource/playfair-display/500.css';
  import '@fontsource/playfair-display/600.css';
  import '@fontsource/playfair-display/700.css';
  import { BRAND_NAME } from '$lib/brand';
  import IllustrationModele from '$lib/illustrations/IllustrationModele.svelte';
  import PatronCote from '$lib/design/PatronCote.svelte';
  import { MESURES_DEMONSTRATION } from '$lib/design/patron-cote';
  let { data } = $props();
</script>

<svelte:head><title>{BRAND_NAME} — Mesurez-la une fois. Son patron est déjà là.</title></svelte:head>

{#if data.connectee}
  <main>
    {#if data.bienvenue}
      <p class="bienvenue" role="status">Votre atelier est prêt. Ajoutez votre première cliente. <a href="/clientes/nouvelle">Ajouter votre première cliente</a></p>
    {/if}
    <section class="hero-legacy">
      <h1>Votre patron sur mesure, en 2 minutes</h1>
      <p>Choisissez un modèle, prenez les mesures au mètre ruban, obtenez un patron coté à imprimer en A4.</p>
      <div class="modeles">
        <a class="carte-modele" href="/patron/mesures?modele=pantalon_large"><IllustrationModele modele="pantalon_large" /><strong>Pantalon large</strong><span>4 mesures au mètre ruban</span></a>
        <a class="carte-modele" href="/patron/mesures?modele=jupe_droite"><IllustrationModele modele="jupe_droite" /><strong>Jupe droite</strong><span>3 mesures au mètre ruban</span></a>
      </div>
      <p><a href="/clientes">Espace atelier</a></p>
    </section>
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
  .flex { flex: 1; } .mini-puce { font-size: 12px; font-weight: 700; background: var(--bleu-pastille); color: var(--bleu-texte); border-radius: 999px; padding: 5px 10px; }
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
  @media (max-width: 640px) { .hero-nav { display: none; } .carte-vetement { min-height: 320px; } }
</style>
