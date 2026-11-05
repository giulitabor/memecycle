-- MEMECYCLE: reference graph, value assessment and user-owned wallet recovery.
-- Source data is referenced, not bulk-copied. Wallet scans require a fresh signature
-- from the wallet owner and are read-only; no transaction execution is implemented.

create extension if not exists http with schema extensions;

create table if not exists public.mc_archive_references (
  id uuid primary key default gen_random_uuid(),
  network text not null default 'solana-mainnet',
  subject_type text not null check (subject_type in ('token_mint','token_account','wallet','transaction','metadata','dataset_record','pool','program')),
  subject_address text not null,
  source_id text not null,
  external_record_id text not null default '',
  locator_url text not null,
  source_revision text,
  content_hash text,
  licence_id text,
  attribution text,
  retrieval_status text not null default 'reference_only'
    check (retrieval_status in ('available','reference_only','missing','error','stale','restricted')),
  evidence_role text not null default 'locator'
    check (evidence_role in ('observed_fact','provider_claim','inference','locator')),
  observed_at timestamptz not null default now(),
  last_checked_at timestamptz,
  normalized_facts jsonb not null default '{}'::jsonb,
  coverage_notes text,
  created_at timestamptz not null default now()
);
alter table public.mc_archive_references
  add column if not exists external_record_id text not null default '';
create unique index if not exists mc_archive_references_identity_idx
  on public.mc_archive_references(network,subject_type,subject_address,source_id,external_record_id);
create index if not exists mc_archive_references_subject_idx
  on public.mc_archive_references(subject_address,observed_at desc);
create index if not exists mc_archive_references_source_idx
  on public.mc_archive_references(source_id,observed_at desc);
alter table public.mc_archive_references enable row level security;
drop policy if exists "Public can read references for published tokens" on public.mc_archive_references;
create policy "Public can read references for published tokens"
  on public.mc_archive_references for select to anon,authenticated
  using (subject_type='token_mint' and exists (
    select 1 from public.mc_tokens t where t.mint=mc_archive_references.subject_address and t.visibility='public'
  ));
grant select on public.mc_archive_references to anon,authenticated;
grant all on public.mc_archive_references to service_role;

create table if not exists public.mc_value_assessments (
  id uuid primary key default gen_random_uuid(),
  mint text not null references public.mc_tokens(mint) on delete cascade,
  assessed_at timestamptz not null default now(),
  assessor_version text not null,
  historical_score smallint check(historical_score between 0 and 100),
  research_score smallint check(research_score between 0 and 100),
  cultural_score smallint check(cultural_score between 0 and 100),
  technical_score smallint check(technical_score between 0 and 100),
  recovery_score smallint check(recovery_score between 0 and 100),
  community_score smallint check(community_score between 0 and 100),
  overall_value_band text not null check(overall_value_band in ('insufficient_evidence','low_potential','moderate_potential','high_potential')),
  evidence_confidence text not null check(evidence_confidence in ('low','medium','high')),
  rights_status text not null default 'unknown' check(rights_status in ('unknown','cc_by','other_license','public_domain','restricted','not_applicable')),
  authority_status text not null default 'unknown',
  consent_status text not null default 'not_requested',
  evidence_refs jsonb not null default '[]'::jsonb,
  findings jsonb not null default '{}'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mc_value_assessments_mint_time_idx
  on public.mc_value_assessments(mint,assessed_at desc);
alter table public.mc_value_assessments enable row level security;
drop policy if exists "Public can read value assessments for published tokens" on public.mc_value_assessments;
create policy "Public can read value assessments for published tokens"
  on public.mc_value_assessments for select to anon,authenticated
  using (exists(select 1 from public.mc_tokens t where t.mint=mc_value_assessments.mint and t.visibility='public'));
grant select on public.mc_value_assessments to anon,authenticated;
grant all on public.mc_value_assessments to service_role;

create table if not exists public.mc_wallet_scan_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_address text not null,
  nonce text not null unique,
  message text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mc_wallet_scan_challenges_expiry_idx
  on public.mc_wallet_scan_challenges(expires_at) where used_at is null;
alter table public.mc_wallet_scan_challenges enable row level security;
revoke all on public.mc_wallet_scan_challenges from anon,authenticated;
grant all on public.mc_wallet_scan_challenges to service_role;

create table if not exists public.mc_wallet_recovery_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_address text not null,
  network text not null default 'solana-mainnet',
  status text not null default 'running' check(status in ('running','completed','partial','failed')),
  scanned_account_count integer not null default 0,
  potential_excess_lamports numeric(39,0) not null default 0,
  potential_excess_sol numeric(30,9) not null default 0,
  zero_balance_close_candidates integer not null default 0,
  limitations jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists mc_wallet_recovery_scans_user_idx
  on public.mc_wallet_recovery_scans(user_id,started_at desc);
alter table public.mc_wallet_recovery_scans enable row level security;
drop policy if exists "Users can read their own wallet scans" on public.mc_wallet_recovery_scans;
create policy "Users can read their own wallet scans"
  on public.mc_wallet_recovery_scans for select to authenticated using(auth.uid()=user_id);
grant select on public.mc_wallet_recovery_scans to authenticated;
grant all on public.mc_wallet_recovery_scans to service_role;

create table if not exists public.mc_wallet_recovery_candidates (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.mc_wallet_recovery_scans(id) on delete cascade,
  account_address text not null,
  token_program_id text not null,
  mint_address text,
  token_amount_raw numeric(39,0),
  lamports_raw numeric(39,0),
  rent_minimum_lamports_raw numeric(39,0),
  potential_excess_lamports_raw numeric(39,0),
  owner_address text,
  close_authority text,
  can_withdraw_excess boolean not null default false,
  can_close_zero_balance boolean not null default false,
  review_required boolean not null default true,
  limitations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(scan_id,account_address)
);
create index if not exists mc_wallet_recovery_candidates_scan_idx
  on public.mc_wallet_recovery_candidates(scan_id);
alter table public.mc_wallet_recovery_candidates enable row level security;
drop policy if exists "Users can read their own wallet recovery candidates" on public.mc_wallet_recovery_candidates;
create policy "Users can read their own wallet recovery candidates"
  on public.mc_wallet_recovery_candidates for select to authenticated using(exists(
    select 1 from public.mc_wallet_recovery_scans s where s.id=mc_wallet_recovery_candidates.scan_id and s.user_id=auth.uid()
  ));
grant select on public.mc_wallet_recovery_candidates to authenticated;
grant all on public.mc_wallet_recovery_candidates to service_role;
