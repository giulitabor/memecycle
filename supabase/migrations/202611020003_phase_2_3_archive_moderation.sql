-- MEMECYCLE Stage 2/3: historical archive queries and authenticated moderation.
-- Admin authorization is based only on trusted app_metadata, never user_metadata.
create index if not exists mc_snapshots_mint_observed_source_idx
  on public.mc_snapshots(mint, observed_at desc, source);
create index if not exists mc_cases_created_idx
  on public.mc_reclamation_cases(created_at desc);
create index if not exists mc_tokens_visibility_updated_idx
  on public.mc_tokens(visibility, updated_at desc);

alter table public.mc_reclamation_cases
  add constraint mc_reclamation_evidence_array_check
  check (jsonb_typeof(evidence) = 'array' and jsonb_array_length(evidence) <= 10);

grant select, update (visibility) on public.mc_tokens to authenticated;
drop policy if exists "MEMECYCLE admins can inspect all tokens" on public.mc_tokens;
create policy "MEMECYCLE admins can inspect all tokens"
  on public.mc_tokens for select to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
drop policy if exists "MEMECYCLE admins can publish reviewed tokens" on public.mc_tokens;
create policy "MEMECYCLE admins can publish reviewed tokens"
  on public.mc_tokens for update to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');

grant select on public.mc_reclamation_cases to authenticated;
grant update (review_status, reviewed_at) on public.mc_reclamation_cases to authenticated;
drop policy if exists "MEMECYCLE admins can inspect reclamation cases" on public.mc_reclamation_cases;
create policy "MEMECYCLE admins can inspect reclamation cases"
  on public.mc_reclamation_cases for select to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
drop policy if exists "MEMECYCLE admins can review reclamation cases" on public.mc_reclamation_cases;
create policy "MEMECYCLE admins can review reclamation cases"
  on public.mc_reclamation_cases for update to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
