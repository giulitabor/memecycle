drop policy if exists "No direct client access to wallet challenges" on public.mc_wallet_challenges;
create policy "No direct client access to wallet challenges"
  on public.mc_wallet_challenges
  for all
  to anon, authenticated
  using (false)
  with check (false);
