-- Align the ingestion-run enum/check contract with the deployed revival worker.
-- The revival worker writes one run row before it starts any RPC investigation.
ALTER TABLE public.mc_ingestion_runs
  DROP CONSTRAINT IF EXISTS mc_ingestion_runs_run_type_check;

ALTER TABLE public.mc_ingestion_runs
  ADD CONSTRAINT mc_ingestion_runs_run_type_check
  CHECK (run_type = ANY (ARRAY[
    'discovery'::text,
    'monitor'::text,
    'market_snapshot'::text,
    'classification'::text,
    'backfill'::text,
    'revival_intelligence'::text
  ]));
