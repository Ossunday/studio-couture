-- Patrons enregistrés sur les fiches clientes (salle d'essayage connectée).
-- À appliquer après 0001_init.sql, 0002_phase1.sql et 0003 :
--   psql -U postgres -h 127.0.0.1 -d studio_couture -f migrations/0004_patrons_clientes.sql
-- Idempotente : peut être ré-exécutée (create table/index if not exists).
--
-- Accès : comme les mensurations et les photos, un patron n'existe que par sa
-- cliente ; l'atelier propriétaire se déduit de clientes.atelier_id, et tous
-- les dépôts filtrent par (atelier_id, cliente_id) avant tout accès.
-- Supprimer la cliente supprime ses patrons (ON DELETE CASCADE) ; supprimer
-- l'utilisatrice autrice garde le patron, seul le lien est annulé (SET NULL),
-- même décision que mensurations.validee_par en 0003.
-- mesures/options/tissu sont des instantanés JSON validés côté serveur
-- (mêmes bornes que la saisie) : jamais de mesure arbitraire stockée.

create table if not exists patrons_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  modele text not null check (modele in ('pantalon_large', 'jupe_droite')),
  nom text not null,
  mesures jsonb not null,
  options jsonb not null default '{}'::jsonb,
  tissu jsonb not null default '{}'::jsonb,
  statut text not null default 'brouillon' check (statut = 'brouillon'),
  cree_par uuid references utilisatrices(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_patrons_clientes_cliente
  on patrons_clientes (cliente_id, created_at desc);
