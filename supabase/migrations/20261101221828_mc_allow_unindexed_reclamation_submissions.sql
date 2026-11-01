-- Reclamation submissions must be allowed for mints that have not yet been indexed.
-- The review/ingestion pipeline will validate the mint and create the archive record later.
alter table public.mc_reclamation_cases
  drop constraint if exists mc_reclamation_cases_mint_fkey;
