-- Phase 0 — Studio Couture (PostgreSQL, hébergement Europe)
-- Photos : chiffrées côté serveur (AES-256-GCM, voir src/lib/server/crypto.ts),
-- jamais d'URL publique, suppression automatique après 7 jours par défaut.

create extension if not exists pgcrypto;

create table if not exists ateliers (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  created_at timestamptz not null default now()
);

create table if not exists utilisatrices (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null references ateliers(id) on delete cascade,
  nom text not null,
  role text not null check (role in ('admin','couturiere')),
  created_at timestamptz not null default now()
);

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null references ateliers(id) on delete cascade,
  nom text not null,
  telephone text,
  created_at timestamptz not null default now()
);

create table if not exists consentements (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  donne_le timestamptz not null default now(),
  revoque_le timestamptz,
  usage_rendu_ia boolean not null default false,
  -- Verrou produit : jamais d'entraînement sur les photos clientes.
  usage_entrainement_ia boolean not null default false check (usage_entrainement_ia = false)
);

create table if not exists photos_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  consentement_id uuid not null references consentements(id),
  type text not null check (type in ('modele','cliente_complete','tissu')),
  storage_key_chiffre text not null,
  creee_le timestamptz not null default now(),
  expire_le timestamptz not null,
  supprimee_le timestamptz
);
create index if not exists idx_photos_expire on photos_clientes(expire_le) where supprimee_le is null;

create table if not exists mensurations (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  code text not null,
  valeur_cm numeric(6,2) not null check (valeur_cm > 0),
  source text not null check (source in ('estimation_photo','saisie_couturiere')),
  marge_erreur_cm numeric(5,2),
  validee_par_couturiere boolean not null default false,
  validee_par uuid references utilisatrices(id),
  validee_le timestamptz,
  check (source <> 'estimation_photo' or marge_erreur_cm is not null)
);

create table if not exists projets_couture (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null references ateliers(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  garment_id text not null check (garment_id in ('jupe_droite','pantalon_classique')),
  etape text not null default 'modele',
  created_at timestamptz not null default now()
);
