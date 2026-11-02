alter table public.mc_discovery_sources enable row level security;
grant select on public.mc_discovery_sources to authenticated;
drop policy if exists "MEMECYCLE admins can inspect discovery sources" on public.mc_discovery_sources;
create policy "MEMECYCLE admins can inspect discovery sources"
  on public.mc_discovery_sources for select to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
