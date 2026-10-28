# Budget performance — connexion lente, mobile, plein soleil (règle n°7)

| Poste | Budget | Contrôle |
|---|---|---|
| HTML SSR page d'accueil | ≤ 30 Ko gzip | Revue à chaque phase |
| JS client page d'accueil | 0 Ko en Phase 0 (amélioration progressive) | `vite build`, chunkSizeWarningLimit=150 Ko |
| CSS | ≤ 10 Ko | Fichier unique `src/app.css`, pas de framework CSS |
| Images produit | WebP/AVIF, largeur max 1200 px | À appliquer dès l'upload (phase ultérieure) |
| Cibles tactiles | ≥ 48×48 px | `--touch: 48px`, tests visuels |
| Contraste | Texte #111 sur #fff (plein soleil) | Pas de gris clair pour le texte utile |
| Hors-ligne | Ressources statiques uniquement | `src/service-worker.ts` — jamais photos clientes / API |
| Polices | Police système uniquement | 0 Ko de webfont |

Incertain : budget réel sur Android d'entrée de gamme au Bénin à mesurer sur appareil cible à la Phase 1.
