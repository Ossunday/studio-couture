# Scripts de diagnostic E2E — à lancer depuis la racine du projet, après `npm run build`

- `node scripts/diagnostic/debug-e2e.mjs` : serveur construit en processus enfant + `fetch` GET/POST `/installation` (avec et sans `Origin`) ; `DEBUG_SANS_ORIGIN=1` montre le rejet 403 sans `ORIGIN` explicite.
- `node scripts/diagnostic/debug-navigateur.mjs` : même serveur enfant, mais soumission du formulaire dans Chromium (en-têtes réellement émis, comparaison JS désactivé) ; `DEBUG_AVEC_FENETRE=1` pour le mode fenêtré, `DEBUG_HOTE=localhost` pour changer d’hôte.
- `node scripts/diagnostic/debug-proxy.mjs` : proxy Node de diagnostic devant le serveur enfant, journalise `Origin`/`Sec-Fetch-Site` tels qu’ils arrivent sur le réseau — c’est lui qui a prouvé l’envoi d’`Origin: null` sous `referrer-policy: no-referrer`.
