-- MEMECYCLE seven-stage intelligence and recovery foundation.
-- Internal operational tables: service-role only. Wallet signatures never imply project authority.
create table if not exists public.mc_onchain_evidence (
  id uuid primary key default gen_random_uuid(),
  mint text not null references public.mc_tokens(mint) on delete cascade,
  evidence_type text not null check (evidence_type in (
    'mint_authority','freeze_authority','supply','holder_distribution',
    'pool_activity','mint_creation','creator_candidate','bundle_launch'
  )),
  subject_address text,
  source text not null,
  confidence text not null default 'partial' check (confidence in ('provider_reported','partial','observed','corroborated','verified')),
  coverage text not null,
  observed_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mc_onchain_evidence_mint_type_idx
  on public.mc_onchain_evidence(mint,evidence_type,observed_at desc);
create index if not exists mc_onchain_evidence_subject_idx
  on public.mc_onchain_evidence(subject_address) where subject_address is not null;

create table if not exists public.mc_revival_assessments (
  id uuid primary key default gen_random_uuid(),
  mint text not null references public.mc_tokens(mint) on delete cascade,
  assessed_at timestamptz not null default now(),
  assessor_version text not null,
  dormancy_score smallint check (dormancy_score between 0 and 100),
  revival_viability_score smallint check (revival_viability_score between 0 and 100),
  authority_clarity_score smallint check (authority_clarity_score between 0 and 100),
  community_signal_score smallint check (community_signal_score between 0 and 100),
  data_confidence_score smallint check (data_confidence_score between 0 and 100),
  risk_score smallint check (risk_score between 0 and 100),
  opportunity_score smallint check (opportunity_score between 0 and 100),
  assessment_status text not null default 'insufficient_evidence'
    check (assessment_status in ('insufficient_evidence','research_candidate','revival_candidate','not_viable','requires_human_review')),
  evidence_manifest jsonb not null default '{}'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  rationale text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists mc_revival_assessments_rank_idx
  on public.mc_revival_assessments(assessment_status,opportunity_score desc,assessed_at desc);
create index if not exists mc_revival_assessments_mint_idx
  on public.mc_revival_assessments(mint,assessed_at desc);

create table if not exists public.mc_research_jobs (
  id uuid primary key default gen_random_uuid(),
  mint text references public.mc_tokens(mint) on delete cascade,
  job_type text not null check (job_type in ('historical_backfill','onchain_investigation','revival_assessment','ai_dossier','identity_verification')),
  status text not null default 'queued' check (status in ('queued','running','succeeded','partial','failed','cancelled')),
  priority smallint not null default 50 check (priority between 0 and 100),
  attempts smallint not null default 0,
  max_attempts smallint not null default 3,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  input jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists mc_research_jobs_queue_idx
  on public.mc_research_jobs(status,priority desc,available_at asc)
  where status in ('queued','partial');
create index if not exists mc_research_jobs_mint_idx
  on public.mc_research_jobs(mint,created_at desc) where mint is not null;

create table if not exists public.mc_project_identities (
  id uuid primary key default gen_random_uuid(),
  mint text not null unique references public.mc_tokens(mint) on delete cascade,
  project_name text,
  website_url text,
  social_links jsonb not null default '[]'::jsonb,
  contact_channels jsonb not null default '[]'::jsonb,
  identity_status text not null default 'unverified'
    check (identity_status in ('unverified','candidate','corroborated','verified','disputed','unreachable')),
  authority_status text not null default 'unknown'
    check (authority_status in ('unknown','wallet_control_verified','candidate_authority','independently_verified','disputed','revoked')),
  consent_status text not null default 'not_requested'
    check (consent_status in ('not_requested','requested','granted','declined','withdrawn')),
  evidence jsonb not null default '[]'::jsonb,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mc_revival_cases (
  id uuid primary key default gen_random_uuid(),
  mint text not null references public.mc_tokens(mint) on delete restrict,
  assessment_id uuid references public.mc_revival_assessments(id) on delete set null,
  case_status text not null default 'research'
    check (case_status in ('research','identity_check','awaiting_consent','consent_confirmed','planning','approved','on_hold','closed','rejected')),
  authority_status text not null default 'unknown'
    check (authority_status in ('unknown','wallet_control_verified','candidate_authority','independently_verified','disputed','revoked')),
  consent_status text not null default 'not_requested'
    check (consent_status in ('not_requested','requested','granted','declined','withdrawn')),
  proposed_recovery_plan jsonb not null default '{}'::jsonb,
  risk_register jsonb not null default '[]'::jsonb,
  requires_human_approval boolean not null default true,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists mc_revival_cases_status_idx
  on public.mc_revival_cases(case_status,updated_at desc);
create index if not exists mc_revival_cases_mint_idx
  on public.mc_revival_cases(mint,created_at desc);

create table if not exists public.mc_revival_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.mc_revival_cases(id) on delete cascade,
  event_type text not null,
  actor text not null default 'system',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mc_revival_case_events_case_idx
  on public.mc_revival_case_events(case_id,created_at desc);

alter table public.mc_onchain_evidence enable row level security;
alter table public.mc_revival_assessments enable row level security;
alter table public.mc_research_jobs enable row level security;
alter table public.mc_project_identities enable row level security;
alter table public.mc_revival_cases enable row level security;
alter table public.mc_revival_case_events enable row level security;

revoke all on public.mc_onchain_evidence,public.mc_revival_assessments,public.mc_research_jobs,
  public.mc_project_identities,public.mc_revival_cases,public.mc_revival_case_events from anon,authenticated;
grant all on public.mc_onchain_evidence,public.mc_revival_assessments,public.mc_research_jobs,
  public.mc_project_identities,public.mc_revival_cases,public.mc_revival_case_events to service_role;

comment on table public.mc_onchain_evidence is 'Provider-attributed on-chain evidence with explicit coverage and confidence; never equates wallet control with project authority.';
comment on table public.mc_revival_assessments is 'Versioned, evidence-weighted dormancy and revival assessments; missing evidence remains null and lowers confidence.';
comment on table public.mc_research_jobs is 'Internal queue for bounded historical, on-chain and research tasks.';
comment on table public.mc_project_identities is 'Project identity, contact-channel provenance, authority and consent verification states.';
comment on table public.mc_revival_cases is 'Human-reviewed recovery workflow. No financial or on-chain actions are executed by this table or workflow.';
comment on table public.mc_revival_case_events is 'Append-only audit history for revival case state transitions.';
