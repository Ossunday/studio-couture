# Patron du pantalon — choix de la base (2026-10-28)

## Base libre examinée : FreeSewing Titan

- Paquet : `@freesewing/titan` version **4.10.2** (npm), « A FreeSewing pattern for a unisex trouser block », auteurs Joost De Cock et Debra Bean.
- **Licence : MIT** (vérifiée via `npm view @freesewing/titan license` et le badge du README du paquet téléchargé). `@freesewing/core` est aussi MIT (4.10.2). L'usage aurait donc été licite, y compris commercial.
- Documentation lue : README et sources du paquet (`package/src/front.mjs`, `back.mjs`, `about.json` : difficulté 3, étiqueté `block: true`).

### Mesures qu'elle exige (relevées dans les sources, `measurements.*`)

`crossSeamBack`, `crossSeamFront`, `knee` (tour de genou), `seatBackArc`, `seatFrontArc`, `seatFront`, `waistBackArc`, `waistFrontArc`, `waistToFloor`, `waistToHips`, `waistToKnee`, `waistToSeat`, `waistToUpperLeg` — **13 mensurations**, dont des arcs devant/dos et des hauteurs taille→genou/sol qui supposent un protocole de mesure d'atelier, plus des options d'aisance (`waistEase`, `seatEase`, `kneeEase`…).

### Décision : non retenue pour ce parcours

1. **Incompatible avec l'objectif produit** (patron en moins de 2 minutes, 3–4 mesures au mètre ruban par une couturière mobile) : 13 mesures expertes contre 4 visées.
2. **C'est un bloc, pas un modèle fini** : devant + dos seulement, ni ceinture finie ni style « pantalon large » ; il aurait fallu construire le modèle par-dessus, donc réintroduire des formules maison non sourcées.
3. **Poids d'intégration** : `@freesewing/core` + plugins pour générer SVG/PDF, à l'encontre du budget de poids (`docs/BUDGET.md`) et du SSR léger actuel ; le générateur PDF A4 maison couvre le besoin sans dépendance.

À re-évaluer si un jour un écran « mesures complètes d'atelier » existe : Titan (MIT) redeviendrait candidate pour remplacer le brouillon.

## Base retenue pour l'instant : brouillon « a_valider »

Construction géométrique simple et explicite dans `src/lib/patterns/pantalon-large/geometry.ts` (constantes `BROUILLON_PANTALON_LARGE`), registre `src/lib/patterns/pantalon-large/formulas.ts` — **toutes les formules `statut: 'a_valider'`, `source: null`** (règle n°3). L'aperçu et le PDF affichent « Brouillon non validé », les formules sont visibles sur l'écran patron, et le moteur de production (`tenterGenerationPatron`) reste bloqué comme avant.

### Mesures exigées par notre brouillon (et pourquoi)

| Mesure | Pourquoi |
|---|---|
| Tour de taille | largeur de ceinture et haut des jambes |
| Tour de hanches | largeur des jambes (le plus fort) |
| **Hauteur de fourche** | **indispensable** : sans elle, impossible de placer le point de fourche ni de déduire l'entrejambe (longueur − fourche). Mesure assise taille→chaise, expliquée par l'illustration de l'écran mesures. |
| Longueur de pantalon | longueur totale des jambes |

Sorties : devant, dos, ceinture — fil droit, crans, marges 1 cm / ourlet 2 cm, aperçu SVG immédiat, PDF A4 à l'échelle 1:1 avec carré de contrôle de 10 cm (`src/lib/patterns/pdf.ts`).

## Questions ouvertes pour le tailleur

Voir `docs/FORMULES_A_VALIDER.md` — aucune valeur ne passera en production sans ses réponses.
