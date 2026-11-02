alter table public.mc_ingestion_runs
  drop constraint if exists mc_ingestion_runs_run_type_check;

alter table public.mc_ingestion_runs
  add constraint mc_ingestion_runs_run_type_check
  check (run_type = any (array[
    'discovery'::text,
    'monitor'::text,
    'market_snapshot'::text,
    'classification'::text,
    'backfill'::text
  ]));
