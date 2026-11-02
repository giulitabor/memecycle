drop policy if exists "Public can submit MEMECYCLE reclamation cases" on public.mc_reclamation_cases;
revoke insert on public.mc_reclamation_cases from anon, authenticated;
grant insert on public.mc_reclamation_cases to service_role;
