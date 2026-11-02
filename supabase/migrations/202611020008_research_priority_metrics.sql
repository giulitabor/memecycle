alter table public.mc_abandonment_assessments
  add column if not exists research_coverage smallint not null default 0,
  add column if not exists community_research_priority smallint not null default 0;
