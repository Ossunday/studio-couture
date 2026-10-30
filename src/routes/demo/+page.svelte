<script lang="ts">
  import IllustrationMesure from '$lib/illustrations/IllustrationMesure.svelte';
  import IllustrationModele from '$lib/illustrations/IllustrationModele.svelte';
  import VisionneusePatron from '$lib/design/VisionneusePatron.svelte';
  import Epingle from '$lib/design/icones/Epingle.svelte';
  import { definitionMensuration } from '$lib/domain/mensurations-saisie';
  import { preparerPiece } from '$lib/patterns/apercu-rendu';
  import { genererPiecesPlacees, MODELES, validerMesuresPatron } from '$lib/patterns/saisie-patron';

  const PRESETS = {
    petite: { libelle: 'Petite', tour_taille_cm: '64', tour_hanches_cm: '88', hauteur_fourche_cm: '24', longueur_pantalon_cm: '96' },
    moyenne: { libelle: 'Moyenne', tour_taille_cm: '82', tour_hanches_cm: '100', hauteur_fourche_cm: '27', longueur_pantalon_cm: '105' },
    forte: { libelle: 'Forte', tour_taille_cm: '110', tour_hanches_cm: '128', hauteur_fourche_cm: '31', longueur_pantalon_cm: '108' }
  } as const;
  type ClePreset = keyof typeof PRESETS;

  const AIDES: Record<string, { aide: string; exemple: string }> = {
    tour_taille_cm: { aide: 'Faites le tour au creux naturel de la taille, ruban à plat, sans serrer.', exemple: 'Exemple courant : 82 cm.' },
    tour_hanches_cm: { aide: 'Faites le tour à l’endroit le plus fort des hanches et des fesses.', exemple: 'Exemple courant : 100 cm.' },
    hauteur_fourche_cm: { aide: 'Assise sur une chaise dure, mesurez le long du côté, de la taille jusqu’à la chaise.', exemple: 'Exemple courant : 27 cm.' },
    longueur_pantalon_cm: { aide: 'Debout, mesurez le long du côté, de la taille jusqu’au sol (ou à la cheville souhaitée).', exemple: 'Exemple courant : 105 cm.' }
  };

  const GUIDES: Record<number, string> = {
    1: 'Commencez ici : choisissez le pantalon large. La jupe droite arrive bientôt, elle reste donc désactivée.',
    2: 'Touchez Petite, Moyenne ou Forte pour remplir les mesures d’un coup, puis ajustez chaque champ si besoin avant de continuer.',
    3: 'Voici votre patron brouillon coté. Zoomez avec + et −, glissez le dessin, et regardez chaque pièce avec les onglets.',
    4: 'Dernière étape : téléchargez le PDF A4 à l’échelle 1:1, puis vérifiez le carré de contrôle de 10 cm à la règle avant toute coupe.'
  };

  const ETAPES = ['Choisir le modèle', 'Mesures', 'Patron', 'Résultat'] as const;
  const champs = MODELES.pantalon_large.champs.map((code) => {
    const def = definitionMensuration(code);
    return { code, libelle: def.libelle, minCm: def.minCm, maxCm: def.maxCm, ...AIDES[code]! };
  });

  let etape = $state(1);
  let valeurs = $state<Record<string, string>>({ tour_taille_cm: '', tour_hanches_cm: '', hauteur_fourche_cm: '', longueur_pantalon_cm: '' });
  let presetActif = $state<ClePreset | ''>('');
  let erreur = $state('');
  let aideOuverte = $state(true);

  function aller(n: number) {
    etape = Math.min(4, Math.max(1, n));
    aideOuverte = true;
    erreur = '';
  }
  function choisirPreset(cle: ClePreset) {
    const p = PRESETS[cle];
    presetActif = cle;
    valeurs = { tour_taille_cm: p.tour_taille_cm, tour_hanches_cm: p.tour_hanches_cm, hauteur_fourche_cm: p.hauteur_fourche_cm, longueur_pantalon_cm: p.longueur_pantalon_cm };
    erreur = '';
  }

  let mesuresValidees = $state<Record<string, number> | null>(null);
  function voirPatron() {
    try {
      mesuresValidees = validerMesuresPatron('pantalon_large', (code) => valeurs[code]);
      aller(3);
    } catch (e) {
      erreur = e instanceof Error ? e.message : 'Vérifiez vos mesures, puis réessayez.';
    }
  }

  const rendu = $derived.by(() => {
    if (!mesuresValidees) return null;
    const { pieces, largeur, hauteur } = genererPiecesPlacees('pantalon_large', mesuresValidees);
    return { pieces: pieces.map(preparerPiece), largeur: Math.ceil(largeur), hauteur: Math.ceil(hauteur) };
  });
  const hrefPdf = $derived.by(() => {
    if (!mesuresValidees) return '/demo';
    const params = new URLSearchParams(Object.fromEntries(Object.entries(mesuresValidees).map(([k, v]) => [k, String(v)])));
    return `/demo/pdf?${params.toString()}`;
  });
  const resume = $derived(
    mesuresValidees ? champs.map((c) => `${c.libelle.replace(' (cm)', '')} : ${String(mesuresValidees![c.code]).replace('.', ',')} cm`) : []
  );
</script>

<svelte:head><title>Démo guidée — Studio Couture</title></svelte:head>

<main>
  <p><a href="/">← Retour à l’accueil</a></p>
  <h1>Démo guidée</h1>
  <p class="chapeau">Sans compte, sans photo : un modèle, quatre mesures, un patron brouillon. Rien n’est enregistré.</p>

  <section class="alerte" role="alert">
    <strong>Brouillon non validé.</strong>
    Ces formules sont marquées « à valider » : un maître tailleur ne les a pas encore confirmées. Essayez d’abord sur un tissu peu coûteux.
  </section>

  <div class="progression-wrap">
    <ol class="progression" aria-label="Progression de la démo">
      {#each ETAPES as nom, i}
        <li aria-current={etape === i + 1 ? 'step' : undefined} class:fait={etape > i + 1} class:actuel={etape === i + 1}>
          <span class="pastille">{i + 1}</span> {nom}
        </li>
      {/each}
    </ol>
    <button type="button" class="bouton bouton-discret" onclick={() => (aideOuverte = true)}>Aide</button>
  </div>
  <div class="barre" aria-hidden="true"><span style="width: {etape * 25}%"></span></div>

  {#if aideOuverte}
    <aside class="bulle" aria-label="Bulle de guidage">
      <Epingle />
      <p>{GUIDES[etape]}</p>
      <button type="button" onclick={() => (aideOuverte = false)}>Fermer l’aide</button>
    </aside>
  {/if}

  {#if etape > 1}
    <p><button type="button" onclick={() => aller(etape - 1)}>← Retour</button></p>
  {/if}

  {#if etape === 1}
    <section aria-labelledby="titre-etape-1">
      <h2 id="titre-etape-1">1. Choisir le modèle</h2>
      <div class="modeles">
        <article class="carte modele">
          <IllustrationModele modele="pantalon_large" />
          <h3>Pantalon large</h3>
          <p>Taille haute, jambes amples, 4 mesures au mètre ruban.</p>
          <button type="button" class="bouton-action" onclick={() => aller(2)}>Choisir le pantalon large</button>
        </article>
        <article class="carte modele bientot">
          <IllustrationModele modele="jupe_droite" />
          <h3>Jupe droite</h3>
          <p>Bientôt dans la démo.</p>
          <button type="button" disabled>Bientôt</button>
        </article>
      </div>
    </section>
  {:else if etape === 2}
    <section aria-labelledby="titre-etape-2">
      <h2 id="titre-etape-2">2. Mesures</h2>
      <p>Choisissez une silhouette pour préremplir, puis ajustez au mètre ruban, en centimètres.</p>
      <div class="presets" role="group" aria-label="Silhouettes prédéfinies">
        {#each Object.entries(PRESETS) as [cle, p]}
          <button type="button" class:actif={presetActif === cle} onclick={() => choisirPreset(cle as ClePreset)}>{p.libelle}</button>
        {/each}
      </div>
      {#if erreur}<p class="alerte" role="alert">{erreur}</p>{/if}
      <form class="grille" onsubmit={(e) => { e.preventDefault(); voirPatron(); }}>
        {#each champs as champ}
          <div class="champ">
            <IllustrationMesure code={champ.code} />
            <label>{champ.libelle}
              <input name={champ.code} inputmode="decimal" required placeholder="ex. 82,5" bind:value={valeurs[champ.code]} />
              <span class="aide">{champ.aide} {champ.exemple} Plage acceptée : {champ.minCm} à {champ.maxCm} cm.</span>
            </label>
          </div>
        {/each}
        <button type="submit" class="bouton-action">Voir mon patron</button>
      </form>
    </section>
  {:else if etape === 3 && rendu}
    <section aria-labelledby="titre-etape-3">
      <h2 id="titre-etape-3">3. Patron brouillon coté</h2>
      <p class="resume">{resume.join(' · ')}</p>
      <VisionneusePatron pieces={rendu.pieces} largeur={rendu.largeur} hauteur={rendu.hauteur} />
      <section class="carte" aria-label="Mesures du patron">
        <h3>Mesures du patron</h3>
        {#each rendu.pieces as piece}
          <h4>{piece.nom}</h4>
          <table>
            <tbody>
              {#each piece.tableau as ligne}<tr><th scope="row">{ligne.libelle}</th><td>{ligne.valeur} cm</td></tr>{/each}
            </tbody>
          </table>
        {/each}
      </section>
      <p><button type="button" class="bouton-action" onclick={() => aller(4)}>Voir le résultat et le PDF</button></p>
    </section>
  {:else if etape === 4}
    <section aria-labelledby="titre-etape-4">
      <h2 id="titre-etape-4">4. Résultat</h2>
      <p class="resume">{resume.join(' · ')}</p>
      <p><a class="bouton bouton-action" href={hrefPdf} download>Télécharger le PDF A4 1:1</a></p>
      <section class="carte">
        <h3>Avant de couper</h3>
        <p>Imprimez sans mise à l’échelle (« taille réelle »), assemblez les pages, puis vérifiez le <strong>carré de contrôle de 10 cm</strong> à la règle. S’il ne mesure pas 10 cm, réimprimez en taille réelle.</p>
      </section>
      <section class="carte">
        <h3>Et ensuite</h3>
        <ol>
          <li>Coupez une toile d’essayage dans un tissu bon marché.</li>
          <li>Faites valider les formules par votre maître tailleur avant un tissu précieux.</li>
          <li>Bientôt : aperçu 3D et devis de tissu.</li>
        </ol>
      </section>
      <p>
        <button type="button" onclick={() => aller(1)}>Recommencer la démo</button>
        <a class="bouton bouton-discret" href="/connexion">Espace atelier (connexion)</a>
      </p>
    </section>
  {/if}
</main>

<style>
  .chapeau { font-size: var(--titre-3); max-width: 42rem; }
  .progression-wrap { display: flex; flex-wrap: wrap; gap: 10px; align-items: start; justify-content: space-between; margin-top: 18px; }
  .progression { display: flex; flex-wrap: wrap; gap: 8px 18px; list-style: none; padding: 0; margin: 0; }
  .progression li { display: inline-flex; gap: 8px; align-items: center; font-weight: 600; }
  .progression .pastille { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 999px; border: 2px solid var(--vert); background: var(--papier); color: var(--vert); }
  .progression li.actuel .pastille { background: var(--terracotta); border-color: var(--terracotta); color: #fff; }
  .progression li.fait .pastille { background: var(--vert); color: #fff; }
  .barre { height: 8px; background: var(--laiton-doux); border-radius: 999px; overflow: hidden; margin: 12px 0 18px; }
  .barre span { display: block; height: 100%; background: var(--vert); transition: width 0.3s ease; }
  .bulle { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; border: 2px solid var(--laiton); background: #fffaf0; border-radius: var(--rayon); padding: 14px 16px; margin: 14px 0; box-shadow: var(--ombre-petite); color: var(--encre); }
  .bulle p { flex: 1 1 260px; margin: 0; }
  .bulle :global(.icone) { color: var(--terracotta); }
  .modeles { display: grid; gap: 16px; margin: 18px 0; }
  @media (min-width: 700px) { .modeles { grid-template-columns: 1fr 1fr; } }
  .modele { text-align: center; display: grid; gap: 8px; justify-items: center; margin: 0; }
  .modele p { margin: 0; }
  .bientot { opacity: 0.72; }
  .presets { display: flex; flex-wrap: wrap; gap: 10px; margin: 14px 0; }
  .presets button.actif { background: var(--terracotta); border-color: var(--terracotta); }
  .champ { display: flex; gap: 12px; align-items: flex-start; }
  .champ label { display: grid; gap: 6px; font-weight: 600; flex: 1; }
  .champ input { min-height: 48px; font: inherit; padding: 10px; border: 2px solid var(--vert); border-radius: 10px; width: 100%; background: #fff; }
  .aide { font-weight: 400; font-size: 15px; }
  .resume { overflow-wrap: anywhere; font-weight: 600; }
  table { border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #8a7d67; padding: 5px 10px; text-align: left; font-weight: 400; }
  th { font-weight: 600; }
</style>
