-- Phase 1 — Studio Couture : suppression d'une utilisatrice sans perte des
-- mensurations, suppression d'un atelier en cascade sans erreur.
-- À appliquer après 0001_init.sql et 0002_phase1.sql :
--   psql -U postgres -h 127.0.0.1 -d studio_couture -f migrations/0003_mensurations_validee_par_set_null.sql
-- Idempotente : peut être ré-exécutée (chaque contrainte est supprimée si elle
-- existe puis recréée avec la bonne action).

-- mensurations.validee_par → utilisatrices : sans action en 0001, la suppression
-- d'une utilisatrice (ou d'un atelier, en cascade) échoue dès qu'elle a saisi
-- une mensuration. Décision production : la mensuration appartient à la cliente
-- et doit lui survivre ; seul le lien vers l'autrice est annulé (SET NULL).
-- La colonne est déjà nullable, validee_par_couturiere et validee_le restent
-- comme trace de la validation. « saisie_par » n'est pas une colonne distincte :
-- c'est ce même champ (cf. RepositoryPg.enregistrerMensuration).
alter table mensurations
  drop constraint if exists mensurations_validee_par_fkey;
alter table mensurations
  add constraint mensurations_validee_par_fkey
  foreign key (validee_par) references utilisatrices(id) on delete set null;

-- sessions.utilisatrice_id → utilisatrices est déjà en ON DELETE CASCADE
-- (0002) : supprimer un compte supprime ses sessions, c'est le comportement
-- voulu — rien à changer.

-- Même famille de blocage, hors utilisatrices : photos_clientes.consentement_id
-- → consentements est sans action en 0001, alors que consentements et photos
-- sont tous deux supprimés en cascade via clientes. Selon l'ordre choisi par
-- PostgreSQL, la suppression d'une cliente ou d'un atelier peut donc échouer.
-- Une photo sans consentement est inutilisable (la révocation supprime déjà
-- les photos) : CASCADE rend la suppression d'atelier totale et sans erreur.
alter table photos_clientes
  drop constraint if exists photos_clientes_consentement_id_fkey;
alter table photos_clientes
  add constraint photos_clientes_consentement_id_fkey
  foreign key (consentement_id) references consentements(id) on delete cascade;
