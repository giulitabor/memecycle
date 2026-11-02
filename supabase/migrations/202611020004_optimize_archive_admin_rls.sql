-- Optimize admin authorization checks and combine public/admin token SELECT policy.
drop policy if exists "MEMECYCLE admins can inspect all tokens" on public.mc_tokens;
drop policy if exists "Public can read published MEMECYCLE tokens" on public.mc_tokens;
create policy "Public and MEMECYCLE admins can read permitted tokens"
  on public.mc_tokens for select to anon, authenticated
  using (
    visibility = 'public'
    or ((select auth.jwt())->'app_metadata'->>'role') = 'admin'
  );

drop policy if exists "MEMECYCLE admins can publish reviewed tokens" on public.mc_tokens;
create policy "MEMECYCLE admins can publish reviewed tokens"
  on public.mc_tokens for update to authenticated
  using (((select auth.jwt())->'app_metadata'->>'role') = 'admin')
  with check (((select auth.jwt())->'app_metadata'->>'role') = 'admin');

drop policy if exists "MEMECYCLE admins can inspect reclamation cases" on public.mc_reclamation_cases;
create policy "MEMECYCLE admins can inspect reclamation cases"
  on public.mc_reclamation_cases for select to authenticated
  using (((select auth.jwt())->'app_metadata'->>'role') = 'admin');
drop policy if exists "MEMECYCLE admins can review reclamation cases" on public.mc_reclamation_cases;
create policy "MEMECYCLE admins can review reclamation cases"
  on public.mc_reclamation_cases for update to authenticated
  using (((select auth.jwt())->'app_metadata'->>'role') = 'admin')
  with check (((select auth.jwt())->'app_metadata'->>'role') = 'admin');
