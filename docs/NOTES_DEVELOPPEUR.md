# Developer notes

Internal notes moved out of the public README. The README stays focused on
what the app is and how to run it; this file keeps the operational details.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Public home when logged out, connected dashboard when logged in |
| `/demo`, `/demo/pdf` | Public guided demo (no account) and its PDF |
| `/installation` | First-run creation of the first workshop (only while no workshop exists) |
| `/inscription`, `/connexion`, `/deconnexion` | Public sign-up, login, logout |
| `/langue` | FR/EN language switch (POST, CSRF-protected) |
| `/clientes`, `/clientes/nouvelle` | Client list and creation |
| `/clientes/[id]` | Client record (measurements, photos, saved patterns) |
| `/clientes/[id]/modifier` | Edit the client record |
| `/clientes/[id]/patron/nouveau` | Create a pattern for a client (fitting room) |
| `/clientes/[id]/patron/[patronId]` | Saved pattern of a client |
| `/clientes/[id]/photos/[photoId]` | Serve a consented client photo (private, `no-store`) |
| `/patron/mesures`, `/patron/apercu`, `/patron/pdf` | Quick pattern without a client: measures → preview → A4 PDF |
| `/profil` | User profile |
| `/atelier/utilisatrices` | Workshop member management |
| `/api/suggestion-modele` | Optional AI assistant endpoint (POST, session + CSRF, 20 req/h/workshop) |

## ORIGIN and CSRF in production

- SvelteKit checks the `Origin` header on form POSTs; adapter-node derives
  the expected origin from the `ORIGIN` environment variable.
- Without `ORIGIN`, adapter-node assumes **https**: a local production build
  browsed over `http://127.0.0.1:3000` then fails with
  “Cross-site POST form submissions are forbidden”.
- `ORIGIN` must match the address actually used in the browser exactly
  (scheme + host + port). Browsing via `localhost` while `ORIGIN` pins
  `127.0.0.1` (or another port) gives the same 403.
- On startup, the app logs an explicit, non-blocking warning when `ORIGIN`
  is missing in production (`avertirSiOriginAbsent` in
  `src/lib/server/config.ts`); the CSRF protection itself is never disabled
  and there is no allow-list of origins.

## Public sign-up rules

- Sign-up is open by default; set `INSCRIPTION_OUVERTE=false` to close it.
- Passwords: scrypt (parameters stored with the hash), minimum 12
  characters.
- The sign-up form has a honeypot field and a per-IP rate limit
  (5 creations/hour).
- There is no e-mail verification and no “forgotten password” flow yet —
  see `docs/A_FAIRE_AVANT_MISE_EN_LIGNE.md` before any real public launch.

## Project rules (non-negotiable)

1. The brand has a single source: `src/lib/brand.ts`. Only static files
   that cannot import TypeScript (`package.json`,
   `static/manifest.webmanifest`, `src/app.html`) copy its values — keep
   them in sync.
2. Product environment variables are prefixed `STUDIO_COUTURE_`;
   `DATABASE_URL` is accepted only as a fallback for the database URL.
3. The pattern registry (`src/lib/patterns/registre.ts`) is the single
   source of truth for the models, their measurement ranges, and their
   options. The TypeScript engine always computes the pattern; the AI
   never produces geometry.
4. Every generated pattern is an **unvalidated draft** until a master
   tailor validates it. Never present it as ready-to-cut.
5. The 3D preview is indicative only, never a drape simulation.
6. Assistant photos: in memory only, metadata stripped, never stored,
   never logged, explicit consent required. No client data is sent to the
   AI.
7. Client-record photos: explicit consent, AES-256-GCM encryption,
   automatic deletion after 7 days, immediate deletion when consent is
   revoked.
8. All data is scoped by workshop (`atelierId`); one workshop never sees
   another's data.
9. FR/EN dictionaries stay in parity (enforced by the type system).
10. Checks before any commit: `npm test`, `npm run check`,
    `npm run build`, `npm run test:e2e`. Builds for verification use
    `STUDIO_COUTURE_BUILD_OUT`, never the `build/` folder.

## Demo and screenshots

```bash
npm install
npm run demo        # in-memory, no database, no key → http://127.0.0.1:3000
```

Regenerate the README screenshots while the demo runs on port 3100:
`CAPTURES_BASE_URL=http://127.0.0.1:3100 node scripts/captures.mjs`.
Assistant diagnostic with the operator's real key (never printed):
`node --env-file="$HOME/studio-couture.env" scripts/diagnostic-assistant.mjs "un pantalon très ample"`
or with `--photo <file>`.
