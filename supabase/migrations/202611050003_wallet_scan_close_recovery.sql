alter table public.mc_wallet_recovery_scans
  add column if not exists potential_close_lamports numeric(39,0) not null default 0;
alter table public.mc_wallet_recovery_candidates
  add column if not exists potential_close_lamports_raw numeric(39,0);
