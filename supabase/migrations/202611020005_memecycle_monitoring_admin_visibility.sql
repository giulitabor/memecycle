-- MEMECYCLE: expose automation run history to trusted administrators only.
alter table public.mc_ingestion_runs enable row level security;
grant select on public.mc_ingestion_runs to authenticated;
drop policy if exists "MEMECYCLE admins can inspect ingestion runs" on public.mc_ingestion_runs;
create policy "MEMECYCLE admins can inspect ingestion runs"
  on public.mc_ingestion_runs
  for select
  to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create index if not exists mc_ingestion_runs_type_started_idx
  on public.mc_ingestion_runs(run_type, started_at desc);
