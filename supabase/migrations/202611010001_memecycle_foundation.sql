create extension if not exists pgcrypto;

create table if not exists public.mc_tokens (
  mint text primary key, chain text not null default 'solana', name text, symbol text,
  image_url text, metadata_uri text,
  classification text not null default 'unverified'
    check (classification in ('active','declining','dormant','abandoned','illiquid','historical','community_revival','unverified')),
  lifecycle_status text not null default 'unverified', first_seen_at timestamptz, last_activity_at timestamptz,
  market_cap_usd numeric, liquidity_usd numeric, volume_24h_usd numeric, holder_count integer,
  data_completeness smallint not null default 0 check (data_completeness between 0 and 100),
  reclamation_score smallint check (reclamation_score between 0 and 100),
  score_breakdown jsonb not null default '{}'::jsonb, risk_flags jsonb not null default '[]'::jsonb,
  source_provenance jsonb not null default '{}'::jsonb,
  visibility text not null default 'private' check (visibility in ('public','private')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.mc_snapshots (
  id bigserial primary key, mint text not null references public.mc_tokens(mint) on delete cascade,
  observed_at timestamptz not null, price_usd numeric, market_cap_usd numeric, liquidity_usd numeric,
  volume_24h_usd numeric, holder_count integer, source text not null,
  raw_observation jsonb not null default '{}'::jsonb, unique(mint, observed_at, source)
);
create table if not exists public.mc_classifications (
  id uuid primary key default gen_random_uuid(), mint text not null references public.mc_tokens(mint) on delete cascade,
  classifier_version text not null, classification text not null, score smallint check (score between 0 and 100),
  explanation text, evidence jsonb not null default '[]'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.mc_reclamation_cases (
  id uuid primary key default gen_random_uuid(), mint text not null references public.mc_tokens(mint) on delete cascade,
  case_type text not null check (case_type in ('historical_archive','community_revival','metadata_correction','collectible_certificate','research_contribution')),
  title text not null, description text not null, submitter_wallet text, contact_email text,
  evidence jsonb not null default '[]'::jsonb,
  review_status text not null default 'pending' check (review_status in ('pending','under_review','approved','rejected','closed')),
  created_at timestamptz not null default now(), reviewed_at timestamptz
);
create table if not exists public.mc_datasets (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null,
  description text not null, access_tier text not null default 'free'
    check (access_tier in ('free','pro','enterprise')),
  record_count bigint not null default 0, published boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.mc_audit_events (
  id bigserial primary key, event_type text not null, actor text not null default 'system',
  subject_ref text, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists mc_tokens_classification_idx on public.mc_tokens(classification);
create index if not exists mc_tokens_activity_idx on public.mc_tokens(last_activity_at desc);
create index if not exists mc_tokens_score_idx on public.mc_tokens(reclamation_score desc);
create index if not exists mc_snapshots_mint_observed_idx on public.mc_snapshots(mint, observed_at desc);
create index if not exists mc_cases_status_idx on public.mc_reclamation_cases(review_status, created_at desc);
alter table public.mc_tokens enable row level security;
alter table public.mc_snapshots enable row level security;
alter table public.mc_classifications enable row level security;
alter table public.mc_reclamation_cases enable row level security;
alter table public.mc_datasets enable row level security;
alter table public.mc_audit_events enable row level security;
create policy "Public can read published MEMECYCLE tokens" on public.mc_tokens for select to anon, authenticated using (visibility = 'public');
create policy "Public can read snapshots for published MEMECYCLE tokens" on public.mc_snapshots for select to anon, authenticated using (exists (select 1 from public.mc_tokens t where t.mint = mc_snapshots.mint and t.visibility = 'public'));
create policy "Public can read classifications for published MEMECYCLE tokens" on public.mc_classifications for select to anon, authenticated using (exists (select 1 from public.mc_tokens t where t.mint = mc_classifications.mint and t.visibility = 'public'));
create policy "Public can read published MEMECYCLE datasets" on public.mc_datasets for select to anon, authenticated using (published = true);
grant select on public.mc_tokens, public.mc_snapshots, public.mc_classifications, public.mc_datasets to anon, authenticated;
grant insert on public.mc_reclamation_cases to anon, authenticated;
create policy "Public can submit MEMECYCLE reclamation cases"
on public.mc_reclamation_cases
for insert to anon, authenticated
with check (
  mint ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
  and case_type in ('historical_archive','community_revival','metadata_correction','research_contribution')
  and title = 'Community submission'
  and char_length(description) <= 2000
  and review_status = 'pending'
  and submitter_wallet is null
  and contact_email is null
);
revoke all on public.mc_audit_events from anon, authenticated;
