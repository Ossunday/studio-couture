# Studio Couture — Architecture

A short, honest map of what the code actually does today.

## Overview

```
Browser (mobile-first, FR/EN)
        │  HTTPS forms + a small JSON endpoint
        ▼
SvelteKit SSR (TypeScript, adapter-node) ──► PostgreSQL (production)
        │                                       or in-memory repository
        ├── Pattern engine (pure TypeScript)    (demo / tests only)
        ├── PDF export (flat pattern, A4 1:1)
        └── Optional AI assistant ──► operator-configured model endpoint
                                      (`POST /v1/messages`, server-side only)
```

## Server-rendered application

- **SvelteKit SSR + TypeScript**, no SPA: pages are rendered on the server,
  forms work with plain POSTs, JavaScript only enhances. Installable as a
  PWA; fonts are bundled locally (no CDN).
- Every connected page shares one layout; the floating AI assistant is
  mounted there and nowhere else.
- Bilingual UI (French first, English) from two typed dictionaries kept in
  parity by the type system.

## Data layer

- A single `Repository` interface (`src/lib/server/repository.ts`) with two
  implementations: **PostgreSQL** for production (migrations in
  `migrations/`) and **in-memory** for the demo and Playwright
  (`STUDIO_COUTURE_REPOSITORY=memoire`). The in-memory store is never a
  production fallback — it is selected explicitly.
- Data is always scoped by workshop (`atelierId`): one workshop never sees
  another workshop's clients, photos, or patterns.

## Pattern engine — the source of truth for geometry

- Three models live in one registry (`src/lib/patterns/registre.ts`):
  `pantalon_large` (wide-leg trousers), `robe_fourreau` (sheath dress),
  `jupe_droite` (straight skirt). Each declares its measurements with
  allowed ranges, its options, and its generator.
- Pieces are **computed** by pure formula/geometry modules
  (`src/lib/patterns/<modele>/`) and rendered as a dimensioned flat pattern,
  in the fitting room and in the A4 PDF. Formulas carry `source`,
  `hypotheses`, ease, and a validation status; today they are still
  **drafts not validated by a master tailor** — every pattern is labelled
  as such.
- **The AI never produces measurements geometry, dimensions, or a pattern.**
  It only proposes a model, options within the registry's ranges, and
  indicative estimated measurements clamped to the registry's ranges. The
  engine computes; the seamstress validates before anything is saved.

## Optional AI assistant

- Floating chat on connected pages (text description, photo, or question),
  backed by `POST /api/suggestion-modele` (`src/lib/server/ia/`).
- Server-side only: session + CSRF required, rate-limited to **20 requests
  per hour per workshop** (in-memory limiter, single instance). The API key
  is never sent to the browser and never logged.
- Strict JSON contract: unknown models are refused (never substituted),
  options and estimated measurements are clamped to registry ranges,
  unknown keys are dropped, and the only free text shown is one short,
  filtered advice sentence. Chat bubbles are built by the app from the
  validated JSON.
- Photos sent to the assistant are checked by file signature (JPEG/PNG/
  WebP, 5 MB max), stripped of metadata, processed **in memory only, never
  stored and never logged**, and require an explicit consent checkbox.
- Not configured, failing, or in demo mode: the assistant answers
  “Assistant bientôt disponible” (“coming soon”) and the manual flow is
  untouched. See `docs/META_USAGE.md`.

## Security

- **Passwords**: scrypt (OWASP-level parameters, parameters stored with the
  hash so older hashes stay verifiable). Minimum 12 characters.
- **CSRF**: SvelteKit origin checks on form POSTs plus a per-session CSRF
  token for forms and for the assistant endpoint. In production, `ORIGIN`
  must match the address used in the browser (see README).
- **Sessions**: random token, only its hash is stored, HTTP-only cookie.
- **Client photos** (client records, separate from assistant photos):
  explicit consent required, encrypted server-side with **AES-256-GCM**,
  **automatically deleted after 7 days** (configurable retention), never
  used for training; revoking consent deletes them immediately.
- Sign-up has a honeypot field and a per-IP rate limit. Rate limiters are
  in-memory (single-instance assumption).
- Startup refuses to boot without a session secret (≥ 32 bytes) and a photo
  encryption key (exactly 32 bytes, base64).

## Tests

- Unit tests (Vitest) including fake-AI-client tests — no network, no real
  key — and Playwright end-to-end tests against the in-memory repository.
- `npm test`, `npm run check`, `npm run build`, `npm run test:e2e`.
