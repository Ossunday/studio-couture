<script lang="ts">
  import Avatar from '$lib/design/Avatar.svelte';
  import Bouton from '$lib/design/Bouton.svelte';
  import Carte from '$lib/design/Carte.svelte';
  import EtatVide from '$lib/design/EtatVide.svelte';
  import PatronCote from '$lib/design/PatronCote.svelte';
  import Puce from '$lib/design/Puce.svelte';
  import { formatCm, formatDateComplete, t, type TranslationKey } from '$lib/i18n';
  let { data, form } = $props();

  /** Clé pas encore dans fr.ts/en.ts : proposée dans le rapport du lot (clé=FR=EN). */
  const txt = (k: string, params?: Record<string, string | number>) => t(data.lang, k as TranslationKey, params);

  // Garde client (le contrôle autoritaire reste validerPhoto côté serveur, 5 Mo) :
  // sans elle, un fichier de plus de 6 Mo heurterait BODY_SIZE_LIMIT d’adapter-node
  // et afficherait une page 413 brute au lieu de ce message.
  let erreurPhotoLocale = $state('');
  function verifierTaillePhoto(event: Event) {
    const saisie = event.currentTarget as HTMLInputElement;
    const fichier = saisie.files?.[0];
    // 5 Mo : même seuil que TAILLE_PHOTO_MAX_OCTETS (src/lib/server/crypto.ts).
    if (fichier && fichier.size > 5 * 1024 * 1024) {
      erreurPhotoLocale = t(data.lang, 'validation.photoTropLourde');
      saisie.value = '';
    } else {
      erreurPhotoLocale = '';
    }
  }

  const nbMesures = $derived(data.mensurations.filter((m) => m.valeurCm !== null).length);
  const mesuresPantalonCompletes = $derived(
    ['tour_taille_cm', 'tour_hanches_cm', 'hauteur_fourche_cm', 'longueur_pantalon_cm'].every((code) =>
      data.mensurations.some((m) => m.code === code && m.valeurCm !== null)
    )
  );
  const base = $derived(`/clientes/${data.cliente.id}`);
  const onglets = $derived([
    { id: 'resume', libelle: t(data.lang, 'fiche.onglet.resume'), href: `${base}?onglet=resume` },
    { id: 'mesures', libelle: t(data.lang, 'fiche.onglet.mesures'), href: `${base}?onglet=mesures` },
    { id: 'photos', libelle: t(data.lang, 'fiche.onglet.photos'), href: `${base}?onglet=photos` },
    { id: 'patrons', libelle: t(data.lang, 'fiche.onglet.patrons'), href: `${base}?onglet=patrons`, badge: data.patrons.length > 0 ? String(data.patrons.length) : undefined }
  ]);
  const GROUPES_MESURES: { titreCle: TranslationKey; codes: string[] }[] = [
    { titreCle: 'fiche.groupes.haut', codes: ['tour_poitrine_cm', 'longueur_dos_cm', 'largeur_epaules_cm', 'longueur_manche_cm'] },
    { titreCle: 'fiche.groupes.tailleBassin', codes: ['tour_taille_cm', 'tour_hanches_cm', 'hauteur_fourche_cm'] },
    { titreCle: 'fiche.groupes.jambes', codes: ['longueur_pantalon_cm', 'longueur_jupe_cm', 'longueur_robe_cm'] }
  ];
  const mesuresParCode = $derived(new Map(data.mensurations.map((m) => [m.code, m])));
  const mesuresRenseignees = $derived(data.mensurations.filter((m) => m.valeurCm !== null));
  const prochaineAction = $derived.by(() => {
    if (mesuresRenseignees.length === 0) return { texte: txt('fiche.actionPrendreMesuresTexte', { prenom: data.prenom }), href: `${base}?onglet=mesures`, bouton: txt('fiche.actionPrendreMesuresBouton') };
    if (data.patrons.length === 0) return { texte: txt('fiche.actionCreerPremierTexte', { prenom: data.prenom }), href: `${base}/patron/nouveau`, bouton: t(data.lang, 'fiche.creerPatronPour', { prenom: data.prenom }) };
    return { texte: txt('fiche.actionDernierTexte', { nom: data.patrons[0]!.nom }), href: `${base}/patron/${data.patrons[0]!.id}`, bouton: txt('fiche.ouvrirDernierPatron') };
  });
  const messagesPatron: Record<string, string> = $derived({
    enregistre: txt('fiche.patronEnregistre'),
    modifie: txt('fiche.patronModifie'),
    duplique: txt('fiche.patronDuplique'),
    renomme: txt('fiche.patronRenomme'),
    supprime: txt('fiche.patronSupprime')
  });
</script>

<svelte:head><title>{t(data.lang, 'cliente.titrePage')} — {data.cliente.nom}</title></svelte:head>

<main class="fiche">
  <p class="retour"><a href="/clientes">← {t(data.lang, 'cliente.retourListe')}</a></p>
  <div class="entete-fiche">
    <Avatar nom={data.cliente.nom} taille={84} />
    <div class="entete-infos">
      <h1>{data.cliente.nom}</h1>
      <p class="meta">{data.cliente.telephone ?? t(data.lang, 'tableau.telephoneNonRenseigne')} · {txt('fiche.clienteDepuis', { date: formatDateComplete(data.lang, data.cliente.creeeLe) })}</p>
      <p class="chips-fiche">
        {#if data.consentement}<span class="chip-fiche chip-bleue">{txt('fiche.consentementSigne')}</span>{:else}<span class="chip-fiche">{txt('fiche.consentementNonSigne')}</span>{/if}
        <span class="chip-fiche chip-bleue">{t(data.lang, 'fiche.mesuresSur10', { fait: nbMesures, total: data.mensurations.length })}</span>
        <span class="chip-fiche">{data.photos.length} {txt('fiche.photo')}{data.photos.length > 1 ? 's' : ''}</span>
      </p>
    </div>
    <div class="entete-actions">
      <a class="bouton-fiche-noir" href="{base}/patron/nouveau" aria-label={t(data.lang, 'fiche.creerPatronPour', { prenom: data.prenom })}>{t(data.lang, 'fiche.creerPatronPour', { prenom: data.prenom })} <span aria-hidden="true">→</span></a>
      <a class="bouton-fiche-bord" href="{base}/modifier">{txt('fiche.modifierFiche')}</a>
    </div>
  </div>

  <nav class="onglets-fiche" aria-label={txt('fiche.sectionsAria')}>
    {#each onglets as onglet}
      <a href={onglet.href} class:actif={onglet.id === data.onglet} aria-current={onglet.id === data.onglet ? 'page' : undefined}>
        {onglet.libelle}{#if onglet.id === 'patrons' && data.patrons.length > 0} · {data.patrons.length}{/if}
      </a>
    {/each}
  </nav>

  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  {#if data.messagePatron && messagesPatron[data.messagePatron]}<p class="succes" role="status">{messagesPatron[data.messagePatron]}</p>{/if}
  {#if form?.consentementEnregistre}<p class="succes" role="status">{txt('fiche.consentementEnregistreMsg')}</p>{/if}
  {#if form?.consentementRevoque}<p class="succes" role="status">{txt('fiche.consentementRevoqueMsg')}</p>{/if}
  {#if form?.photoAjoutee}<p class="succes" role="status">{txt('fiche.photoAjouteeMsg')}</p>{/if}
  {#if form?.photoSupprimee}<p class="succes" role="status">{txt('fiche.photoSupprimeeMsg')}</p>{/if}
  {#if form?.mensurationsEnregistrees}<p class="succes" role="status">{txt('fiche.mensurationsEnregistreesMsg')}</p>{/if}

  {#if data.onglet === 'resume'}
    <div class="grille-resume">
      <Carte titre={t(data.lang, 'fiche.prochaineAction')}>
        <p>{prochaineAction.texte}</p>
        <p><Bouton variante="action" href={prochaineAction.href}>{prochaineAction.bouton}</Bouton></p>
      </Carte>
      <Carte titre={t(data.lang, 'fiche.mesuresCles')}>
        {#if mesuresRenseignees.length === 0}
          <p>{txt('fiche.aucuneMesure')}</p>
        {:else}
          <ul class="liste-mesures">
            {#each mesuresRenseignees as m}<li><span>{t(data.lang, m.libelleCle)}</span><strong>{formatCm(data.lang, m.valeurCm!)} {t(data.lang, 'commun.cm')}</strong></li>{/each}
          </ul>
        {/if}
        <p><a href="{base}?onglet=mesures">{txt('fiche.voirToutesMesures')}</a></p>
      </Carte>
      <Carte titre={t(data.lang, 'fiche.derniersPatrons')}>
        {#if data.patrons.length === 0}
          <p>{t(data.lang, 'fiche.aucunPatron')}</p>
        {:else}
          <ul class="liste-patrons">
            {#each data.patrons.slice(0, 3) as patron}
              <li><a href="{base}/patron/{patron.id}">{patron.nom}</a> <Puce ton="accent">{t(data.lang, 'fiche.brouillon')}</Puce><br /><small>{formatDateComplete(data.lang, patron.creeLe)} · {patron.titreModele}</small></li>
            {/each}
          </ul>
        {/if}
        <p><a href="{base}?onglet=patrons">{txt('fiche.tousPatrons')}</a></p>
      </Carte>
    </div>

    {#if data.peutSupprimer}
      <details class="carte danger">
        <summary>{t(data.lang, 'fiche.zoneDanger')} — {t(data.lang, 'fiche.supprimerCliente').toLowerCase()}</summary>
        <p>{txt('fiche.suppressionTexte')}</p>
        <form method="post" action="?/supprimer">
          <input type="hidden" name="_csrf" value={data.csrfToken} />
          <label class="coche"><input type="checkbox" name="confirme_suppression" required /> {t(data.lang, 'fiche.confirmerSuppression')}</label>
          <button type="submit" class="bouton-danger">{txt('fiche.supprimerDefinitivement')}</button>
        </form>
      </details>
    {/if}
  {:else if data.onglet === 'mesures'}
    <Carte titre={txt('fiche.mensurationsTitre')}>
      <p>{txt('fiche.mensurationsIntro', { exemple: formatCm(data.lang, 82.5) })}</p>
      <form method="post" action="?/mensurations" class="grille">
        <input type="hidden" name="_csrf" value={data.csrfToken} />
        {#each GROUPES_MESURES as groupe}
          <fieldset>
            <legend>{t(data.lang, groupe.titreCle)}</legend>
            {#each groupe.codes as code}
              {@const m = mesuresParCode.get(code)}
              {#if m}
                <label>{t(data.lang, m.libelleCle)} — {t(data.lang, 'patron.mesures.aidePlage', { min: m.minCm, max: m.maxCm })}
                  <input name={m.code} inputmode="decimal" value={m.valeurCm ?? ''} placeholder={txt('fiche.nonMesure')} />
                  {#if m.valeurCm === null}<span class="manquante">{t(data.lang, 'fiche.manquante')}</span>{/if}
                </label>
              {/if}
            {/each}
          </fieldset>
        {/each}
        <button type="submit">{t(data.lang, 'fiche.enregistrerMesures')}</button>
      </form>
    </Carte>
  {:else if data.onglet === 'photos'}
    <Carte titre={txt('fiche.consentementSigneTitre')}>
      {#if data.consentement}
        <p>
          {txt('fiche.consentementDonneLe', { date: formatDateComplete(data.lang, data.consentement.donneLe) })}
          {txt('fiche.renduAutorise', { reponse: data.consentement.usageRenduIa ? txt('commun.oui') : txt('commun.non') })}
          {txt('fiche.entrainementJamais')}
        </p>
        <form method="post" action="?/revoquer">
          <input type="hidden" name="_csrf" value={data.csrfToken} />
          <button type="submit">{txt('fiche.revoquerConsentement')}</button>
        </form>
      {:else}
        <p>{txt('fiche.aucunConsentement')}</p>
        <form method="post" action="?/consentement" class="grille">
          <input type="hidden" name="_csrf" value={data.csrfToken} />
          <label>
            <input type="checkbox" name="accord_photo" required style="min-height:auto;width:auto" />
            {txt('fiche.consentementAccordTexte')}
          </label>
          <label>
            <input type="checkbox" name="usage_rendu_ia" style="min-height:auto;width:auto" />
            {txt('fiche.consentementRenduTexte')}
          </label>
          <label>{txt('fiche.signatureNom')}
            <input name="signature_nom" required minlength="2" autocomplete="name" placeholder={txt('fiche.signaturePlaceholder')} />
          </label>
          <button type="submit">{txt('fiche.enregistrerConsentement')}</button>
        </form>
      {/if}
    </Carte>

    <Carte titre={txt('fiche.photosTitre')}>
      <p>{txt('fiche.photosIntro')}</p>
      {#if data.photos.length === 0}
        <EtatVide titre={txt('fiche.aucunePhotoTitre')} texte={txt('fiche.aucunePhotoTexte')} />
      {:else}
        <ul>
          {#each data.photos as photo}
            <li>
              <a href="/clientes/{data.cliente.id}/photos/{photo.id}">
                {photo.type === 'modele' ? txt('fiche.photoDuModele') : photo.type === 'tissu' ? txt('fiche.photoDuTissu') : txt('fiche.photoDeLaCliente')}
              </a>
              — {txt('fiche.photoAjouteeLe', { date: formatDateComplete(data.lang, photo.creeeLe) })},
              {txt('fiche.photoSuppressionLe', { date: formatDateComplete(data.lang, photo.expireLe) })}
              <form method="post" action="?/supprimerPhoto">
                <input type="hidden" name="_csrf" value={data.csrfToken} />
                <input type="hidden" name="photo_id" value={photo.id} />
                <button type="submit">{txt('fiche.supprimerPhoto')}</button>
              </form>
            </li>
          {/each}
        </ul>
      {/if}
      {#if data.consentement}
        {#if erreurPhotoLocale}<p class="alerte" role="alert">{erreurPhotoLocale}</p>{/if}
        <form method="post" action="?/televerserPhoto" enctype="multipart/form-data" class="grille">
          <input type="hidden" name="_csrf" value={data.csrfToken} />
          <label>{txt('fiche.typePhoto')}
            <select name="type_photo">
              <option value="cliente_complete">{txt('fiche.photoCompleteCliente')}</option>
              <option value="modele">{txt('fiche.photoModeleChoisi')}</option>
              <option value="tissu">{txt('fiche.photoTissu')}</option>
            </select>
          </label>
          <label>{txt('fiche.photoChamp')}
            <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onchange={verifierTaillePhoto} />
          </label>
          <button type="submit">{txt('fiche.envoyerPhoto')}</button>
        </form>
      {:else}
        <p>{txt('fiche.consentementAvantPhoto')}</p>
      {/if}
    </Carte>
  {:else if data.onglet === 'patrons'}
    {#if data.patrons.length === 0}
      <EtatVide titre={txt('fiche.aucunPatronTitre')} texte={txt('fiche.aucunPatronTexte', { prenom: data.prenom })}>
        <Bouton variante="action" href="{base}/patron/nouveau">{t(data.lang, 'fiche.creerPatronPour', { prenom: data.prenom })}</Bouton>
      </EtatVide>
    {:else}
      <ul class="grille-patrons">
        {#each data.patrons as patron, i}
          <li class="carte-patron">
            <div class="patron-visuel">
              {#if patron.vignette}
                <PatronCote generique={patron.vignette} variante="mini" remplissage={['#dce5fa', '#ffdfb8', '#e3dbff'][i % 3]} uid="fiche-{patron.id}" classe="miniature" />
              {:else if patron.miniature}
                <svg class="miniature" viewBox="0 0 {patron.miniature.largeur} {patron.miniature.hauteur}" role="img" aria-label={txt('fiche.miniatureAria', { nom: patron.nom })}>
                  {#each patron.miniature.pieces as piece}
                    <polygon points={piece.couture} fill={patron.tissuHex} fill-opacity="0.75" stroke="var(--encre)" stroke-width="0.4" />
                  {/each}
                </svg>
              {/if}
            </div>
            <div class="patron-corps">
              <p class="patron-nom"><strong>{patron.titreModele} — {patron.nom}</strong></p>
              <p class="meta">{patron.mesuresResume || patron.mesuresTexte}</p>
              <p class="meta">{formatDateComplete(data.lang, patron.creeLe)}</p>
              <p><span class="chip-brouillon">{t(data.lang, 'commun.brouillonAValider')}</span></p>
              <p class="actions-patron">
                <a class="bouton-patron-noir" href="{base}/patron/{patron.id}" aria-label={t(data.lang, 'fiche.ouvrirSalle')}>{txt('fiche.ouvrir')}</a>
                <a class="bouton-patron-bord" href={patron.hrefPdf} download aria-label={t(data.lang, 'commun.telechargerPdf')}>{txt('fiche.pdfA4')}</a>
              </p>
              <form method="post" action="?/dupliquerPatron" class="ligne-form">
                <input type="hidden" name="_csrf" value={data.csrfToken} />
                <input type="hidden" name="patron_id" value={patron.id} />
                <button type="submit" class="discret">{t(data.lang, 'fiche.dupliquer')}</button>
              </form>
              <form method="post" action="?/renommerPatron" class="ligne-form renommer">
                <input type="hidden" name="_csrf" value={data.csrfToken} />
                <input type="hidden" name="patron_id" value={patron.id} />
                <label class="sr-only" for="renommer-{patron.id}">{txt('fiche.nouveauNomPatron')}</label>
                <input id="renommer-{patron.id}" name="nouveau_nom" value={patron.nom} required minlength="2" maxlength="80" />
                <button type="submit" class="discret">{t(data.lang, 'fiche.renommer')}</button>
              </form>
              <form method="post" action="?/supprimerPatron" class="ligne-form supprimer-patron">
                <input type="hidden" name="_csrf" value={data.csrfToken} />
                <input type="hidden" name="patron_id" value={patron.id} />
                <label class="coche"><input type="checkbox" name="confirme_suppression_patron" required /> {txt('commun.confirmer')}</label>
                <button type="submit" class="discret danger-texte">{txt('fiche.supprimerPatron')}</button>
              </form>
            </div>
          </li>
        {/each}
        <li class="carte-nouveau-patron">
          <a href="{base}/patron/nouveau" aria-label={t(data.lang, 'fiche.creerPatronPour', { prenom: data.prenom })}>
            <span class="plus-rond" aria-hidden="true">+</span>
            <strong>{txt('fiche.nouveauPatronPour', { prenom: data.prenom })}</strong>
            <span>{mesuresPantalonCompletes ? txt('fiche.nouveauPatronMesuresOk') : txt('fiche.nouveauPatronMesuresACompleter')}</span>
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
