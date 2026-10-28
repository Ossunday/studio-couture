-- Phase 1 — Studio Couture : authentification atelier, consentement signé,
-- photos chiffrées en base, mensurations manuelles.
-- À appliquer après 0001_init.sql : psql "$STUDIO_COUTURE_DATABASE_URL" -f migrations/0002_phase1.sql

alter table utilisatrices
  add column if not exists identifiant text,
  add column if not exists mot_de_passe_hash text;

-- Identifiant de connexion : e-mail OU téléphone, normalisé en minuscules sans espaces.
create unique index if not exists idx_utilisatrices_identifiant
  on utilisatrices (identifiant) where identifiant is not null;

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  utilisatrice_id uuid not null references utilisatrices(id) on delete cascade,
  token_hash text not null unique,
  creee_le timestamptz not null default now(),
  expire_le timestamptz not null
);
create index if not exists idx_sessions_expire on sessions(expire_le);

-- Consentement photo signé : nom tapé par la cliente (ou la couturière sous sa dictée) + version du texte.
alter table consentements
  add column if not exists signature_nom text,
  add column if not exists texte_version text not null default 'v1';

-- Photo chiffrée stockée en base (AES-256-GCM, voir src/lib/server/crypto.ts) :
-- aucun fichier en clair, aucune URL publique, suppression = suppression de la ligne.
alter table photos_clientes
  add column if not exists type_mime text,
  add column if not exists taille_octets integer,
  add column if not exists iv bytea,
  add column if not exists auth_tag bytea,
  add column if not exists donnees_chiffrees bytea;

alter table mensurations
  add column if not exists creee_le timestamptz not null default now();

create unique index if not exists idx_mensurations_cliente_code
  on mensurations (cliente_id, code);
