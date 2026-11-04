# How Meta technology is used in Studio Couture

This file states only what the project actually does — nothing else.

## At runtime: an optional AI assistant (operator-configured)

- When — and only when — the operator configures the three server-side
  variables `STUDIO_COUTURE_IA_API_KEY`, `STUDIO_COUTURE_IA_BASE_URL`, and
  `STUDIO_COUTURE_IA_MODELE`, the floating assistant calls the
  **Meta AI model `muse-wonder-1.0`** through the Meta API endpoint
  compatible with `POST /v1/messages`.
- It is used for exactly two things:
  1. **Recognizing a garment** — from a short text description or from a
     photo (the prompt first describes the garment it sees, then maps it to
     the catalogue) — and proposing the matching catalogue model and its
     options;
  2. **Estimating indicative body measurements** from the height and build
     the user declares in the chat.
- Honest status: text recognition was measured working by the project owner
  with the real key (a wide-trousers description returns the wide-trousers
  model). Photo recognition received an explicit-categories prompt fix
  after a real test returned “not available yet”; it is covered by unit
  tests with a fake client, and the owner can re-check a real photo with
  `scripts/diagnostic-assistant.mjs --photo <file>`, which prints what the
  model reported seeing.
- Guardrails: the model never draws the pattern and never emits final
  measurements. Its JSON is strictly validated, estimated measurements are
  clamped to the catalogue ranges and labelled “Estimation indicative, à
  vérifier au mètre ruban.” (“Indicative estimate — check with a tape
  measure”), and nothing is saved to a client record unless the seamstress
  submits the form. Assistant photos are processed in memory, stripped of
  metadata, never stored, and never logged; no client data is sent.
- **In demo mode (`npm run demo`) and whenever the three variables are
  absent, no Meta call happens at all**: the button stays visible and the
  chat honestly answers “Assistant bientôt disponible”.

## During development: Muse

- The application was built with **Muse** (Anthropic's CLI), driven
  by the project playbook in `CLAUDE.md`, the running state in `HANDOFF.md`,
  and the phase briefs in `docs/PHASE_0.md` and `docs/PROMPT_*.md`, with the
  test suite run after every phase. See the README's “Built with
  Muse” section.

## Nothing else

No other Meta product, model, dataset, or API is used — no advertising,
no analytics, no social login, and client photos are never used for
training.
