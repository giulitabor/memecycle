create table if not exists public.mc_user_watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mint text not null check (mint ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  created_at timestamptz not null default now(),
  constraint mc_user_watchlists_user_mint_key unique (user_id, mint)
);
create index if not exists mc_user_watchlists_user_created_idx on public.mc_user_watchlists (user_id, created_at desc);
alter table public.mc_user_watchlists enable row level security;
drop policy if exists "Users read their own watchlist" on public.mc_user_watchlists;
create policy "Users read their own watchlist" on public.mc_user_watchlists for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users add to their own watchlist" on public.mc_user_watchlists;
create policy "Users add to their own watchlist" on public.mc_user_watchlists for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users remove from their own watchlist" on public.mc_user_watchlists;
create policy "Users remove from their own watchlist" on public.mc_user_watchlists for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.mc_user_watchlists from anon;
grant select, insert, delete on public.mc_user_watchlists to authenticated;
