alter table public.mc_abandonment_assessments
  add column if not exists pool_last_activity_at timestamptz,
  add column if not exists pool_activity_age_days numeric,
  add column if not exists jupiter_is_verified boolean,
  add column if not exists jupiter_organic_score numeric,
  add column if not exists jupiter_audit jsonb,
  add column if not exists corroborating_sources text[] not null default '{}',
  add column if not exists research_summary text,
  add column if not exists risk_flags jsonb not null default '[]'::jsonb,
  add column if not exists auto_publish_eligible boolean not null default false,
  add column if not exists auto_published boolean not null default false;

alter table public.mc_reclamation_cases
  add column if not exists submitter_wallet_verified_at timestamptz,
  add column if not exists submitter_wallet_signature text;

create table if not exists public.mc_wallet_challenges (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  mint text not null,
  case_type text not null,
  title text not null default 'Community submission',
  description text not null,
  evidence jsonb not null default '[]'::jsonb,
  message text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  signature text,
  created_at timestamptz not null default now()
);
create index if not exists mc_wallet_challenges_wallet_created_idx on public.mc_wallet_challenges(wallet,created_at desc);
create index if not exists mc_wallet_challenges_expiry_idx on public.mc_wallet_challenges(expires_at) where consumed_at is null;
alter table public.mc_wallet_challenges enable row level security;
revoke all on public.mc_wallet_challenges from anon,authenticated;
grant all on public.mc_wallet_challenges to service_role;

insert into public.mc_discovery_sources(source_key,provider,endpoint,enabled)
values
 ('jupiter_recent','jupiter','https://api.jup.ag/tokens/v2/recent',true),
 ('pumpfun_launch_history','pumpdata','https://pumpdata.fun/free/launches/since.json',true)
on conflict (source_key) do update set provider=excluded.provider,endpoint=excluded.endpoint,enabled=true,updated_at=now();
