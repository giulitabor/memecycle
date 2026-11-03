create table if not exists public.mc_ai_research_reports (
  id uuid primary key default gen_random_uuid(),
  mint text not null references public.mc_tokens(mint) on delete cascade,
  status text not null default 'completed' check (status in ('completed','failed')),
  model text not null,
  prompt_version text not null,
  summary text not null,
  report jsonb not null,
  evidence_manifest jsonb not null default '{}'::jsonb,
  generation_id text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12,8),
  error_message text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists mc_ai_research_reports_mint_created_idx on public.mc_ai_research_reports (mint, created_at desc);
create index if not exists mc_ai_research_reports_created_idx on public.mc_ai_research_reports (created_at desc);
alter table public.mc_ai_research_reports enable row level security;
revoke all on public.mc_ai_research_reports from anon, authenticated;
grant all on public.mc_ai_research_reports to service_role;
