create table if not exists public.mc_abandonment_assessments (
  id uuid primary key default gen_random_uuid(),
  mint text not null references public.mc_tokens(mint) on delete cascade,
  assessed_at timestamptz not null default now(),
  market_pair_address text,
  market_pair_age_days numeric,
  liquidity_usd numeric,
  volume_24h_usd numeric,
  sampled_holder_accounts integer not null default 0,
  sampled_accounts_without_recent_activity integer not null default 0,
  newest_sampled_holder_activity_at timestamptz,
  assessment_status text not null default 'insufficient_evidence' check (assessment_status in ('insufficient_evidence','candidate_for_review','verified_abandoned','rejected')),
  eligible_for_publication boolean not null default false,
  evidence jsonb not null default '[]'::jsonb,
  assessor_version text not null
);
create index if not exists mc_abandonment_assessments_status_idx on public.mc_abandonment_assessments(assessment_status, assessed_at desc);
create index if not exists mc_abandonment_assessments_mint_idx on public.mc_abandonment_assessments(mint, assessed_at desc);
alter table public.mc_abandonment_assessments enable row level security;
grant select on public.mc_abandonment_assessments to authenticated;
drop policy if exists "MEMECYCLE admins can inspect abandonment assessments" on public.mc_abandonment_assessments;
create policy "MEMECYCLE admins can inspect abandonment assessments" on public.mc_abandonment_assessments for select to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');