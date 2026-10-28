# Phase 0 — Fondations (2026-10-28)

## Fait

- SvelteKit SSR + TypeScript strict (`strict`, `noUncheckedIndexedAccess`), adapter-node (hébergement Europe), CSP + `no-store` sur les routes photos.
- Domaine typé : atelier, utilisatrice (`admin`/`couturière`), cliente, consentement, mensuration, photo chiffrée, projet.
- PostgreSQL : `migrations/0001_init.sql` — dont verrou SQL `usage_entrainement_ia = false` et `CHECK` marge d'erreur obligatoire pour les estimations photo.
- Registre patron : `jupe-droite/formulas.ts` tout en `a_valider`, `source: null`, `aisanceCm: {}` ; `pantalon-classique` en placeholder. Moteur `engine.ts` qui **refuse** de générer dans cet état.
- IA derrière interfaces (`src/lib/ai/types.ts`) ; V1 manuelle : try-on « en attente », étiquette « rendu indicatif », aucune mensuration inventée.
- Vie privée : rétention 7 jours configurable (`retention.ts`), chiffrement AES-256-GCM testé (`crypto.ts`), service worker qui ne cache jamais photos/API.
- i18n : `fr` seul publié ; garde-fou documenté pour toute langue locale.
- PWA : manifeste, page d'accueil SSR avec parcours en 9 étapes et blocage patron expliqué à l'écran. Budget dans `docs/BUDGET.md`.
- Tests écrits : mensurations, permissions, moteur, rétention/consentement, chiffrement, fournisseurs manuels (6 fichiers).

## Tests

⚠️ **Non exécutés** : l'outil shell de cette session est temporairement indisponible (« muse-wonder-1.0 is temporarily unavailable »).
Commandes à lancer dès son retour, avant tout merge :

```bash
npm install && npm test && npm run check && npm run build
```

## Incertain / à valider par vous

1. **Formules jupe droite** : aucune source tailleur fournie — il faut un maître tailleur nommé (ou un ouvrage de référence précis) pour passer en `valide_par_tailleur`. Les infographies des photos envoyées ne sont pas une source.
2. Authentification (sessions, mots de passe) : non implémentée en Phase 0 — à cadrer en Phase 1 (rôles définis, pas le login).
3. Stockage objet chiffré (quel fournisseur en Europe, petit budget ?) et tâche cron de suppression à 7 jours : à choisir.
4. Icônes PWA 192/512 px : référencées dans le manifeste, pas encore produites.
5. Appareil Android cible pour mesurer le budget réel : à désigner.

## Suite proposée (Phase 1, seulement après votre « suite »)

Auth atelier + CRUD clientes avec consentement, upload photo chiffré + suppression, saisie manuelle des mensurations.
