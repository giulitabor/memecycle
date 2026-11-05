drop policy if exists "Public can read references for published tokens" on public.mc_archive_references;
create policy "Public can read references for published tokens"
on public.mc_archive_references for select to anon,authenticated
using (
  (subject_type in ('token_mint','metadata') and exists(
    select 1 from public.mc_tokens t where t.mint=mc_archive_references.subject_address and t.visibility='public'
  ))
  or
  (subject_type='transaction' and exists(
    select 1 from public.mc_tokens t where t.mint=mc_archive_references.normalized_facts->>'mint' and t.visibility='public'
  ))
);
