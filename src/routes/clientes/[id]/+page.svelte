<script lang="ts">
  import Avatar from '$lib/design/Avatar.svelte';
  import Bouton from '$lib/design/Bouton.svelte';
  import Carte from '$lib/design/Carte.svelte';
  import EtatVide from '$lib/design/EtatVide.svelte';
  import PatronCote from '$lib/design/PatronCote.svelte';
  import Puce from '$lib/design/Puce.svelte';
  let { data, form } = $props();

  // Garde client (le contrôle autoritaire reste validerPhoto côté serveur, 5 Mo) :
  // sans elle, un fichier de plus de 6 Mo heurterait BODY_SIZE_LIMIT d’adapter-node
  // et afficherait une page 413 brute au lieu de ce message.
  let erreurPhotoLocale = $state('');
  function verifierTaillePhoto(event: Event) {
    const saisie = event.currentTarget as HTMLInputElement;
    const fichier = saisie.files?.[0];
    // 5 Mo : même seuil que TAILLE_PHOTO_MAX_OCTETS (src/lib/server/crypto.ts).
    if (fichier && fichier.size > 5 * 1024 * 1024) {
      erreurPhotoLocale = 'Photo trop lourde : 5 Mo maximum.';
      saisie.value = '';
    } else {
      erreurPhotoLocale = '';
    }
  }

  const fmt = (v: number) => String(v).replace('.', ',');
  const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');
  const moisAnneeFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const nbMesures = $derived(data.mensurations.filter((m) => m.valeurCm !== null).length);
  const mesuresPantalonCompletes = $derived(
    ['tour_taille_cm', 'tour_hanches_cm', 'hauteur_fourche_cm', 'longueur_pantalon_cm'].every((code) =>
      data.mensurations.some((m) => m.code === code && m.valeurCm !== null)
    )
  );
  const base = $derived(`/clientes/${data.cliente.id}`);
  const onglets = $derived([
    { id: 'resume', libelle: 'Résumé', href: `${base}?onglet=resume` },
    { id: 'mesures', libelle: 'Mesures', href: `${base}?onglet=mesures` },
    { id: 'photos', libelle: 'Photos', href: `${base}?onglet=photos` },
    { id: 'patrons', libelle: 'Patrons', href: `${base}?onglet=patrons`, badge: data.patrons.length > 0 ? String(data.patrons.length) : undefined }
  ]);
  const GROUPES_MESURES = [
    { titre: 'Haut du corps', codes: ['tour_poitrine_cm', 'longueur_dos_cm', 'largeur_epaules_cm', 'longueur_manche_cm'] },
    { titre: 'Taille et bassin', codes: ['tour_taille_cm', 'tour_hanches_cm', 'hauteur_fourche_cm'] },
    { titre: 'Jambes', codes: ['longueur_pantalon_cm', 'longueur_jupe_cm', 'longueur_robe_cm'] }
  ];
  const mesuresParCode = $derived(new Map(data.mensurations.map((m) => [m.code, m])));
  const mesuresRenseignees = $derived(data.mensurations.filter((m) => m.valeurCm !== null));
  const prochaineAction = $derived.by(() => {
    if (mesuresRenseignees.length === 0) return { texte: `Prenez d’abord les mesures de ${data.prenom} pour pouvoir créer un patron.`, href: `${base}?onglet=mesures`, bouton: 'Prendre les mesures' };
    if (data.patrons.length === 0) return { texte: `Les mesures sont là : créez un premier patron pour ${data.prenom} dans la salle d’essayage.`, href: `${base}/patron/nouveau`, bouton: `Créer un patron pour ${data.prenom}` };
    return { texte: `Dernier patron : « ${data.patrons[0]!.nom} ». Ouvrez-le pour l’ajuster ou téléchargez son PDF.`, href: `${base}/patron/${data.patrons[0]!.id}`, bouton: 'Ouvrir le dernier patron' };
  });
  const messagesPatron: Record<string, string> = {
    enregistre: 'Patron enregistré sur la fiche.',
    modifie: 'Patron mis à jour.',
    duplique: 'Patron dupliqué.',
    renomme: 'Patron renommé.',
    supprime: 'Patron supprimé.'
  };
</script>

<main class="fiche">
  <p class="retour"><a href="/clientes">← Toutes les clientes</a></p>
  <div class="entete-fiche">
    <Avatar nom={data.cliente.nom} taille={84} />
    <div class="entete-infos">
      <h1>{data.cliente.nom}</h1>
      <p class="meta">{data.cliente.telephone ?? 'Téléphone non renseigné'} · cliente depuis {moisAnneeFr(data.cliente.creeeLe)}</p>
      <p class="chips-fiche">
        {#if data.consentement}<span class="chip-fiche chip-bleue">Consentement signé</span>{:else}<span class="chip-fiche">Consentement photo non signé</span>{/if}
        <span class="chip-fiche chip-bleue">{nbMesures} mesures sur {data.mensurations.length}</span>
        <span class="chip-fiche">{data.photos.length} photo{data.photos.length > 1 ? 's' : ''}</span>
      </p>
    </div>
    <div class="entete-actions">
      <a class="bouton-fiche-noir" href="{base}/patron/nouveau" aria-label="Créer un patron pour {data.prenom}">Créer un patron pour {data.prenom} <span aria-hidden="true">→</span></a>
      <a class="bouton-fiche-bord" href="{base}/modifier">Modifier la fiche</a>
    </div>
  </div>

  <nav class="onglets-fiche" aria-label="Sections de la fiche cliente">
    {#each onglets as onglet}
      <a href={onglet.href} class:actif={onglet.id === data.onglet} aria-current={onglet.id === data.onglet ? 'page' : undefined}>
        {onglet.libelle}{#if onglet.id === 'patrons' && data.patrons.length > 0} · {data.patrons.length}{/if}
      </a>
    {/each}
  </nav>

  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  {#if data.messagePatron && messagesPatron[data.messagePatron]}<p class="succes" role="status">{messagesPatron[data.messagePatron]}</p>{/if}
  {#if form?.consentementEnregistre}<p class="succes" role="status">Consentement photo enregistré.</p>{/if}
  {#if form?.consentementRevoque}<p class="succes" role="status">Consentement révoqué et photos supprimées.</p>{/if}
  {#if form?.photoAjoutee}<p class="succes" role="status">Photo chiffrée enregistrée. Elle sera supprimée automatiquement dans 7 jours.</p>{/if}
  {#if form?.photoSupprimee}<p class="succes" role="status">Photo supprimée.</p>{/if}
  {#if form?.mensurationsEnregistrees}<p class="succes" role="status">Mensurations enregistrées et validées par la couturière.</p>{/if}

  {#if data.onglet === 'resume'}
    <div class="grille-resume">
      <Carte titre="Prochaine action">
        <p>{prochaineAction.texte}</p>
        <p><Bouton variante="action" href={prochaineAction.href}>{prochaineAction.bouton}</Bouton></p>
      </Carte>
      <Carte titre="Mesures clés">
        {#if mesuresRenseignees.length === 0}
          <p>Aucune mesure enregistrée pour le moment.</p>
        {:else}
          <ul class="liste-mesures">
            {#each mesuresRenseignees as m}<li><span>{m.libelle}</span><strong>{fmt(m.valeurCm!)} cm</strong></li>{/each}
          </ul>
        {/if}
        <p><a href="{base}?onglet=mesures">Voir toutes les mesures</a></p>
      </Carte>
      <Carte titre="Derniers patrons">
        {#if data.patrons.length === 0}
          <p>Aucun patron enregistré pour {data.prenom} pour le moment.</p>
        {:else}
          <ul class="liste-patrons">
            {#each data.patrons.slice(0, 3) as patron}
              <li><a href="{base}/patron/{patron.id}">{patron.nom}</a> <Puce ton="accent">Brouillon</Puce><br /><small>{dateFr(patron.creeLe)} · {patron.titreModele}</small></li>
            {/each}
          </ul>
        {/if}
        <p><a href="{base}?onglet=patrons">Tous les patrons</a></p>
      </Carte>
    </div>

    {#if data.peutSupprimer}
      <details class="carte danger">
        <summary>Zone danger — supprimer la cliente</summary>
        <p>Cette action supprime définitivement la fiche, ses mesures, ses photos et ses patrons enregistrés. Elle est irréversible.</p>
        <form method="post" action="?/supprimer">
          <input type="hidden" name="_csrf" value={data.csrfToken} />
          <label class="coche"><input type="checkbox" name="confirme_suppression" required /> Je comprends : tout sera supprimé, sans retour possible.</label>
          <button type="submit" class="bouton-danger">Supprimer définitivement cette cliente</button>
        </form>
      </details>
    {/if}
  {:else if data.onglet === 'mesures'}
    <Carte titre="Mensurations (saisie manuelle, en cm)">
      <p>Mesurez au mètre ruban, puis saisissez en centimètres (ex. 82,5). Laissez vide ce qui n’est pas mesuré : la fiche indique ce qui manque.</p>
      <form method="post" action="?/mensurations" class="grille">
        <input type="hidden" name="_csrf" value={data.csrfToken} />
        {#each GROUPES_MESURES as groupe}
          <fieldset>
            <legend>{groupe.titre}</legend>
            {#each groupe.codes as code}
              {@const m = mesuresParCode.get(code)}
              {#if m}
                <label>{m.libelle} — entre {m.minCm} et {m.maxCm} cm
                  <input name={m.code} inputmode="decimal" value={m.valeurCm ?? ''} placeholder="Non mesuré" />
                  {#if m.valeurCm === null}<span class="manquante">Mesure manquante</span>{/if}
                </label>
              {/if}
            {/each}
          </fieldset>
        {/each}
        <button type="submit">Enregistrer les mensurations</button>
      </form>
    </Carte>
  {:else if data.onglet === 'photos'}
    <Carte titre="Consentement photo signé">
      {#if data.consentement}
        <p>
          Consentement donné le {dateFr(data.consentement.donneLe)}.
          Rendu indicatif autorisé : {data.consentement.usageRenduIa ? 'oui' : 'non'}.
          Entraînement IA : jamais.
        </p>
        <form method="post" action="?/revoquer">
          <input type="hidden" name="_csrf" value={data.csrfToken} />
          <button type="submit">Révoquer le consentement et supprimer les photos</button>
        </form>
      {:else}
        <p>Aucun consentement actif : aucune photo cliente ne peut être ajoutée.</p>
        <form method="post" action="?/consentement" class="grille">
          <input type="hidden" name="_csrf" value={data.csrfToken} />
          <label>
            <input type="checkbox" name="accord_photo" required style="min-height:auto;width:auto" />
            La cliente accepte explicitement que ses photos soient conservées chiffrées 7 jours pour son projet de couture, jamais pour l’entraînement d’une IA. (texte v1)
          </label>
          <label>
            <input type="checkbox" name="usage_rendu_ia" style="min-height:auto;width:auto" />
            La cliente accepte aussi le rendu indicatif à partir de ses photos.
          </label>
          <label>Nom signé de la cliente
            <input name="signature_nom" required minlength="2" autocomplete="name" placeholder="Nom tapé par la cliente en signature" />
          </label>
          <button type="submit">Enregistrer le consentement signé</button>
        </form>
      {/if}
    </Carte>

    <Carte titre="Photos (option)">
      <p>Les photos sont facultatives : un patron peut être créé sans elles, depuis « Créer un patron ». Le consentement ci-dessus n’est demandé qu’au moment d’envoyer une photo.</p>
      {#if data.photos.length === 0}
        <EtatVide titre="Aucune photo" texte="Aucune photo pour cette cliente. Elles sont facultatives et supprimées automatiquement après 7 jours." />
      {:else}
        <ul>
          {#each data.photos as photo}
            <li>
              <a href="/clientes/{data.cliente.id}/photos/{photo.id}">
                Photo {photo.type === 'modele' ? 'du modèle' : photo.type === 'tissu' ? 'du tissu' : 'de la cliente'}
              </a>
              — ajoutée le {dateFr(photo.creeeLe)},
              suppression automatique le {dateFr(photo.expireLe)}
              <form method="post" action="?/supprimerPhoto">
                <input type="hidden" name="_csrf" value={data.csrfToken} />
                <input type="hidden" name="photo_id" value={photo.id} />
                <button type="submit">Supprimer cette photo</button>
              </form>
            </li>
          {/each}
        </ul>
      {/if}
      {#if data.consentement}
        {#if erreurPhotoLocale}<p class="alerte" role="alert">{erreurPhotoLocale}</p>{/if}
        <form method="post" action="?/televerserPhoto" enctype="multipart/form-data" class="grille">
          <input type="hidden" name="_csrf" value={data.csrfToken} />
          <label>Type de photo
            <select name="type_photo">
              <option value="cliente_complete">Photo complète de la cliente</option>
              <option value="modele">Photo du modèle choisi</option>
              <option value="tissu">Photo du tissu</option>
            </select>
          </label>
          <label>Photo (JPEG, PNG ou WebP, 5 Mo maximum)
            <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onchange={verifierTaillePhoto} />
          </label>
          <button type="submit">Envoyer la photo chiffrée</button>
        </form>
      {:else}
        <p>Enregistrez d’abord le consentement signé ci-dessus pour pouvoir ajouter une photo.</p>
      {/if}
    </Carte>
  {:else if data.onglet === 'patrons'}
    {#if data.patrons.length === 0}
      <EtatVide titre="Aucun patron enregistré" texte="Créez un premier patron pour {data.prenom} : mesures préremplies, tissu, 3D et PDF, puis enregistrez-le ici.">
        <Bouton variante="action" href="{base}/patron/nouveau">Créer un patron pour {data.prenom}</Bouton>
      </EtatVide>
    {:else}
      <ul class="grille-patrons">
        {#each data.patrons as patron, i}
          <li class="carte-patron">
            <div class="patron-visuel">
              {#if patron.vignette}
                <PatronCote generique={patron.vignette} variante="mini" remplissage={['#dce5fa', '#ffdfb8', '#e3dbff'][i % 3]} uid="fiche-{patron.id}" classe="miniature" />
              {:else if patron.miniature}
                <svg class="miniature" viewBox="0 0 {patron.miniature.largeur} {patron.miniature.hauteur}" role="img" aria-label="Miniature du patron {patron.nom}">
                  {#each patron.miniature.pieces as piece}
                    <polygon points={piece.couture} fill={patron.tissuHex} fill-opacity="0.75" stroke="var(--encre)" stroke-width="0.4" />
                  {/each}
                </svg>
              {/if}
            </div>
            <div class="patron-corps">
              <p class="patron-nom"><strong>{patron.titreModele} — {patron.nom}</strong></p>
              <p class="meta">{patron.mesuresResume || patron.mesuresTexte}</p>
              <p class="meta">{dateFr(patron.creeLe)}</p>
              <p><span class="chip-brouillon">Brouillon à valider</span></p>
              <p class="actions-patron">
                <a class="bouton-patron-noir" href="{base}/patron/{patron.id}" aria-label="Ouvrir dans la salle d’essayage">Ouvrir</a>
                <a class="bouton-patron-bord" href={patron.hrefPdf} download aria-label="Télécharger le PDF A4 1:1">PDF A4</a>
              </p>
              <form method="post" action="?/dupliquerPatron" class="ligne-form">
                <input type="hidden" name="_csrf" value={data.csrfToken} />
                <input type="hidden" name="patron_id" value={patron.id} />
                <button type="submit" class="discret">Dupliquer</button>
              </form>
              <form method="post" action="?/renommerPatron" class="ligne-form renommer">
                <input type="hidden" name="_csrf" value={data.csrfToken} />
                <input type="hidden" name="patron_id" value={patron.id} />
                <label class="sr-only" for="renommer-{patron.id}">Nouveau nom du patron</label>
                <input id="renommer-{patron.id}" name="nouveau_nom" value={patron.nom} required minlength="2" maxlength="80" />
                <button type="submit" class="discret">Renommer</button>
              </form>
              <form method="post" action="?/supprimerPatron" class="ligne-form supprimer-patron">
                <input type="hidden" name="_csrf" value={data.csrfToken} />
                <input type="hidden" name="patron_id" value={patron.id} />
                <label class="coche"><input type="checkbox" name="confirme_suppression_patron" required /> Confirmer</label>
                <button type="submit" class="discret danger-texte">Supprimer le patron</button>
              </form>
            </div>
          </li>
        {/each}
        <li class="carte-nouveau-patron">
          <a href="{base}/patron/nouveau" aria-label="Créer un patron pour {data.prenom}">
            <span class="plus-rond" aria-hidden="true">+</span>
            <strong>Nouveau patron pour {data.prenom}</strong>
            <span>{mesuresPantalonCompletes ? 'Ses mesures sont déjà enregistrées, rien à ressaisir.' : 'Vous pourrez compléter ses mesures pendant la création.'}</span>
          </a>
        </li>
      </ul>
    {/if}
  {/if}
</main>

<style>
  .retour a { color: var(--encre); font-weight: 700; text-decoration: none; }
  .entete-fiche { display: flex; flex-wrap: wrap; gap: 22px; align-items: center; margin: 14px 0 22px; background: var(--carte); border: 1px solid var(--bord); border-radius: 32px; padding: clamp(20px, 3.5vw, 34px); }
  .entete-fiche :global(.avatar) { background: var(--peche); color: #7c2d12; }
  .entete-infos { flex: 1; min-width: 220px; }
  .entete-infos h1 { margin: 0; font-size: clamp(2rem, 4vw, 2.7rem); }
  .chips-fiche { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 0; }
  .chip-fiche { background: var(--fond); border-radius: 999px; padding: 5px 12px; font-size: 12.5px; font-weight: 700; }
  .chip-bleue { background: var(--bleu-pastille); color: var(--bleu-texte); }
  .entete-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-left: auto; }
  .bouton-fiche-noir { display: inline-flex; align-items: center; gap: 10px; min-height: 56px; padding: 12px 26px; border-radius: 999px; background: var(--encre); color: #fff; text-decoration: none; font-weight: 800; }
  .bouton-fiche-bord { display: inline-flex; align-items: center; min-height: 56px; padding: 12px 24px; border-radius: 999px; border: 1.5px solid var(--encre); color: var(--encre); background: #fff; text-decoration: none; font-weight: 700; }
  .onglets-fiche { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 22px; }
  .onglets-fiche a { display: inline-flex; align-items: center; min-height: 48px; padding: 10px 22px; border-radius: 999px; background: #e4e4ea; color: var(--encre); text-decoration: none; font-weight: 700; }
  .onglets-fiche a.actif { background: var(--encre); color: #fff; }
  .meta { color: var(--encre-douce); margin: 4px 0; }
  .succes { border-left: 6px solid var(--vert-cote); background: #e7f0ec; padding: 12px 16px; border-radius: 0 var(--rayon) var(--rayon) 0; font-weight: 600; }
  .grille-resume { display: grid; gap: 16px; margin-top: 18px; }
  @media (min-width: 900px) { .grille-resume { grid-template-columns: repeat(3, 1fr); align-items: start; } }
  .liste-mesures, .liste-patrons { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
  .liste-mesures li { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--bord); padding-bottom: 6px; }
  fieldset { border: 1px solid var(--bord); border-radius: var(--rayon); padding: 14px; display: grid; gap: 12px; margin: 0; }
  legend { font-weight: 700; padding: 0 8px; }
  .manquante { color: var(--terracotta-fonce); font-weight: 600; font-size: 0.9rem; }
  .danger { border-color: var(--terracotta); margin-top: 18px; }
  .danger summary { min-height: 48px; display: flex; align-items: center; font-weight: 700; color: var(--terracotta-fonce); cursor: pointer; }
  .coche { display: flex; gap: 10px; align-items: flex-start; font-weight: 600; margin: 10px 0; }
  .coche input { min-height: auto; width: auto; margin-top: 4px; }
  .bouton-danger { background: var(--terracotta); border-color: var(--terracotta); color: #fff; }
  .grille-patrons { list-style: none; padding: 0; margin: 18px 0 0; display: grid; gap: 20px; }
  @media (min-width: 760px) { .grille-patrons { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); } }
  .carte-patron { display: flex; flex-direction: column; gap: 14px; min-width: 0; background: var(--carte); border: 1px solid var(--bord); border-radius: 28px; box-shadow: var(--ombre-petite); padding: 16px; }
  .patron-visuel { background: #ececf1; border-radius: 20px; padding: 14px; display: flex; align-items: center; justify-content: center; min-height: 230px; }
  .patron-visuel :global(.miniature), .miniature { width: min(190px, 80%); height: auto; max-height: 260px; }
  .patron-corps { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .patron-corps > p { margin: 0 0 8px; }
  .chip-brouillon { background: var(--peche-pastille); color: var(--peche-texte); border-radius: 999px; padding: 5px 12px; font-size: 12.5px; font-weight: 800; display: inline-flex; }
  .bouton-patron-noir { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 10px 22px; border-radius: 14px; background: var(--encre); color: #fff; text-decoration: none; font-weight: 800; flex: 1; }
  .bouton-patron-bord { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 10px 22px; border-radius: 14px; border: 1.5px solid var(--encre); color: var(--encre); background: #fff; text-decoration: none; font-weight: 700; flex: 1; }
  .carte-nouveau-patron { border: 2px dashed #b9b9c6; border-radius: 28px; min-height: 320px; display: flex; }
  .carte-nouveau-patron a { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; padding: 24px; color: var(--encre); text-decoration: none; }
  .carte-nouveau-patron span { color: var(--texte-secondaire); line-height: 1.5; }
  .plus-rond { width: 56px; height: 56px; border-radius: 999px; background: var(--bleu-pastille); color: var(--encre) !important; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 400; }
  .patron-nom { margin: 0 0 4px; overflow-wrap: anywhere; }
  .actions-patron { display: flex; flex-wrap: wrap; gap: 8px; }
  .ligne-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 8px; }
  .ligne-form input[name='nouveau_nom'] { flex: 1; min-height: 48px; font: inherit; padding: 8px 12px; border: 1.5px solid var(--bord-fort); border-radius: 10px; min-width: 140px; }
  button.discret { background: var(--carte); color: var(--encre); border-color: var(--bord-fort); }
  .danger-texte { color: var(--terracotta-fonce); border-color: var(--terracotta); }
  .supprimer-patron .coche { margin: 0; }
</style>
